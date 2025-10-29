"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Mantra {
  id: number;
  text: string;
  date: string;
  time: string;
  category: string;
  color: string;
  completed: boolean;
  editHistory: { text: string; date: string }[];
}

interface Stats {
  totalMantras: number;
  streak: number;
  categoryCounts: Record<string, number>;
}

export default function Mantra() {
  const [mantras, setMantras] = useState<Mantra[]>([]);
  const [newMantra, setNewMantra] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("genel");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMantraIndex, setCurrentMantraIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalMantras: 0, streak: 0, categoryCounts: {} });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [showTimeline, setShowTimeline] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const categories = [
    { id: "genel", name: "Genel", icon: "✨", color: "from-purple-400 to-pink-500" },
    { id: "basari", name: "Başarı", icon: "🏆", color: "from-yellow-400 to-orange-500" },
    { id: "sevgi", name: "Sevgi", icon: "❤️", color: "from-pink-400 to-rose-500" },
    { id: "huzur", name: "Huzur", icon: "🧘", color: "from-blue-400 to-cyan-500" },
    { id: "bolluk", name: "Bolluk", icon: "💰", color: "from-green-400 to-emerald-500" },
  ];

  const suggestions: Record<string, string[]> = {
    genel: [
      "Bugün harika bir gün olacak",
      "Kendime güveniyorum ve yeteneklerimi biliyorum",
      "Her zorluk beni daha güçlü yapıyor",
      "Huzur ve mutluluğu hak ediyorum",
    ],
    basari: [
      "Ben başarılıyım ve değerliyim",
      "Hedeflerime ulaşmak için gerekli güce sahibim",
      "Her adım beni başarıya yakınlaştırıyor",
      "Potansiyelim sınırsız",
    ],
    sevgi: [
      "Sevgi ve şefkat dolu bir kalbim var",
      "Sevgiyi hak ediyorum ve sevgiyi veriyorum",
      "Kendimi olduğum gibi seviyorum",
      "Etrafım sevgi dolu insanlarla çevrili",
    ],
    huzur: [
      "İç huzurum her şeyi aşıyor",
      "Anlık farkındalıkla yaşıyorum",
      "Huzur benim doğal halim",
      "Zihnimde ve kalbimde barış var",
    ],
    bolluk: [
      "Hayat bana bolluk ve bereket getiriyor",
      "Finansal özgürlüğe ulaşıyorum",
      "Bolluk zihniyetiyle yaşıyorum",
      "Para bana kolayca geliyor",
    ],
  };

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    loadMantras();
  };

  const loadMantras = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('mantras')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const loadedMantras = data.map((mantra, index) => ({
        id: index,
        text: mantra.text,
        category: mantra.category,
        date: new Date(mantra.created_at).toLocaleDateString('tr-TR'),
        time: new Date(mantra.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        color: categories.find(c => c.id === mantra.category)?.color || 'from-purple-400 to-pink-500',
        completed: false,
        editHistory: []
      }));
      setMantras(loadedMantras);
      calculateStats(loadedMantras);
    }
  };

  useEffect(() => {
    // Her mantra değişiminde localStorage'a kaydet
    if (mantras.length >= 0) {
      localStorage.setItem("mantras", JSON.stringify(mantras));
      calculateStats(mantras);
    }
  }, [mantras]);

  const calculateStats = (mantraList: Mantra[]) => {
    const categoryCounts: Record<string, number> = {};
    mantraList.forEach(m => {
      categoryCounts[m.category] = (categoryCounts[m.category] || 0) + 1;
    });
    
    const dates = [...new Set(mantraList.map(m => m.date))].sort();
    let streak = dates.length > 0 ? 1 : 0;
    
    setStats({
      totalMantras: mantraList.length,
      streak,
      categoryCounts
    });
  };

  const addMantra = async () => {
    if (!newMantra.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('mantras')
      .insert({
        user_id: user.id,
        text: newMantra,
        category: selectedCategory
      });

    if (!error) {
      loadMantras();
      setNewMantra("");
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const deleteMantra = async (id: number) => {
    if (!confirm("Bu mantrayı silmek istediğinize emin misiniz?")) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const mantraToDelete = mantras.find(m => m.id === id);
    if (!mantraToDelete) return;

    // Supabase'den sil
    const { error } = await supabase
      .from('mantras')
      .delete()
      .eq('user_id', user.id)
      .eq('text', mantraToDelete.text);

    if (!error) {
      setMantras(mantras.filter(m => m.id !== id));
    }
  };
  
  const toggleComplete = (id: number) => {
    setMantras(mantras.map(m => m.id === id ? { ...m, completed: !m.completed } : m));
  };
  
  const startEdit = (mantra: Mantra) => {
    setEditingId(mantra.id);
    setEditText(mantra.text);
  };
  
  const saveEdit = (id: number) => {
    if (editText.trim() === "") return;
    setMantras(mantras.map(m => {
      if (m.id === id) {
        return {
          ...m,
          text: editText,
          editHistory: [...(m.editHistory || []), { text: m.text, date: new Date().toLocaleDateString('tr-TR') }]
        };
      }
      return m;
    }));
    setEditingId(null);
  };

  const playMantras = () => {
    if (mantras.length === 0) return;
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying && mantras.length > 0) {
      const interval = setInterval(() => {
        setCurrentMantraIndex((prev) => (prev + 1) % mantras.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isPlaying, mantras.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-20 left-40 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDelay: `${Math.random() * 3}s`,
                fontSize: `${Math.random() * 20 + 10}px`
              }}
            >
              {['✨', '🌟', '💖', '🌈', '✨'][Math.floor(Math.random() * 5)]}
            </div>
          ))}
        </div>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-fadeIn">
          <div className="text-7xl mb-4 animate-bounce">🌟</div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            Günlük Mantra
          </h1>
          <p className="text-gray-800 text-lg font-semibold">Pozitif enerjiyle gününü şekillendir ✨</p>
        </div>

        {/* Stats Dashboard */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 animate-slideIn">
          <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
            <div className="text-4xl mb-2">📜</div>
            <div className="text-3xl font-bold">{stats.totalMantras}</div>
            <div className="text-purple-100 text-sm font-semibold">Toplam Mantra</div>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-3xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
            <div className="text-4xl mb-2">🔥</div>
            <div className="text-3xl font-bold">{stats.streak}</div>
            <div className="text-orange-100 text-sm font-semibold">Gün Seri</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-3xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
            <div className="text-4xl mb-2">✅</div>
            <div className="text-3xl font-bold">{mantras.filter(m => m.completed === true).length}</div>
            <div className="text-green-100 text-sm font-semibold">Tamamlanan</div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-3xl p-6 text-white shadow-xl transform hover:scale-105 transition-all">
            <div className="text-4xl mb-2">🎯</div>
            <div className="text-3xl font-bold">{Object.keys(stats.categoryCounts).length}</div>
            <div className="text-blue-100 text-sm font-semibold">Kategori</div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Mantra Player */}
          {mantras.length > 0 && (
            <div className="mb-8 animate-slideIn animation-delay-200">
              <div className="relative overflow-hidden rounded-3xl p-12 shadow-2xl transform transition-all duration-500 hover:scale-[1.02]">
                <div className={`absolute inset-0 bg-gradient-to-br ${mantras[currentMantraIndex]?.color} transition-all duration-700`}></div>
                <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-black/20 to-transparent"></div>
                <div className="relative z-10 text-center">
                  <div className="text-5xl font-bold text-white mb-10 drop-shadow-2xl animate-pulse leading-tight">
                    "{mantras[currentMantraIndex]?.text}"
                  </div>
                  <button
                    onClick={playMantras}
                    className="px-12 py-4 bg-white hover:bg-gray-50 text-gray-800 rounded-full font-bold transition-all transform hover:scale-110 shadow-2xl hover:shadow-3xl"
                  >
                    {isPlaying ? '⏸️ Durdur' : '▶️ Otomatik Oynat'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div className="mb-8 animate-slideIn animation-delay-200">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 border-2 border-purple-100">
              <h3 className="text-xl font-bold text-gray-800 mb-4">🎯 Kategori Seç</h3>
              <div className="flex flex-wrap gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-6 py-3 rounded-2xl font-semibold transition-all transform hover:scale-110 ${
                      selectedCategory === cat.id
                        ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Add Mantra */}
          <div className="mb-8 animate-slideIn animation-delay-400">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-8 border-2 border-purple-100">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                ✨ Yeni Mantra Ekle
              </h3>
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newMantra}
                  onChange={(e) => setNewMantra(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addMantra()}
                  placeholder="Bugün kendime ne söylemek istiyorum?"
                  className="flex-1 px-6 py-4 rounded-2xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:border-transparent text-gray-800 text-lg font-medium transition-all bg-white"
                />
                <button
                  onClick={addMantra}
                  className="px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold hover:shadow-2xl transition-all transform hover:scale-110 hover:-rotate-2"
                >
                  🚀 Ekle
                </button>
              </div>
            </div>
          </div>

          {/* AI Suggestions */}
          <div className="mb-8 animate-slideIn animation-delay-600">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-8 border-2 border-purple-100">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                🧠 AI Mantra Önerileri
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions[selectedCategory]?.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="group p-6 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl cursor-pointer hover:shadow-xl transition-all transform hover:scale-105 border-2 border-purple-200 hover:border-purple-400"
                    onClick={() => setNewMantra(suggestion)}
                    style={{ animation: `slideIn 0.5s ease-out ${idx * 100}ms both` }}
                  >
                    <p className="text-gray-800 font-semibold group-hover:text-purple-700 transition-colors">
                      ✨ "{suggestion}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mantras List */}
          <div className="animate-slideIn animation-delay-800">
            {mantras.length === 0 ? (
              <div className="text-center py-20 bg-white/50 backdrop-blur-md rounded-3xl">
                <div className="text-8xl mb-6 animate-bounce">🌟</div>
                <h3 className="text-2xl font-bold text-gray-700 mb-2">Henüz mantra eklemediniz</h3>
                <p className="text-gray-500">Yukarıdaki önerilerden birini seçerek başlayın</p>
              </div>
            ) : (
              <div className="grid gap-6">
                {mantras.map((mantra, idx) => (
                  <div
                    key={mantra.id}
                    className={`group relative rounded-2xl transform transition-all hover:scale-[1.01] ${
                      mantra.completed === true ? 'opacity-60' : ''
                    }`}
                    style={{ animation: `slideIn 0.5s ease-out ${idx * 100}ms both` }}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-r ${mantra.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                    <div className="relative bg-white border-l-4 shadow-lg hover:shadow-2xl transition-all p-6" style={{ borderColor: `hsl(${idx * 60}, 70%, 50%)` }}>
                      <p className={`text-2xl font-bold text-gray-800 ${
                        mantra.completed === true ? 'line-through opacity-60' : ''
                      }`}>
                        ✨ "{mantra.text}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline & History Section */}
          <div className="mt-12 animate-slideIn animation-delay-900">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-10 border-2 border-purple-100">
              <div className="mb-8">
                <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  📊 Mantra Takip
                </h3>
              </div>

              {/* Filters */}
              <div className="mb-8 space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <button
                    onClick={() => setFilterCategory("all")}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                      filterCategory === "all"
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🌟 Tümü ({mantras.length})
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        filterCategory === cat.id
                          ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat.icon} {cat.name} ({mantras.filter(m => m.category === cat.id).length})
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Mantra ara..."
                  className="w-full px-6 py-4 rounded-2xl border-2 border-gray-300 focus:outline-none focus:ring-4 focus:ring-purple-400 text-gray-800 font-medium bg-white shadow-lg"
                />
              </div>

              {/* Timeline View */}
              <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 via-pink-400 to-blue-400"></div>
                  
                  <div className="space-y-8">
                    {Object.entries(
                      mantras
                        .filter(m => filterCategory === "all" || m.category === filterCategory)
                        .filter(m => searchQuery === "" || m.text.toLowerCase().includes(searchQuery.toLowerCase()))
                        .reduce((acc, mantra) => {
                          if (!acc[mantra.date]) acc[mantra.date] = [];
                          acc[mantra.date].push(mantra);
                          return acc;
                        }, {} as Record<string, Mantra[]>)
                    )
                      .sort(([dateA], [dateB]) => {
                        const a = new Date(dateA.split('.').reverse().join('-'));
                        const b = new Date(dateB.split('.').reverse().join('-'));
                        return b.getTime() - a.getTime();
                      })
                      .map(([date, dayMantras], dateIdx) => {
                        const isToday = date === new Date().toLocaleDateString('tr-TR');
                        const dayName = new Date(date.split('.').reverse().join('-')).toLocaleDateString('tr-TR', { weekday: 'long' });
                        
                        return (
                          <div key={date} className="relative pl-20">
                            {/* Timeline Dot */}
                            <div className={`absolute left-4 w-9 h-9 rounded-full flex items-center justify-center ${
                              isToday 
                                ? 'bg-gradient-to-r from-green-400 to-emerald-500 animate-pulse shadow-xl' 
                                : 'bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg'
                            }`}>
                              <span className="text-white text-xl font-bold">{dayMantras.length}</span>
                            </div>
                            
                            {/* Date Card */}
                            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-6 shadow-xl border-2 border-purple-200">
                              <div className="flex items-center justify-between mb-4">
                                <div>
                                  <h4 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                    {isToday && <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full">Bugün</span>}
                                    📅 {date}
                                  </h4>
                                  <p className="text-gray-600 capitalize font-semibold mt-1">{dayName}</p>
                                </div>
                                <div className="flex gap-2">
                                  {categories.map(cat => {
                                    const count = dayMantras.filter(m => m.category === cat.id).length;
                                    if (count === 0) return null;
                                    return (
                                      <div key={cat.id} className={`px-4 py-2 rounded-xl text-white bg-gradient-to-r ${cat.color} shadow-lg`}>
                                        <div className="text-xl">{cat.icon}</div>
                                        <div className="text-sm font-bold">{count}</div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                              
                              {/* Mantras for this day */}
                              <div className="space-y-3">
                                {dayMantras.map((mantra, idx) => (
                                  <div
                                    key={mantra.id}
                                    className={`group p-4 rounded-2xl bg-white border-l-4 shadow-md hover:shadow-lg transition-all relative`}
                                    style={{ borderColor: `hsl(${idx * 60}, 70%, 50%)` }}
                                  >
                                    {editingId === mantra.id ? (
                                      <div className="space-y-3">
                                        <input
                                          type="text"
                                          value={editText}
                                          onChange={(e) => setEditText(e.target.value)}
                                          className="w-full px-4 py-2 rounded-xl border-2 border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 font-semibold"
                                          autoFocus
                                        />
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => saveEdit(mantra.id)}
                                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm"
                                          >
                                            ✅ Kaydet
                                          </button>
                                          <button
                                            onClick={() => setEditingId(null)}
                                            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold text-sm"
                                          >
                                            ❌ İptal
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex items-start gap-3">
                                          <span className={`px-3 py-1 rounded-lg text-xs font-bold text-white bg-gradient-to-r ${mantra.color}`}>
                                            {categories.find(c => c.id === mantra.category)?.icon}
                                          </span>
                                          <div className="flex-1">
                                            <p className="text-gray-800 font-bold text-lg">"{mantra.text}"</p>
                                            <p className="text-gray-500 text-sm mt-1">🕒 {mantra.time}</p>
                                          </div>
                                        </div>
                                        <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                          <button
                                            onClick={() => startEdit(mantra)}
                                            className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200"
                                            title="Düzenle"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                          </button>
                                          <button
                                            onClick={() => deleteMantra(mantra.id)}
                                            className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200"
                                            title="Sil"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                  
                  {mantras.filter(m => filterCategory === "all" || m.category === filterCategory)
                    .filter(m => searchQuery === "" || m.text.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="text-center py-20">
                      <div className="text-8xl mb-6">🔍</div>
                      <h3 className="text-2xl font-bold text-gray-700 mb-2">Sonuç bulunamadı</h3>
                      <p className="text-gray-500">Farklı bir filtre veya arama deneyin</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Stats Grid View - Always Show Below */}
              <div className="mt-12">
                <h4 className="text-2xl font-bold text-gray-800 mb-6">📊 İstatistikler</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Category Breakdown */}
                  <div className="col-span-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                    <h4 className="text-xl font-bold text-gray-800 mb-4">📊 Kategori Dağılımı</h4>
                    <div className="space-y-3">
                      {categories.map(cat => {
                        const count = mantras.filter(m => m.category === cat.id).length;
                        const percentage = mantras.length > 0 ? (count / mantras.length * 100).toFixed(0) : 0;
                        return (
                          <div key={cat.id}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-bold text-gray-700">{cat.icon} {cat.name}</span>
                              <span className="font-bold text-gray-800">{count} ({percentage}%)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${cat.color} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl p-6 text-white shadow-xl">
                      <div className="text-4xl mb-2">📅</div>
                      <div className="text-3xl font-bold">{[...new Set(mantras.map(m => m.date))].length}</div>
                      <div className="text-sm opacity-90">Aktif Gün</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl p-6 text-white shadow-xl">
                      <div className="text-4xl mb-2">⏰</div>
                      <div className="text-3xl font-bold">{mantras.length > 0 ? (mantras.length / [...new Set(mantras.map(m => m.date))].length).toFixed(1) : 0}</div>
                      <div className="text-sm opacity-90">Günlük Ortalama</div>
                    </div>
                  </div>
                  
                  {/* Recent Activity */}
                  <div className="col-span-3 bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-6 border-2 border-orange-200">
                    <h4 className="text-xl font-bold text-gray-800 mb-4">🔥 Son Aktiviteler</h4>
                    <div className="space-y-2">
                      {mantras.slice(0, 5).map((mantra, idx) => (
                        <div key={mantra.id} className="flex items-center gap-3 p-3 bg-white rounded-xl">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white bg-gradient-to-r ${mantra.color} font-bold`}>
                            {categories.find(c => c.id === mantra.category)?.icon}
                          </span>
                          <div className="flex-1">
                            <p className="text-gray-800 font-semibold">"{mantra.text}"</p>
                            <p className="text-gray-500 text-sm">{mantra.date} • {mantra.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}