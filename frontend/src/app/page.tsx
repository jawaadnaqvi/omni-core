"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import Image from "next/image";
import { 
  BrainCircuit, LayoutDashboard, FileText, Library, 
  MessageSquare, GraduationCap, Play, Pause, Search, 
  Trash2, UploadCloud, LogOut, Volume2, Send, CheckCircle2,
  ChevronRight, Calendar, Clock, Plus, Timer, 
  Bot, Sparkles, FileSearch, MessageSquareText, RotateCcw, VolumeX,
  Video, MonitorPlay, Copy, PhoneOff, ExternalLink
} from "lucide-react";

// ==========================================
// --- TypeScript Interfaces ---
// ==========================================
type User = { id: number; email: string; full_name: string };
type Collection = { id: number; name: string; description?: string };
type Note = { id: number; title: string; content: string; collection_id: number | null; created_at: string };
type ChatMessage = { id?: number; role: "user" | "assistant"; content: string; created_at?: string; note_id?: number };
type Meeting = { id: number; title: string; room_name: string; user_id: number; created_at: string };

export default function Dashboard() {
  // ==========================================
  // --- Global State ---
  // ==========================================
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileProfile, setShowMobileProfile] = useState(false);
  
  // AI Assistant Blinking State
  const [isBlinking, setIsBlinking] = useState(false);

  // ==========================================
  // --- Auth State ---
  // ==========================================
  const [isLogin, setIsLogin] = useState(true); 
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // ==========================================
  // --- Core Data State ---
  // ==========================================
  const [notes, setNotes] = useState<Note[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  
  // ==========================================
  // --- Form & UI State ---
  // ==========================================
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedCollectionForm, setSelectedCollectionForm] = useState<string>("");
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newBookName, setNewBookName] = useState("");
  const [newBookDesc, setNewBookDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadingNoteId, setUploadingNoteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewingBookId, setViewingBookId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  // ==========================================
  // --- Meeting & Timer State ---
  // ==========================================
  const [activeMeeting, setActiveMeeting] = useState<Meeting | null>(null);
  const [pomoTime, setPomoTime] = useState(25 * 60);
  const [pomoActive, setPomoActive] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // ==========================================
  // --- Chat & AI State ---
  // ==========================================
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [targetNote, setTargetNote] = useState<Note | null>(null); 
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [speakingId, setSpeakingId] = useState<number | null>(null); 
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // --- Mock Test State ---
  // ==========================================
  const [mockTestPattern, setMockTestPattern] = useState("Generate 5 MCQs, 3 Short Questions, and 1 Long Question.");
  const [selectedMockBook, setSelectedMockBook] = useState<string>("");
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);
  const [generatedTest, setGeneratedTest] = useState("");
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);

  // --- Constants ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";
  const JITSI_SERVER = "meet.ffmuc.net";

  // ==========================================
  // --- Effects (Side Effects) ---
  // ==========================================

  // 1. Initial Load: Check Auth & Fetch Data
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      fetchUserProfile(storedToken);
      fetchData(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  // 2. Teechu (AI Assistant) Blinking Animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 200); // 200ms blink duration
    }, 3000); // Blink every 3 seconds
    return () => clearInterval(blinkInterval);
  }, []);

  // 3. Live Clock
  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Auto-hide Toast Messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // 5. Pomodoro Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (pomoActive && pomoTime > 0) {
      interval = setInterval(() => setPomoTime(t => t - 1), 1000);
    } else if (pomoTime === 0 && pomoActive) {
      setPomoActive(false);
      setPomoTime(25 * 60);
      alert("🎉 Focus session complete! Take a 5-minute break.");
    }
    return () => clearInterval(interval);
  }, [pomoActive, pomoTime]);

  // 6. Auto-scroll Chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isAiTyping]);

  // 7. Fetch Data on Tab Change
  useEffect(() => {
    if (activeTab === "ai") {
      fetchChatHistory();
      if (targetNote) fetchSuggestions(targetNote.id);
    }
    if (activeTab === "meetings" && token) {
      fetchMeetings(token);
    }
  }, [activeTab, targetNote]);

  // ==========================================
  // --- Helper Functions ---
  // ==========================================
  
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => { 
    setPomoActive(false); 
    setPomoTime(25 * 60); 
  };

  const getGreeting = () => {
    if (!currentTime) return "Welcome";
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return "Good morning";
    if (hour >= 12 && hour < 17) return "Good afternoon";
    if (hour >= 17 && hour < 21) return "Good evening";
    return "Good night";
  };

  const copyToClipboard = (text: string) => { 
    navigator.clipboard.writeText(text); 
    setMessage("✅ Link copied to clipboard!"); 
  };

  // ==========================================
  // --- API Fetching Functions ---
  // ==========================================
  
  const fetchUserProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setUser(await res.json());
      else handleLogout();
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const fetchData = async (authToken: string) => {
    try {
      const [notesRes, colRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/notes/`, { headers: { Authorization: `Bearer ${authToken}` } }),
        fetch(`${API_URL}/api/v1/notes/collections`, { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      if (notesRes.ok && colRes.ok) {
        setNotes(await notesRes.json());
        setCollections(await colRes.json());
      }
    } catch (err) { console.error(err); }
  };

  const fetchMeetings = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/notes/meetings`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) setMeetings(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchChatHistory = async () => {
    if (!token) return;
    try {
      const url = targetNote ? `${API_URL}/api/v1/ai/history?note_id=${targetNote.id}` : `${API_URL}/api/v1/ai/history`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setChatHistory(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchSuggestions = async (noteId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/ai/suggestions/${noteId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSuggestions((await res.json()).questions);
    } catch (err) { console.error(err); }
  };

  // ==========================================
  // --- Action Handlers ---
  // ==========================================

  // 1. Text-to-Speech Toggle
  const toggleSpeak = (id: number, text: string) => {
    if (speakingId === id) { 
      window.speechSynthesis.cancel(); 
      setSpeakingId(null); 
    } else {
      window.speechSynthesis.cancel(); 
      const cleanText = text.replace(/[*#`_]/g, ''); 
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setSpeakingId(null); 
      window.speechSynthesis.speak(utterance);
      setSpeakingId(id);
    }
  };

  // 2. Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setAuthLoading(true); 
    setAuthMessage("");
    
    const url = isLogin ? `${API_URL}/api/v1/auth/login` : `${API_URL}/api/v1/auth/register`;
    const body = isLogin 
      ? new URLSearchParams({ username: email, password }) 
      : JSON.stringify({ email, password, full_name: fullName });
      
    try {
      const res = await fetch(url, { 
        method: "POST", 
        headers: isLogin ? { "Content-Type": "application/x-www-form-urlencoded" } : { "Content-Type": "application/json" }, 
        body 
      });
      const data = await res.json();
      if (res.ok) {
        if (isLogin) { 
          localStorage.setItem("token", data.access_token); 
          setToken(data.access_token); 
          fetchUserProfile(data.access_token); 
          fetchData(data.access_token); 
        } else { 
          setAuthMessage("✅ Account created! Please login."); 
          setIsLogin(true); 
          setPassword(""); 
        }
      } else {
        setAuthMessage(`❌ ${data.detail || "Something went wrong"}`);
      }
    } catch (err) { 
      setAuthMessage("❌ Failed to connect to the backend. Please try again later."); 
    } finally { 
      setAuthLoading(false); 
    }
  };

  // 3. Meeting Handlers
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!token || !newMeetingTitle.trim()) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notes/meetings`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ title: newMeetingTitle }) 
      });
      if (res.ok) { 
        setMessage("✅ Live class created!"); 
        setNewMeetingTitle(""); 
        fetchMeetings(token); 
      }
    } catch (err) { 
      setMessage("❌ Network error."); 
    }
  };

  const handleDeleteMeeting = async (meetingId: number) => {
    if (!token || !confirm("Delete this class?")) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notes/meetings/${meetingId}`, { 
        method: "DELETE", 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) { 
        setMessage("🗑️ Class deleted."); 
        fetchMeetings(token); 
      }
    } catch (err) { 
      setMessage("❌ Network error."); 
    }
  };

  // 4. Note & Book Handlers
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!token) return setMessage("❌ Session expired. Please log in again.");
    try {
      const res = await fetch(`${API_URL}/api/v1/notes/`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ title: newTitle, content: newContent, collection_id: selectedCollectionForm ? parseInt(selectedCollectionForm) : null }) 
      });
      if (res.ok) { 
        setMessage("✅ Note created."); 
        setNewTitle(""); setNewContent(""); setSelectedCollectionForm(""); 
        fetchData(token); 
      } else { 
        const errorData = await res.json(); 
        setMessage(`❌ ${errorData.detail || "Failed to create note"}`); 
      }
    } catch (err) { setMessage("❌ Network error."); }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/notes/collections`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ name: newBookName, description: newBookDesc }) 
      });
      if (res.ok) { 
        setMessage("✅ Book created."); 
        setNewBookName(""); setNewBookDesc(""); 
        fetchData(token); 
      }
    } catch (err) { setMessage("❌ Network error."); }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!token || !confirm("Delete this note?")) return;
    try {
      await fetch(`${API_URL}/api/v1/notes/${noteId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setMessage("🗑️ Note deleted."); 
      fetchData(token);
      if (targetNote?.id === noteId) { setTargetNote(null); setActiveTab("notes"); }
    } catch (err) { console.error(err); }
  };

  const handleDeleteBook = async (colId: number) => {
    if (!token || !confirm("Delete this book?")) return;
    try {
      await fetch(`${API_URL}/api/v1/notes/collections/${colId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setMessage("🗑️ Book deleted."); 
      setViewingBookId(null); 
      fetchData(token);
    } catch (err) { console.error(err); }
  };

  const handleUploadPdf = async (noteId: number) => {
    if (!file || !token) return setMessage("❌ Please select a file first.");
    setUploadingNoteId(noteId);
    const formData = new FormData(); 
    formData.append("file", file);
    try {
      const res = await fetch(`${API_URL}/api/v1/notes/${noteId}/upload`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData });
      if (res.ok) {
        setMessage("✅ PDF uploaded successfully."); 
        setFile(null);
        const fileInput = document.getElementById(`file-${noteId}`) as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else setMessage("❌ Upload failed.");
    } catch (err) { setMessage("❌ Upload failed due to a network error."); } finally { setUploadingNoteId(null); }
  };

  // 5. AI Chat Handler
  const handleSendMessage = async (e: React.FormEvent, customPrompt?: string) => {
    e.preventDefault(); 
    const promptToSend = customPrompt || chatPrompt;
    if (!promptToSend.trim() || !token) return;
    
    setChatPrompt("");
    setChatHistory(prev => [...prev, { role: "user", content: promptToSend, note_id: targetNote?.id }]);
    setIsAiTyping(true);
    
    try {
      const res = await fetch(`${API_URL}/api/v1/ai/chat`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ prompt: promptToSend, note_id: targetNote ? targetNote.id : null }) 
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(prev => [...prev, { role: "assistant", content: data.response, note_id: targetNote?.id }]);
      } else {
        setChatHistory(prev => [...prev, { role: "assistant", content: "❌ AI failed to respond. Please try again." }]);
      }
    } catch (err) { } finally { setIsAiTyping(false); }
  };

  // 6. Mock Test Handler
  const handleGenerateMockTest = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!token) return;
    setIsGeneratingTest(true); 
    setGeneratedTest("");
    try {
      const res = await fetch(`${API_URL}/api/v1/ai/mock-test`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ book_id: selectedMockBook ? parseInt(selectedMockBook) : null, note_ids: selectedChapters, pattern: mockTestPattern }) 
      });
      if (res.ok) setGeneratedTest((await res.json()).test_content);
    } catch (err) { } finally { setIsGeneratingTest(false); }
  };

  // 7. Logout
  const handleLogout = () => {
    window.speechSynthesis.cancel(); 
    localStorage.removeItem("token"); 
    setToken(null); 
    setUser(null);
  };

  // --- Filtering Logic ---
  const filteredNotes = viewingBookId 
    ? notes.filter(n => n.collection_id === viewingBookId) 
    : notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase()) || (n.content && n.content.toLowerCase().includes(searchQuery.toLowerCase())));

  // ==========================================
  // --- Loading & Auth Screens ---
  // ==========================================

  if (isLoading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!token) {
    return (
      <div className="min-h-screen flex bg-[#050505] text-gray-200 font-sans selection:bg-indigo-500/30 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-50"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[120px] animate-float-delayed"></div>
        </div>

        {/* Branding Side */}
        <div className="hidden lg:flex w-1/2 relative z-10 items-center justify-center border-r border-white/5">
          <div className="relative text-center px-12">
            <div className="w-20 h-20 mx-auto bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/50 mb-8 rotate-3 hover:rotate-0 transition-transform duration-300 animate-pulse-glow">
              <BrainCircuit className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl font-bold tracking-tight mb-6 leading-tight text-white">
              Your Personal <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">AI Knowledge Hub</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto">Organize your notes, upload study materials, and chat with an AI that actually knows your syllabus.</p>
          </div>
        </div>

        {/* Form Side */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md bg-[#0a0a0a]/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
            <div className="text-center mb-10 lg:text-left">
              <h2 className="text-3xl font-bold text-white mb-2">{isLogin ? "Welcome back" : "Create an account"}</h2>
              <p className="text-gray-400">{isLogin ? "Enter your details to access your dashboard." : "Start your journey with Omni Core today."}</p>
            </div>
            
            {authMessage && (
              <div className={`mb-6 p-3 rounded-lg text-sm font-medium border text-center ${authMessage.includes("✅") ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                {authMessage}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-5">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <input type="text" placeholder="Jawaad Naqvi" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-gray-500 transition-all" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                <input type="email" placeholder="jawaad@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-gray-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-white placeholder-gray-500 transition-all" />
              </div>
              <button type="submit" disabled={authLoading} className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] mt-4 flex justify-center items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {authLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLogin ? "Sign In" : "Create Account")}
              </button>
            </form>
            
            <p className="mt-8 text-center text-sm text-gray-400">
              {isLogin ? "New to Omni Core? " : "Already have an account? "}
              <button onClick={() => { setIsLogin(!isLogin); setAuthMessage(""); }} className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded">
                {isLogin ? "Create an account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // --- Main Dashboard Render ---
  // ==========================================
  return (
    <div className="flex h-screen bg-[#050505] text-gray-200 font-sans overflow-hidden selection:bg-indigo-500/30">
      
      {/* --- Animated Background --- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-grid-pattern opacity-30"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] animate-float-delayed"></div>
      </div>

      {/* --- Sidebar (Desktop Only) --- */}
      <aside className="w-[260px] bg-[#0a0a0a]/80 backdrop-blur-xl border-r border-white/5 flex-col hidden md:flex flex-shrink-0 z-20 print:hidden">
        <div className="h-16 flex items-center px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Omni Core</span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
          <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Workspace</p>
          <button onClick={() => { setActiveTab("dashboard"); window.speechSynthesis.cancel(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "dashboard" ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}><LayoutDashboard className="w-4 h-4" /> Dashboard</button>
          <button onClick={() => { setActiveTab("notes"); setTargetNote(null); window.speechSynthesis.cancel(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "notes" ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}><FileText className="w-4 h-4" /> My Notes</button>
          <button onClick={() => { setActiveTab("collections"); setTargetNote(null); window.speechSynthesis.cancel(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "collections" ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}><Library className="w-4 h-4" /> My Books</button>
          
          <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2">AI Tools</p>
          <button onClick={() => { setActiveTab("ai"); setTargetNote(null); window.speechSynthesis.cancel(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "ai" && !targetNote ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}><Bot className="w-4 h-4" /> AI Tutor</button>
          <button onClick={() => { setActiveTab("mocktest"); window.speechSynthesis.cancel(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "mocktest" ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}><GraduationCap className="w-4 h-4" /> Mock Tests</button>
          
          <p className="px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2">Live</p>
          <button onClick={() => { setActiveTab("meetings"); setActiveMeeting(null); window.speechSynthesis.cancel(); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "meetings" ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-white/5 hover:text-white"}`}><Video className="w-4 h-4" /> Live Classes</button>
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md animate-pulse-glow">{user?.full_name?.charAt(0).toUpperCase() || "U"}</div>
            <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-white truncate">{user?.full_name}</p><p className="text-xs text-gray-400 truncate">{user?.email}</p></div>
          </div>
          <button onClick={handleLogout} className="w-full mt-2 flex items-center justify-center gap-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 py-2 rounded-lg text-xs font-medium transition-colors border border-transparent hover:border-red-500/10"><LogOut className="w-3.5 h-3.5" /> Sign Out</button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10 bg-transparent">
        
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-8 border-b border-white/5 bg-[#050505]/50 backdrop-blur-md sticky top-0 z-30 print:hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-white capitalize flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-500 md:hidden" />
              <span className="hidden md:block">{activeTab === 'mocktest' ? 'Mock Tests' : activeTab === 'meetings' ? 'Live Classes' : activeTab === 'collections' ? 'My Books' : activeTab}</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            {currentTime && (
              <div className="hidden md:flex items-center gap-4 bg-white/5 border border-white/5 rounded-full px-4 py-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-gray-300"><Clock className="w-3.5 h-3.5 text-indigo-400" /><span className="font-mono">{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>
                <div className="w-px h-3 bg-white/10"></div>
                <div className="flex items-center gap-1.5 text-xs text-gray-300"><Calendar className="w-3.5 h-3.5" />{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
              </div>
            )}
            <button onClick={() => { setActiveTab("notes"); setTargetNote(null); }} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-600/20 focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <Plus className="w-4 h-4" /> <span className="hidden md:inline">New Note</span>
            </button>
            <div className="relative md:hidden">
              <button onClick={() => setShowMobileProfile(!showMobileProfile)} className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400">
                {user?.full_name?.charAt(0).toUpperCase() || "U"}
              </button>
              {showMobileProfile && (
                <div className="absolute top-12 right-0 w-48 bg-[#121214] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="p-4 border-b border-white/5 bg-[#0a0a0a]">
                    <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Toast Message */}
        {message && (
          <div className="absolute top-20 right-4 md:right-8 z-50 flex items-center gap-3 bg-[#18181b] border border-indigo-500/30 text-white px-4 py-3 rounded-xl shadow-2xl animate-in slide-in-from-right-8 fade-in print:hidden">
            <CheckCircle2 className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-medium">{message}</span>
          </div>
        )}

        {/* Dynamic Content View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8 print:p-0 print:overflow-visible">
          
          {/* ========================================== */}
          {/* TAB: LIVE CLASSES                         */}
          {/* ========================================== */}
          {activeTab === "meetings" && (
            <div className="max-w-6xl mx-auto h-full flex flex-col animate-in fade-in duration-500 print:hidden">
              {activeMeeting ? (
                /* Waiting Room UI */
                <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0a0a] rounded-2xl border border-white/10 p-6 md:p-12 text-center shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full animate-pulse"></div>
                  <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mb-6 relative z-10 animate-float">
                    <Video className="w-12 h-12 text-indigo-400" />
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-3 relative z-10">{activeMeeting.title}</h2>
                  <p className="text-gray-400 max-w-md mx-auto mb-8 relative z-10">
                    Your meeting room is ready. Click the button below to join the video call in a new tab. You can also copy the guest link to share with students. Lobby is enabled for security.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    {/* HOST JOIN BUTTON (Lobby Enabled) */}
                    <button 
                      onClick={() => window.open(`https://${JITSI_SERVER}/${activeMeeting.room_name}#config.prejoinPageEnabled=false&config.lobby.enabled=true`, "_blank")} 
                      className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    >
                      <ExternalLink className="w-5 h-5" /> Join Video Call
                    </button>
                    
                    {/* COPY GUEST LINK BUTTON (Lobby Enabled) */}
                    <button 
                      onClick={() => copyToClipboard(`https://${JITSI_SERVER}/${activeMeeting.room_name}#config.lobby.enabled=true`)} 
                      className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-medium transition-all hover:-translate-y-0.5"
                    >
                      <Copy className="w-5 h-5" /> Copy Guest Link
                    </button>
                  </div>
                  <button onClick={() => setActiveMeeting(null)} className="mt-12 text-sm text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors">
                    <PhoneOff className="w-4 h-4" /> Leave Waiting Room
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold text-white">Live Classroom</h1>
                    <p className="text-sm text-gray-400">Start a virtual class and share the link with your students.</p>
                  </div>
                  <form onSubmit={handleCreateMeeting} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center">
                    <input type="text" value={newMeetingTitle} onChange={e => setNewMeetingTitle(e.target.value)} required className="flex-1 w-full p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white text-sm" placeholder="Class Title (e.g., AI Lecture 1)" />
                    <button type="submit" className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5">
                      <Video className="w-4 h-4" /> Start Class
                    </button>
                  </form>
                  <h3 className="text-lg font-semibold text-white mt-8 mb-4">Your Scheduled Classes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {meetings.map(meeting => (
                      <div key={meeting.id} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl flex flex-col relative group hover:border-indigo-500/30 transition-all card-hover">
                        <button onClick={() => handleDeleteMeeting(meeting.id)} className="absolute top-3 right-3 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all bg-white/5 p-1.5 rounded-md" title="Delete Class">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-4 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                          <MonitorPlay className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h4 className="text-white font-semibold mb-1 pr-6 truncate">{meeting.title}</h4>
                        <p className="text-xs text-gray-400 mb-4">Created: {new Date(meeting.created_at).toLocaleDateString()}</p>
                        <div className="mt-auto flex gap-2">
                          <button onClick={() => setActiveMeeting(meeting)} className="flex-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs py-2 rounded-lg transition font-medium border border-indigo-500/30 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                            <Video className="w-3.5 h-3.5" /> Join Room
                          </button>
                          <button onClick={() => copyToClipboard(`https://${JITSI_SERVER}/${meeting.room_name}#config.lobby.enabled=true`)} className="px-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg transition-colors border border-white/5" title="Copy Guest Link">
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {meetings.length === 0 && (
                      <div className="col-span-full text-center text-gray-400 py-10 bg-[#0a0a0a] border border-white/5 rounded-xl">
                        No classes scheduled yet. Create your first live class above.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB: DASHBOARD                            */}
          {/* ========================================== */}
          {activeTab === "dashboard" && (
             <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 print:hidden">
               <div>
                 <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{getGreeting()}, {user?.full_name?.split(' ')[0]}! 👋</h1>
                 <p className="text-gray-400">Here is a quick overview of your progress today.</p>
               </div>
               
               {/* Stats Grid */}
               <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                 <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 p-4 md:p-6 rounded-2xl relative overflow-hidden group card-hover">
                   <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-2 md:mb-4 relative z-10">
                     <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform flex-shrink-0"><FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-400" /></div>
                     <div><p className="text-xs md:text-sm font-medium text-gray-400">Total Notes</p><p className="text-2xl md:text-3xl font-bold text-white">{notes.length}</p></div>
                   </div>
                   <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 text-blue-500/5 group-hover:text-blue-500/10 transition-colors"><FileText className="w-20 h-20 md:w-32 md:h-32" /></div>
                 </div>
                 <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 p-4 md:p-6 rounded-2xl relative overflow-hidden group card-hover">
                   <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-2 md:mb-4 relative z-10">
                     <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-110 transition-transform flex-shrink-0"><Library className="w-5 h-5 md:w-6 md:h-6 text-purple-400" /></div>
                     <div><p className="text-xs md:text-sm font-medium text-gray-400">Active Books</p><p className="text-2xl md:text-3xl font-bold text-white">{collections.length}</p></div>
                   </div>
                   <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 text-purple-500/5 group-hover:text-purple-500/10 transition-colors"><Library className="w-20 h-20 md:w-32 md:h-32" /></div>
                 </div>
                 <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10 p-4 md:p-6 rounded-2xl relative overflow-hidden group card-hover col-span-2 md:col-span-1">
                   <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-2 md:mb-4 relative z-10">
                     <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:scale-110 transition-transform flex-shrink-0"><MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-green-400" /></div>
                     <div><p className="text-xs md:text-sm font-medium text-gray-400">AI Interactions</p><p className="text-2xl md:text-3xl font-bold text-white">{chatHistory.length}</p></div>
                   </div>
                   <div className="absolute -bottom-2 -right-2 md:-bottom-4 md:-right-4 text-green-500/5 group-hover:text-green-500/10 transition-colors"><MessageSquare className="w-20 h-20 md:w-32 md:h-32" /></div>
                 </div>
               </div>

               {/* Split Layout: Recent Notes & Timer */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 space-y-4">
                   <div className="flex items-center justify-between">
                     <h3 className="text-lg font-semibold text-white">Recent Notes</h3>
                     <button onClick={() => { setActiveTab("notes"); setTargetNote(null); }} className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">View all <ChevronRight className="w-4 h-4"/></button>
                   </div>
                   {notes.length > 0 ? (
                     <div className="grid grid-cols-1 gap-4">
                       {notes.slice(0, 3).map(note => (
                         <div key={note.id} className="bg-[#0a0a0a] border border-white/5 hover:border-indigo-500/30 p-5 rounded-xl transition-all cursor-pointer group flex items-start gap-4 card-hover">
                           <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 border border-indigo-500/20 group-hover:scale-110 transition-transform"><FileText className="w-5 h-5 text-indigo-400" /></div>
                           <div className="flex-1 min-w-0"><h4 className="font-semibold text-white mb-1 truncate group-hover:text-indigo-300 transition-colors">{note.title}</h4><p className="text-sm text-gray-400 line-clamp-1">{note.content || "No text content."}</p></div>
                           <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="bg-[#0a0a0a] border border-dashed border-white/10 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                       <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 animate-float"><FileText className="w-8 h-8 text-indigo-400 opacity-50" /></div>
                       <h4 className="text-white font-medium mb-1">No notes yet</h4>
                       <p className="text-sm text-gray-400 mb-4 max-w-xs">Create your first note to start building your AI knowledge base.</p>
                       <button onClick={() => { setActiveTab("notes"); setTargetNote(null); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-600/20">Create First Note</button>
                     </div>
                   )}
                 </div>

                 {/* Pomodoro Timer Widget */}
                 <div className="space-y-4">
                   <h3 className="text-lg font-semibold text-white">Productivity</h3>
                   <div className="bg-gradient-to-br from-indigo-900/30 to-[#0a0a0a] border border-indigo-500/20 p-6 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.1)] relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full animate-pulse"></div>
                     <Timer className="w-6 h-6 text-indigo-400 mb-4" />
                     <p className="text-5xl font-mono font-bold text-white tracking-tight mb-2">{formatTime(pomoTime)}</p>
                     <p className="text-xs text-indigo-300/70 font-medium uppercase tracking-widest mb-6">Pomodoro Timer</p>
                     <div className="flex gap-2 w-full">
                       <button onClick={() => setPomoActive(!pomoActive)} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${pomoActive ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 hover:-translate-y-0.5'}`}>{pomoActive ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}</button>
                       <button onClick={resetTimer} className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-white/5 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400" title="Reset Timer"><RotateCcw className="w-4 h-4" /></button>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
          )}

          {/* ========================================== */}
          {/* TAB: NOTES                                */}
          {/* ========================================== */}
          {activeTab === "notes" && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 print:hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><h1 className="text-2xl font-bold text-white">My Notes</h1><p className="text-sm text-gray-400">Create, manage, and upload study materials.</p></div>
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input type="text" placeholder="Search notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-white/10 rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-white text-sm transition-all" />
                </div>
              </div>
              
              <form onSubmit={handleCreateNote} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-3">
                  <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="w-full p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white text-sm transition-all" placeholder="Note Title (e.g., Operating Systems Chapter 1)" />
                  <input type="text" value={newContent} onChange={e => setNewContent(e.target.value)} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white text-sm transition-all" placeholder="Content overview (Optional)" />
                </div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3">
                  <select value={selectedCollectionForm} onChange={e => setSelectedCollectionForm(e.target.value)} className="w-full sm:w-40 p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white text-sm">
                    <option value="">No Book</option>
                    {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <Plus className="w-4 h-4" /> Create
                  </button>
                </div>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredNotes.map(note => (
                  <div key={note.id} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl flex flex-col relative group transition-all shadow-lg card-hover">
                    <button onClick={() => handleDeleteNote(note.id)} className="absolute top-4 right-4 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all bg-white/5 p-2 rounded-lg" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    <h3 className="text-lg font-semibold text-white mb-2 pr-10">{note.title}</h3>
                    <p className="text-sm text-gray-400 mb-4 flex-1 line-clamp-3">{note.content || "No content provided."}</p>
                    
                    <div className="bg-[#050505] p-3 rounded-xl border border-white/5 mt-auto space-y-2">
                      <div className="flex items-center gap-2 mb-1"><UploadCloud className="w-4 h-4 text-indigo-400" /><span className="text-xs font-medium text-gray-300">Document Actions</span></div>
                      <input type="file" accept=".pdf,.txt" id={`file-${note.id}`} onChange={(e) => setFile(e.target.files?.[0] || null)} className="w-full text-xs text-gray-400 mb-2 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 transition-colors" />
                      <button onClick={() => handleUploadPdf(note.id)} disabled={uploadingNoteId === note.id} className="w-full bg-white/5 hover:bg-white/10 text-xs py-2 rounded-lg transition text-gray-300 font-medium">{uploadingNoteId === note.id ? "Processing..." : "Upload PDF"}</button>
                      <button onClick={() => { setTargetNote(note); setActiveTab("ai"); window.speechSynthesis.cancel(); }} className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 border border-indigo-500/30 hover:-translate-y-0.5"><FileSearch className="w-3.5 h-3.5" /> Chat with PDF</button>
                    </div>
                  </div>
                ))}
                {filteredNotes.length === 0 && (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6"><FileText className="w-10 h-10 text-indigo-400 opacity-50" /></div>
                    <h3 className="text-xl font-bold text-white mb-2">No notes found</h3>
                    <p className="text-gray-400 mb-6 max-w-sm">You haven't created any notes yet, or your search didn't match. Create your first note to get started!</p>
                    <button onClick={() => { setActiveTab("notes"); setTargetNote(null); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-indigo-600/20">Create Note</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB: BOOKS                                */}
          {/* ========================================== */}
          {activeTab === "collections" && (
            <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 print:hidden">
              <div><h1 className="text-2xl font-bold text-white">My Books</h1><p className="text-sm text-gray-400">Organize your notes into subjects or folders.</p></div>
              <form onSubmit={handleCreateBook} className="bg-[#0a0a0a] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row gap-4">
                <input type="text" value={newBookName} onChange={e => setNewBookName(e.target.value)} required className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white text-sm" placeholder="Book Name (e.g., Artificial Intelligence)" />
                <input type="text" value={newBookDesc} onChange={e => setNewBookDesc(e.target.value)} className="flex-1 p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white text-sm" placeholder="Description / Author (Optional)" />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"><Plus className="w-4 h-4" /> Add Book</button>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {collections.map(col => (
                  <div key={col.id} onClick={() => setViewingBookId(col.id)} className={`p-5 rounded-2xl border cursor-pointer transition-all relative group card-hover ${viewingBookId === col.id ? "bg-indigo-500/10 border-indigo-500/50" : "bg-[#0a0a0a] border-white/5 hover:border-white/20"}`}>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(col.id); }} className="absolute top-3 right-3 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all bg-white/5 p-1.5 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
                    <Library className={`w-6 h-6 mb-3 ${viewingBookId === col.id ? "text-indigo-400" : "text-gray-400"}`} />
                    <h3 className="text-base font-semibold text-white mb-1 pr-6 truncate">{col.name}</h3>
                    <p className="text-xs text-gray-400 truncate">{col.description || "No description."}</p>
                  </div>
                ))}
              </div>
              {viewingBookId && (
                <div className="mt-8 pt-8 border-t border-white/5">
                  <div className="flex justify-between items-center mb-6"><h3 className="text-lg font-semibold text-white">Notes in this Book</h3><button onClick={() => setViewingBookId(null)} className="text-sm text-gray-400 hover:text-white">Clear Filter ✕</button></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredNotes.map(note => (
                      <div key={note.id} className="bg-[#0a0a0a] p-4 rounded-xl border border-white/5 card-hover"><h4 className="font-medium text-white mb-1">{note.title}</h4><p className="text-xs text-gray-400 line-clamp-2">{note.content || "No content."}</p></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================== */}
          {/* TAB: AI CHAT                              */}
          {/* ========================================== */}
          {activeTab === "ai" && (
            <div className="h-full flex flex-col max-w-6xl mx-auto animate-in fade-in duration-500 print:hidden">
              {targetNote ? (
                <div className="mb-4 bg-[#0a0a0a] border border-indigo-500/30 rounded-xl p-4 flex items-start gap-4 shadow-lg shadow-indigo-500/10">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0 relative animate-pulse-glow"><FileText className="w-5 h-5 text-indigo-400" /><div className="absolute -bottom-1 -right-1 bg-indigo-600 rounded-full p-0.5 border border-[#0a0a0a]"><MessageSquareText className="w-3 h-3 text-white" /></div></div>
                  <div className="flex-1"><div className="flex justify-between items-start"><div><h3 className="text-white font-semibold text-sm flex items-center gap-2">{targetNote.title} <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Targeted Mode</span></h3><p className="text-xs text-gray-400 mt-1">Chars: {targetNote.content?.length || 'N/A'} • ID: {targetNote.id}</p></div><button onClick={() => { setTargetNote(null); window.speechSynthesis.cancel(); }} className="text-xs text-gray-400 hover:text-white bg-white/5 px-2 py-1 rounded">Clear Target ✕</button></div></div>
                </div>
              ) : (
                <div className="text-center mb-6"><div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-float"><Bot className="w-6 h-6 text-indigo-400" /></div><h1 className="text-2xl font-bold text-white">AI Tutor</h1><p className="text-sm text-gray-400">Ask anything about all your uploaded documents.</p></div>
              )}
              <div className="flex-1 overflow-y-auto space-y-6 pb-4 custom-scrollbar">
                {chatHistory.length === 0 && (<div className="text-center text-gray-400 mt-10"><Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20 animate-pulse" /><p>Start a conversation.</p></div>)}
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (<div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-1">{targetNote ? <FileSearch className="w-4 h-4 text-indigo-400" /> : <Bot className="w-4 h-4 text-indigo-400" />}</div>)}
                    <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-5 py-4 ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-600/20" : "bg-[#0a0a0a] border border-white/5 text-gray-200 rounded-tl-sm shadow-xl"}`}>
                      {msg.role === "assistant" ? (
                        <div>
                          <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-[#050505] prose-pre:border prose-pre:border-white/10"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                          <div className="mt-3 flex justify-end border-t border-white/5 pt-2"><button onClick={() => toggleSpeak(idx, msg.content)} className="text-xs flex items-center gap-1.5 text-gray-400 hover:text-indigo-400 transition-colors">{speakingId === idx ? <><VolumeX className="w-3.5 h-3.5 text-red-400" /> Stop</> : <><Volume2 className="w-3.5 h-3.5" /> Listen</>}</button></div>
                        </div>
                      ) : (<p className="text-sm leading-relaxed">{msg.content}</p>)}
                    </div>
                  </div>
                ))}
                {isAiTyping && (
                  <div className="flex gap-4"><div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">{targetNote ? <FileSearch className="w-4 h-4 text-indigo-400" /> : <Bot className="w-4 h-4 text-indigo-400" />}</div><div className="bg-[#0a0a0a] border border-white/5 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2"><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span><span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]"></span></div></div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="pt-4 border-t border-white/5 space-y-4">
                {suggestions.length > 0 && (<div className="flex flex-wrap gap-2">{suggestions.map((q, i) => (<button key={i} onClick={(e) => handleSendMessage(e as any, q)} className="text-xs bg-white/5 hover:bg-indigo-500/20 text-gray-300 hover:text-indigo-300 border border-white/10 hover:border-indigo-500/30 px-3 py-1.5 rounded-full transition-all text-left hover:-translate-y-0.5">{q}</button>))}</div>)}
                <form onSubmit={handleSendMessage} className="relative">
                  <input type="text" value={chatPrompt} onChange={e => setChatPrompt(e.target.value)} placeholder={targetNote ? `Ask about "${targetNote.title}"...` : "Message AI Tutor..."} className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-2xl pl-5 pr-14 py-4 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 shadow-xl transition-all" disabled={isAiTyping} />
                  <button type="submit" disabled={isAiTyping || !chatPrompt.trim()} className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400"><Send className="w-4 h-4" /></button>
                </form>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB: MOCK TESTS                           */}
          {/* ========================================== */}
          {activeTab === "mocktest" && (
            <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
              <div className="print:hidden"><h1 className="text-2xl font-bold text-white">AI Exam Generator</h1><p className="text-sm text-gray-400">Generate predicted questions and mock exams based on your syllabus.</p></div>
              <div className="bg-[#0a0a0a] border border-white/5 p-6 rounded-2xl print:hidden">
                <form onSubmit={handleGenerateMockTest} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2"><label className="text-sm font-medium text-gray-300">1. Select Subject</label><select value={selectedMockBook} onChange={e => { setSelectedMockBook(e.target.value); setSelectedChapters([]); }} className="w-full p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white text-sm"><option value="">All Books</option>{collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                    <div className="space-y-2"><label className="text-sm font-medium text-gray-300">2. Exam Pattern</label><input type="text" value={mockTestPattern} onChange={e => setMockTestPattern(e.target.value)} required className="w-full p-3 bg-white/5 rounded-xl border border-white/10 focus:border-indigo-500 outline-none text-white text-sm" placeholder="e.g. 10 MCQs and 2 Long Questions" /></div>
                  </div>
                  {selectedMockBook && (<div className="p-4 bg-white/5 rounded-xl border border-white/5 space-y-3"><label className="text-sm font-medium text-gray-300">3. Select Chapters (Optional)</label><div className="flex flex-wrap gap-3">{notes.filter(n => n.collection_id === parseInt(selectedMockBook)).map(note => (<label key={note.id} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer bg-[#050505] px-3 py-2 rounded-lg border border-white/5 hover:border-indigo-500/50 transition-all"><input type="checkbox" checked={selectedChapters.includes(note.id)} onChange={() => setSelectedChapters(prev => prev.includes(note.id) ? prev.filter(id => id !== note.id) : [...prev, note.id])} className="rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500" />{note.title}</label>))}{notes.filter(n => n.collection_id === parseInt(selectedMockBook)).length === 0 && <span className="text-sm text-gray-400">No chapters found.</span>}</div></div>)}
                  <button type="submit" disabled={isGeneratingTest} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 transition-all flex justify-center items-center gap-2 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400">{isGeneratingTest ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Generating Exam...</> : <><GraduationCap className="w-5 h-5" /> Generate Mock Test</>}</button>
                </form>
              </div>
              {generatedTest && (<div className="printable-test mt-8 bg-white text-black p-8 md:p-12 rounded-2xl shadow-2xl print:shadow-none print:p-0"><div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-4 print:hidden"><div><h2 className="text-2xl font-bold text-black">Omni Core Mock Exam</h2><p className="text-sm text-gray-500">Generated by AI</p></div><button onClick={() => window.print()} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors">🖨️ Print PDF</button></div><div className="prose prose-sm md:prose-base max-w-none prose-headings:font-bold prose-headings:text-black prose-p:text-gray-800 prose-li:text-gray-800"><ReactMarkdown>{generatedTest}</ReactMarkdown></div></div>)}
            </div>
          )}

        </div>
      </main>

      {/* ========================================== */}
      {/* MOBILE BOTTOM NAVIGATION                   */}
      {/* ========================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/10 z-50 flex justify-between items-center px-1 py-2 pb-safe">
        <button onClick={() => { setActiveTab("dashboard"); window.speechSynthesis.cancel(); }} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${activeTab === "dashboard" ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[9px] font-medium">Home</span>
        </button>
        <button onClick={() => { setActiveTab("notes"); setTargetNote(null); window.speechSynthesis.cancel(); }} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${activeTab === "notes" ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}>
          <FileText className="w-5 h-5" />
          <span className="text-[9px] font-medium">Notes</span>
        </button>
        <button onClick={() => { setActiveTab("collections"); setTargetNote(null); window.speechSynthesis.cancel(); }} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${activeTab === "collections" ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}>
          <Library className="w-5 h-5" />
          <span className="text-[9px] font-medium">Books</span>
        </button>
        <button onClick={() => { setActiveTab("ai"); setTargetNote(null); window.speechSynthesis.cancel(); }} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${activeTab === "ai" ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}>
          <Bot className="w-5 h-5" />
          <span className="text-[9px] font-medium">AI</span>
        </button>
        <button onClick={() => { setActiveTab("mocktest"); window.speechSynthesis.cancel(); }} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${activeTab === "mocktest" ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}>
          <GraduationCap className="w-5 h-5" />
          <span className="text-[9px] font-medium">Tests</span>
        </button>
        <button onClick={() => { setActiveTab("meetings"); setActiveMeeting(null); window.speechSynthesis.cancel(); }} className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-colors ${activeTab === "meetings" ? "text-indigo-400" : "text-gray-400 hover:text-white"}`}>
          <Video className="w-5 h-5" />
          <span className="text-[9px] font-medium">Live</span>
        </button>
      </nav>

      {/* ========================================== */}
      {/* FLOATING AI ASSISTANT (Teechu)             */}
      {/* ========================================== */}
      <div 
        onClick={() => { setActiveTab("ai"); setTargetNote(null); window.speechSynthesis.cancel(); }}
        className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 cursor-pointer group"
        title="Ask AI Assistant"
      >
        {/* Tooltip / Speech Bubble */}
        <div className="absolute -top-12 right-0 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap shadow-lg">
          Need help? Ask me! 👋
          <div className="absolute -bottom-1 right-6 w-2 h-2 bg-indigo-600 rotate-45"></div>
        </div>

        {/* Teechu Image with Blinking Logic */}
        <div className="relative w-20 h-20 md:w-24 md:h-24 bg-transparent flex items-center justify-center group-hover:scale-110 transition-all duration-300 drop-shadow-[0_0_20px_rgba(79,70,229,0.6)]">
          <Image 
            src={isBlinking ? "/assistant-closed.png" : "/assistant.png"} 
            alt="AI Assistant" 
            width={100} 
            height={100} 
            className="object-contain"
            priority 
          />
        </div>
      </div>
    </div>
  );
}