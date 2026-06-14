import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, PhoneCall, Video, Check, Copy, Heart, ArrowLeft, Send, Star, Volume2, Lock, Shield, Share2 } from "lucide-react";

interface PremiumChatProps {
  onBackToMain?: () => void;
  onNext: () => void;
  onSelectChat?: (name: string, image: string) => void;
  profiles?: any[]; // passed from StepLanding.tsx (1000 friends)
}

interface UnifiedProfile {
  id: number;
  name: string;
  age: number;
  location: string;
  image: string;
  tags: string[];
  followers: string;
  isVip: boolean;
  country: "Bangladesh" | "India";
}

interface Post {
  id: string; // post-${profileId}-${index}
  profileId: number;
  profileName: string;
  profileImage: string;
  type: "photo" | "video";
  mediaUrl: string;
  caption: string;
  initialLikes: number;
  initialComments: {
    id: string;
    userName: string;
    text: string;
    time: string;
  }[];
}

interface PostActiveState {
  likesOffset: number; // +1, 0, or -1 based on user toggle
  likedByUser: boolean;
  userComments: {
    id: string;
    userName: string;
    text: string;
    time: string;
  }[];
}

interface Message {
  id: string;
  text: string;
  type: "sent" | "received" | "system" | "encrypt" | "form";
  containsHTML?: boolean;
}

