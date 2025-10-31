"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";

interface Stats {
  meditationCount: number;
  meditationMinutes: number;
  calorieCount: number;
  mantraCount: number;
  courseProgress: number;
  streak: number;
}

interface Activity {
  id: string;
  type: string;
  description: string;
  time: string;
  icon: string;
}

export default function Dashboard() {
  const { user, loading: userLoading } = useUser();
  const [stats, setStats] = useState<Stats>({
    meditationCount: 0,
    meditationMinutes: 0,
    calorieCount: 0,
    mantraCount: 0,
    courseProgress: 0,
    streak: 0
  });
  const [activities, setActivities] = useState<Activity[]>([]);
  const [quote, setQuote] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setRandomQuote();
    
    // Saati güncelle
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      checkUser();
    }
  }, [user]);

  const checkUser = async () => {
    if (!user) return;
    loadStats();
    loadActivities();
  };

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    // Tüm API çağrılarını paralel yap - sadece gerekli kolonları çek
    const [meditationsRes, mealsRes, mantrasRes, courseProgressRes] = await Promise.all([
      supabase.from('meditation_sessions').select('duration, date, created_at').eq('user_id', user.id).limit(100),
      supabase.from('meals').select('calories, date').eq('user_id', user.id).gte('date', today).limit(50),
      supabase.from('mantras').select('id').eq('user_id', user.id).limit(100),
      supabase.from('course_progress').select('progress_percent').eq('user_id', user.id).limit(20)
    ]);

    const meditations = meditationsRes.data || [];
    const meals = mealsRes.data || [];
    const mantras = mantrasRes.data || [];
    const courseProgress = courseProgressRes.data || [];
    
    const totalMinutes = meditations.reduce((sum: number, m: any) => sum + (m.duration || 0), 0);
    const totalCalories = meals.reduce((sum: number, m: any) => sum + (m.calories || 0), 0);
    const totalProgress = courseProgress.reduce((sum: number, p: any) => sum + (p.progress_percent || 0), 0);
    
    setStats({
      meditationCount: meditations.length,
      meditationMinutes: totalMinutes,
      calorieCount: totalCalories,
      mantraCount: mantras.length,
      courseProgress: totalProgress,
      streak: calculateStreak(meditations)
    });
  };

  const calculateStreak = (sessions: any[]) => {
    if (sessions.length === 0) return 0;
    let streak = 1;
    const today = new Date().toLocaleDateString('tr-TR');
    
    for (let i = 0; i < sessions.length - 1; i++) {
      if (sessions[i].date === today) streak++;
    }
    return streak;
  };

  const loadActivities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const acts: Activity[] = [];
    
    // Son meditasyon
    const { data: meditations } = await supabase
      .from('meditation_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (meditations && meditations.length > 0) {
      const m = meditations[0];
      acts.push({
        id: "med-1",
        type: "Meditasyon",
        description: `${m.title || m.duration + ' dakika meditasyon'}`,
        time: new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        icon: "🧘"
      });
    }
    
    // Son yemek
    const { data: meals } = await supabase
      .from('meals')
      .select('name, calories, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (meals && meals.length > 0) {
      const m = meals[0];
      acts.push({
        id: "meal-1",
        type: "Kalori",
        description: `${m.name} - ${m.calories} kalori`,
        time: new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        icon: "🍽️"
      });
    }
    
    // Son mantra
    const { data: mantras } = await supabase
      .from('mantras')
      .select('text, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (mantras && mantras.length > 0) {
      const m = mantras[0];
      acts.push({
        id: "mantra-1",
        type: "Mantra",
        description: m.text,
        time: new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        icon: "💭"
      });
    }
    
    setActivities(acts);
  };

  const setRandomQuote = () => {
    const quotes = [
      "Bugün harika bir gün! 🌟",
      "Her gün yeni bir fırsat! 💫",
      "Sen harikasın! 🚀",
      "Hedeflerine bir adım daha yakınsın! 🎯",
      "Bugün kendine iyi bak! 💝",
      "Küçük adımlar büyük değişimler yapar! ✨",
      "Kendine inan, yapabilirsin! 💪"
    ];
    setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return "Günaydın"; // 06:00 - 11:59
    if (hour >= 12 && hour < 18) return "İyi günler"; // 12:00 - 17:59
    if (hour >= 18 && hour < 22) return "İyi akşamlar"; // 18:00 - 21:59
    return "İyi geceler"; // 22:00 - 05:59
  };

  const features = [
    { name: "AI Chat", icon: "🤖", link: "/ai-chat", color: "from-blue-400 to-cyan-500", desc: "Yapay zeka asistanınla sohbet et" },
    { name: "Eğitimler", icon: "📚", link: "/egitimler", color: "from-purple-400 to-pink-500", desc: "Kursları tamamla" },
    { name: "Mantra", icon: "💭", link: "/mantra", color: "from-yellow-400 to-orange-500", desc: "Mantralarını oluştur" },
    { name: "Meditasyon", icon: "🧘", link: "/meditasyon", color: "from-green-400 to-emerald-500", desc: "Meditasyon yap" },
    { name: "Kalori", icon: "🔥", link: "/kalori", color: "from-red-400 to-rose-500", desc: "Beslenme takibi" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Karşılama */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {getGreeting()}, {user?.name || 'Kullanıcı'}! 👋
          </h1>
          <p className="text-gray-600">{currentTime.toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Motivasyon Kartı */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl p-8 mb-8 text-white shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">{quote}</h2>
              <p className="text-purple-100">Hedeflerine ulaşmak için bugün ne yapacaksın?</p>
            </div>
            <div className="text-6xl">✨</div>
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">🧘</div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{stats.meditationCount}</p>
                <p className="text-sm text-gray-500">Meditasyon</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">{stats.meditationMinutes} dakika</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">🔥</div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{stats.calorieCount}</p>
                <p className="text-sm text-gray-500">Kalori</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">Bugünün toplamı</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-yellow-500">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">💭</div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{stats.mantraCount}</p>
                <p className="text-sm text-gray-500">Mantra</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">Oluşturduğun mantralar</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">🔥</div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-800">{stats.streak}</p>
                <p className="text-sm text-gray-500">Gün Serisi</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">Devam et!</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Son Aktiviteler */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">📊 Son Aktiviteler</h2>
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🌱</div>
                  <p className="text-gray-600">Henüz aktivite yok. Hadi başlayalım!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                      <div className="text-4xl">{activity.icon}</div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{activity.type}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                      </div>
                      <div className="text-sm text-gray-500">{activity.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hızlı Erişim */}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">⚡ Hızlı Erişim</h2>
            <div className="space-y-3">
              {features.map((feature) => (
                <Link
                  key={feature.name}
                  href={feature.link}
                  className={`block bg-gradient-to-r ${feature.color} rounded-xl p-4 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{feature.icon}</div>
                    <div>
                      <p className="font-bold">{feature.name}</p>
                      <p className="text-sm opacity-90">{feature.desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}