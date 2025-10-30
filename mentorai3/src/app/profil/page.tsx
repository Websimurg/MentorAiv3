"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import * as Sentry from '@sentry/nextjs';
import { User } from "@supabase/supabase-js";

interface UserProfile {
  name: string;
  email: string;
  phone?: string;
  bio?: string;
  birthDate?: string;
  gender?: string;
  height?: number;
  weight?: number;
  goal?: string;
}

interface UserStats {
  meditationCount: number;
  meditationMinutes: number;
  calorieCount: number;
  coursesCompleted: number;
  streak: number;
}

export default function Profil() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "stats" | "settings">("profile");
  
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    email: "",
    phone: "",
    bio: "",
    birthDate: "",
    gender: "",
    height: 0,
    weight: 0,
    goal: ""
  });

  const [stats, setStats] = useState<UserStats>({
    meditationCount: 0,
    meditationMinutes: 0,
    calorieCount: 0,
    coursesCompleted: 0,
    streak: 0
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    Sentry.setContext('page', {
      name: 'Profil',
      url: typeof window !== 'undefined' ? window.location.href : '',
    });
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      router.push("/login");
      return;
    }

    setUser(session.user);
    loadProfile(session.user);
    loadStats();
    setLoading(false);
  };

  const loadProfile = async (user: User) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      setProfile({
        name: data.name || user.user_metadata?.name || "",
        email: user.email || "",
        phone: data.phone || "",
        bio: data.bio || "",
        birthDate: data.birth_date || "",
        gender: data.gender || "",
        height: data.height || 0,
        weight: data.weight || 0,
        goal: data.goal || ""
      });
    } else {
      setProfile({
        ...profile,
        name: user.user_metadata?.name || "",
        email: user.email || ""
      });
    }
  };

  const loadStats = () => {
    const meditations = JSON.parse(localStorage.getItem("meditationSessions") || "[]");
    const meals = JSON.parse(localStorage.getItem("meals") || "[]");
    const courseProgress = JSON.parse(localStorage.getItem("courseProgress") || "{}");

    const totalMinutes = meditations.reduce((sum: number, m: any) => sum + (m.duration || 0), 0);
    const completedCourses = Object.values(courseProgress).filter((progress: any) => progress === 100).length;

    setStats({
      meditationCount: meditations.length,
      meditationMinutes: totalMinutes,
      calorieCount: meals.length,
      coursesCompleted: completedCourses,
      streak: 0
    });
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    
    Sentry.addBreadcrumb({
      category: 'profile',
      message: 'Profil güncelleme başlatıldı',
      level: 'info',
    });
    
    try {
      const profileData: any = {
        id: user.id,
        name: profile.name,
        updated_at: new Date().toISOString()
      };
      
      // Sadece dolu alanları ekle
      if (profile.phone) profileData.phone = profile.phone;
      if (profile.bio) profileData.bio = profile.bio;
      if (profile.birthDate) profileData.birth_date = profile.birthDate;
      if (profile.gender) profileData.gender = profile.gender;
      if (profile.height) profileData.height = profile.height;
      if (profile.weight) profileData.weight = profile.weight;
      if (profile.goal) profileData.goal = profile.goal;
      
      console.log('Profil güncelleniyor:', profileData);
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        })
        .select();

      if (error) {
        console.error('Profil güncelleme hatası:', error);
        throw error;
      }
      
      console.log('Profil güncellendi:', data);
      
      Sentry.addBreadcrumb({
        category: 'profile',
        message: 'Profil başarıyla güncellendi',
        level: 'info',
      });
      
      alert("✅ Profil başarıyla güncellendi!");
    } catch (error: any) {
      console.error('Profil kaydetme hatası:', error);
      
      Sentry.captureException(error, {
        tags: {
          action: 'save_profile',
          user_id: user.id,
        },
      });
      
      alert("❌ Profil güncellenirken hata oluştu: " + (error.message || 'Bilinmeyen hata'));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("❌ Şifreler eşleşmiyor!");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert("❌ Şifre en az 6 karakter olmalı!");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) throw error;
      
      alert("✅ Şifre başarıyla değiştirildi!");
      setPasswordData({ newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      alert("❌ Hata: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl">⏳ Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            👤 Profilim
          </h1>
          <p className="text-gray-600">Hesap bilgilerinizi yönetin</p>
        </div>

        <div className="flex gap-2 mb-8 bg-white rounded-2xl p-2 shadow-lg">
          <button onClick={() => setActiveTab("profile")} className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${activeTab === "profile" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"}`}>
            📝 Profil
          </button>
          <button onClick={() => setActiveTab("stats")} className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${activeTab === "stats" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"}`}>
            📊 İstatistikler
          </button>
          <button onClick={() => setActiveTab("settings")} className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${activeTab === "settings" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"}`}>
            ⚙️ Ayarlar
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 Kişisel Bilgiler</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad</label>
                  <input type="text" value={profile.name} onChange={(e) => setProfile({...profile, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                  <input type="email" value={profile.email} disabled className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 cursor-not-allowed" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon</label>
                  <input type="tel" value={profile.phone} onChange={(e) => setProfile({...profile, phone: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="+90 555 123 45 67" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Doğum Tarihi</label>
                  <input type="date" value={profile.birthDate} onChange={(e) => setProfile({...profile, birthDate: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hakkımda</label>
                <textarea value={profile.bio} onChange={(e) => setProfile({...profile, bio: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none resize-none" placeholder="Kendiniz hakkında kısa bilgi..." />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cinsiyet</label>
                  <select value={profile.gender} onChange={(e) => setProfile({...profile, gender: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none">
                    <option value="">Seçiniz</option>
                    <option value="male">Erkek</option>
                    <option value="female">Kadın</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Boy (cm)</label>
                  <input type="number" value={profile.height || ""} onChange={(e) => setProfile({...profile, height: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="170" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kilo (kg)</label>
                  <input type="number" value={profile.weight || ""} onChange={(e) => setProfile({...profile, weight: parseInt(e.target.value) || 0})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="70" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hedefim</label>
                <select value={profile.goal} onChange={(e) => setProfile({...profile, goal: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none">
                  <option value="">Seçiniz</option>
                  <option value="lose_weight">Kilo Vermek</option>
                  <option value="gain_muscle">Kas Kazanmak</option>
                  <option value="stay_healthy">Sağlıklı Kalmak</option>
                  <option value="improve_mental">Zihinsel Sağlık</option>
                  <option value="learn_new">Yeni Şeyler Öğrenmek</option>
                </select>
              </div>
              <button onClick={saveProfile} disabled={saving} className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition disabled:opacity-50">
                {saving ? "⏳ Kaydediliyor..." : "✅ Profili Kaydet"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl">🧘</div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-800">{stats.meditationCount}</p>
                  <p className="text-sm text-gray-500">Meditasyon</p>
                </div>
              </div>
              <p className="text-sm text-gray-600">{stats.meditationMinutes} dakika</p>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl">🔥</div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-800">{stats.calorieCount}</p>
                  <p className="text-sm text-gray-500">Öğün</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-4">
                <div className="text-4xl">🎓</div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-gray-800">{stats.coursesCompleted}</p>
                  <p className="text-sm text-gray-500">Kurs</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">🔒 Şifre Değiştir</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Yeni Şifre</label>
                  <input type="password" value={passwordData.newPassword} onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="En az 6 karakter" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Şifre Tekrar</label>
                  <input type="password" value={passwordData.confirmPassword} onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="Şifrenizi tekrar girin" />
                </div>
                <button onClick={changePassword} disabled={saving} className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition disabled:opacity-50">
                  {saving ? "⏳ Değiştiriliyor..." : "✅ Şifre Değiştir"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}