import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, X, Upload, User, Loader2 } from "lucide-react";
import { geminiService } from "../services/geminiService";

interface ChatbotFaceProps {
  onOpenFullChat?: () => void;
}

type Emotion = "neutral" | "thinking" | "happy" | "excited";

export default function ChatbotFace({ onOpenFullChat }: ChatbotFaceProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [y, setY] = useState(0);
  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState<string>(() => localStorage.getItem("hn_lib_user_name") || "");
  const [quickMessage, setQuickMessage] = useState("");
  const [quickResponse, setQuickResponse] = useState("Xin chào 💖 Mình là XinhLao đây~");
  const [emotion, setEmotion] = useState<Emotion>("neutral");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Speak initial greeting after a short delay
    const timer = setTimeout(() => {
      playVoice(quickResponse);
    }, 1500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 15;
      const y = (e.clientY / window.innerHeight - 0.5) * 15;
      setMousePos({ x, y });

      if (dragging) {
        // Offset by roughly half the chatbot width/height to center it under cursor
        // Since it's fixed bottom-6 right-6, we calculate relative to that
        const offsetX = e.clientX - window.innerWidth + 100;
        const offsetY = e.clientY - window.innerHeight + 100;
        setPosition({ x: offsetX, y: offsetY });
      }
    };

    const handleMouseUp = () => setDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragging]);

  // 🎙 AI Voice (High Quality)
  const playVoice = async (text: string) => {
    try {
      // Use Zephyr for a clear, professional female-leaning tone
      const audioUrl = await geminiService.generateTTS(text, 'Zephyr');
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.play();
      }
    } catch (error) {
      console.error("TTS Error:", error);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleQuickChat = async () => {
    if (!quickMessage.trim() && !imagePreview) return;
    
    setIsLoading(true);
    setEmotion("thinking");
    setQuickResponse("💭 Đợi mình chút nha...");
    
    try {
      let prompt = quickMessage;
      if (userName) {
        prompt = `Người dùng tên là ${userName}. ${prompt}`;
      }

      let responseText = "";
      if (imagePreview) {
        const base64 = imagePreview.split(",")[1];
        responseText = await geminiService.analyzeImage(base64, prompt || "Hãy phân tích hình ảnh này liên quan đến sách hoặc văn hóa.");
      } else {
        responseText = await geminiService.chat(prompt, []);
      }

      setQuickResponse(responseText);
      playVoice(responseText);
      setEmotion("happy");
      setQuickMessage("");
    } catch (error) {
      console.error("Quick chat error:", error);
      const errorMessages = [
        "🤖 Mình hơi lag một chút, thử lại nhé!",
        "📡 Kết nối đang chập chờn...",
        "😅 Cho mình 1 giây suy nghĩ lại nhé!"
      ];
      const errorMsg = errorMessages[Math.floor(Math.random() * errorMessages.length)];
      setQuickResponse(errorMsg);
      playVoice(errorMsg);
      setEmotion("neutral");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setEmotion("excited");
        setQuickResponse(`Tôi đã nhận được ảnh! ${userName ? userName + " ơi, " : ""}bạn muốn tôi phân tích cuốn sách này không?`);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveName = (name: string) => {
    setUserName(name);
    localStorage.setItem("hn_lib_user_name", name);
    if (name) {
      setEmotion("happy");
      const msg = `Chào ${name}! Rất vui được hỗ trợ bạn.`;
      setQuickResponse(msg);
      playVoice(msg);
    }
  };

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 origin-bottom-right flex flex-col items-end select-none"
      style={{ 
        filter: 'drop-shadow(0 0 30px rgba(250,204,21,0.5))',
        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
        cursor: dragging ? 'grabbing' : 'auto'
      }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (e.button === 2) setDragging(true); // Right click to drag
      }}
    >
      {/* 🌟 TÊN ĐỒNG BỘ */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1 text-base font-artistic bg-gradient-to-r from-yellow-200 via-primary to-primary-hover bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(197,160,89,0.4)] tracking-wide animate-shine"
        style={{ textShadow: '0 0 10px rgba(197,160,89,0.2)' }}
      >
        ✨ XinhLao ✨
      </motion.div>

      {/* Avatar Image */}
      <motion.div
        animate={{ y: [0, -8, 0], translateY: y * 0.15 }}
        transition={{ 
          y: { repeat: Infinity, duration: 3, ease: "easeInOut" },
          translateY: { type: "spring", stiffness: 60 }
        }}
        className="relative"
      >
        <motion.img
          src="https://i.postimg.cc/QCTk68dw/Thiết_kế_chưa_có_tên_(3).png"
          alt="XinhLao"
          onClick={() => setOpen(!open)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-40 h-auto object-contain cursor-pointer drop-shadow-xl"
          style={{
            transform: `translate(${mousePos.x}px, ${mousePos.y}px)`,
            filter: emotion === "thinking" ? "grayscale(0.5) brightness(0.8)" : 
                    emotion === "happy" ? "brightness(1.1) contrast(1.1)" : "none"
          }}
        />
        
        {/* Status Indicator */}
        <AnimatePresence>
          {emotion !== "neutral" && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg border-2 border-[#0f172a]"
            >
              <div className="text-[8px]">
                {emotion === "thinking" ? "🤔" : emotion === "happy" ? "😊" : "✨"}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Chat Box */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8, transformOrigin: "bottom right" }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            className="absolute bottom-full mb-3 right-0 w-[320px] bg-[#0f172a]/85 backdrop-blur-xl text-white rounded-2xl shadow-2xl p-4 border border-white/10 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                <div className="text-[9px] font-bold uppercase tracking-widest text-primary/80">XinhLao AI Assistant</div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/20 hover:text-white transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>

            {/* Name Input */}
            {!userName && (
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-white/30" />
                <input
                  placeholder="Tên của bạn là gì?"
                  className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-black/40 border border-white/10 text-[9px] focus:outline-none focus:border-primary/50 transition-all"
                  onBlur={(e) => saveName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName((e.target as HTMLInputElement).value)}
                />
              </div>
            )}
            
            <div className="text-[10px] leading-relaxed text-white/80 bg-white/10 p-2.5 rounded-xl border border-white/5 max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-line">
              {quickResponse}
            </div>

            {imagePreview && (
              <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                <button 
                  onClick={() => setImagePreview(null)}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={quickMessage}
                    onChange={(e) => setQuickMessage(e.target.value)}
                    placeholder="Nói gì đó với mình... 💬"
                    className="w-full p-3 pr-10 rounded-xl bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-primary/50 transition-all placeholder-white/30"
                    onKeyDown={(e) => e.key === "Enter" && handleQuickChat()}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-primary transition-colors"
                  >
                    <Upload className="w-3 h-3" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept="image/*" />
                </div>
                <button 
                  onClick={handleQuickChat}
                  disabled={isLoading || (!quickMessage.trim() && !imagePreview)}
                  className="p-3 bg-primary text-black rounded-xl hover:bg-primary-hover disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(197,160,89,0.2)]"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>

              <button 
                onClick={() => {
                  setOpen(false);
                  onOpenFullChat?.();
                }}
                className="w-full py-2 bg-white/5 border border-white/10 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2 text-white/40 hover:text-white"
              >
                <MessageSquare className="w-3 h-3" />
                Mở Trợ lý đầy đủ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔍 ZOOM CONTROLS */}
      <div className="flex gap-1 mt-2">
        <button
          onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
          className="w-6 h-6 flex items-center justify-center bg-white/10 text-white/40 hover:text-white hover:bg-white/20 rounded-md text-xs transition-all"
        >
          -
        </button>
        <button
          onClick={() => setScale((s) => Math.min(2, s + 0.2))}
          className="w-6 h-6 flex items-center justify-center bg-primary/20 text-primary hover:bg-primary/40 rounded-md text-xs transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}



