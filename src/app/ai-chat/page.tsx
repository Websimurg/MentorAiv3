"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import * as Sentry from '@sentry/nextjs';

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface ChatHistory {
  id: string;
  threadId: string;
  title: string;
  lastMessage: string;
  timestamp: number;
  messages: Message[];
}

interface UserProfile {
  name: string;
  preferences: string[];
  learnings: string[];
  lastUpdated: number;
}

export default function AIChat() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<ChatHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Kullanıcı",
    preferences: [],
    learnings: [],
    lastUpdated: Date.now()
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const mainCategories = [
    { id: "love", name: "Aşk & İlişkiler", icon: "❤️", gradient: "from-pink-400 to-rose-500" },
    { id: "money", name: "Para & Bolluk", icon: "💰", gradient: "from-green-400 to-emerald-500" },
    { id: "health", name: "Sağlık & Vitalite", icon: "🏥", gradient: "from-orange-400 to-red-500" },
    { id: "peace", name: "Huzur & Denge", icon: "☮️", gradient: "from-purple-400 to-indigo-500" },
  ];

  const subCategories: Record<string, any[]> = {
    love: [
      { id: "romantic", name: "Romantik İlişkiler", icon: "💑", gradient: "from-pink-300 to-rose-400" },
      { id: "family", name: "Aile İlişkileri", icon: "👨‍👩‍👧‍👦", gradient: "from-blue-300 to-cyan-400" },
      { id: "friendship", name: "Arkadaşlıklar", icon: "🤝", gradient: "from-yellow-300 to-amber-400" },
    ],
    money: [
      { id: "wealth", name: "Zenginlik Zihniyeti", icon: "🧠", gradient: "from-green-300 to-emerald-400" },
      { id: "income", name: "Gelir Artırma", icon: "📈", gradient: "from-teal-300 to-cyan-400" },
      { id: "investment", name: "Yatırım", icon: "💎", gradient: "from-emerald-300 to-green-400" },
    ],
    health: [
      { id: "nutrition", name: "Beslenme", icon: "🥗", gradient: "from-green-300 to-lime-400" },
      { id: "fitness", name: "Fitness", icon: "💪", gradient: "from-orange-300 to-red-400" },
      { id: "wellness", name: "Genel Sağlık", icon: "🌟", gradient: "from-yellow-300 to-orange-400" },
    ],
    peace: [
      { id: "meditation", name: "Meditasyon", icon: "🧘", gradient: "from-purple-300 to-violet-400" },
      { id: "mantra", name: "Mantra & Afirmasyon", icon: "🌟", gradient: "from-yellow-300 to-orange-400" },
      { id: "mindfulness", name: "Farkındalık", icon: "🧠", gradient: "from-indigo-300 to-purple-400" },
    ],
  };

  const questions: Record<string, string[]> = {
    romantic: ["Sağlıklı ilişki nasıl kurulur?", "İlişkide iletişim nasıl güçlendirilir?", "İlişki sorunları nasıl çözülür?", "Partnerimi nasıl daha iyi anlarım?"],
    family: ["Ailemle iletişimi nasıl düzeltirim?", "Aile baskısıyla nasıl başa çıkarım?", "Sağlıklı sınırlar nasıl koyarım?", "Ebeveyn ilişkilerimi nasıl geliştiririm?"],
    friendship: ["Yeni arkadaşlar nasıl edinirim?", "Arkadaşlıkları nasıl sürdürürüm?", "Sosyal çevrem nasıl genişler?", "Değerli arkadaşlıklar nasıl kurulur?"],
    wealth: ["Bolluk zihniyeti nasıl geliştirilir?", "Para bloklarımı nasıl aşarım?", "Zenginlik afirmasyonları nelerdir?", "Finansal özgürlük nasıl kazanılır?"],
    income: ["Maaş artışı nasıl isterim?", "Pasif gelir kaynakları nelerdir?", "Yan gelir nasıl elde edilir?", "Kariyer gelişimi nasıl sağlanır?"],
    investment: ["Yatırıma nasıl başlarım?", "Hangi yatırım araçları güvenlidir?", "Portföy nasıl oluşturulur?", "Risk yönetimi nasıl yapılır?"],
    nutrition: ["Sağlıklı beslenme nasıl olmalı?", "Kilo verme için diyet planı", "Günlük kalori ihtiyacım nedir?", "Protein ağırlıklı beslenme"],
    fitness: ["Evde egzersiz nasıl yapılır?", "Spor programı nasıl oluşturulur?", "Hangi egzersizler etkilidir?", "Motivasyon nasıl korunur?"],
    wellness: ["Daha iyi uyumak için ne yapmalıyım?", "Stres nasıl azaltılır?", "Bağışıklık nasıl güçlendirilir?", "Enerji seviyesi nasıl artırılır?"],
    meditation: ["Meditasyona nasıl başlarım?", "Günde kaç dakika meditasyon yapmalıyım?", "Meditasyon pozisyonu nasıl olmalı?", "Derin meditasyon nasıl yapılır?"],
    mantra: ["Güçlü mantralar nelerdir?", "Sabah mantram ne olmalı?", "Mantra nasıl tekrarlanır?", "Afirmasyonlar işe yarar mı?"],
    mindfulness: ["Farkındalık meditasyonu nedir?", "Şimdiki ana nasıl odaklanırım?", "Düşüncelerimi nasıl gözlemlerim?", "Mindfulness günlük hayata nasıl uygulanır?"],
  };

  useEffect(() => {
    // Sentry context ayarla
    Sentry.setContext('page', {
      name: 'AI Chat',
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
    
    checkUserAndLoadData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkUserAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Kullanıcı profilini yükle
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      setUserProfile({
        name: profile.name || user.email?.split('@')[0] || 'Kullanıcı',
        preferences: [],
        learnings: [],
        lastUpdated: Date.now()
      });
    }

    // İlk yükleme - hoşgeldin mesajı ekleme, kartları göster

    // Geçmiş sohbetleri Supabase'den yükle
    loadChatHistories(user.id);
  };

  const loadChatHistories = async (userId: string) => {
    const { data: histories } = await supabase
      .from('ai_chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (histories) {
      const formattedHistories: ChatHistory[] = histories.map(h => ({
        id: h.id,
        threadId: h.thread_id,
        title: h.title,
        lastMessage: h.last_message,
        timestamp: new Date(h.created_at).getTime(),
        messages: h.messages || []
      }));
      setChatHistories(formattedHistories);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      // Mevcut sohbeti kaydet
      saveCurrentChat();
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (customMessage?: string) => {
    const messageToSend = customMessage || input;
    if (!messageToSend.trim() || isLoading) return;
    
    // Sentry breadcrumb ekle
    Sentry.addBreadcrumb({
      category: 'user-action',
      message: 'Kullanıcı mesaj gönderdi',
      level: 'info',
      data: {
        messageLength: messageToSend.length,
      },
    });
    
    const userMessage: Message = { role: "user", content: messageToSend, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    setIsLoading(true);
    
    try {
      // Kullanıcı bağlamını hazırla
      const userContext = {
        name: userProfile.name,
        preferences: userProfile.preferences,
        learnings: userProfile.learnings,
        conversationCount: chatHistories.length
      };

      // OpenAI Assistant API çağrısı
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageToSend,
          threadId: threadId,
          userContext: userContext // Kullanıcı bağlamını gönder
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Sunucu hatası" }));
        throw new Error(errorData.error || "Bir hata oluştu");
      }
      
      const data = await response.json();

      // Thread ID'yi sakla (ilk mesajda gelir)
      if (data.threadId && !threadId) {
        setThreadId(data.threadId);
        localStorage.setItem("aiChatThreadId", data.threadId);
      }

      // AI yanıtını ekle
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: data.response, 
        timestamp: Date.now() 
      }]);
      
      // Kullanıcı profilini güncelle (AI'den öğrenilen bilgiler)
      if (data.userLearnings) {
        updateUserProfile(data.userLearnings);
      }
      
      // Chat'i kaydet
      setTimeout(() => saveCurrentChat(), 500);
    } catch (error: any) {
      console.error("Chat error:", error);
      
      // Hatayı Sentry'ye gönder
      Sentry.captureException(error, {
        level: 'error',
        tags: {
          component: 'AIChat',
          action: 'sendMessage',
        },
        extra: {
          messageLength: messageToSend.length,
          threadId: threadId,
        },
      });
      
      // Hata durumunda fallback yanıt
      const fallbackResponse = generateSmartResponse(messageToSend);
      setMessages((prev) => [...prev, { 
        role: "assistant", 
        content: fallbackResponse, 
        timestamp: Date.now() 
      }]);
      
      // Fallback durumunda da kaydet
      setTimeout(() => saveCurrentChat(), 500);
    } finally {
      setIsLoading(false);
    }
  };
  
  const generateSmartResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();
    
    // Aşk & İlişkiler
    if (lowerQuestion.includes("ilişki") || lowerQuestion.includes("aşk") || lowerQuestion.includes("partner")) {
      return "💖 **İlişki Rehberi**\n\nSağlıklı bir ilişki için:\n\n1. **Açık iletişim** kurun\n2. **Karşılıklı saygı** gösterin\n3. **Kaliteli zaman** geçirin\n4. **Birbirinize destek** olun\n\nHer ilişki farklıdır, kendi dinamiklerinizi keşfedin! ❤️";
    }
    
    // Para & Bolluk
    if (lowerQuestion.includes("para") || lowerQuestion.includes("yatırım") || lowerQuestion.includes("gelir")) {
      return "💰 **Finansal Rehber**\n\nMali bağımsızlık için:\n\n1. **Birikim yapın** (gelirin %20'si)\n2. **Yatırım öğrenin** (hisse, kripto, emlak)\n3. **Pasif gelir** kaynakları oluşturun\n4. **Finansal eğitim** alın\n\nKüçük adımlar büyük değişimler yaratir! 📈";
    }
    
    // Sağlık & Beslenme
    if (lowerQuestion.includes("beslenme") || lowerQuestion.includes("kalori") || lowerQuestion.includes("diyet")) {
      return "🥗 **Beslenme Rehberi**\n\nSağlıklı beslenme için:\n\n1. **Bol su için** (2-3 litre/gün)\n2. **Renkli sebzeler** tüketin\n3. **Protein ağırlıklı** beslenin\n4. **İşlenmiş gıdalardan** kaçın\n\nKalori sayfamızdan takip yapabilirsiniz! 🔥";
    }
    
    // Meditasyon & Mantra
    if (lowerQuestion.includes("meditasyon") || lowerQuestion.includes("mantra") || lowerQuestion.includes("huzur")) {
      return "🧘 **Meditasyon Rehberi**\n\nHuzur bulmak için:\n\n1. **Rahat bir pozisyon** bulun\n2. **Derin nefes** alın (4-7-8 tekniği)\n3. **5-10 dakika** odaklanın\n4. **Düşüncelerinizi** gözlemleyin\n\nGünde 10 dakika bile fark yaratir! 🌟";
    }
    
    // Genel karşılama
    return "🤖 **MentorAi³**\n\nSize yardımcı olmaktan mutluluk duyuyorum!\n\nYardımcı olabileceğim konular:\n\n• 💖 Aşk & İlişkiler\n• 💰 Para & Bolluk\n• 🏥 Sağlık & Beslenme\n• ☮️ Huzur & Meditasyon\n\nBaşka nasıl yardımcı olabilirim? 😊";
  };

  const goBack = () => {
    if (selectedSubCategory) setSelectedSubCategory(null);
    else if (selectedCategory) setSelectedCategory(null);
  };

  const resetAll = () => {
    setSelectedCategory(null);
    setSelectedSubCategory(null);
  };

  const saveCurrentChat = async () => {
    try {
      if (messages.length === 0) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const chatId = currentChatId || Date.now().toString();
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      const title = lastUserMessage?.content.slice(0, 50) || "Yeni Sohbet";
      
      const { error } = await supabase
        .from('ai_chat_history')
        .upsert({
          id: chatId,
          user_id: user.id,
          thread_id: threadId || "",
          title: title,
          last_message: messages[messages.length - 1]?.content.slice(0, 100) || "",
          messages: messages
        });
      
      if (!error) {
        setCurrentChatId(chatId);
        await loadChatHistories(user.id);
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const loadChat = (chatId: string) => {
    const chat = chatHistories.find(h => h.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setThreadId(chat.threadId);
      setCurrentChatId(chat.id);
      setShowHistory(false);
    }
  };
  
  const startNewChat = () => {
    // Mesajları temizle ve kategorileri göster
    setMessages([]);
    setThreadId(null);
    setCurrentChatId(null);
    setSelectedCategory(null);
    setSelectedSubCategory(null);
    setShowHistory(false);
  };
  
  const deleteChat = async (chatId: string) => {
    if (!confirm("Bu sohbeti silmek istediğinize emin misiniz?")) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('ai_chat_history')
      .delete()
      .eq('id', chatId);
    
    if (currentChatId === chatId) {
      startNewChat();
    }
    
    await loadChatHistories(user.id);
  };
  

  const updateUserProfile = (learnings: string[]) => {
    const updatedProfile = {
      ...userProfile,
      learnings,
      lastUpdated: Date.now()
    };
    setUserProfile(updatedProfile);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-2xl font-bold text-gray-800">🧠 AI Chat</h2>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl font-semibold transition-all"
              >
                📜 Geçmiş ({chatHistories.length})
              </button>
              
              {messages.length > 0 && (
                <button
                  onClick={startNewChat}
                  className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-xl font-semibold transition-all"
                >
                  ➕ Yeni Sohbet
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sohbet Geçmişi Modal - Geliştirilmiş Tasarım */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-gradient-to-br from-white to-purple-50 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden transform transition-all">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  📜 Sohbet Geçmişi
                </h2>
                <p className="text-purple-100 text-sm mt-1">{chatHistories.length} sohbet kaydedildi</p>
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all hover:rotate-90 duration-300"
              >
                ×
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(85vh-120px)] p-6">
              {chatHistories.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6 animate-bounce">💭</div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Henüz sohbet yok</h3>
                  <p className="text-gray-500">Yeni bir sohbet başlatarak ilk kaydınızı oluşturun</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {chatHistories.map((chat, idx) => (
                    <div
                      key={chat.id}
                      className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer transform hover:scale-[1.02] ${
                        currentChatId === chat.id
                          ? "border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 shadow-lg"
                          : "border-gray-200 bg-white hover:border-purple-300 hover:shadow-md"
                      }`}
                      onClick={() => loadChat(chat.id)}
                      style={{ animation: `slideIn 0.3s ease-out ${idx * 50}ms both` }}
                    >
                      {/* Aktif İşaretleyici */}
                      {currentChatId === chat.id && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500"></div>
                      )}
                      
                      <div className="p-5 flex items-start gap-4">
                        {/* Icon */}
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                          currentChatId === chat.id
                            ? "bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg"
                            : "bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-purple-100 group-hover:to-pink-100"
                        }`}>
                          {currentChatId === chat.id ? "💬" : "📝"}
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className={`font-bold text-lg truncate ${
                              currentChatId === chat.id ? "text-purple-700" : "text-gray-800 group-hover:text-purple-600"
                            }`}>
                              {chat.title}
                            </h3>
                            {currentChatId === chat.id && (
                              <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full font-semibold flex-shrink-0">
                                Aktif
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                            {chat.lastMessage}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                📅 {new Date(chat.timestamp).toLocaleDateString("tr-TR", {
                                  day: "numeric",
                                  month: "short"
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                🕒 {new Date(chat.timestamp).toLocaleTimeString("tr-TR", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                              <span className="flex items-center gap-1">
                                💬 {chat.messages.length} mesaj
                              </span>
                            </div>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-100 rounded-lg text-red-500 hover:text-red-700"
                              title="Sohbeti Sil"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!selectedCategory && !selectedSubCategory && messages.length === 0 && (
        <div className="max-w-6xl mx-auto mb-8"><div className="text-center mb-8"><div className="text-6xl mb-4">👋</div><h1 className="text-4xl font-bold text-gray-800 mb-2">Merhaba {userProfile.name}!</h1><p className="text-gray-600">Hayatının hangi alanında destek istiyorsun?</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{mainCategories.map((cat, idx) => (<button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`group relative overflow-hidden rounded-3xl p-8 transition-all duration-500 transform hover:scale-105 shadow-xl hover:shadow-2xl bg-gradient-to-br ${cat.gradient}`} style={{ animation: `slideIn 0.5s ease-out ${idx * 100}ms both` }}><div className="relative z-10 text-center"><div className="text-6xl mb-4 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">{cat.icon}</div><h3 className="text-xl font-bold text-white mb-2">{cat.name}</h3><div className="mt-4 text-white/90 text-sm">Tıklayarak keşfet →</div></div></button>))}</div></div>
      )}

      {selectedCategory && !selectedSubCategory && messages.length === 0 && (
        <div className="max-w-6xl mx-auto mb-8"><div className="text-center mb-8"><h2 className="text-3xl font-bold text-gray-800 mb-2">{mainCategories.find((c) => c.id === selectedCategory)?.icon} {mainCategories.find((c) => c.id === selectedCategory)?.name}</h2><p className="text-gray-600">Hangi konuda yardım istiyorsun?</p></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{subCategories[selectedCategory]?.map((sub: any, idx: number) => (<button key={sub.id} onClick={() => setSelectedSubCategory(sub.id)} className={`group relative overflow-hidden rounded-3xl p-8 transition-all duration-500 transform hover:scale-105 shadow-xl hover:shadow-2xl bg-gradient-to-br ${sub.gradient}`} style={{ animation: `slideIn 0.5s ease-out ${idx * 100}ms both` }}><div className="relative z-10 text-center"><div className="text-5xl mb-4 transform transition-transform duration-500 group-hover:scale-110">{sub.icon}</div><h3 className="text-xl font-bold text-white mb-2">{sub.name}</h3><div className="mt-4 text-white/90 text-sm">Tıklayarak devam et →</div></div></button>))}</div></div>
      )}

      {selectedSubCategory && messages.length === 0 && (
        <div className="max-w-6xl mx-auto mb-8"><div className="text-center mb-8"><h2 className="text-3xl font-bold text-gray-800 mb-2">💡 Hazır Sorular</h2><p className="text-gray-600">Bir soruya tıklayarak sohbete başla</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{questions[selectedSubCategory]?.map((q: string, idx: number) => (<button key={idx} onClick={() => sendMessage(q)} className="group p-6 bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 rounded-2xl text-left transition-all hover:shadow-xl border-2 border-gray-200 hover:border-purple-300 transform hover:scale-105 duration-300" style={{ animation: `slideIn 0.5s ease-out ${idx * 100}ms both` }}><div className="flex items-center gap-4"><div className="text-4xl">💬</div><span className="font-semibold text-gray-800 text-lg group-hover:text-purple-700 transition-colors">{q}</span></div></button>))}</div></div>
      )}

      {messages.length > 0 && (
        <div className="max-w-4xl mx-auto mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 h-[500px] overflow-y-auto">
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="flex items-start gap-3 max-w-[85%]">
                    {msg.role === "assistant" && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        AI
                      </div>
                    )}
                    <div className={`rounded-2xl px-6 py-4 ${msg.role === "user" ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white" : "bg-gray-100 text-gray-800"}`}>
                      <div className="whitespace-pre-line">{msg.content}</div>
                      <div className="text-xs mt-2 opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {msg.role === "user" && (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        👤
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-6 py-3">
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                      <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Tarzı Input Alanı */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t shadow-lg z-30">
        <div className="max-w-4xl mx-auto p-4">
          
          <div className="flex items-center gap-2">
            
            {/* Text Input */}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === "Enter" && !isLoading && !e.shiftKey) sendMessage(); }}
              placeholder="Mesaj yaz..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-full border-2 border-gray-200 focus:outline-none focus:border-purple-500 text-gray-800 bg-gray-50"
            />
            
            {/* Gönder Butonu */}
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="p-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "⏳" : "🚀"}
            </button>
          </div>
        </div>
      </div>
      
      {/* Alt boşluk - input için */}
      <div className="h-24"></div>

      <style jsx>{`@keyframes slideIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}