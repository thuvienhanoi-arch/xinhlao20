import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Facebook, 
  Loader2, 
  Copy, 
  Check, 
  Mic, 
  Sparkles, 
  Quote, 
  Layout, 
  Type as TypeIcon,
  Send,
  RefreshCw,
  Share2
} from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

interface AutoFacebookContentProps {
  image: string | null;
  analysis: string | null;
  bookTitle: string | null;
}

export const AutoFacebookContent: React.FC<AutoFacebookContentProps> = ({ image, analysis, bookTitle }) => {
  const [contentInput, setContentInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<'professional' | 'storytelling' | 'viral' | 'educational'>('professional');

  const handleGenerate = async () => {
    if (!image || !analysis) {
      toast.error('Vui lòng phân tích sách trước khi tạo bài viết.');
      return;
    }

    setIsGenerating(true);
    try {
      // We'll use a more specialized prompt based on the selected style
      const post = await geminiService.generateFacebookPost(image, contentInput, analysis, style);
      setGeneratedPost(post);
      toast.success('Đã tạo bài viết Facebook thành công!');
    } catch (error) {
      console.error('Error generating Facebook post:', error);
      toast.error('Không thể tạo bài viết. Vui lòng thử lại.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Đã sao chép vào bộ nhớ tạm!');
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    if (!isRecording) {
      setIsRecording(true);
      recognition.start();
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setContentInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
    } else {
      setIsRecording(false);
      recognition.stop();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Facebook className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-serif italic">Auto Facebook Content</h3>
          <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Tạo nội dung mạng xã hội chuyên nghiệp</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
              <TypeIcon className="w-3 h-3" />
              Cảm nhận & Tóm tắt bổ sung
            </label>
            <div className="relative">
              <textarea 
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder="Nhập thêm cảm nhận cá nhân, bài học tâm đắc hoặc thông điệp bạn muốn truyền tải..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pr-14 text-sm focus:outline-none focus:border-primary/50 h-48 transition-all resize-none shadow-inner"
              />
              <button 
                onClick={toggleRecording}
                className={cn(
                  "absolute right-4 top-4 p-3 rounded-xl transition-all",
                  isRecording ? "bg-red-500 text-white animate-pulse" : "bg-white/5 text-white/40 hover:text-primary hover:bg-white/10"
                )}
              >
                <Mic className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
              <Layout className="w-3 h-3" />
              Phong cách bài viết
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'professional', label: 'Chuyên nghiệp', icon: Sparkles },
                { id: 'storytelling', label: 'Kể chuyện', icon: Quote },
                { id: 'viral', label: 'Viral/Hấp dẫn', icon: Share2 },
                { id: 'educational', label: 'Giáo dục', icon: BookOpen }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setStyle(item.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest",
                    style === item.id 
                      ? "bg-primary/20 border-primary text-primary shadow-[0_0_20px_rgba(197,160,89,0.1)]" 
                      : "bg-white/5 border-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleGenerate}
            disabled={isGenerating || !analysis}
            className="w-full py-4 bg-primary text-black font-bold uppercase tracking-widest rounded-2xl hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-primary/10"
          >
            {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            Tạo nội dung bài viết
          </button>
        </div>

        {/* Output Section */}
        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            {generatedPost ? (
              <motion.div
                key="output"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-3 py-1 rounded-full">
                    Bản nháp AI đề xuất
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => copyToClipboard(generatedPost)}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                      title="Sao chép"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={handleGenerate}
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all"
                      title="Tạo lại"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-8 overflow-y-auto custom-scrollbar backdrop-blur-xl">
                  <div className="prose prose-invert prose-amber max-w-none prose-p:leading-relaxed prose-p:text-white/80">
                    <ReactMarkdown>{generatedPost}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center p-10 space-y-4"
              >
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                  <Send className="w-8 h-8 text-white/10" />
                </div>
                <div>
                  <h4 className="text-lg font-serif italic text-white/40">Sẵn sàng sáng tạo</h4>
                  <p className="text-xs text-white/20 max-w-[200px] mx-auto">Nội dung Facebook của bạn sẽ xuất hiện tại đây sau khi nhấn nút tạo.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const BookOpen = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);
