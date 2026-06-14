import React, { useState, useEffect } from "react";
import { Heart, UserCheck, User, HelpCircle, Wallet, Bell, ShieldCheck, Clock, Video, MessageSquare, PhoneCall, Copy, Check, Info, Share2, Play, Volume2, RefreshCw, Wifi, Zap } from "lucide-react";
import PremiumChat from "./PremiumChat";

interface StepLandingProps {
  onNext: () => void;
  onSelectChat: (name: string, image: string, id?: number) => void;
}

interface Profile {
  id: number;
  name: string;
  age: number;
  location: string;
  image: string;
  tags: string[];
}

export default function StepLanding({ onNext, onSelectChat }: StepLandingProps) {
  const [onlineCount, setOnlineCount] = useState(14205);
  const [isAdOpen, setIsAdOpen] = useState(true);
  const [notifyState, setNotifyState] = useState<"idle" | "loading" | "success">("idle");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // Profile Modal State
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem("monersathi_username") || "");
  const [userPhone, setUserPhone] = useState(() => localStorage.getItem("monersathi_user_phone") || "");
  const [profileSaved, setProfileSaved] = useState(false);

  // Fluctuating user counts
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineCount((prev) => {
        const offset = Math.floor(Math.random() * 15) - 7;
        return Math.max(13000, prev + offset);
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Premium Portraits list of 200 unique profiles
  const [profiles, setProfiles] = useState<Profile[]>(() => {
    const pool = [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1513956589380-bad6acb9b9d4?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1548142813-c348350df52b?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1485199692108-c3b5069de6a0?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1514311548104-ae305aac368a?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1496440737103-cd596325d314?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1594744803329-e58b31de215f?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1614283232822-48df790e50ef?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1619380061814-58f03707f082?auto=format&fit=crop&q=80&w=300"
    ];

    const customNames = [
      "অনন্যা", "অদিতি", "অর্পিতা", "অনামিকা", "অবন্তিকা", "অনুষ্কা", "অস্মিতা", "আরোহী", "অহনা", "আদৃতা",
      "আনিকা", "আয়েশা", "আফসানা", "আলিয়া", "আজমেরী", "আতিয়া", "আরিশা", "আজরা", "আমিনা", "আদ্রিতা",
      "আনহা", "আভা", "আরিয়া", "আসমা", "আনোয়ারা", "ইপ্সিতা", "ইশিতা", "ইসরাত", "ইভা", "ইফতি",
      "ইশিকা", "ইরাম", "ইলমা", "ইশরাত", "ইনায়াহ", "ইসমত", "ইতি", "ইশমাম", "ইসমা", "ইলহাম",
      "উর্মি", "উৎসব", "উর্বশী", "উমাইমা", "উম্মে", "উশশী", "উজালা", "উমাইra", "উপমা", "উফাত",
      "ঐশী", "একতা", "এশা", "এলেনা", "এভা", "ঐশ্বর্য", "এলিজা", "এনাম", "এষা", "এয়ানা",
      "ওশিন", "ওহী", "ওলিয়া", "ঔশী", "ওম", "ওশিকা", "ওসিয়া", "ওমিরা", "ওভি", "অয়নিকা",
      "কবিতা", "কথা", "কান্তা", "কুসুম", "কীর্তিকা", "কানিজ", "কায়েস", "কায়নাত", "কারিশমা", "কনক",
      "কিয়া", "কবির", "কামরুন", "কাওসার", "কুন্তলা", "গীতি", "গরিমা", "গুনগুন", "গীতিমা", "গওহর",
      "গার্গী", "গালিব", "গোধূলি", "গোলাপি", "গিনি", "ঘাসফুল", "ঘৃতকুমারী", "ঘনশ্রী", "ঘুড়ি", "ঘ্রাণ",
      "চন্দ্রিমা", "চৈতি", "চিত্রা", "চম্পা", "চেতনা", "চাঁদনী", "চিরশ্রী", "চয়নিকা", "চরমী", "চারু",
      "ছোঁয়া", "ছায়া", "ছন্দা", "ছোয়া", "ছেঁউড়ি", "জান্নাত", "জোহরা", "জুঁই", "জিনিয়া", "জারা",
      "জেবা", "জুলেখা", "জেসিকা", "জয়া", "জেনীফার", "ঝিলিক", "ঝুমকা", "ঝর্ণা", "ঝুমুর", "ঝিনুক",
      "ঝরা", "ঝিঁঝিঁ", "ঝংকার", "ঝিলমিল", "ঝুমকো", "টুম্পা", "টিয়া", "টিনা", "তৃষ্ণা", "তিশা",
      "তানিয়া", "তুলি", "তাসনিয়া", "তামান্না", "তাবাচ্ছুম", "ডালিয়া", "ডেইজি", "দীপা", "দিঘী", "দোলা",
      "তাসফিয়া", "ত্বাহা", "তাহসিন", "তূর", "ত্রিশা", "তনিমা", "তৃপ্তি", "তিতলি", "তরু", "তাজ",
      "থিউরি", "থিয়ো", "থেমিস", "থালিয়া", "থিয়া", "দিশা", "দোয়েল", "দীপ্তি", "দেবশ্রী", "দোলন",
      "দৃষ্টি", "দুলালী", "দিবা", "দাক্ষায়ণী", "দিসা", "ধৃতি", "ধারিত্রী", "ধ্রুবতারা", "ধন্যা", "ধ্রুবা",
      "ধামিনী", "ধী", "ধীরা", "ধ্বনি", "ধারিণী", "নুসরাত", "নিশা", "নদী", "নীলা", "নিধি",
      "নোভা", "নাহিয়ান", "নায়লা", "নওরিন", "নিঝুম", "পূজা", "পপি", "প্রিয়া", "প্রত্যাশা", "প্রাপ্তি"
    ];

    const locations = [
      "ঢাকা", "চট্টগ্রাম", "সিলেট", "খুলনা", "বরিশাল", "রংপুর", "রাজশাহী", "কুমিল্লা", "ময়মনসিংহ", "গাজীপুর",
      "নারায়ণগঞ্জ", "সাভার", "যশোর", "পাবনা", "ফরিদপুর", "কুষ্টিয়া"
    ];

    const tagsPool = [
      ["ভিডিও চ্যাট", "গল্প করা", "গান শোনা"],
      ["আড্ডা", "নতুন বন্ধু", "রোমাঞ্চ"],
      ["কথা বলা", "ফ্রেন্ডশিপ", "ভ্রমণ"],
      ["ভিডিও কল", "গান গাওয়া", "স্মার্ট"],
      ["অনলাইন চ্যাট", "হাসিখুশি", "গল্প করা"],
      ["নতুন আড্ডা", "সঙ্গ লাভ", "মুভি"],
      ["ভিডিও চ্যাট", "রোমান্টিক", "কথা বলা"],
      ["বন্ধুত্ব", "গান শোনা", "খোলা মন"],
      ["ভিডিও আড্ডা", "ভ্রমণ প্রিয়", "আকর্ষণীয়"],
      ["রোমাঞ্চ", "গান গাওয়া", "গল্প করা"],
      ["ফ্রেন্ডশিপ", "হাসিখুশি", "ভিডিও কল"],
      ["ভিডিও চ্যাট", "নতুন বন্ধু", "গল্প বলা"]
    ];

    const firstNames = customNames;
    const lastNames = [
      "আক্তার", "সুলতানা", "বেগম", "ইসলাম", "রহমান", "খাতুন", "চৌধুরী", "শিকদার", "মজুমদার", "ঘোষ",
      "রায়", "দাশ", "নন্দী", "দত্ত", "ধর", "হাসান", "খান", "আমেদ", "কবীর", "দেবী"
    ];

    const generated: Profile[] = [];
    const usedCombinations = new Set<string>();

    for (let i = 0; i < 3050; i++) {
      const idxF = (i * 3 + 7) % firstNames.length;
      const idxL = (i * 7 + 13) % lastNames.length;
      const firstName = firstNames[idxF];
      const lastName = lastNames[idxL];
      
      let fullName = `${firstName} ${lastName}`;
      if (usedCombinations.has(fullName)) {
        const extraIdx = (idxF + idxL + i) % lastNames.length;
        fullName = `${firstName} ${lastNames[extraIdx]} (${5000 + i})`;
      }
      usedCombinations.add(fullName);

      generated.push({
        id: 5000 + i,
        name: fullName,
        age: 18 + ((i * 11 + 5) % 11), // ages between 18 and 28
        location: locations[(i * 19 + 3) % locations.length],
        image: pool[i % pool.length],
        tags: tagsPool[i % tagsPool.length]
      });
    }
    return generated;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const [visibleVideoCount, setVisibleVideoCount] = useState(4);

  // Active navigation tab and Facebook Reels states
  const [currentTab, setCurrentTab] = useState<"বন্ধুরা" | "ভিডিও" | "প্রিমিয়াম">("বন্ধুরা");
  const [likedReels, setLikedReels] = useState<Record<number, boolean>>({});
  const [reelsHeartDiffs, setReelsHeartDiffs] = useState<Record<number, number>>({});

  // ================== FACEBOOK-STYLE REAL-TIME LIVE SYNC SYSTEM ==================
  const [isSyncActive, setIsSyncActive] = useState(true);
  const [lastSyncText, setLastSyncText] = useState("এইমাত্র সিঙ্ক হয়েছে");
  const [syncTimerSeconds, setSyncTimerSeconds] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [liveToast, setLiveToast] = useState<{
    id: number;
    name: string;
    image: string;
    message: string;
    type: "chat" | "join" | "reel";
  } | null>(null);

  // 1. Live Sync timer tick counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncTimerSeconds((prev) => {
        const next = prev + 1;
        if (next < 5) {
          setLastSyncText("এইমাত্র সিঙ্ক হয়েছে");
        } else if (next < 60) {
          setLastSyncText(`${next} সেকেন্ড আগে সিঙ্ক হয়েছে`);
        } else {
          setLastSyncText(`১ মিনিট আগে সিঙ্ক হয়েছে`);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Real-time dynamic updates simulator (Interactions, Likes, Join alerts)
  useEffect(() => {
    if (!isSyncActive) return;

    const interval = setInterval(() => {
      // Fluctuate reels metrics & love bounds to simulate worldwide online user responses
      const randomReelId = 5000 + Math.floor(Math.random() * 40);
      setReelsHeartDiffs(prev => ({
        ...prev,
        [randomReelId]: (prev[randomReelId] || 0) + (Math.random() > 0.45 ? 1 : 0)
      }));
    }, 10000); // Polling 10s

    return () => clearInterval(interval);
  }, [isSyncActive]);

  // Interacted profiles lookup mapping
  const [interactedProfiles, setInteractedProfiles] = useState<Record<number, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem("monersathi_interacted_profile_ids") || "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const data = JSON.parse(localStorage.getItem("monersathi_interacted_profile_ids") || "{}");
        setInteractedProfiles(data);
      } catch (e) {
        console.error("Error reading interacted profiles:", e);
      }
    };
    window.addEventListener("monersathi_interacted_profiles_updated", handleUpdate);
    return () => {
      window.removeEventListener("monersathi_interacted_profiles_updated", handleUpdate);
    };
  }, []);

  const getSortedProfiles = (rawProfiles: Profile[]) => {
    const interacted: Profile[] = [];
    const rest: Profile[] = [];
    
    rawProfiles.forEach((p) => {
      if (interactedProfiles[p.id]) {
        interacted.push(p);
      } else {
        rest.push(p);
      }
    });
    
    // Sort interacted by timestamp descending
    interacted.sort((a, b) => {
      const timeB = interactedProfiles[b.id] || 0;
      const timeA = interactedProfiles[a.id] || 0;
      return timeB - timeA;
    });
    
    return [...interacted, ...rest];
  };

  // Fisher-Yates shuffle algorithm for profiles to alter positions on refresh
  const shuffleRemainingProfiles = () => {
    setProfiles((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
      }
      return arr;
    });
  };

  // Pull-to-refresh Gesture handlers
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = React.useRef<number | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  const handleDragStart = (clientY: number) => {
    if (containerRef.current && containerRef.current.scrollTop === 0 && !isRefreshing) {
      pullStartY.current = clientY;
      setIsPulling(true);
    }
  };

  const handleDragMove = (clientY: number) => {
    if (pullStartY.current === null) return;
    const diff = clientY - pullStartY.current;
    if (diff > 0) {
      const dist = Math.min(diff * 0.45, 100);
      setPullDistance(dist);
    } else {
      setPullDistance(0);
    }
  };

  const handleDragEnd = () => {
    if (pullStartY.current === null) return;
    pullStartY.current = null;
    setIsPulling(false);

    if (pullDistance > 45) {
      triggerManualRefresh();
    } else {
      setPullDistance(0);
    }
  };

  // 3. User manually triggers pull-to-refresh
  const triggerManualRefresh = () => {
    setIsSpinning(true);
    setIsRefreshing(true);
    setPullDistance(0);
    setLastSyncText("রিফ্রেশ করা হচ্ছে...");

    setTimeout(() => {
      setIsSpinning(false);
      setIsRefreshing(false);
      setSyncTimerSeconds(0);
      setLastSyncText("এইমাত্র সিঙ্ক হয়েছে");

      // Shuffle entire profiles (keeping track of chatted ones, which stay first)
      shuffleRemainingProfiles();

      // Slide a dynamic success confirmation banner 
      const randomIdx = Math.floor(Math.random() * 30);
      const randomP = profiles[randomIdx];
      setLiveToast({
        id: randomP.id,
        name: "পদ্ধতি সিঙ্ক সম্পন্ন",
        image: randomP.image,
        type: "join",
        message: "সবাই সচল! মনের সাথীদের তথ্য রিয়েল-টাইমে রিফ্রেশ এবং এলোমেলো করা হয়েছে।"
      });

      // Fluctuate stats
      setOnlineCount((prev) => {
        const offset = Math.floor(Math.random() * 60) - 30;
        return prev + offset;
      });

      setTimeout(() => setLiveToast(null), 3800);

    }, 1200);
  };

  const handleCopyId = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(id)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleNotificationRequest = () => {
    setNotifyState("loading");
    setTimeout(() => {
      setNotifyState("success");
      alert("ধন্যবাদ! আপনি এখন থেকে আমাদের সব আপডেট নোটিফিকেশনে পাবেন।");
    }, 1500);
  };

  const handleSaveProfile = () => {
    if (!userName || !userPhone) {
      alert("দয়া করে নাম এবং নাম্বার দিন!");
      return;
    }
    localStorage.setItem("monersathi_username", userName);
    localStorage.setItem("monersathi_user_phone", userPhone);
    setProfileSaved(true);
    setTimeout(() => {
      setProfileSaved(false);
      setProfileModalOpen(false);
    }, 1200);

    // Silently log activity
    fetch("/api/log-activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: "local",
        action: "গ্রাহক প্রোফাইল তৈরি করেছেন (মনের সাথী)",
        details: { name: userName, phone: userPhone }
      })
    }).catch(console.error);
  };

  const handleTabClick = (tabName: "বন্ধুরা" | "ভিডিও" | "প্রিমিয়াম") => {
    setCurrentTab(tabName);
  };

  // Touch gesture swipe handling to switch tabs (ভিডিও, প্রিমিয়াম, বন্ধুরা) like Facebook app
  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Detect high-momentum horizontal swipes with minimal vertical component
    if (Math.abs(diffX) > 60 && Math.abs(diffY) < 55) {
      const tabs: Array<"বন্ধুরা" | "ভিডিও" | "প্রিমিয়াম"> = ["বন্ধুরা", "ভিডিও", "প্রিমিয়াম"];
      const currentIndex = tabs.indexOf(currentTab);

      if (diffX > 0) {
        // Swiped Left -> Move to Next Tab
        if (currentIndex < tabs.length - 1) {
          handleTabClick(tabs[currentIndex + 1]);
        } else {
          // Wrap or trigger Help chat if swiping left beyond Premium
          onSelectChat("Nusrat Jahan", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300");
        }
      } else {
        // Swiped Right -> Move to Previous Tab
        if (currentIndex > 0) {
          handleTabClick(tabs[currentIndex - 1]);
        }
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="flex flex-col h-screen max-h-screen bg-[#f4f7f6] text-gray-800 rounded-none overflow-hidden select-none relative"
    >
      
      {/* Stick Header & Navigation together so they don't scroll down */}
      <div className="sticky top-0 z-30 bg-white shrink-0 border-b border-gray-100/80 shadow-xs">
        {/* Header Section */}
        <header className="px-4 py-3 flex justify-between items-center bg-white">
          <div className="flex items-center gap-1.5">
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
            <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
              মনের সাথী
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={onNext}
              className="bg-[#e8faf0] text-[#128C7E] border border-[#a3e4c4] p-1.5 rounded-full hover:bg-[#128C7E] hover:text-white transition flex items-center justify-center cursor-pointer"
              title="লগইন করুন"
            >
              <User className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => onSelectChat("Nusrat Jahan", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300")}
              className="bg-blue-50 text-blue-600 border border-blue-200 px-3 py-1 rounded-full text-[10px] font-bold hover:bg-blue-600 hover:text-white transition flex items-center gap-0.5 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>হেল্প</span>
            </button>
          </div>
        </header>

        {/* Navigation Tabs Bar */}
        <nav className="bg-white flex justify-around text-xs font-bold">
          <button 
            onClick={() => handleTabClick("বন্ধুরা")} 
            className={`py-2.5 flex-1 text-center transition ${
              currentTab === "বন্ধুরা" ? "text-pink-500 border-b-2 border-pink-500" : "text-gray-500 hover:text-pink-500"
            }`}
          >
            বন্ধুরা
          </button>
          <button 
            onClick={() => handleTabClick("ভিডিও")} 
            className={`py-2.5 flex-1 text-center transition flex items-center justify-center gap-1.5 ${
              currentTab === "ভিডিও" ? "text-pink-500 border-b-2 border-pink-500" : "text-gray-500 hover:text-pink-500"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            <span>ভিডিও</span>
          </button>
          <button 
            onClick={() => handleTabClick("প্রিমিয়াম")} 
            className={`py-2.5 flex-1 text-center transition ${
              currentTab === "প্রিমিয়াম" ? "text-pink-500 border-b-2 border-pink-500" : "text-gray-500 hover:text-pink-500"
            }`}
          >
            প্রিমিয়াম
          </button>
        </nav>


      </div>

      {/* Floating Facebook style Pull-to-refresh Indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-75"
          style={{ 
            top: `${100 + (isRefreshing ? 15 : pullDistance * 0.75)}px`,
            opacity: isRefreshing ? 1 : Math.min(pullDistance / 35, 1)
          }}
        >
          <div className="bg-white rounded-full p-2.5 w-10 h-10 shadow-lg border border-gray-150 flex items-center justify-center">
            <RefreshCw className={`w-5 h-5 text-pink-500 ${isRefreshing ? "animate-spin" : ""}`} style={{ transform: isRefreshing ? undefined : `rotate(${pullDistance * 4.5}deg)` }} />
          </div>
        </div>
      )}

      {/* Main View Scrollable Container with Swipe & Pull gestures */}
      <div 
        ref={containerRef}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onMouseMove={(e) => {
          if (e.buttons === 1) { // Click and drag
            handleDragMove(e.clientY);
          }
        }}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        className={`flex-grow overflow-y-auto custom-scrollbar transition-all duration-75 ${
          currentTab === "ভিডিও" 
            ? "bg-[#f0f2f5] p-2 pb-10" 
            : currentTab === "বন্ধুরা" 
            ? "bg-[#f0f2f5] p-0" 
            : "p-3 space-y-4 pb-10"
        }`}
        style={{
          transform: (pullDistance > 0 && !isRefreshing) ? `translateY(${pullDistance * 0.4}px)` : undefined
        }}
      >
        
        {currentTab === "ভিডিও" ? (
          /* ================== FACEBOOK REELS LIVE STREAM TAB (1000 PROFILES) ================== */
          <div className="flex flex-col space-y-4 max-w-xl mx-auto select-none">
            {/* Reels list rendering */}
            {(() => {
              const sortedReels = getSortedProfiles(profiles);
              const matchedReels = sortedReels.filter((p) => {
                return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(p.id).includes(searchQuery);
              });
              const displayedReels = matchedReels.slice(0, visibleVideoCount);

              if (displayedReels.length === 0) {
                return (
                  <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 text-slate-550 select-none">
                    <p className="text-xs font-semibold">আপনার খোঁজা নামে কোনো শর্ট রিল পাওয়া যায়নি।</p>
                    <button 
                      onClick={() => {
                        setSearchQuery("");
                        setVisibleVideoCount(4);
                      }}
                      className="mt-3 text-[10px] text-pink-600 font-extrabold border border-pink-100 rounded-full px-4 py-1.5 hover:bg-pink-50 transition"
                    >
                      সব রিলস দেখুন
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {displayedReels.map((profile) => {
                    const isLiked = !!likedReels[profile.id];
                    const customHeartDiff = reelsHeartDiffs[profile.id] || 0;
                    const baseLikesCount = ((profile.id * 13 + 373) % 1000) + 450;
                    const totalLikes = baseLikesCount + customHeartDiff;
                    const viewCountStr = (((profile.id * 7 + 105) % 15) / 10 + 1.2).toFixed(1) + "K";

                    const handleLikeClick = (id: number) => {
                      setLikedReels(prev => {
                        const nextLiked = !prev[id];
                        setReelsHeartDiffs(diffs => ({
                          ...diffs,
                          [id]: (diffs[id] || 0) + (nextLiked ? 1 : -1)
                        }));
                        return { ...prev, [id]: nextLiked };
                      });
                    };

                    return (
                      <div 
                        key={profile.id}
                        className="w-full max-w-[360px] mx-auto aspect-[9/16] bg-slate-900 rounded-[28px] overflow-hidden relative shadow-2xl border border-slate-800 flex flex-col group"
                      >
                        {/* Background Portrait Photo mimicking active video reel stream layout */}
                        <div className="absolute inset-0 z-0 bg-slate-950">
                          <img 
                            src={`/profile/${profile.id}.jpg`}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = profile.image;
                            }}
                            alt={profile.name}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover opacity-90 group-hover:scale-102 transition duration-700" 
                          />
                          {/* Rich bottom-up fade gradient to protect caption legibility */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10" />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent z-10 h-24" />
                        </div>

                        {/* Top progress indicator bar mimicking real video trackers */}
                        <div className="absolute top-2.5 left-4 right-4 z-20 flex gap-1">
                          <div className="h-1 flex-1 bg-pink-500 rounded-full transition-all duration-300"></div>
                          <div className="h-1 flex-1 bg-white/40 rounded-full"></div>
                          <div className="h-1 flex-1 bg-white/40 rounded-full"></div>
                        </div>

                        {/* Top Live header & view count markers */}
                        <div className="absolute top-6 left-4 z-20 flex items-center gap-1.5">
                          <span className="bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded flex items-center gap-0.5 animate-pulse uppercase tracking-widest shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            LIVE
                          </span>
                          <span className="bg-black/40 backdrop-blur-md text-[8px] text-white font-extrabold px-2 py-0.5 rounded-full select-none shadow-xs border border-white/5">
                            👀 {viewCountStr} দেখছেন
                          </span>
                        </div>

                        {/* Sound badge with dynamic simulated voice frequency */}
                        <div className="absolute top-6 right-4 z-20">
                          <button className="p-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-slate-900 transition flex items-center justify-center">
                            <Volume2 className="w-3 h-3 text-white" />
                          </button>
                        </div>

                        {/* Center Screen Play overlays mimicking active video state */}
                        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                          <span className="p-3 bg-black/30 backdrop-blur-lg rounded-full text-white opacity-40 group-hover:opacity-100 transition-all duration-500 transform hover:scale-110 active:scale-95 shadow-md">
                            <Play className="w-5 h-5 fill-white ml-0.5 animate-pulse" />
                          </span>
                        </div>

                        {/* Right Floating Operations Sidebar Menu (Facebook Reels Style) */}
                        <div className="absolute right-3.5 bottom-24 z-20 flex flex-col items-center gap-4">
                          {/* Heart/Like circle element */}
                          <div className="flex flex-col items-center">
                            <button 
                              onClick={() => handleLikeClick(profile.id)}
                              className={`p-3 rounded-full backdrop-blur-md shadow-lg border transition duration-300 active:scale-75 ${
                                isLiked 
                                  ? "bg-red-500 text-white border-red-400" 
                                  : "bg-black/50 text-white border-white/10 hover:bg-black/70"
                              }`}
                            >
                              <Heart className={`w-5 h-5 ${isLiked ? "fill-current scale-110" : ""}`} />
                            </button>
                            <span className="text-[10px] text-white font-black mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-mono">
                              {totalLikes}
                            </span>
                          </div>

                          {/* Chat circular trigger */}
                          <div className="flex flex-col items-center">
                            <button 
                              onClick={() => onSelectChat(profile.name, profile.image, profile.id)}
                              className="p-3 bg-[#25D366] hover:bg-[#1ebd5a] active:scale-75 text-white rounded-full backdrop-blur-md shadow-lg transition"
                            >
                              <MessageSquare className="w-5 h-5 fill-current" />
                            </button>
                            <span className="text-[10px] text-white font-black mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              চ্যাট
                            </span>
                          </div>

                          {/* PhoneCall / Join Room triggers */}
                          <div className="flex flex-col items-center">
                            <button 
                              onClick={() => onSelectChat(profile.name, profile.image, profile.id)}
                              className="p-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 active:scale-75 text-white rounded-full shadow-lg transition"
                            >
                              <PhoneCall className="w-5 h-5" />
                            </button>
                            <span className="text-[10px] text-white font-black mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              কল করুন
                            </span>
                          </div>

                          {/* Copy ID Button shortcut */}
                          <div className="flex flex-col items-center">
                            <button 
                              onClick={(e) => handleCopyId(e, profile.id)}
                              className="p-2.5 bg-black/50 hover:bg-black/70 border border-white/10 text-white rounded-full shadow-lg transition active:scale-75"
                            >
                              {copiedId === profile.id ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-[9px] text-white/90 font-bold mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-mono">
                              ID: {profile.id}
                            </span>
                          </div>

                          {/* Share button mimicking social reels */}
                          <div className="flex flex-col items-center">
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`https://monersathi.live/reel/${profile.id}`);
                                alert("রিল লিংক কপি হয়েছে! আপনার বন্ধুদের সাথে শেয়ার করুন।");
                              }}
                              className="p-2.5 bg-black/50 hover:bg-black/70 border border-white/10 text-white rounded-full shadow-lg transition active:scale-75"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] text-white font-bold mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                              শেয়ার
                            </span>
                          </div>
                        </div>

                        {/* Bottom-Left Overlaid caption text & user card details */}
                        <div className="absolute left-4 bottom-4 right-20 z-20 flex flex-col gap-1.5 text-white text-left selection-none">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <img 
                                src={`/profile/${profile.id}.jpg`}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = profile.image;
                                }}
                                alt={profile.name} 
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="w-8 h-8 rounded-full object-cover border-2 border-green-500 bg-slate-800"
                              />
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border border-black"></span>
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-xs font-black text-white tracking-wide drop-shadow-md">
                                  {profile.name}
                                </h3>
                                <span className="text-[9px] font-black text-amber-400 drop-shadow-md">
                                  ★ {profile.age} বছর
                                </span>
                              </div>
                              <span className="text-[8px] text-pink-300 font-extrabold tracking-tight drop-shadow-sm flex items-center gap-0.5">
                                📍 {profile.location} বিভাগ
                              </span>
                            </div>
                          </div>

                          <p className="text-[10px] text-white/90 font-medium leading-relaxed drop-shadow-sm line-clamp-2 pl-0.5">
                            কথা বলতে চাইলে এখনই নিচে <span className="text-green-400 font-extrabold hover:underline">চ্যাট</span> বা <span className="text-pink-400 font-extrabold hover:underline">কল বাটন</span> চাপুন!
                          </p>

                          {/* Quick pill tags */}
                          <div className="flex flex-wrap gap-1 mt-1 pl-0.5">
                            {profile.tags.map(tag => (
                              <span 
                                key={tag} 
                                className="text-[8px] font-extrabold bg-black/45 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 text-white/95"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>


                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Pagination Load More controller inside Reels Feed */}
            {profiles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(p.id).includes(searchQuery)).length > visibleVideoCount && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setVisibleVideoCount((prev) => prev + 6)}
                  className="bg-white border-2 border-pink-500/20 hover:border-pink-500/50 hover:bg-pink-50/30 text-pink-500 font-extrabold text-xs px-6 py-3.5 rounded-full transition shadow-sm flex items-center gap-2 active:scale-95 cursor-pointer mb-6"
                >
                  <span>📺 আরো ৬ জন মনের সাথীর লাইভ রিলস দেখুন</span>
                  <span className="text-[9px] text-gray-500">({profiles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(p.id).includes(searchQuery)).length - visibleVideoCount}টি বাকি)</span>
                </button>
              </div>
            )}
          </div>
        ) : currentTab === "বন্ধুরা" ? (
          <PremiumChat profiles={getSortedProfiles(profiles)} onNext={onNext} onSelectChat={onSelectChat} />
        ) : (
          /* ================== STANDARD CATALOG OR PREMIUM TAB VIEW ================== */
          <>
            {/* Main catalog listing (Online friends or Premium VIPs) */}
            <div>
              <div className="flex flex-col gap-3.5 mb-4 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">

                {/* Search Input field */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={currentTab === "প্রিমিয়াম" 
                      ? "প্রিমিয়াম সাথী খুঁজুন (যেমন: নুসরাত বা আইডি 5065)..."
                      : "নাম বা আইডি দিয়ে সার্চ করুন (যেমন: নুসরাত বা 5085)..."
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleCount(30); // reset page limit on search
                    }}
                    className="w-full text-xs text-gray-800 border-2 border-gray-500/10 bg-[#f9fafb] p-3 rounded-xl pl-9 outline-none focus:border-pink-500 focus:bg-white transition font-bold"
                  />
                  <span className="absolute left-3 top-3.5 text-gray-400">
                    🔍
                  </span>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-3 text-xs bg-gray-100 hover:bg-gray-200 text-gray-500 px-2 py-1 rounded cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* grid container */}
              {(() => {
                const sorted = getSortedProfiles(profiles);
                const filteredProfiles = sorted.filter((p) => {
                  const matchedSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(p.id).includes(searchQuery);
                  const matchedDistrict = selectedDistrict ? p.location === selectedDistrict : true;
                  return matchedSearch && matchedDistrict;
                });
                const displayed = filteredProfiles.slice(0, visibleCount);

                if (displayed.length === 0) {
                  return (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-xs select-none">
                      <p className="text-gray-500 text-xs font-semibold">আপনার খোঁজা নামে কোনো সচল মনের সাথী পাওয়া যায়নি।</p>
                      <button 
                        onClick={() => { setSearchQuery(""); setSelectedDistrict(""); }}
                        className="mt-3 text-[10px] text-pink-500 font-extrabold border border-pink-200 rounded-full px-4 py-1.5 hover:bg-pink-50 transition pointer-events-auto"
                      >
                        সব প্রোফাইল দেখুন
                      </button>
                    </div>
                  );
                }

                return (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                      {displayed.map((profile) => {
                        const isPremiumTab = currentTab === "প্রিমিয়াম";
                        return (
                          <div 
                            key={profile.id}
                            className={`bg-white rounded-2xl shadow-xs border flex flex-col overflow-hidden transform hover:-translate-y-0.5 transition duration-300 relative ${
                              isPremiumTab ? "border-amber-400 ring-1 ring-amber-300 shadow-md" : "border-gray-100"
                            }`}
                          >
                            {/* Premium overlay badge */}
                            {isPremiumTab && (
                              <div className="absolute top-2.5 left-2.5 z-10 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[8px] px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm border border-amber-300 animate-pulse">
                                <span>👑 VIP PREMIUM</span>
                              </div>
                            )}

                            {/* Image Section */}
                            <div onClick={() => onSelectChat(profile.name, profile.image, profile.id)} className="relative cursor-pointer aspect-square bg-gray-100 group">
                              <img 
                                src={`/profile/${profile.id}.jpg`}
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = profile.image;
                                }}
                                alt={profile.name} 
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                              />
                              <div className="absolute bottom-2.5 right-2.5 bg-green-500 w-3 h-3 rounded-full border-2 border-white shadow-md"></div>
                            </div>

                            {/* Info Text Area */}
                            <div className="p-2 flex-grow flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start gap-1">
                                  <h3 className="text-[11px] font-extrabold text-gray-800 line-clamp-1">
                                    {profile.name} ({profile.age})
                                  </h3>
                                  <span className="text-[8px] font-extrabold text-gray-400 bg-gray-50 px-1 py-0.5 rounded border border-gray-100 whitespace-nowrap">
                                    {profile.location}
                                  </span>
                                </div>
                                
                                {/* Floating responsive ID Tag */}
                                <div 
                                  onClick={(e) => handleCopyId(e, profile.id)}
                                  className="inline-flex items-center gap-1 bg-pink-50 hover:bg-pink-100 text-pink-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded mt-1.5 cursor-pointer transition select-none"
                                >
                                  <span>ID: {profile.id}</span>
                                  {copiedId === profile.id ? (
                                    <Check className="w-2.5 h-2.5 text-green-600" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </div>
                              </div>

                              {/* Call/Message Buttons */}
                              <div className="flex gap-1.5 mt-2.5">
                                <button 
                                  onClick={() => onSelectChat(profile.name, profile.image, profile.id)}
                                  className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-extrabold py-1.5 rounded-lg shadow-sm hover:opacity-90 transition active:scale-95 flex items-center justify-center gap-0.5 focus:outline-none cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>চ্যাট</span>
                                </button>
                                <button 
                                  onClick={() => onSelectChat(profile.name, profile.image, profile.id)}
                                  className={`flex-1 text-white text-[10px] font-extrabold py-1.5 rounded-lg shadow-sm transition active:scale-95 flex items-center justify-center gap-0.5 focus:outline-none cursor-pointer ${
                                    isPremiumTab 
                                      ? "bg-amber-500 hover:bg-amber-600" 
                                      : "bg-slate-950 hover:bg-slate-800"
                                  }`}
                                >
                                  <PhoneCall className="w-3 h-3" />
                                  <span>কল</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Load More Button */}
                    {filteredProfiles.length > visibleCount && (
                      <div className="flex justify-center mt-6">
                        <button
                          onClick={() => setVisibleCount((prev) => prev + 30)}
                          className="bg-white border-2 border-pink-500/20 hover:border-pink-500/50 hover:bg-pink-50/30 text-pink-500 font-extrabold text-xs px-6 py-3 rounded-full transition shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer select-none"
                        >
                          <span>🔍 আরো ৩০ জন মনের সাথী দেখুন</span>
                          <span className="text-[10px] opacity-75 font-bold font-mono">({filteredProfiles.length - visibleCount} বাকি)</span>
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </>
        )}
      </div>

      {/* 🔴 FACEBOOK-STYLE REAL-TIME LIVE TOAST OVERLAY */}
      {liveToast && (
        <div className="absolute bottom-[92px] left-3 right-3 z-40 animate-bounce">
          <div 
            onClick={() => {
              if (liveToast.id && liveToast.name !== "পদ্ধতি সিঙ্ক সম্পন্ন") {
                onSelectChat(liveToast.name, liveToast.image, liveToast.id);
              }
              setLiveToast(null);
            }}
            className="bg-[#111827]/95 backdrop-blur-md text-white rounded-2xl p-3 border border-pink-500/20 shadow-2xl flex items-center gap-3 cursor-pointer transition hover:scale-[1.02] active:scale-98 select-none"
          >
            <div className="relative shrink-0">
              <img 
                src={`/profile/${liveToast.id}.jpg`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = liveToast.image;
                }}
                alt={liveToast.name} 
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full object-cover border-2 border-green-500 bg-slate-800"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border border-slate-900 animate-pulse"></span>
            </div>
            
            <div className="flex-grow text-left">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-pink-400">
                  {liveToast.name}
                </span>
                <span className="text-[8px] bg-sky-600 text-white font-black px-1.5 py-0.5 rounded animate-pulse">
                  রিয়েল-টাইম লাইভ
                </span>
              </div>
              <p className="text-[10px] text-gray-200 font-semibold leading-tight mt-0.5">
                {liveToast.message}
              </p>
            </div>

            <button 
              onClick={(e) => {
                e.stopPropagation();
                setLiveToast(null);
              }}
              className="text-gray-400 hover:text-white p-1 text-xs font-bold shrink-0 cursor-pointer"
              title="বন্ধ করুন"
            >
              ✕
            </button>
          </div>
        </div>
      )}



      {/* User Profile Creator Modal Overlay Card inside the app frame */}
      {profileModalOpen && (
        <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[320px] relative shadow-2xl border border-gray-100 animate-zoom-in">
            <button 
              onClick={() => setProfileModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 font-bold cursor-pointer"
            >
              ✕
            </button>
            <h2 className="text-base font-black text-center text-pink-500 mb-5 flex items-center justify-center gap-1">
              <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
              <span>আপনার প্রোফাইল তৈরি করুন</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 mb-1 pl-1 block uppercase tracking-wider">আপনার নাম</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full text-xs text-gray-800 border-2 border-gray-100 bg-[#f9fafb] rounded-xl p-3 outline-none focus:border-pink-500 transition font-bold" 
                  placeholder="যেমন: রাহুল"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-gray-400 mb-1 pl-1 block uppercase tracking-wider">মোবাইল নাম্বার</label>
                <input 
                  type="tel" 
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  className="w-full text-xs text-gray-800 border-2 border-gray-100 bg-[#f9fafb] rounded-xl p-3 outline-none focus:border-pink-500 transition font-bold" 
                  placeholder="017XX-XXXXXX"
                />
              </div>

              {profileSaved ? (
                <div className="bg-green-50 border border-green-100 text-green-600 text-xs font-bold py-3 text-center rounded-xl flex items-center justify-center gap-1.5 pl-2 select-none">
                  <Check className="w-4 h-4 text-green-600 animate-bounce" />
                  <span>প্রোফাইল সেভ হয়েছে!</span>
                </div>
              ) : (
                <button 
                  onClick={handleSaveProfile}
                  className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold py-3 text-xs rounded-xl shadow-md hover:shadow-pink-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  প্রোফাইল সেভ করুন
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
