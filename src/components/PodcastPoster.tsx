import React from "react";
import { motion } from "motion/react";

export function GlassFooter({ globalOpacity = 0.6, bookTitle }: { globalOpacity?: number, bookTitle?: string | null }) {
  const displayText = bookTitle || "© 2026 Hanoi Culture and Library Center • All rights reserved";
  
  return (
    <div className="absolute bottom-6 w-full flex justify-center overflow-hidden">
      <div 
        className="backdrop-blur-xl border border-white/20 shadow-2xl px-6 py-3 rounded-2xl text-center transition-colors duration-300 max-w-[90%] relative overflow-hidden"
        style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.4})` }}
      >
        <div className="whitespace-nowrap animate-marquee-ltr inline-block">
          <p className="text-sm text-gray-200 tracking-wide inline-block px-4">
            {displayText}
          </p>
          <p className="text-sm text-gray-200 tracking-wide inline-block px-4">
            {displayText}
          </p>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee-ltr {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        .animate-marquee-ltr {
          animation: marquee-ltr 15s linear infinite;
        }
      `}} />
    </div>
  );
}

export default function PodcastPoster({ onStart, globalOpacity = 0.6, bookTitle, coverImage }: { onStart?: () => void, globalOpacity?: number, bookTitle?: string | null, coverImage?: string | null }) {
  const bgImage = coverImage || "https://i.postimg.cc/YqFTd0pp/goc-nhin-da-dang-ve-van-hoa-lich-su-Thu-do-(4).png";
  
  return (
    <div 
      className="w-full h-screen relative flex items-center justify-center overflow-hidden transition-colors duration-300"
    >
      {/* Background image with dark overlay */}
      <motion.div 
        key={bgImage}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${bgImage}")` }}
      ></motion.div>
      <div className="absolute inset-0 bg-black/60 z-0"></div>

      {/* Content glass */}
      <div className="relative z-10 p-10 md:p-16 rounded-[32px] bg-black/30 backdrop-blur-md border border-white/20 shadow-[0_0_40px_rgba(234,179,8,0.2)] text-center text-white max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tighter mb-4 font-heading hero-title">
          SUMMARY OF BOOKS FROM THE HANOI LIBRARY
        </h1>
        <p className="text-2xl italic font-medium opacity-90 mb-8 text-white">
          Nơi công nghệ đánh thức vẻ đẹp di sản.
        </p>
        <button 
          onClick={onStart}
          className="px-10 py-4 font-bold uppercase tracking-widest rounded-full transition-all shadow-lg hover:shadow-primary/50 hover:scale-105 bg-primary text-black"
        >
          Get Started
        </button>
      </div>

      <GlassFooter globalOpacity={globalOpacity} bookTitle={bookTitle} />
    </div>
  );
}
