import React, { useState, useRef, useEffect } from "react";
import { countries, Country } from "../data/countries";
import { ChevronLeft, Search, Check, CircleAlert } from "lucide-react";

interface StepPhoneInputProps {
  onBack: () => void;
  onContinue: (countryCode: string, phoneNumber: string) => void;
}

export default function StepPhoneInput({ onBack, onContinue }: StepPhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "+880") || countries[0]
  );
  
  const [customCountryCode, setCustomCountryCode] = useState("+880");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorText, setErrorText] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.includes(searchQuery)
  );

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setCustomCountryCode(country.code);
    setIsOpen(false);
    setErrorText("");
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.trim();
    if (value && !value.startsWith("+")) {
      value = "+" + value;
    }
    setCustomCountryCode(value);
    
    // Look for match
    const match = countries.find((c) => c.code === value);
    if (match) {
      setSelectedCountry(match);
    } else {
      setSelectedCountry({ name: "Custom", code: value, flag: "🌐" });
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorText("");
    // strip non-numeric
    const clean = e.target.value.replace(/[^0-9]/g, "");
    setPhoneNumber(clean);
  };

  const handleSubmit = () => {
    if (!phoneNumber) {
      setErrorText("অনুগ্রহ করে আপনার হোয়াটসঅ্যাপ নম্বরটি দিন।");
      return;
    }
    if (phoneNumber.length < 8) {
      setErrorText("অনুগ্রহ করে সঠিক নম্বরটি প্রবেশ করান (অন্তত ৮ সংখ্যা)।");
      return;
    }
    onContinue(customCountryCode, phoneNumber);
  };

  return (
    <div className="flex flex-col justify-between h-full flex-grow">
      <div>
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white py-1 px-3 -ml-3 rounded-full hover:bg-white/5 mb-4 text-sm transition-all focus:outline-none"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>ফিরে যান</span>
        </button>

        <h2 className="text-2xl font-bold mb-2">WhatsApp নম্বর দিয়ে যুক্ত হোন</h2>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Baileys মাল্টি-ডিভাইস প্রোটোকলের মাধ্যমে WhatsApp সার্ভার থেকে সরাসরি ৮-সংখ্যার Secure Matching Pairing Code জেনারেট করা হবে।
        </p>

        {/* Errors display */}
        {errorText && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 flex items-start gap-2.5 text-xs animate-pulse">
            <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorText}</span>
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
            আপনার হোয়াটসঅ্যাপ নম্বর
          </label>

          <div className="relative flex gap-2">
            {/* Country Selector Trigger */}
            <div className="relative w-28 shrink-0" ref={dropdownRef}>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl selection:bg-transparent pointer-events-none">
                {selectedCountry.flag}
              </span>
              
              <input
                type="text"
                value={customCountryCode}
                onChange={handleCountryCodeChange}
                onClick={() => setIsOpen(true)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-10 pr-2 text-white font-medium focus:outline-none focus:border-purple-500 hover:bg-white/10 transition-all text-center text-sm"
                placeholder="+Code"
              />

              {/* Country Code Selector List (Dropdown) */}
              {isOpen && (
                <div 
                  className="absolute left-0 mt-2 w-72 max-h-64 bg-[#111115] border border-zinc-800 rounded-xl overflow-hidden z-50 shadow-2xl custom-scrollbar flex flex-col"
                  style={{ top: "100%" }}
                >
                  <div className="p-2 border-b border-zinc-800/80 sticky top-0 bg-[#111115] z-10 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="দেশ বা কোড খুঁজুন..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500 transition-all"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  
                  <ul className="divide-y divide-zinc-900 overflow-y-auto flex-grow custom-scrollbar">
                    {filteredCountries.length === 0 ? (
                      <li className="px-4 py-3 text-xs text-zinc-500 text-center">দেশ পাওয়া যায়নি</li>
                    ) : (
                      filteredCountries.map((c) => (
                        <li
                          key={c.name}
                          onClick={() => handleCountrySelect(c)}
                          className="flex items-center justify-between px-3 py-2.5 hover:bg-white/10 cursor-pointer transition-colors text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{c.flag}</span>
                            <span className="text-zinc-300 font-medium truncate max-w-[130px]">{c.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500 font-mono font-bold mr-1">{c.code}</span>
                            {selectedCountry.code === c.code && (
                              <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            )}
                          </div>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Local Phone Input */}
            <input
              type="tel"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              placeholder="01XXXXXXXX"
              className="flex-grow bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white font-semibold focus:outline-none focus:border-purple-500 hover:bg-white/10 transition-all tracking-widest placeholder:text-zinc-700 text-base"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-8 mb-2">
        <button
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:shadow-pink-500/10 transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-95 focus:outline-none"
        >
          <span>Continue</span>
          <svg className="w-5 h-5 ml-1 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
