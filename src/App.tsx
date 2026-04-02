/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Wand2, 
  Mic, 
  Image as ImageIcon, 
  Send, 
  ChevronRight, 
  Loader2, 
  Copy,
  Check,
  History,
  LayoutDashboard,
  Settings,
  BookOpen,
  Facebook,
  Upload,
  Palette,
  Download,
  Quote,
  LogIn,
  LogOut,
  Trash2,
  Play,
  Pause,
  X,
  Search,
  FileText,
  Phone,
  Mail,
  MapPin,
  Star,
  Users,
  Briefcase,
  Award,
  Headphones,
  Save,
  ExternalLink,
  Share2,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import ChatbotFace from './components/ChatbotFace';
import { AutoFacebookContent } from './components/AutoFacebookContent';
import PodcastPoster from './components/PodcastPoster';
import { geminiService } from './services/geminiService';
import { cn } from './lib/utils';
import { 
  auth, 
  signInWithGoogle, 
  logout, 
  savePodcast, 
  getSavedPodcasts, 
  deleteSavedPodcast, 
  SavedPodcast,
  requestConsultation,
  getMyConsultations,
  Consultation,
  saveBookAnalysis,
  getBookAnalyses,
  BookAnalysis
} from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Toaster, toast } from 'sonner';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        // Try to parse FirestoreErrorInfo if it's a JSON string
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) {
          errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} at ${parsed.path})`;
        }
      } catch (e) {
        errorMessage = this.state.error.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-bg-main flex items-center justify-center p-4 text-center">
          <div className="max-w-md w-full bg-bg-main border border-white/5 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Something went wrong</h2>
            <p className="text-zinc-400 mb-6">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-black font-medium hover:bg-primary-hover transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Custom Confirm Modal
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-main/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bg-main border border-white/5 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
      >
        <h3 className="text-xl font-bold text-white mb-2 font-heading">{title}</h3>
        <p className="text-zinc-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Xác nhận
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AudioProcessingOverlay = () => (
  <div className="flex flex-col items-center justify-center space-y-6 py-12 bg-bg-main/50 rounded-[18px] border border-white/5 backdrop-blur-xl w-full">
    <div className="flex flex-col items-center gap-4">
      <motion.img 
        src="https://i.postimg.cc/FKSZ4dBg/LOGO.png" 
        alt="Rotating Logo" 
        className="w-40 h-40 object-contain"
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        referrerPolicy="no-referrer"
      />
      <p className="text-[10px] font-bold text-primary uppercase tracking-widest text-center">
        Hanoi Cultural and Library Center LIBRARY
      </p>
    </div>
    <div className="text-4xl">🎙️</div>
    <div className="flex items-end gap-1 h-8">
      {[...Array(11)].map((_, i) => (
        <motion.div 
          key={i}
          className="w-1 bg-primary rounded-full"
          animate={{ height: [8, 32, 12, 28, 8] }}
          transition={{ 
            duration: 0.8, 
            repeat: Infinity, 
            delay: i * 0.05,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
    <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs animate-pulse">
      Đang xử lý audio...
    </p>
  </div>
);

type View = 'landing' | 'chat' | 'book' | 'caption' | 'saved' | 'agent' | 'consultations' | 'facebook-studio';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface BookState {
  image: string | null;
  analysis: string | null;
  isLoading: boolean;
  podcastScript: string | null;
  ttsReadyScript: string | null;
  podcastTitle: string | null;
  isGeneratingScript: boolean;
  podcastAudio: string | null;
  isGeneratingAudio: boolean;
  facebookPost: string | null;
  isGeneratingPost: boolean;
  bookContentInput: string;
  bookTitle: string | null;
  podcastCover: string | null;
  isGeneratingCover: boolean;
}

interface CaptionState {
  image: string | null;
  caption: string | null;
  isLoading: boolean;
}

interface AgentState {
  eventName: string;
  location: string;
  time: string;
  highlights: string;
  generatedPost: string | null;
  isLoading: boolean;
}

interface ConsultationForm {
  name: string;
  email: string;
  phone: string;
  serviceType: string;
  message: string;
  isSubmitting: boolean;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [legalDocState, setLegalDocState] = useState<{ image: string | null, analysis: string | null, isLoading: boolean }>({
    image: null,
    analysis: null,
    isLoading: false
  });

  const legalDocFileInputRef = useRef<HTMLInputElement>(null);

  const handleLegalDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLegalDocState(prev => ({ ...prev, image: reader.result as string, analysis: null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeLegalDoc = async () => {
    if (!legalDocState.image) return;
    setLegalDocState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await geminiService.analyzeLegalDocument(legalDocState.image);
      setLegalDocState(prev => ({ ...prev, analysis: result || 'Không thể phân tích hồ sơ.', isLoading: false }));
    } catch (error) {
      console.error('Legal doc analysis error:', error);
      setLegalDocState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const [activeView, setActiveView] = useState<View>('landing');
  const [globalOpacity, setGlobalOpacity] = useState(0.8);
  const [user, setUser] = useState<User | null>(null);
  const [savedPodcasts, setSavedPodcasts] = useState<SavedPodcast[]>([]);
  const [bookAnalyses, setBookAnalyses] = useState<BookAnalysis[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, onConfirm });
  };

  const [consultationForm, setConsultationForm] = useState<ConsultationForm>({
    name: '',
    email: '',
    phone: '',
    serviceType: 'Book Recommendation',
    message: '',
    isSubmitting: false
  });
  
  const [bookState, setBookState] = useState<BookState>({
    image: null,
    analysis: null,
    isLoading: false,
    podcastScript: null,
    ttsReadyScript: null,
    podcastTitle: null,
    isGeneratingScript: false,
    podcastAudio: null,
    isGeneratingAudio: false,
    facebookPost: null,
    isGeneratingPost: false,
    bookContentInput: "",
    bookTitle: null,
    podcastCover: null,
    isGeneratingCover: false
  });

  const [captionState, setCaptionState] = useState<CaptionState>({
    image: null,
    caption: null,
    isLoading: false
  });

  const [agentState, setAgentState] = useState<AgentState>({
    eventName: '',
    location: '',
    time: '',
    highlights: '',
    generatedPost: null,
    isLoading: false
  });

  const [podcastAIState, setPodcastAIState] = useState<{
    bookInfo: string;
    script: string | null;
    audio: string | null;
    isLoading: boolean;
    isGeneratingAudio: boolean;
    tone: string;
    voiceStyle: string;
    isEditing: boolean;
    editedScript: string | null;
  }>({
    bookInfo: '',
    script: null,
    audio: null,
    isLoading: false,
    isGeneratingAudio: false,
    tone: 'Inspirational',
    voiceStyle: 'Kore',
    isEditing: false,
    editedScript: null
  });

  const [myConsultations, setMyConsultations] = useState<Consultation[]>([]);
  const [isLoadingConsultations, setIsLoadingConsultations] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const bookFileInputRef = useRef<HTMLInputElement>(null);
  const captionFileInputRef = useRef<HTMLInputElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        fetchSavedPodcasts();
        fetchMyConsultations();
        getBookAnalyses().then(setBookAnalyses);
      } else {
        setSavedPodcasts([]);
        setMyConsultations([]);
        setBookAnalyses([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchMyConsultations = async () => {
    setIsLoadingConsultations(true);
    try {
      const result = await getMyConsultations();
      setMyConsultations(result);
    } catch (error) {
      console.error('Error fetching consultations:', error);
    } finally {
      setIsLoadingConsultations(false);
    }
  };

  const handleConsultationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Vui lòng đăng nhập để gửi yêu cầu tư vấn.');
      return;
    }
    setConsultationForm(prev => ({ ...prev, isSubmitting: true }));
    try {
      await requestConsultation({
        name: consultationForm.name,
        email: consultationForm.email,
        phone: consultationForm.phone,
        serviceType: consultationForm.serviceType,
        message: consultationForm.message
      });
      toast.success('Yêu cầu tư vấn của bạn đã được gửi thành công! Chúng tôi sẽ liên hệ sớm nhất.');
      setConsultationForm({
        name: '',
        email: '',
        phone: '',
        serviceType: 'Book Recommendation',
        message: '',
        isSubmitting: false
      });
      fetchMyConsultations();
    } catch (error) {
      console.error('Error submitting consultation:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại sau.');
      setConsultationForm(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const fetchSavedPodcasts = async () => {
    try {
      const podcasts = await getSavedPodcasts();
      setSavedPodcasts(podcasts);
    } catch (error) {
      console.error('Error fetching saved podcasts:', error);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setActiveView('book');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleDeleteSavedPodcast = async (id: string) => {
    showConfirm(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa podcast này?',
      async () => {
        try {
          await deleteSavedPodcast(id);
          fetchSavedPodcasts();
          toast.success('Đã xóa podcast.');
        } catch (error) {
          console.error('Error deleting podcast:', error);
          toast.error('Không thể xóa podcast.');
        } finally {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    );
  };

  const handleSavePodcast = async () => {
    if (!user || !bookState.podcastScript || !bookState.podcastAudio) return;
    setIsSaving(true);
    try {
      await savePodcast({
        title: bookState.podcastTitle || `Podcast: ${bookState.analysis?.split('\n')[0].replace('# ', '') || 'Untitled'}`,
        script: bookState.podcastScript,
        ttsReadyScript: bookState.ttsReadyScript || undefined,
        audioUrl: bookState.podcastAudio,
        imageUrl: bookState.podcastCover || 'https://i.postimg.cc/FKSZ4dBg/LOGO.png' // Use generated cover if exists
      });
      toast.success('Podcast đã được lưu vào thư viện!');
      fetchSavedPodcasts();
    } catch (error) {
      console.error('Error saving podcast:', error);
      toast.error('Không thể lưu podcast. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!user || !bookState.analysis) return;
    setIsSaving(true);
    try {
      await saveBookAnalysis({
        bookTitle: bookState.podcastTitle || 'Untitled',
        author: 'Unknown',
        analysis: bookState.analysis
      });
      toast.success('Phân tích sách đã được lưu!');
      getBookAnalyses().then(setBookAnalyses);
    } catch (error) {
      console.error('Error saving analysis:', error);
      toast.error('Không thể lưu phân tích. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBookUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBookState(prev => ({ ...prev, image: reader.result as string, analysis: null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBookAnalysis = async () => {
    if (!bookState.image) return;
    setBookState(prev => ({ ...prev, isLoading: true }));
    try {
      const result = await geminiService.analyzeBookCover(bookState.image);
      setBookState(prev => ({ 
        ...prev, 
        analysis: result.analysis || 'Failed to analyze.', 
        bookTitle: result.title || null,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Book analysis error:', error);
      setBookState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGenerateFacebookPost = async () => {
    if (!bookState.image || !bookState.bookContentInput.trim() || !bookState.analysis) return;
    setBookState(prev => ({ ...prev, isGeneratingPost: true }));
    try {
      const post = await geminiService.generateFacebookPost(
        bookState.image, 
        bookState.bookContentInput,
        bookState.analysis
      );
      setBookState(prev => ({ ...prev, facebookPost: post, isGeneratingPost: false }));
    } catch (error) {
      console.error('Error generating Facebook post:', error);
      setBookState(prev => ({ ...prev, isGeneratingPost: false }));
    }
  };

  const handleGenerateBookScript = async () => {
    if (!bookState.analysis) return;
    setBookState(prev => ({ ...prev, isGeneratingScript: true }));
    try {
      const result = await geminiService.generateBookPodcastScript(bookState.analysis);
      setBookState(prev => ({ 
        ...prev, 
        podcastScript: result.podcast_script, 
        ttsReadyScript: result.tts_ready_script,
        podcastTitle: result.title,
        isGeneratingScript: false 
      }));
    } catch (error) {
      console.error('Error generating book script:', error);
      setBookState(prev => ({ ...prev, isGeneratingScript: false }));
    }
  };

  const handleGenerateAudioFromBook = async () => {
    const scriptToUse = bookState.ttsReadyScript || bookState.podcastScript;
    if (!scriptToUse) return;
    setBookState(prev => ({ ...prev, isGeneratingAudio: true }));
    try {
      const audioUrl = await geminiService.generateTTS(scriptToUse);
      setBookState(prev => ({ ...prev, podcastAudio: audioUrl, isGeneratingAudio: false }));
    } catch (error) {
      console.error('Error generating podcast audio:', error);
      setBookState(prev => ({ ...prev, isGeneratingAudio: false }));
    }
  };

  const handleGeneratePodcastCover = async () => {
    if (!bookState.bookTitle || !bookState.analysis) {
      toast.error('Vui lòng phân tích sách trước khi tạo bìa.');
      return;
    }
    setBookState(prev => ({ ...prev, isGeneratingCover: true }));
    try {
      const cover = await geminiService.generatePodcastCover(bookState.bookTitle, bookState.analysis);
      setBookState(prev => ({ ...prev, podcastCover: cover, isGeneratingCover: false }));
      toast.success('Đã tạo bìa podcast thành công!');
    } catch (error) {
      console.error('Error generating podcast cover:', error);
      setBookState(prev => ({ ...prev, isGeneratingCover: false }));
      toast.error('Không thể tạo bìa podcast.');
    }
  };

  const handleCaptionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCaptionState(prev => ({ ...prev, image: reader.result as string, caption: null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateCaption = async () => {
    if (!captionState.image) return;
    setCaptionState(prev => ({ ...prev, isLoading: true }));
    try {
      let result;
      if (bookState.analysis) {
        result = await geminiService.generateFacebookPost(
          captionState.image, 
          "", // No additional content for now
          bookState.analysis
        );
      } else {
        result = await geminiService.generateCinematicCaption(captionState.image);
      }
      setCaptionState(prev => ({ ...prev, caption: result || 'Failed to generate content.', isLoading: false }));
    } catch (error) {
      console.error('Caption generation error:', error);
      setCaptionState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGenerateAgentPost = async () => {
    if (!agentState.eventName || !agentState.location || !agentState.time || !agentState.highlights) {
      alert('Vui lòng điền đầy đủ thông tin sự kiện.');
      return;
    }
    setAgentState(prev => ({ ...prev, isLoading: true }));
    try {
      const post = await geminiService.generateHanoiEventPost({
        eventName: agentState.eventName,
        location: agentState.location,
        time: agentState.time,
        highlights: agentState.highlights
      });
      setAgentState(prev => ({ ...prev, generatedPost: post, isLoading: false }));
    } catch (error) {
      console.error('Agent generation error:', error);
      setAgentState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGeneratePodcastAI = async () => {
    if (!podcastAIState.bookInfo.trim()) return;
    setPodcastAIState(prev => ({ ...prev, isLoading: true, script: null, audio: null, editedScript: null, isEditing: false }));
    try {
      const result = await geminiService.generateBookPodcastScript(
        podcastAIState.bookInfo, 
        podcastAIState.tone, 
        podcastAIState.voiceStyle
      );
      setPodcastAIState(prev => ({ 
        ...prev, 
        script: result.podcast_script, 
        editedScript: result.podcast_script,
        isLoading: false 
      }));
    } catch (error) {
      console.error('Podcast AI error:', error);
      setPodcastAIState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleGenerateAudioAI = async () => {
    const scriptToUse = podcastAIState.editedScript || podcastAIState.script;
    if (!scriptToUse) return;
    setPodcastAIState(prev => ({ ...prev, isGeneratingAudio: true }));
    try {
      const audio = await geminiService.generateTTS(scriptToUse, podcastAIState.voiceStyle);
      setPodcastAIState(prev => ({ ...prev, audio, isGeneratingAudio: false }));
    } catch (error) {
      console.error('Audio AI error:', error);
      setPodcastAIState(prev => ({ ...prev, isGeneratingAudio: false }));
    }
  };

  const toggleRecording = (setter: (val: string | ((prev: string) => string)) => void) => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'vi-VN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setter(prev => prev + (prev ? ' ' : '') + transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      toast.error('Có lỗi xảy ra khi nhận diện giọng nói.');
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !selectedImage) || isChatLoading) return;

    const userMsg = chatInput;
    const userImg = selectedImage;
    setChatInput('');
    setSelectedImage(null);
    
    setChatMessages(prev => [...prev, { 
      role: 'user', 
      content: userMsg + (userImg ? '\n\n[Image Attached]' : '') 
    }]);
    setIsChatLoading(true);

    try {
      if (userImg) {
        const response = await geminiService.analyzeImage(userImg, userMsg || "Analyze this image.");
        setChatMessages(prev => [...prev, { role: 'model', content: response || 'No response' }]);
        speak(response || '');
      } else {
        const history = chatMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));
        
        // Create a placeholder for the streaming response
        setChatMessages(prev => [...prev, { role: 'model', content: '' }]);
        
        let fullResponse = '';
        const stream = geminiService.chatStream(userMsg, history);
        
        for await (const chunk of stream) {
          fullResponse += chunk;
          setChatMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = fullResponse;
            return newMessages;
          });
        }
        
        speak(fullResponse);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, { role: 'model', content: 'Sorry, I encountered an error.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const speak = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "vi-VN";
    utter.rate = 1;
    window.speechSynthesis.speak(utter);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="flex h-screen bg-transparent text-white font-sans overflow-hidden selection:bg-primary selection:text-white"
    >
      {/* Sidebar - Premium Aesthetic */}
      <aside 
        className="w-64 border-r border-white/15 bg-[#020617] flex flex-col transition-colors duration-300"
      >
        <div className="p-5">
          <div className="flex flex-col items-center gap-2 mb-7">
            <img 
              src="https://i.postimg.cc/FKSZ4dBg/LOGO.png" 
              alt="Hanoi Library Logo" 
              className="h-28 w-auto object-contain" 
              referrerPolicy="no-referrer"
            />
            <p className="text-[9px] font-bold text-primary text-center leading-tight uppercase tracking-wider">
              Hanoi Cultural and Library Center<br/>LIBRARY
            </p>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'landing', icon: LayoutDashboard, label: 'Thư viện Hà Nội' },
              { id: 'book', icon: BookOpen, label: 'Tóm tắt Sách' },
              { id: 'agent', icon: Wand2, label: 'AI Agency Reporter' },
              { id: 'facebook-studio', icon: Facebook, label: 'Facebook Studio' },
              { id: 'caption', icon: Quote, label: 'Nội dung Facebook' },
              { id: 'chat', icon: MessageSquare, label: 'Hanoi Library AI Assistant' },
              { id: 'saved', icon: History, label: 'Bộ sưu tập' },
              { id: 'consultations', icon: Mic, label: 'Podcast Library' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group",
                  activeView === item.id 
                    ? "bg-[#eab308]/10 text-[#facc15] border border-[#eab308]/20" 
                    : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon className={cn("w-4 h-4 transition-transform group-hover:scale-110", activeView === item.id ? "text-primary" : "text-white/20")} />
                <span className="text-[10px] font-bold uppercase tracking-widest truncate whitespace-nowrap min-w-0">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-8 border-t border-white/5 space-y-8">
          {/* Opacity Control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white/40">
                <Palette className="w-3 h-3" />
                <span className="text-[10px] uppercase font-bold tracking-widest">Độ mờ</span>
              </div>
              <span className="text-[10px] font-mono text-primary">{(globalOpacity * 100).toFixed(1)}%</span>
            </div>
            <input 
              type="range" 
              min="0.1" 
              max="1" 
              step="0.01" 
              value={globalOpacity} 
              onChange={(e) => setGlobalOpacity(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <p className="text-[9px] text-white/20 italic leading-tight">
              *Điều chỉnh độ mờ của các lớp phủ nội dung để tối ưu hiển thị.
            </p>
          </div>

          {user ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-3 bg-bg-card/50 rounded-2xl border border-white/5">
                <img 
                  src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=6366f1&color=fff`} 
                  className="w-10 h-10 rounded-full border border-white/10"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">{user.displayName}</p>
                  <p className="text-[10px] text-white/30 truncate uppercase tracking-widest">{user.email}</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/20 hover:text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-br from-primary to-primary-hover text-black font-bold uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(197,160,89,0.1)]"
            >
              <LogIn className="w-5 h-5" />
              Đăng nhập
            </button>
          )}
        </div>
      </aside>

      {/* Main Content - Premium Aesthetic */}
      <main 
        className="flex-1 flex flex-col relative transition-colors duration-300"
        style={{ backgroundColor: 'rgba(2, 6, 23, 0.5)', backdropFilter: 'none' }}
      >
        <AnimatePresence mode="wait">
          {activeView === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-y-auto"
            >
              <PodcastPoster 
                onStart={() => setActiveView('book')} 
                globalOpacity={globalOpacity} 
                bookTitle={bookState.bookTitle}
                coverImage={bookState.podcastCover}
              />
              
              {/* Stats Section */}
              <section 
                className="py-20 px-14 glass-panel border-y border-white/5 transition-colors duration-300"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                  {[
                    { icon: Award, label: 'Năm phục vụ', value: '20+' },
                    { icon: Users, label: 'Độc giả tin dùng', value: '10k+' },
                    { icon: BookOpen, label: 'Đầu sách đa dạng', value: '50k+' },
                    { icon: Star, label: 'Đánh giá tích cực', value: '99%' }
                  ].map((stat, i) => (
                    <div key={i} className="space-y-4 text-center md:text-left">
                      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto md:mx-0">
                        <stat.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h4 className="text-4xl font-serif font-bold">{stat.value}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Footer */}
              <footer className="py-20 px-20 border-t border-white/5 text-center space-y-8">
                <div className="flex flex-col items-center gap-4">
                  <img 
                    src="https://i.postimg.cc/FKSZ4dBg/LOGO.png" 
                    alt="Hanoi Library Logo" 
                    className="h-40 w-auto object-contain" 
                    referrerPolicy="no-referrer"
                  />
                  <p className="text-sm font-bold text-primary uppercase tracking-[0.2em] text-center">
                    Hanoi Cultural and Library Center LIBRARY
                  </p>
                </div>
                <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.5em]">
                  © 2026 HANOI LIBRARY. All Rights Reserved.
                </p>
              </footer>
            </motion.div>
          )}

          {activeView === 'consultations' && (
            <motion.div 
              key="podcast-ai"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <header 
                className="h-14 border-b border-white/5 flex items-center px-7 shrink-0 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300 bg-bg-main"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 hero-title">Podcast Library</h2>
                </div>
              </header>

              <div className="p-5 max-w-4xl mx-auto w-full space-y-8 pb-20">
                <section 
                  className="rounded-[18px] p-5 border border-white/5 space-y-7 backdrop-blur-xl transition-colors duration-300 bg-bg-main"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-11 h-11 bg-primary/10 rounded-[11px] flex items-center justify-center">
                      <Mic className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif">Tạo kịch bản Podcast</h3>
                      <p className="text-white/40 text-sm">Nhập thông tin sách để AI tạo kịch bản chuyên nghiệp với cấu trúc 5 phần.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Thông tin sách / Chủ đề</label>
                    <textarea 
                      value={podcastAIState.bookInfo}
                      onChange={(e) => setPodcastAIState(prev => ({ ...prev, bookInfo: e.target.value }))}
                      placeholder="Nhập tên sách, tác giả hoặc nội dung chính bạn muốn làm podcast..."
                      className="w-full bg-bg-card/50 border border-white/10 rounded-[11px] p-4 text-sm focus:outline-none focus:border-primary/50 h-40 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Phong cách (Tone)</label>
                      <select 
                        value={podcastAIState.tone}
                        onChange={(e) => setPodcastAIState(prev => ({ ...prev, tone: e.target.value }))}
                        className="w-full bg-bg-card/50 border border-white/10 rounded-[11px] p-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        <option value="Informative">Thông tin (Informative)</option>
                        <option value="Conversational">Trò chuyện (Conversational)</option>
                        <option value="Inspirational">Truyền cảm hứng (Inspirational)</option>
                        <option value="Cinematic">Điện ảnh (Cinematic)</option>
                      </select>
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Giọng đọc (Voice Style)</label>
                      <select 
                        value={podcastAIState.voiceStyle}
                        onChange={(e) => setPodcastAIState(prev => ({ ...prev, voiceStyle: e.target.value }))}
                        className="w-full bg-bg-card/50 border border-white/10 rounded-[11px] p-3 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                      >
                        <option value="Kore">Kore (Ấm áp, truyền cảm)</option>
                        <option value="Fenrir">Fenrir (Mạnh mẽ, nam tính)</option>
                        <option value="Zephyr">Zephyr (Nhẹ nhàng, bay bổng)</option>
                        <option value="Puck">Puck (Vui vẻ, năng động)</option>
                        <option value="Charon">Charon (Trầm mặc, sâu sắc)</option>
                        <option value="Aria">Aria (Trung tính, thông tin)</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={handleGeneratePodcastAI}
                    disabled={podcastAIState.isLoading || !podcastAIState.bookInfo.trim()}
                    className="w-full py-3 bg-gradient-to-br from-primary to-primary-hover text-black font-bold uppercase tracking-widest rounded-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_30px_rgba(197,160,89,0.1)]"
                  >
                    {podcastAIState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    Tạo kịch bản hoàn chỉnh
                  </button>
                </section>

                <AnimatePresence>
                  {podcastAIState.script && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      <section 
                        className="rounded-[18px] p-5 border border-white/5 space-y-5 backdrop-blur-xl transition-colors duration-300 bg-bg-main"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-7 h-7 bg-primary/10 rounded-[11px] flex items-center justify-center">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="text-xl font-serif italic">Kịch bản Podcast</h3>
                          </div>
                          <div className="flex gap-4">
                            <button 
                              onClick={() => setPodcastAIState(prev => ({ ...prev, isEditing: !prev.isEditing }))}
                              className={cn(
                                "px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-all flex items-center gap-2",
                                podcastAIState.isEditing ? "bg-white text-black" : "border border-white/20 text-white hover:bg-white/5"
                              )}
                            >
                              {podcastAIState.isEditing ? "Xong" : "Chỉnh sửa"}
                            </button>
                            <button 
                              onClick={handleGenerateAudioAI}
                              disabled={podcastAIState.isGeneratingAudio}
                              className="px-4 py-1.5 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-primary-hover transition-all flex items-center gap-2"
                            >
                              {podcastAIState.isGeneratingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
                              Chuyển đổi giọng nói
                            </button>
                            <button 
                              onClick={() => copyToClipboard(podcastAIState.script!)}
                              className="p-2 text-white/20 hover:text-white transition-colors"
                            >
                              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {podcastAIState.isEditing ? (
                          <textarea 
                            value={podcastAIState.editedScript || ''}
                            onChange={(e) => setPodcastAIState(prev => ({ ...prev, editedScript: e.target.value }))}
                            className="w-full bg-white/5 border border-white/10 rounded-[11px] p-4 text-sm focus:outline-none focus:border-primary/50 h-[500px] transition-colors font-mono"
                          />
                        ) : (
                          <div className="prose prose-invert prose-amber max-w-none max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                            <ReactMarkdown>{podcastAIState.editedScript || podcastAIState.script}</ReactMarkdown>
                          </div>
                        )}
                      </section>

                      {podcastAIState.isGeneratingAudio && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="w-full"
                        >
                          <AudioProcessingOverlay />
                        </motion.div>
                      )}

                      {podcastAIState.audio && (
                        <motion.section 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-primary rounded-[18px] p-5 text-white flex flex-col md:flex-row items-center gap-5 shadow-[0_0_50px_rgba(99,102,241,0.2)]"
                        >
                          <div className="w-14 h-14 bg-bg-card/10 rounded-full flex items-center justify-center shrink-0">
                            <Headphones className="w-7 h-7" />
                          </div>
                          <div className="flex-1 w-full space-y-4">
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-widest opacity-60">Trình phát âm thanh</h4>
                              <p className="text-xl font-serif font-bold italic">Podcast của bạn đã sẵn sàng</p>
                            </div>
                            <audio src={podcastAIState.audio} controls className="w-full accent-black" />
                          </div>
                          <a 
                            href={podcastAIState.audio}
                            download="podcast-ai.wav"
                            className="px-5 py-3 bg-bg-card text-white font-bold uppercase tracking-widest rounded-[11px] hover:bg-bg-hover transition-all flex items-center gap-3 shadow-xl"
                          >
                            <Download className="w-4 h-4" />
                            Tải xuống
                          </a>
                        </motion.section>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeView === 'book' && (
            <motion.div 
              key="book"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <header 
                className="h-14 border-b border-white/5 flex items-center px-7 shrink-0 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300"
                style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.4})` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 hero-title">Phân tích Sách & Podcast Studio</h2>
                </div>
              </header>

              <div className="p-5 max-w-5xl mx-auto w-full space-y-8 pb-20">
                <section 
                  className="rounded-[18px] p-5 border border-white/5 relative overflow-hidden group backdrop-blur-xl transition-colors duration-300 bg-[#1c1b18]"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                    <div className="shrink-0">
                      <div 
                        onClick={() => bookFileInputRef.current?.click()}
                        className={cn(
                          "w-44 aspect-[3/4] rounded-[18px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group shadow-[0_0_50px_rgba(0,0,0,0.5)]",
                          bookState.image ? "border-transparent" : "border-white/10 hover:border-primary/50 hover:bg-primary/5"
                        )}
                      >
                        {bookState.image ? (
                          <>
                            <img src={bookState.image} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Upload className="w-8 h-8 text-white" />
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-3 bg-bg-card/50 rounded-[11px] mb-4">
                              <Upload className="w-8 h-8 text-white/20" />
                            </div>
                            <p className="text-sm font-bold uppercase tracking-widest text-white/60">Tải lên bìa sách</p>
                          </>
                        )}
                        <input type="file" ref={bookFileInputRef} onChange={handleBookUpload} className="hidden" accept="image/*" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-8">
                      <div className="space-y-4">
                        <h3 className="text-4xl font-sans font-black tracking-tighter leading-none uppercase">Chuyển đổi tri thức <br /> thành <span className="highlight italic">âm thanh.</span></h3>
                        <p className="text-white/85 text-base leading-relaxed max-w-md font-medium">
                          Tải lên bìa sách để AI phân tích nội dung, tạo kịch bản podcast chuyên nghiệp và chuyển đổi thành giọng đọc truyền cảm.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-4">
                        <button 
                          onClick={handleBookAnalysis}
                          disabled={!bookState.image || bookState.isLoading}
                          className="px-5 py-3 bg-primary text-black font-bold uppercase tracking-widest rounded-[11px] hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center gap-3 shadow-[0_0_30px_rgba(197,160,89,0.1)]"
                        >
                          {bookState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          Phân tích ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <AnimatePresence>
                  {bookState.analysis && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-12"
                    >
                      <section 
                        className="rounded-[18px] p-5 border border-white/5 backdrop-blur-xl transition-colors duration-300"
                        style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.33})` }}
                      >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                          <div className="flex items-center gap-4">
                            <div className="w-7 h-7 bg-primary/10 rounded-[11px] flex items-center justify-center">
                              <BookOpen className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="text-3xl font-sans font-black uppercase tracking-tighter italic">Kết quả <span className="highlight">phân tích</span></h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => copyToClipboard(bookState.analysis!)}
                              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-[11px] text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              Sao chép
                            </button>
                            <button 
                              onClick={() => window.open('https://notebooklm.google.com/', '_blank')}
                              className="px-4 py-2 bg-primary/20 text-primary rounded-[11px] text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all border border-primary/20"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              NotebookLM
                            </button>
                          </div>
                        </div>
                        <div className="prose prose-invert prose-amber max-w-none prose-headings:font-sans prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter">
                          <ReactMarkdown>{bookState.analysis}</ReactMarkdown>
                        </div>
                        
                        <div className="mt-12 pt-10 border-t border-white/5 space-y-12">
                          <div className="pt-10 border-t border-white/5">
                            <AutoFacebookContent 
                              image={bookState.image}
                              analysis={bookState.analysis}
                              bookTitle={bookState.bookTitle}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-10 border-t border-white/5">
                          <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Quản lý nội dung</h4>
                            <button 
                              onClick={handleSaveAnalysis}
                              disabled={isSaving}
                              className="w-full py-3 border border-primary text-primary font-bold uppercase tracking-widest rounded-[11px] hover:bg-primary hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              Lưu phân tích
                            </button>
                          </div>

                          <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-white/60">Podcast Studio</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <button 
                                onClick={handleGenerateBookScript}
                                disabled={bookState.isGeneratingScript}
                                className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 rounded-[11px] border border-white/5 hover:border-primary/30 transition-all group"
                              >
                                <FileText className="w-6 h-6 text-white/20 group-hover:text-primary" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Tạo Kịch Bản</span>
                              </button>
                              <button 
                                onClick={handleGeneratePodcastCover}
                                disabled={bookState.isGeneratingCover}
                                className="flex flex-col items-center justify-center gap-3 p-4 bg-white/5 rounded-[11px] border border-white/5 hover:border-primary/30 transition-all group"
                              >
                                {bookState.isGeneratingCover ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <ImageIcon className="w-6 h-6 text-white/20 group-hover:text-primary" />}
                                <span className="text-[10px] font-bold uppercase tracking-widest">Thiết kế bìa</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                      {/* Podcast Results */}
                      {(bookState.podcastScript || bookState.podcastAudio) && (
                        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-1 space-y-6">
                            {bookState.isGeneratingAudio && (
                              <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full"
                              >
                                <AudioProcessingOverlay />
                              </motion.div>
                            )}

                            {bookState.podcastAudio && (
                              <div 
                                className="rounded-[18px] p-4 border border-white/5 space-y-4 backdrop-blur-xl transition-colors duration-300"
                                style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.33})` }}
                              >
                                <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Âm thanh Podcast</h4>
                                <div className="p-4 rounded-[18px] border border-white/5" style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.4})` }}>
                                  <audio src={bookState.podcastAudio} controls className="w-full accent-primary" />
                                </div>
                                <div className="flex gap-4">
                                  <a 
                                    href={bookState.podcastAudio} 
                                    download="podcast-audio.wav"
                                    className="flex-1 py-3 bg-white/5 text-white font-bold uppercase tracking-widest rounded-[11px] hover:bg-white/10 transition-all flex items-center justify-center gap-3 text-xs"
                                  >
                                    <Download className="w-4 h-4" />
                                    Tải Audio
                                  </a>
                                  {user && (
                                    <button 
                                      onClick={handleSavePodcast}
                                      disabled={isSaving}
                                      className="flex-1 py-3 bg-gradient-to-br from-primary to-primary-hover text-black font-bold uppercase tracking-widest rounded-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xs shadow-[0_0_20px_rgba(197,160,89,0.1)]"
                                    >
                                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <History className="w-4 h-4" />}
                                      Lưu lại
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="lg:col-span-2 space-y-6">
                            {bookState.podcastScript && (
                              <div 
                                className="rounded-[18px] p-5 border border-white/5 h-full flex flex-col backdrop-blur-xl transition-colors duration-300"
                                style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.33})` }}
                              >
                                <div className="flex items-center justify-between mb-10">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Kịch bản Podcast</h4>
                                  <div className="flex gap-4">
                                    <button 
                                      onClick={handleGenerateAudioFromBook}
                                      disabled={bookState.isGeneratingAudio}
                                      className="px-4 py-1.5 bg-primary text-black text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-primary-hover transition-all flex items-center gap-2"
                                    >
                                      {bookState.isGeneratingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mic className="w-3 h-3" />}
                                      Chuyển đổi giọng nói
                                    </button>
                                    <button 
                                      onClick={() => copyToClipboard(bookState.podcastScript!)}
                                      className="p-2 text-white/20 hover:text-white transition-colors"
                                    >
                                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                  </div>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-4 max-h-[600px] custom-scrollbar">
                                  <div className="prose prose-invert prose-amber max-w-none">
                                    <ReactMarkdown>{bookState.podcastScript}</ReactMarkdown>
                                  </div>
                                </div>
                              </div>
                            )}

                            {bookState.facebookPost && (
                              <div 
                                className="rounded-[18px] p-5 border border-white/5 backdrop-blur-xl transition-colors duration-300"
                                style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.33})` }}
                              >
                                <div className="flex items-center justify-between mb-10">
                                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Bài đăng Facebook</h4>
                                  <button 
                                    onClick={() => copyToClipboard(bookState.facebookPost!)}
                                    className="p-2 text-white/20 hover:text-white transition-colors"
                                  >
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                </div>
                                <div className="prose prose-invert prose-amber max-w-none">
                                  <ReactMarkdown>{bookState.facebookPost}</ReactMarkdown>
                                </div>
                              </div>
                            )}
                          </div>
                        </section>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeView === 'agent' && (
            <motion.div 
              key="agent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <header 
                className="h-20 border-b border-white/5 flex items-center px-7 shrink-0 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300 bg-bg-main"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 hero-title">AI Agency Reporter</h2>
                </div>
              </header>

              <div className="p-7 max-w-4xl mx-auto w-full space-y-8 pb-20">
                <section 
                  className="rounded-[27px] p-8 border border-white/5 space-y-7 backdrop-blur-xl transition-colors duration-300 bg-bg-card/50"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <Wand2 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif">Sáng tạo nội dung sự kiện</h3>
                      <p className="text-white/40 text-sm">Nhập thông tin sự kiện để AI viết bài phong cách cinematic.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {[
                      { label: 'Tên sự kiện', value: 'eventName', placeholder: 'Ví dụ: Lễ hội Ánh sáng Hà Nội' },
                      { label: 'Địa điểm', value: 'location', placeholder: 'Ví dụ: Văn Miếu - Quốc Tử Giám' },
                      { label: 'Thời gian', value: 'time', placeholder: 'Ví dụ: 19:00 - 22:00, Thứ 7 hàng tuần' },
                      { label: 'Điểm nổi bật', value: 'highlights', placeholder: 'Ví dụ: Trình diễn 3D Mapping, Âm nhạc dân gian' }
                    ].map((field) => (
                      <div key={field.value} className="space-y-3">
                        <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest">{field.label}</label>
                        <input 
                          value={(agentState as any)[field.value]}
                          onChange={(e) => setAgentState(prev => ({ ...prev, [field.value]: e.target.value }))}
                          placeholder={field.placeholder}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm focus:outline-none focus:border-primary/50 transition-colors"
                        />
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={handleGenerateAgentPost}
                    disabled={agentState.isLoading}
                    className="w-full py-5 bg-gradient-to-br from-primary to-primary-hover text-black font-bold uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_30px_rgba(197,160,89,0.1)]"
                  >
                    {agentState.isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
                    Tạo bài viết ngay
                  </button>
                </section>

                <AnimatePresence>
                  {agentState.generatedPost && (
                    <motion.section 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-4 bg-primary rounded-full" />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Bài viết hoàn chỉnh</h3>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(agentState.generatedPost!)}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                      </div>

                      <div 
                        className="rounded-[27px] p-8 border border-white/5 relative group backdrop-blur-xl transition-colors duration-300"
                        style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.33})` }}
                      >
                        <div className="prose prose-invert prose-amber max-w-none">
                          <ReactMarkdown>{agentState.generatedPost}</ReactMarkdown>
                        </div>
                        <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Sáng tạo bởi HANOI LIBRARY AI</span>
                          </div>
                          <div className="flex gap-3">
                            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-white/30 font-bold">#HanoiCulture</span>
                            <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] text-white/30 font-bold">#Storytelling</span>
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeView === 'facebook-studio' && (
            <motion.div 
              key="facebook-studio"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <header 
                className="h-20 border-b border-white/5 flex items-center px-7 shrink-0 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300 bg-bg-main"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 hero-title">Facebook Content Studio</h2>
                </div>
              </header>

              <div className="p-7 max-w-6xl mx-auto w-full space-y-8 pb-20">
                <section 
                  className="rounded-[27px] p-8 border border-white/5 space-y-7 backdrop-blur-xl transition-colors duration-300 bg-bg-card/50"
                >
                  {!bookState.analysis ? (
                    <div className="text-center py-20 space-y-6">
                      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto">
                        <BookOpen className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-serif">Chưa có dữ liệu phân tích</h3>
                        <p className="text-white/40 text-sm max-w-md mx-auto mt-2">Vui lòng thực hiện phân tích bìa sách tại mục "Tóm tắt Sách" trước khi sử dụng tính năng này.</p>
                      </div>
                      <button 
                        onClick={() => setActiveView('book')}
                        className="px-8 py-3 bg-primary text-black font-bold uppercase tracking-widest rounded-xl hover:bg-primary-hover transition-all"
                      >
                        Đến mục Phân tích Sách
                      </button>
                    </div>
                  ) : (
                    <AutoFacebookContent 
                      image={bookState.image}
                      analysis={bookState.analysis}
                      bookTitle={bookState.bookTitle}
                    />
                  )}
                </section>
              </div>
            </motion.div>
          )}

          {activeView === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex items-center justify-center p-4"
            >
              <div className="chat-container w-full max-w-[420px] h-[650px] backdrop-blur-[20px] bg-white/10 rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/10">
                <div className="chat-box flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3">
                  {chatMessages.length === 0 && (
                    <div className="message bot bg-white/15 text-white self-start max-w-[75%] p-3 rounded-[14px] text-sm">
                      Xin chào 💖 Mình là XinhLao đây~ Mình có thể giúp gì cho bạn?
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "message max-w-[75%] p-3 rounded-[14px] text-sm",
                        msg.role === 'user' ? "user bg-[#4f8cff] text-white self-end" : "bot bg-white/15 text-white self-start"
                      )}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ))}
                  {isChatLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                    <div className="message bot bg-white/15 text-white self-start max-w-[75%] p-3 rounded-[14px] text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang trả lời...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleChatSubmit} className="chat-input flex border-t border-white/10">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 p-4 border-none outline-none bg-transparent text-white placeholder-white/30"
                  />
                  <button 
                    type="submit"
                    disabled={isChatLoading || (!chatInput.trim() && !selectedImage)}
                    className="px-5 border-none bg-[#4f8cff] text-white cursor-pointer disabled:opacity-50 transition-opacity"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}

          {activeView === 'caption' && (
            <motion.div 
              key="caption"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <header 
                className="h-14 border-b border-white/5 flex items-center px-7 shrink-0 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300 bg-bg-main"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 hero-title">Tạo nội dung mạng xã hội Facebook chuyên nghiệp từ nội dung kết quả phân tích sách</h2>
                </div>
              </header>

              <div className="p-5 max-w-4xl mx-auto w-full space-y-8 pb-20">
                <section 
                  className="rounded-[18px] p-5 border border-white/5 space-y-7 backdrop-blur-xl transition-colors duration-300 bg-bg-card/50"
                >
                  <div 
                    onClick={() => captionFileInputRef.current?.click()}
                    className={cn(
                      "w-full aspect-video rounded-[18px] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden relative group",
                      captionState.image ? "border-transparent" : "border-white/10 hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    {captionState.image ? (
                      <>
                        <img src={captionState.image} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-bg-main/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="w-10 h-10 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-white/5 rounded-[18px] mb-6">
                          <ImageIcon className="w-10 h-10 text-white/20" />
                        </div>
                        <h3 className="text-xl font-serif mb-2">Tải ảnh minh họa bài đăng</h3>
                        <p className="text-xs font-bold uppercase tracking-widest text-white/30">AI sẽ tạo nội dung Facebook chuyên nghiệp từ kết quả phân tích sách</p>
                        {bookState.analysis && (
                          <div className="mt-4 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Đang sử dụng kết quả phân tích sách</p>
                          </div>
                        )}
                      </>
                    )}
                    <input type="file" ref={captionFileInputRef} onChange={handleCaptionUpload} className="hidden" accept="image/*" />
                  </div>

                  <button 
                    onClick={handleGenerateCaption}
                    disabled={!captionState.image || captionState.isLoading}
                    className="w-full py-3 bg-gradient-to-br from-primary to-primary-hover text-black font-bold uppercase tracking-widest rounded-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-[0_0_30px_rgba(197,160,89,0.1)]"
                  >
                    {captionState.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Quote className="w-4 h-4" />}
                    Tạo nội dung Facebook
                  </button>
                </section>

                <AnimatePresence>
                  {captionState.caption && (
                    <motion.section 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className="flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-4 bg-primary rounded-full" />
                          <h3 className="text-xs font-bold uppercase tracking-widest text-white/40">Caption Cinematic</h3>
                        </div>
                        <button 
                          onClick={() => copyToClipboard(captionState.caption!)}
                          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Đã sao chép' : 'Sao chép'}
                        </button>
                      </div>

                      <div 
                        className="rounded-[27px] p-8 border border-white/5 relative group backdrop-blur-xl transition-colors duration-300"
                        style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.33})` }}
                      >
                        <div className="prose prose-invert prose-amber max-w-none quote leading-relaxed">
                          <ReactMarkdown>{captionState.caption}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {activeView === 'saved' && (
            <motion.div 
              key="saved"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col overflow-y-auto"
            >
              <header 
                className="h-14 border-b border-white/5 flex items-center px-7 shrink-0 backdrop-blur-md sticky top-0 z-10 transition-colors duration-300"
                style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.4})` }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h2 className="text-xs font-bold uppercase tracking-[0.3em] text-white/40 hero-title">Thư viện Podcast đã lưu</h2>
                </div>
              </header>

              <div className="p-5 max-w-6xl mx-auto w-full space-y-8 pb-20">
                {!user ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-8">
                    <div className="w-16 h-16 bg-dark-brown-light/20 rounded-[27px] flex items-center justify-center">
                      <LogIn className="w-8 h-8 text-white/20" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif italic">Đăng nhập để xem thư viện</h3>
                      <p className="text-sm text-white/40 mt-4 max-w-xs mx-auto">Lưu trữ và quản lý các podcast bạn đã tạo một cách chuyên nghiệp.</p>
                    </div>
                    <button 
                      onClick={handleLogin}
                      className="px-7 py-3 bg-primary text-black font-bold uppercase tracking-widest rounded-[11px] hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                    >
                      Đăng nhập ngay
                    </button>
                  </div>
                ) : savedPodcasts.length === 0 ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-8">
                    <div className="w-16 h-16 bg-dark-brown-light/20 rounded-[27px] flex items-center justify-center">
                      <History className="w-8 h-8 text-white/20" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif italic">Chưa có podcast nào được lưu</h3>
                      <p className="text-sm text-white/40 mt-4">Hãy bắt đầu tạo podcast đầu tiên của bạn từ mục Phân tích Sách.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {savedPodcasts.map((podcast) => (
                      <motion.div 
                        key={podcast.id}
                        layout
                        className="rounded-[18px] overflow-hidden border border-white/5 group hover:border-primary/30 transition-all flex flex-col backdrop-blur-xl"
                        style={{ backgroundColor: `rgba(15, 23, 42, ${globalOpacity * 0.33})` }}
                      >
                        <div className="aspect-video relative overflow-hidden">
                          <img src={podcast.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-bg-main/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button 
                              onClick={() => {
                                setBookState(prev => ({
                                  ...prev,
                                  podcastTitle: podcast.title,
                                  podcastScript: podcast.script,
                                  ttsReadyScript: podcast.ttsReadyScript || null,
                                  podcastAudio: podcast.audioUrl,
                                  analysis: 'Đã tải từ thư viện.'
                                }));
                                setActiveView('book');
                              }}
                              className="w-8 h-8 bg-primary text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-[0_0_20px_rgba(197,160,89,0.2)]"
                            >
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          </div>
                        </div>
                        <div className="p-5 space-y-4 flex-1 flex flex-col">
                          <div className="space-y-1">
                            <p className="small-text font-bold uppercase tracking-widest text-primary">Podcast Episode</p>
                            <h4 className="text-lg font-serif italic line-clamp-2">{podcast.title}</h4>
                          </div>
                          <div className="pt-4 mt-auto border-t border-white/5 flex items-center justify-between">
                            <span className="small-text text-white/20 font-bold uppercase tracking-widest">
                              {podcast.createdAt.toDate().toLocaleDateString('vi-VN')}
                            </span>
                            <button 
                              onClick={() => handleDeleteSavedPodcast(podcast.id!)}
                              className="p-2 text-white/20 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating AI Assistant Face */}
      <ChatbotFace onOpenFullChat={() => setIsChatOpen(true)} />

      {/* Sidebar Chat Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsChatOpen(false)}
              className="fixed inset-0 bg-bg-main/60 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md border-l border-white/5 z-[70] flex flex-col shadow-2xl backdrop-blur-2xl transition-colors duration-300 bg-[#1c1b18]"
            >
              <div className="chat-container w-full h-full flex flex-col overflow-hidden">
                <div className="chat-header flex items-center justify-end p-6 border-b border-white/10">
                  <button 
                    onClick={() => setIsChatOpen(false)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/20 hover:text-white"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="chat-box flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-4">
                  {chatMessages.length === 0 && (
                    <div className="message bot bg-white/15 text-white self-start max-w-[85%] p-4 rounded-[18px] text-sm">
                      Xin chào 💖 Mình là XinhLao đây~ Mình có thể giúp gì cho bạn?
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "message max-w-[85%] p-4 rounded-[18px] text-sm",
                        msg.role === 'user' ? "user bg-[#4f8cff] text-white self-end" : "bot bg-white/15 text-white self-start"
                      )}
                    >
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ))}
                  {isChatLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                    <div className="message bot bg-white/15 text-white self-start max-w-[85%] p-4 rounded-[18px] text-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang trả lời...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-6 border-t border-white/10">
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input 
                      type="text" 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Nhập tin nhắn..."
                      className="flex-1 p-4 rounded-[14px] bg-white/5 border border-white/10 outline-none text-white placeholder-white/30 focus:border-[#4f8cff]/50 transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={isChatLoading || (!chatInput.trim() && !selectedImage)}
                      className="w-14 h-14 flex items-center justify-center rounded-[14px] bg-[#4f8cff] text-white cursor-pointer disabled:opacity-50 transition-opacity"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Toaster position="top-center" richColors />
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
