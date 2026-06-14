export interface Profile {
  id: number;
  name: string;
  age: number;
  location: string;
  image: string;
  tags: string[];
  status: string;
}

export const featuredProfiles: Profile[] = [
  {
    id: 1,
    name: "তানিয়া",
    age: 21,
    location: "ঢাকা",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
    tags: ["গল্প করা", "গান শোনা", "ভিডিও চ্যাট"],
    status: "🟢 আড্ডার জন্য অনলাইন"
  },
  {
    id: 2,
    name: "রিয়া",
    age: 23,
    location: "চট্টগ্রাম",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
    tags: ["আড্ডা", "নতুন বন্ধু", "রোমাঞ্চ"],
    status: "🔥 এখন লাইভে"
  },
  {
    id: 3,
    name: "সারা",
    age: 20,
    location: "সিলেট",
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=600",
    tags: ["কথা বলা", "ফ্রেন্ডশিপ", "ভ্রমণ"],
    status: "⭐ ভেরিফাইড ইউজার"
  },
  {
    id: 4,
    name: "নেহা",
    age: 22,
    location: "কলকাতা",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600",
    tags: ["ভিডিও কল", "গান গাওয়া", "স্মার্ট"],
    status: "💖 একটিভ আছি"
  }
];
