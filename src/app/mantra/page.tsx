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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-20px`,
                animationDelay: `${Math.random() * 2}s`,
                fontSize: `${Math.random() * 15 + 10}px`
              }}
            >
              ✨
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            🌟 Mantra
          </h1>
          <p className="text-sm text-gray-500">Günlük olumlamalarınızı oluşturun</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="text-2xl mb-1">📜</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalMantras}</div>
            <div className="text-xs text-gray-500">Toplam</div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="text-2xl mb-1">🔥</div>
            <div className="text-2xl font-bold text-gray-900">{stats.streak}</div>
            <div className="text-xs text-gray-500">Gün Seri</div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-2xl font-bold text-gray-900">{mantras.filter(m => m.completed === true).length}</div>
            <div className="text-xs text-gray-500">Tamamlanan</div>
          </div>
          
          <div className="bg-white rounded-2xl p-4 border border-gray-200">
            <div className="text-2xl mb-1">🎯</div>
            <div className="text-2xl font-bold text-gray-900">{Object.keys(stats.categoryCounts).length}</div>
            <div className="text-xs text-gray-500">Kategori</div>
          </div>
        </div>

        {/* Mantra Player */}
        {mantras.length > 0 && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="text-center mb-4">
              <div className="text-xl font-semibold text-gray-900 mb-4 leading-relaxed">
                "{mantras[currentMantraIndex]?.text}"
              </div>
              <button
                onClick={playMantras}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
              >
                {isPlaying ? '⏸️ Durdur' : '▶️ Otomatik Oynat'}
              </button>
            </div>
          </div>
        )}

        {/* Category Selector */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">🎯 Kategori</h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Add Mantra */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            ✨ Yeni Mantra
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={newMantra}
              onChange={(e) => setNewMantra(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addMantra()}
              placeholder="Bugün kendime ne söylemek istiyorum?"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent text-gray-900 placeholder:text-gray-400"
            />
            <button
              onClick={addMantra}
              className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium transition-colors"
            >
              Ekle
            </button>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white rounded-2xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            💡 Öneriler
          </h3>
          <div className="space-y-2">
            {suggestions[selectedCategory]?.map((suggestion, idx) => (
              <button
                key={idx}
                className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                onClick={() => setNewMantra(suggestion)}
              >
                <p className="text-sm text-gray-700">
                  "{suggestion}"
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Mantras List */}
        <div>
          {mantras.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
              <div className="text-5xl mb-3">🌟</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Henüz mantra yok</h3>
              <p className="text-sm text-gray-500">Önerilerden birini seçin</p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 px-1">Son Mantralar</h3>
              {mantras.slice(0, 10).map((mantra) => (
                <div
                  key={mantra.id}
                  className="bg-white rounded-xl p-4 border border-gray-200"
                >
                  {editingId === mantra.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(mantra.id)}
                          className="flex-1 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium"
                        >
                          Kaydet
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                        >
                          İptal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-gray-900 flex-1">
                          "{mantra.text}"
                        </p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(mantra)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteMantra(mantra.id)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{categories.find(c => c.id === mantra.category)?.icon}</span>
                        <span>{mantra.date}</span>
                        <span>•</span>
                        <span>{mantra.time}</span>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}