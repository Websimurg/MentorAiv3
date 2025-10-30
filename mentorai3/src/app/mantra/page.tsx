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
  const [showConfetti, setShowConfetti] = useState(false);
  const [stats, setStats] = useState<Stats>({ totalMantras: 0, streak: 0, categoryCounts: {} });
  const [dailyAffirmations, setDailyAffirmations] = useState<string[]>([]);
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

  // Günlük random olumlama seç
  useEffect(() => {
    const allAffirmations = [
      "Bugün harika bir gün olacak! 🌟",
      "Kendime güveniyorum ve yeteneklerimi biliyorum 💪",
      "Her zorluk beni daha güçlü yapıyor 🚀",
      "Huzur ve mutluluğu hak ediyorum 💜",
      "Ben başarılıyım ve değerliyim 🏆",
      "Hedeflerime ulaşmak için gerekli güce sahibim ✨",
      "Sevgi ve şefkat dolu bir kalbim var ❤️",
      "Kendimi olduğum gibi seviyorum 🤗",
      "İç huzurum her şeyi aşıyor 🧘",
      "Hayat bana bolluk ve bereket getiriyor 💰",
      "Potansiyelim sınırsız 🌈",
      "Her adım beni başarıya yakınlaştırıyor 🚶",
    ];
    
    const today = new Date().toDateString();
    const seed = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const shuffled = [...allAffirmations].sort(() => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x) - 0.5;
    });
    
    setDailyAffirmations(shuffled.slice(0, 2));
  }, []);


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
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

      <div className="max-w-6xl mx-auto">

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-3xl font-bold text-purple-600 mb-1">{mantras.length}</div>
            <p className="text-sm text-gray-600">Toplam Mantra</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-3xl font-bold text-indigo-600 mb-1">{stats.streak}</div>
            <p className="text-sm text-gray-600">Gün Seri</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-3xl font-bold text-pink-600 mb-1">{categories.length}</div>
            <p className="text-sm text-gray-600">Kategori</p>
          </div>
        </div>

        {/* Günlük Olumlamalar */}
        <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 rounded-3xl shadow-xl p-8 mb-8 border-2 border-purple-200">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">🌟 Günlük Olumlamalar</h2>
            <p className="text-sm text-gray-600">Her gün senin için seçilmiş motive edici mesajlar</p>
          </div>
          
          <div className="space-y-4">
            {dailyAffirmations.map((affirmation, index) => (
              <div 
                key={index}
                className="p-5 bg-white rounded-2xl shadow-md border border-purple-100"
              >
                <p className="text-xl text-gray-800 font-semibold leading-relaxed text-center">
                  {affirmation}
                </p>
              </div>
            ))}
          </div>
        </div>


        {/* Category Selector */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🎯 Kategori Seç</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-4 rounded-xl text-center font-semibold transition-all transform hover:scale-105 ${
                  selectedCategory === cat.id
                    ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <div className="text-3xl mb-2">{cat.icon}</div>
                <div className="text-sm">{cat.name}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Add Mantra */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">✨ Yeni Mantra Ekle</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={newMantra}
              onChange={(e) => setNewMantra(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addMantra()}
              placeholder="Bugün kendime ne söylemek istiyorum?"
              className="flex-1 px-5 py-4 rounded-xl border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
            />
            <button
              onClick={addMantra}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
            >
              🚀 Ekle
            </button>
          </div>
        </div>

        {/* AI Suggestions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🧠 AI Mantra Önerileri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions[selectedCategory]?.map((suggestion, idx) => (
              <button
                key={idx}
                className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl text-left text-sm text-gray-800 transition-all border-2 border-purple-200 hover:border-purple-400 transform hover:scale-105"
                onClick={() => setNewMantra(suggestion)}
              >
                ✨ {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Mantras List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📜 Mantralarım</h3>
          {mantras.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🌟</div>
              <p className="text-lg text-gray-600">Henüz mantra eklemediniz</p>
              <p className="text-sm text-gray-500 mt-2">Yukarıdaki önerilerden birini seçerek başlayın!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {mantras.map((mantra) => (
                <div
                  key={mantra.id}
                  className="group p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border-2 border-gray-200 hover:border-purple-300 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{categories.find(c => c.id === mantra.category)?.icon}</span>
                    <div className="flex-1">
                      <p className="text-base font-semibold text-gray-900 leading-relaxed">"{mantra.text}"</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <span>📅 {mantra.date}</span>
                        <span>•</span>
                        <span>🕒 {mantra.time}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMantra(mantra.id)}
                      className="opacity-0 group-hover:opacity-100 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-medium transition-all"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}