export default function PremiumChat({ onBackToMain, onNext, onSelectChat, profiles: mainProfiles = [] }: PremiumChatProps) {
  // ==========================================
  // States
  // ==========================================
  const [unifiedProfiles, setUnifiedProfiles] = useState<UnifiedProfile[]>([]);
  const [activeTab, setActiveTab] = useState<"Bangladesh" | "India" | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [visibleProfilesCount, setVisibleProfilesCount] = useState(12);

  // View state: "feed" (Instagram post lists) | "profile" (Facebook scroll down wall list) | "chat" (WhatsApp chat window)
  const [viewMode, setViewState] = useState<"feed" | "profile" | "chat">("feed");
  const [selectedProfile, setSelectedProfile] = useState<UnifiedProfile | null>(null);

  // Dynamic user reactions store (postId -> state offset/user likes/add comments)
  const [postsState, setPostsState] = useState<Record<string, PostActiveState>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // WhatsApp chat fields
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioChecked, setAudioChecked] = useState(false);
  const [videoChecked, setVideoChecked] = useState(false);
  const [isProcessingSelection, setIsProcessingSelection] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const chatAreaRef = useRef<HTMLDivElement | null>(null);

  // ==========================================
  // 2. Load and unify profiles from StepLanding
  // ==========================================
  useEffect(() => {
    // Collect and map 3050 main catalog profiles completely untouched
    const mappedCatalogFriends: UnifiedProfile[] = mainProfiles.map((p: any) => {
      return {
        id: p.id,
        name: p.name,
        age: p.age,
        location: p.location.endsWith(" বিভাগ") ? p.location : p.location + " বিভাগ",
        image: p.image,
        tags: p.tags || ["অনলাইন গল্প", "বন্ধুত্ব", "ভ্রমণ"],
        followers: (((p.id * 17) % 35) + 12).toFixed(1) + "K",
        isVip: p.id % 15 === 0,
        country: "Bangladesh"
      };
    });

    setUnifiedProfiles(mappedCatalogFriends);
  }, [mainProfiles]);

  // Handle scrolling of chatbot
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, viewMode]);

  // ==========================================
  // 3. Instagram-like Posts Generator
  // ==========================================
  const getPostsForProfile = (profile: UnifiedProfile): Post[] => {
    const posts: Post[] = [];
    const isBangle = /[অ-হ]/.test(profile.name); // Check if Bengali character has set names

    // Unsplash secondary photos to show variation
    const imageCatalog = [
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=300"
    ];
    const secondaryImage = imageCatalog[profile.id % imageCatalog.length];

    // Post 1 (Photo category)
    const cap1 = isBangle 
      ? `হ্যালো! আমি ${profile.name} বলছি... 💖 আজকাল খুব একাকীত্ব ফিল করি। মন খুলে কথা বলার মত একজন ভালো মনের বন্ধু খুঁজছি। আপনি কি আমার সাথে গল্প করবেন? আড্ডা ভালোবাসো যারা সরাসরি আমার মেসেজ দিন 🥰`
      : `Looking for a genuine friend to share good times and beautiful conversations! 🥰 Send me a private chat if you're online! 💖`;
    const likes1 = ((profile.id * 11) % 400) + 1200; // e.g. 1.5K likes scale

    posts.push({
      id: `post-${profile.id}-1`,
      profileId: profile.id,
      profileName: profile.name,
      profileImage: profile.image,
      type: "photo",
      mediaUrl: profile.image,
      caption: cap1,
      initialLikes: likes1,
      initialComments: [
        { id: `c-${profile.id}-1-1`, userName: "সজীব চৌধুরী", text: "আপু, তোমাকে অনেক কিউট লাগছে! কথা বলতে চাই।", time: "৫ মিনিট আগে" },
        { id: `c-${profile.id}-1-2`, userName: "ইমরান খান", text: "আমি এখনই পেমেন্ট করে লাইভ রুমে যুক্ত হচ্ছি 🌹", time: "২০ মিনিট আগে" }
      ]
    });

    // Post 2 (Video category)
    const cap2 = isBangle
      ? `আমার একটি সম্পূর্ণ নতুন লাইভ ভিডিও রিল শেয়ার করলাম! 🎬 সবাইকে দেখার এবং লাইক দেয়ার অনুরোধ থাকলো। এখনই আমার সাথে ভিডিও কলে সামনাসামনি কথা বলুন এবং আনন্দ উল্লাস করুন! 📞💖`
      : `Just uploaded my new video highlight! Let's arrange a dedicated private call, waiting in the lobby! 🥰🎬`;
    const likes2 = ((profile.id * 17) % 500) + 750; // around 1.1K

    posts.push({
      id: `post-${profile.id}-2`,
      profileId: profile.id,
      profileName: profile.name,
      profileImage: profile.image,
      type: "video",
      mediaUrl: secondaryImage,
      caption: cap2,
      initialLikes: likes2,
      initialComments: [
        { id: `c-${profile.id}-2-1`, userName: "নাবিল চৌধুরী", text: "ভিডিওর এক্সপ্রেশনগুলো জাস্ট ওয়াও!", time: "১২ মিনিট আগে" },
        { id: `c-${profile.id}-2-2`, userName: "আরিয়ান আহমেদ", text: "আইডি নং ধরে টাকা পে করতেছি, একটু পর কল দিচ্ছি।", time: "১ ঘন্টা আগে" }
      ]
    });

    return posts;
  };

  // Setup active post variables lookup
  const getPostCurrentState = (post: Post) => {
    const dynamic = postsState[post.id] || { likesOffset: 0, likedByUser: false, userComments: [] };
    const totalLikes = post.initialLikes + dynamic.likesOffset;
    const allComments = [...post.initialComments, ...dynamic.userComments];
    return {
      totalLikes,
      likedByUser: dynamic.likedByUser,
      comments: allComments,
      commentsCount: allComments.length
    };
  };

  // ==========================================
  // 4. Reactions & Comments Operations
  // ==========================================
  const handleLikePost = (postId: string) => {
    setPostsState((prev) => {
      const current = prev[postId] || { likesOffset: 0, likedByUser: false, userComments: [] };
      const nextLiked = !current.likedByUser;
      const nextOffset = current.likesOffset + (nextLiked ? 1 : -1);
      return {
        ...prev,
        [postId]: {
          ...current,
          likedByUser: nextLiked,
          likesOffset: nextOffset
        }
      };
    });
  };

  const handlePostComment = (postId: string) => {
    const text = commentDrafts[postId] || "";
    if (!text.trim()) return;

    const savedUser = localStorage.getItem("monersathi_username") || "গ্রাহক";
    const newComment = {
      id: `user-comment-${Date.now()}`,
      userName: savedUser,
      text: text.trim(),
      time: "এইমাত্র"
    };

    setPostsState((prev) => {
      const current = prev[postId] || { likesOffset: 0, likedByUser: false, userComments: [] };
      return {
        ...prev,
        [postId]: {
          ...current,
          userComments: [...current.userComments, newComment]
        }
      };
    });

    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
  };

  // Handles copying of unique user IDs
  const handleCopyIdValue = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    navigator.clipboard.writeText(String(id)).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  // ==========================================
  // 5. WhatsApp-themed Automations
  // ==========================================
  const handleOpenChatScreen = (profile: UnifiedProfile) => {
    setSelectedProfile(profile);
    setViewState("chat");
    setAudioChecked(false);
    setVideoChecked(false);
    setIsProcessingSelection(false);

    setMessages([
      { id: "sys-today", text: "Today", type: "system" },
      { id: "sys-encrypt", text: "Messages and calls are end-to-end encrypted.", type: "encrypt" }
    ]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `welcome-${Date.now()}`,
          text: `হ্যালো! আমি <b>${profile.name}</b> বলছি। মনের সাথী মেম্বারশিপে আপনাকে স্বাগতম! 💖`,
          type: "received",
          containsHTML: true
        }
      ]);
    }, 450);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `form-${Date.now()}`, text: "", type: "form" }
      ]);
    }, 1100);
  };

  const processServiceRates = () => {
    if (!audioChecked && !videoChecked) {
      alert("দয়া করে অত্যন্ত একটি টাইপ সিলেক্ট করুন।");
      return;
    }

    setIsProcessingSelection(true);

    setTimeout(() => {
      let ratesText = "<b>সার্ভিস রেট এবং বিস্তারিত আলোচনা:</b><br><br>";

      if (audioChecked) {
        ratesText += `<b>🎧 অডিও রিয়েল কল সার্ভিস:</b><br>
        • ১০ মিনিট ১০০ টাকা<br>
        • ২০ মিনিট ১৫০ টাকা<br>
        • ৩০ মিনিট ২০০ টাকা<br>
        • ১ ঘন্টা ৫০০ টাকা<br><br>`;
      }

      if (videoChecked) {
        ratesText += `<b>📹 ভিডিও রিয়েল কল সার্ভিস:</b><br>
        • ১০ মিনিট ২১০ টাকা<br>
        • ৩০ মিনিট ৫১০ টাকা<br>
        • ১ ঘন্টা ১০২০ টাকা<br><br>`;
      }

      ratesText += `পেমেন্ট করতে পছন্দের মানুষটির আইডি <b>(${selectedProfile?.id})</b> ব্যবহার করে পেমেন্ট বাটনে ক্লিক করে টাকা পরিশোধ করুন!<br><br>
      <i>১০০% ভেরিফাইড সাথী। পেমেন্ট সম্পন্ন হলে ১ মিনিটে চ্যাট ও কল লাইন ওপেন হবে। ধন্যবাদ! 🌹</i>`;

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.type !== "form");
        return [
          ...filtered,
          {
            id: `rate-reply-${Date.now()}`,
            text: ratesText,
            type: "received",
            containsHTML: true
          }
        ];
      });
      setIsProcessingSelection(false);
    }, 850);
  };

  // ==========================================
  // 6. Profiles & Posts Filters
  // ==========================================
  const filteredProfiles = unifiedProfiles.filter((p) => {
    // Search filter
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || String(p.id).includes(searchQuery);
    return matchesSearch;
  });

  // Slice profile data for high performance feed
  const visibleSubset = filteredProfiles.slice(0, visibleProfilesCount);

  return (
    <div className="w-full h-full flex flex-col relative bg-[#f0f2f5] selection:bg-pink-500 selection:text-white">

      {/* ==================== 1. FEED INSTAGRAM STYLE PAGE ==================== */}
      {viewMode === "feed" && (
        <div className="flex flex-col h-full overflow-hidden text-slate-800">
          
          {/* Compact Top Header with Search Icon on the Right Corner */}
          <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-200 z-10 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#00a884] animate-pulse"></span>
              <span className="text-[13px] font-black tracking-wider text-gray-850">
                বন্ধুরা ফিড
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {isSearchOpen && (
                <div className="relative flex items-center animate-fade-in">
                  <input 
                    type="text" 
                    placeholder="সার্চ..."
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleProfilesCount(12);
                    }}
                    className="text-[11px] text-gray-800 border border-gray-300 bg-white py-1 px-2.5 rounded-lg outline-none w-28 md:w-40 focus:border-pink-500 transition"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 text-[10px] text-gray-400 font-bold hover:text-gray-850"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
              <button 
                onClick={() => setIsSearchOpen(prev => !prev)}
                className="p-1.5 hover:bg-black/5 active:scale-90 transition rounded-full text-gray-500 hover:text-gray-800"
                title="সার্চ করুন"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                </svg>
              </button>
            </div>
          </div>

          {/* Scrollable List Feed of Posts */}
          <div className="flex-grow overflow-y-auto p-3 space-y-4 pb-12">
            {visibleSubset.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-gray-200 text-gray-500">
                <p className="text-xs font-semibold">আপনার খোঁজা নামে কোনো সচল সাথীর পোস্ট পাওয়া যায়নি।</p>
                <button 
                  onClick={() => setSearchQuery("")}
                  className="mt-3 text-[10px] text-pink-600 font-black border border-pink-200 rounded-full px-4 py-1.5 hover:bg-pink-50 transition"
                >
                  সব পোস্ট ফিড দেখুন
                </button>
              </div>
            ) : (
              visibleSubset.map((profile) => {
                const posts = getPostsForProfile(profile);

                return (
                  <div key={profile.id} className="space-y-4">
                    {posts.map((post) => {
                      const { totalLikes, likedByUser, comments, commentsCount } = getPostCurrentState(post);
                      const isCommentsOpen = !!expandedComments[post.id];
                      const commentText = commentDrafts[post.id] || "";

                      return (
                        <article 
                          key={post.id}
                          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs max-w-md mx-auto"
                        >
                          {/* Post Card Header */}
                          <div className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {/* Avatar Click View Trigger */}
                              <div 
                                onClick={() => {
                                  setSelectedProfile(profile);
                                  setViewState("profile");
                                }}
                                className="relative cursor-pointer group active:scale-95 transition"
                                title="প্রোফাইল দেখতে ক্লিক করুন"
                              >
                                <img 
                                  src={`/profile/${profile.id}.jpg`}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null;
                                    e.currentTarget.src = profile.image;
                                  }}
                                  alt={profile.name} 
                                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-400 bg-gray-150"
                                  referrerPolicy="no-referrer"
                                />
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></span>
                              </div>
                              
                              <div className="text-left">
                                <div className="flex items-center gap-1.5">
                                  <span 
                                    onClick={() => {
                                      setSelectedProfile(profile);
                                      setViewState("profile");
                                    }}
                                    className="text-[13px] font-extrabold text-slate-900 hover:text-pink-600 hover:underline cursor-pointer"
                                  >
                                    {profile.name}
                                  </span>
                                  <span className="text-[9px] bg-red-500 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-tighter">
                                    {profile.isVip ? "👑 VIP" : "ভেরিফাইড বন্ধু"}
                                  </span>
                                </div>
                                <span className="text-[9px] text-[#00a884] font-bold flex items-center gap-0.5">
                                  📍 {profile.location} • {profile.age} বছর • {profile.followers} ফলোয়ারস
                                </span>
                              </div>
                            </div>

                            {/* Options ID Trigger */}
                            <div 
                              onClick={(e) => handleCopyIdValue(e, profile.id)}
                              className="bg-[#f0f2f5] hover:bg-[#e1e2e5] border border-gray-200 text-pink-600 text-[10px] font-mono px-2 py-1 rounded-lg cursor-pointer transition select-none"
                            >
                              {copiedId === profile.id ? "Copied!" : `ID: ${profile.id}`}
                            </div>
                          </div>

                          {/* Post Caption Details */}
                          <div className="px-3 pb-2 text-left">
                            <p className="text-[11.5px] text-gray-850 leading-relaxed font-semibold">
                              {post.caption}
                            </p>
                          </div>

                          {/* Media Block representing photo or video */}
                          <div className="aspect-square bg-slate-950 relative overflow-hidden group border-y border-gray-100">
                            <img 
                              src={post.mediaUrl} 
                              alt="Post contents" 
                              className="w-full h-full object-cover group-hover:scale-102 transition duration-700"
                              referrerPolicy="no-referrer"
                            />

                            {/* Gradient overlays */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                            {post.type === "video" && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 uppercase tracking-widest animate-pulse absolute top-3 left-3 shadow shadow-red-500/20">
                                  <Volume2 className="w-2.5 h-2.5" />
                                  ভিডিও পোস্ট
                                </span>
                                <button 
                                  onClick={() => handleOpenChatScreen(profile)}
                                  className="p-4 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 shadow-lg active:scale-95 transition"
                                >
                                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current text-white ml-0.5" width="24" height="24">
                                    <path d="M8 5v14l11-7z"></path>
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Social Actions Buttons Bar */}
                          <div className="p-2 flex items-center justify-between text-xs border-b border-gray-100 select-none bg-[#f8f9fa]">
                            {/* Like Option */}
                            <button 
                              onClick={() => handleLikePost(post.id)}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all active:scale-90 ${
                                likedByUser ? "text-red-500 bg-red-50 font-bold" : "text-gray-650 hover:bg-gray-150"
                              }`}
                            >
                              <Heart className={`w-4 h-4 ${likedByUser ? "fill-red-500" : ""}`} />
                              <span>{totalLikes.toLocaleString()} লাইক</span>
                            </button>

                            {/* Comment Option */}
                            <button 
                              onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                                isCommentsOpen ? "text-[#00a884] bg-emerald-50 font-bold" : "text-gray-650 hover:bg-gray-150"
                              }`}
                            >
                              <MessageSquare className="w-4 h-4" />
                              <span>{commentsCount} কমেন্ট</span>
                            </button>

                            {/* Direct WhatsApp Call options */}
                            <button 
                              onClick={() => handleOpenChatScreen(profile)}
                              className="flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-white px-2.5 py-1.5 rounded-full font-bold text-[10px] shadow active:scale-95 transition-all"
                            >
                              <MessageSquare className="w-3.5 h-3.5 fill-current" />
                              <span>চ্যাট করুন</span>
                            </button>
                          </div>

                          {/* Comment Expand section */}
                          {isCommentsOpen && (
                            <div className="bg-slate-50 p-3 text-left space-y-2 border-t border-gray-200">
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1.5">
                                মন্তব্যসমূহ ({commentsCount}টি)
                              </p>

                              {/* Comment items stack */}
                              <div className="space-y-2 bg-white border border-gray-100 p-2 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
                                {comments.map((comm) => (
                                  <div key={comm.id} className="text-[11px] leading-relaxed border-b border-gray-100 pb-1.5 last:border-0 last:pb-0">
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="font-extrabold text-pink-600">{comm.userName}</span>
                                      <span className="text-[9px] text-gray-400">{comm.time}</span>
                                    </div>
                                    <p className="text-gray-700 mt-0.5 font-medium">{comm.text}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Write custom comment bar */}
                              <div className="flex gap-2.5 items-center mt-2 pt-1 border-t border-gray-200">
                                <input 
                                  type="text" 
                                  placeholder="আপনার মিষ্টি মন্তব্যটি লিখুন..."
                                  value={commentText}
                                  onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handlePostComment(post.id);
                                    }
                                  }}
                                  className="flex-grow text-[11px] text-gray-800 bg-white border border-gray-300 rounded-lg p-2 outline-none focus:border-[#00a884] font-semibold"
                                />
                                <button 
                                  onClick={() => handlePostComment(post.id)}
                                  className="bg-[#00a884] hover:bg-[#008f6f] text-white p-2 rounded-lg transition active:scale-95 shrink-0"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          )}

                        </article>
                      );
                    })}
                  </div>
                );
              })
            )}

            {/* Pagination Button for the main list database */}
            {filteredProfiles.length > visibleProfilesCount && (
              <div className="flex justify-center pt-2">
                <button 
                  onClick={() => setVisibleProfilesCount(prev => prev + 12)}
                  className="bg-[#00a884] hover:bg-[#008f6f] text-white font-black text-xs px-6 py-3 rounded-full transition-all active:scale-95 cursor-pointer shadow-lg inline-flex items-center gap-1 mb-8"
                >
                  <span>আরো সাথী ও বন্ধুদের নতুন পোস্ট লোড করুন</span>
                  <span className="text-[10px] text-white/90">({filteredProfiles.length - visibleProfilesCount}টি প্রোফাইল বাকি)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. DETAILED PROFILE WALL VIEW (FACEBOOK STYLE SCROLL WALL) ==================== */}
      {viewMode === "profile" && selectedProfile && (
        <div className="flex flex-col h-full overflow-hidden text-slate-800 bg-[#f0f2f5]">
          
          {/* Back top bar header */}
          <div className="bg-white px-3 py-2 border-b border-gray-200 shrink-0 flex items-center justify-between z-10">
            <button 
              onClick={() => setViewState("feed")}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-black capitalize font-extrabold active:scale-95 transition"
            >
              <ArrowLeft className="w-4 h-4 text-pink-600" />
              <span>ইনস্টাগ্রাম ফিডে ফিরুন</span>
            </button>
            <span className="text-[11px] text-[#00a884] font-extrabold flex items-center gap-1 bg-gray-100 px-2.5 py-0.5 rounded-full">
              ID: {selectedProfile.id}
            </span>
          </div>

          {/* Facebook Wall Profile Container scroll down list */}
          <div className="flex-grow overflow-y-auto p-4 space-y-4 pb-12 custom-scrollbar">
            
            {/* Elegant Hero card header */}
            <header className="bg-white rounded-2xl border border-gray-200 p-4 text-center space-y-3 relative shadow-sm">
              
              {/* Premium absolute tags */}
              <div className="absolute top-3 left-3 bg-amber-50 border border-amber-200 text-amber-700 text-[8px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-0.5">
                <span>👑 PREMIUM</span>
              </div>

              {/* Cover-looking photo/top portion */}
              <div className="pt-2 flex flex-col items-center">
                <div className="relative">
                  <img 
                    src={`/profile/${selectedProfile.id}.jpg`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = selectedProfile.image;
                    }}
                    alt={selectedProfile.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-amber-300 shadow-xl bg-white" 
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-500 border-4 border-white"></span>
                </div>
              </div>

              {/* Profile identity info */}
              <div className="text-center space-y-1">
                <h2 className="text-lg font-black flex items-center justify-center gap-1 text-slate-900">
                  <span>{selectedProfile.name}</span>
                  <span className="text-xs text-pink-650">({selectedProfile.age} বছর)</span>
                </h2>
                
                <p className="text-xs text-gray-500 font-extrabold flex items-center justify-center gap-1">
                  <span>📍 {selectedProfile.location}</span>
                  <span>•</span>
                  <span className="text-[#00a884]">{selectedProfile.followers} ফলোয়ারস</span>
                </p>

                <p className="text-[11px] text-gray-600 font-semibold max-w-sm mx-auto pt-1 leading-relaxed">
                  "মনের সাথী নিশ্চিত ভেরিফাইড ভিআইপি মেম্বার। অবসর সময়ে গান গাইতে, আড্ডা দিতে এবং নতুন মানুষের সাথে ভিডিও চ্যাটে সময় কাটাতে ভালোবাসি। 💖"
                </p>
              </div>

              {/* Sub Tags pill items */}
              <div className="flex flex-wrap gap-1.5 justify-center pt-1.5">
                {selectedProfile.tags.map((tag) => (
                  <span key={tag} className="bg-gray-100 border border-gray-200 text-[9px] font-bold px-2 py-0.5 rounded-full text-gray-650">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Quick interactive calls trigger */}
              <div className="grid grid-cols-2 gap-3.5 pt-3">
                <button
                  onClick={() => handleOpenChatScreen(selectedProfile)}
                  className="bg-[#25D366] hover:bg-[#20ba5a] text-white py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow transition active:scale-95"
                >
                  <MessageSquare className="w-4 h-4 fill-current text-white" />
                  <span>চ্যাট মেসেজ</span>
                </button>
                <button
                  onClick={() => handleOpenChatScreen(selectedProfile)}
                  className="bg-gradient-to-r from-pink-500 to-rose-500 text-white py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 shadow transition active:scale-95"
                >
                  <Video className="w-4 h-4" />
                  <span>ভিডিও কল করুন</span>
                </button>
              </div>

            </header>

            {/* Profile timeline posts title banner */}
            <div className="border-b border-gray-200 pb-1 flex justify-between items-center px-1">
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider">
                সব পোস্ট ({getPostsForProfile(selectedProfile).length}টি আপলোড করা)
              </span>
              <span className="text-[10px] text-[#00a884] font-extrabold">
                সক্রিয় ফিড • ফেসবুক লাইভ
              </span>
            </div>

            {/* Timeless Wall Scrollable list */}
            {getPostsForProfile(selectedProfile).map((post) => {
              const { totalLikes, likedByUser, comments, commentsCount } = getPostCurrentState(post);
              const isCommentsOpen = !!expandedComments[post.id];
              const commentText = commentDrafts[post.id] || "";

              return (
                <article 
                  key={post.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs max-w-md mx-auto"
                >
                  {/* Card Header inside Wall */}
                  <div className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={`/profile/${selectedProfile.id}.jpg`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = selectedProfile.image;
                        }}
                        alt={selectedProfile.name} 
                        className="w-8 h-8 rounded-full object-cover border border-amber-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-left">
                        <span className="text-[12px] font-black text-slate-900">{selectedProfile.name}</span>
                        <div className="text-[8px] text-gray-500">এইমাত্র আপডেট করা হয়েছে</div>
                      </div>
                    </div>
                    <span className="bg-red-500/10 border border-red-500/30 text-rose-550 text-[8px] font-black px-2 py-0.5 rounded-full">
                      🔥 ভেরিভাইড পোস্ট
                    </span>
                  </div>

                  {/* Caption */}
                  <div className="px-3 pb-2 text-left">
                    <p className="text-[11px] text-gray-850 font-semibold">
                      {post.caption}
                    </p>
                  </div>

                  {/* Media Frame */}
                  <div className="aspect-video bg-black/5 relative overflow-hidden group">
                    <img 
                      src={post.mediaUrl} 
                      alt="Wall post media description"
                      className="w-full h-full object-cover group-hover:scale-101 transition duration-500" 
                      referrerPolicy="no-referrer"
                    />
                    
                    {post.type === "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                        <Volume2 className="absolute top-2 right-2 w-3.5 h-3.5 text-white/80" />
                        <button 
                          onClick={() => handleOpenChatScreen(selectedProfile)}
                          className="p-3.5 bg-rose-600 rounded-full text-white shadow-lg shadow-rose-600/20 active:scale-95 transition"
                        >
                          <Video className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Reaction Buttons */}
                  <div className="p-1.5 flex items-center justify-between text-xs border-b border-gray-100 select-none bg-[#f8f9fa]">
                    <button 
                      onClick={() => handleLikePost(post.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                        likedByUser ? "text-red-500 bg-red-50 font-bold" : "text-gray-650 hover:bg-gray-150"
                      }`}
                    >
                      <Heart className="w-4 h-4" />
                      <span>{totalLikes.toLocaleString()} Likes</span>
                    </button>

                    <button 
                      onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all ${
                        isCommentsOpen ? "text-[#00a884] bg-emerald-50 font-bold" : "text-gray-650 hover:bg-gray-150"
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{commentsCount} কমেন্ট</span>
                    </button>

                    <button 
                      onClick={() => handleOpenChatScreen(selectedProfile)}
                      className="flex items-center gap-1 bg-[#25D366] text-white px-2.5 py-1 rounded-full font-bold text-[9px] shadow"
                    >
                      <span>চ্যাট</span>
                    </button>
                  </div>

                  {/* Comments Box details */}
                  {isCommentsOpen && (
                    <div className="bg-slate-50 p-3 text-left space-y-2 border-t border-gray-150">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                        মন্তব্যসমূহ ({commentsCount}টি)
                      </p>

                      <div className="space-y-1.5 bg-white border border-gray-100 p-2 rounded-xl max-h-40 overflow-y-auto custom-scrollbar">
                        {comments.map((comm) => (
                          <div key={comm.id} className="text-[11px] leading-relaxed border-b border-gray-100 pb-1.5 last:border-0 last:pb-0">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-extrabold text-pink-600">{comm.userName}</span>
                              <span className="text-[9px] text-gray-400">{comm.time}</span>
                            </div>
                            <p className="text-gray-700 mt-0.5 font-medium">{comm.text}</p>
                          </div>
                        ))}
                      </div>

                      {/* Write custom comment bar */}
                      <div className="flex gap-2 items-center pt-1 border-t border-gray-200">
                        <input 
                          type="text" 
                          placeholder="মন্তব্য লিখুন..."
                          value={commentText}
                          onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handlePostComment(post.id);
                            }
                          }}
                          className="flex-grow text-[11px] text-gray-800 bg-white border border-gray-300 rounded-lg p-2 outline-none focus:border-[#00a884] font-semibold"
                        />
                        <button 
                          onClick={() => handlePostComment(post.id)}
                          className="bg-[#00a884] text-white p-2 rounded-lg transition active:scale-95"
                        >
                          <Send className="w-3" />
                        </button>
                      </div>
                    </div>
                  )}

                </article>
              );
            })}

          </div>
        </div>
      )}

      {/* ==================== 3. ACTIVE IMMERSIVE WHATSAPP BOT CHAT ==================== */}
      {viewMode === "chat" && selectedProfile && (
        <div className="flex flex-col h-full bg-[#efeae2] text-slate-800">
          
          {/* WhatsApp Header */}
          <header className="bg-white px-3 py-2 flex justify-between items-center h-[60px] shrink-0 z-10 shadow-sm border-b border-gray-100">
            <div 
              onClick={() => {
                // Return to profile wall if we came there, else feed
                setViewState("profile");
              }}
              className="flex items-center gap-2 flex-1 overflow-hidden cursor-pointer"
            >
              <div className="p-1 cursor-pointer hover:bg-slate-100 rounded-full text-slate-600">
                <svg viewBox="0 0 24 24" width="22" height="22" className="fill-current text-slate-500">
                  <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
                </svg>
              </div>

              <img 
                src={`/profile/${selectedProfile.id}.jpg`}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = selectedProfile.image;
                }}
                alt={selectedProfile.name} 
                className="w-10 h-10 rounded-full object-cover border border-[#00a884] shrink-0"
                referrerPolicy="no-referrer"
              />

              <div className="text-left overflow-hidden">
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  {selectedProfile.name}
                </h4>
                <p className="text-[9px] text-[#00a884] font-black tracking-wide">
                  Premium &bull; Online
                </p>
              </div>
            </div>

            {/* Standard WhatsApp Call pending alerts */}
            <div className="flex items-center gap-4 shrink-0 pl-1">
              <button onClick={() => setShowToast(true)} className="text-slate-500 hover:text-emerald-600 active:scale-90 transition pr-0.5">
                <Video className="w-5 h-5 text-[#54656f]" />
              </button>
              <button onClick={() => setShowToast(true)} className="text-slate-500 hover:text-emerald-600 active:scale-90 transition pr-0.5">
                <PhoneCall className="w-4 h-4 text-[#54656f]" />
              </button>
            </div>
          </header>

          {/* Chat canvas messages container */}
          <main
            ref={chatAreaRef}
            className="flex-grow p-4 overflow-y-auto flex flex-col gap-2.5 bg-cover bg-center select-none"
            style={{ 
              backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
              backgroundColor: "#efeae2"
            }}
          >
            {messages.map((m) => {
              if (m.type === "system") {
                return (
                  <div key={m.id} className="text-center my-1.5 flex justify-center">
                    <span className="bg-white text-[10px] text-gray-500 px-3 py-1 rounded shadow-xs font-bold border border-gray-100">
                      {m.text}
                    </span>
                  </div>
                );
              }

              if (m.type === "encrypt") {
                return (
                  <div key={m.id} className="bg-[#ffeecd] border border-amber-200/40 text-[#54656f] text-[10.5px] p-2.5 rounded-lg text-center leading-normal max-w-[90%] mx-auto flex items-start gap-1 justify-center shadow-xs">
                    <svg viewBox="0 0 24 24" width="11" height="11" className="fill-[#54656f] mt-0.5 shrink-0">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM9 6c0-1.66 1.34-3 3-3s3 1.34 3 3v2H9V6zm9 14H6V10h12v10zm-6-3c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z"/>
                    </svg>
                    <span>{m.text}</span>
                  </div>
                );
              }

              if (m.type === "form") {
                return (
                  <div key={m.id} className="self-start max-w-[85%] bg-white rounded-lg rounded-tl-none p-3.5 shadow-sm text-left leading-relaxed text-slate-800 animate-fade-in border border-emerald-500/10">
                    <span className="font-extrabold text-[12px] block mb-2 text-[#00a884]">
                      জান্নাতী সাথী আড্ডার জন্য টিক দিন:
                    </span>
                    <div className="bg-slate-50 border border-gray-200/60 p-2.5 rounded-xl space-y-2 mt-2">
                      <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                        <input 
                          type="checkbox"
                          checked={audioChecked}
                          onChange={(e) => setAudioChecked(e.target.checked)}
                          className="w-4 h-4 accent-[#00a884] cursor-pointer"
                        />
                        <span className="text-[12.5px] font-bold text-slate-700">🎧 Audio Call</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                        <input 
                          type="checkbox"
                          checked={videoChecked}
                          onChange={(e) => setVideoChecked(e.target.checked)}
                          className="w-4 h-4 accent-[#00a884] cursor-pointer"
                        />
                        <span className="text-[12.5px] font-bold text-slate-700">📹 Video Call</span>
                      </label>
                      <button 
                        onClick={processServiceRates}
                        disabled={isProcessingSelection}
                        className="w-full bg-[#00a884] text-white text-[11.5px] font-bold py-2 rounded-lg mt-1 hover:bg-[#008f6f] active:scale-98 transition shadow"
                      >
                        {isProcessingSelection ? "Processing..." : "পরবর্তী ধাপ"}
                      </button>
                    </div>
                  </div>
                );
              }

              const isSent = m.type === "sent";
              return (
                <div 
                  key={m.id} 
                  className={`max-w-[85%] flex flex-col rounded-lg p-2.5 text-xs text-left shadow-xs ${
                    isSent 
                      ? "self-end bg-[#d9fdd3] rounded-tr-none text-slate-900 border border-emerald-100" 
                      : "self-start bg-white rounded-tl-none text-slate-950 border border-gray-100"
                  }`}
                >
                  {m.containsHTML ? (
                    <div dangerouslySetInnerHTML={{ __html: m.text }} className="leading-snug space-y-1 text-[12.5px]" />
                  ) : (
                    <p className="leading-snug text-[12.5px] font-semibold">{m.text}</p>
                  )}
                </div>
              );
            })}
          </main>

          {/* Footer Voice/Message trigger bar */}
          <footer className="p-2.5 bg-slate-100 flex items-center gap-2.5 shrink-0 z-10 border-t border-gray-200">
            <div className="flex-grow bg-white rounded-full flex items-center px-4 py-1 border border-gray-200 shadow-xs min-h-[44px]">
              <input
                type="text"
                placeholder="একটি বার্তা লিখুন..."
                readOnly
                onClick={() => setShowToast(true)}
                className="flex-1 border-none outline-none font-bold text-gray-500 bg-transparent text-xs py-1 cursor-pointer"
              />
            </div>
            
            <button
              onClick={() => setShowToast(true)}
              className="bg-[#00a884] text-white p-3 rounded-full shadow-md shrink-0 focus:outline-none"
            >
              <Send className="w-4 h-4" />
            </button>
          </footer>

        </div>
      )}

      {/* ==================== GLOBAL PAYMENT TOAST POPUP OVERLAY ==================== */}
      {showToast && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 select-none">
          <div className="bg-white rounded-2xl p-6 w-full max-w-[340px] text-center shadow-2xl border border-gray-100 animate-zoom-in">
            <div className="w-[60px] h-[60px] bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <svg viewBox="0 0 24 24" width="30" height="30" className="fill-red-600">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
              </svg>
            </div>

            <h3 className="text-[17px] font-black text-slate-900 mb-2">
              পেমেন্ট পেন্ডিং!
            </h3>
            
            <p className="text-[12.5px] text-gray-500 font-semibold leading-relaxed mb-6">
              ভিআইপি প্রিমিয়াম সাথী ও বন্ধুদের সাথে সম্পূর্ণ আনলিমিটেড আলাপ করার জন্য পেমেন্ট নিশ্চিত করুন।
            </p>

            <button
              onClick={() => {
                setShowToast(false);
                onNext(); // Navigate to payments
              }}
              className="w-full bg-[#00a884] text-white font-extrabold text-sm py-3 rounded-xl hover:bg-[#008f6f] transition shadow-md focus:outline-none"
            >
              পেমেন্ট নিশ্চিত করুন
            </button>
            
            <button
              onClick={() => setShowToast(false)}
              className="w-full mt-2 text-xs font-bold text-gray-400 py-1.5 focus:outline-none"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
