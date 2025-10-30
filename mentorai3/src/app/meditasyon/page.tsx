"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Session {
  id: string;
  duration: number;
  date: string;
  time: string;
  type: string;
  mood?: string;
  title?: string;
  description?: string;
}

export default function Meditasyon() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [duration, setDuration] = useState(60); // Sınırsız süre için 60 dakika
  const [isActive, setIsActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDescription, setSessionDescription] = useState("");
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [actualDuration, setActualDuration] = useState<number>(0);

  const meditationTips = [
    "🧘 Derin nefes alın, zihnini dinlendir",
    "🌿 Şu ana odaklan, geçmişi bırak",
    "✨ Her gün 10 dakika meditasyon, hayatını değiştirir",
    "🌊 Nefesini takip et, huzuru bul",
    "💜 Kendine şefkat göster, sabretmeyi öğren",
    "🌟 Sessizlik içinde güç var",
    "🦋 Düşüncelerin bulut gibi, geçip gitmesine izin ver",
  ];

  const router = useRouter();

  // Supabase'den oturumları yükle
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    loadSessions();
  };

  const loadSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('User:', user);
    if (!user) {
      console.log('No user found!');
      return;
    }

    const { data, error } = await supabase
      .from('meditation_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    console.log('Supabase data:', data);
    console.log('Supabase error:', error);

    if (data) {
      const formattedSessions = data.map(session => ({
        id: session.id,
        duration: session.duration,
        date: new Date(session.date).toLocaleDateString('tr-TR'),
        time: new Date(session.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        type: 'Nefes Meditasyonu',
        mood: '😊',
        title: session.title || '',
        description: session.description || ''
      }));
      console.log('Formatted sessions:', formattedSessions);
      setSessions(formattedSessions);
    }
  };

  const saveSessions = async (newSession: Session) => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Saving session, user:', user);
    if (!user) {
      console.log('No user, cannot save!');
      return;
    }

    const sessionData = {
      user_id: user.id,
      duration: newSession.duration,
      date: new Date().toISOString(),
      title: newSession.title,
      description: newSession.description
    };
    console.log('Session data to save:', sessionData);

    const { data, error } = await supabase
      .from('meditation_sessions')
      .insert(sessionData);

    console.log('Save result - data:', data, 'error:', error);

    if (!error) {
      console.log('Save successful, reloading sessions...');
      await loadSessions();
    } else {
      console.error('Save failed:', error);
      alert('Kaydetme hatası: ' + error.message);
    }
  };

  // Rotate meditation tips every 5 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % meditationTips.length);
    }, 5000);
    return () => clearInterval(tipInterval);
  }, [meditationTips.length]);

  const startMeditation = () => {
    setTimeLeft(duration * 60);
    setIsActive(true);
    setStartTime(Date.now());
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setIntervalId(interval);
  };

  const stopMeditation = () => {
    if (intervalId) clearInterval(intervalId);
    setIsActive(false);
    setTimeLeft(0);
  };

  const pauseMeditation = () => {
    if (intervalId) clearInterval(intervalId);
    setIsActive(false);
  };

  const completeMeditation = () => {
    if (intervalId) clearInterval(intervalId);
    setIsActive(false);
    
    // Gerçek süreyi hesapla (dakika)
    const elapsed = Math.round((Date.now() - startTime) / 1000 / 60);
    setActualDuration(elapsed > 0 ? elapsed : 1);
    
    setTimeLeft(0);
    setShowSaveModal(true);
  };

  const saveSession = async () => {
    if (!sessionTitle.trim()) {
      alert("Lütfen bir başlık girin!");
      return;
    }

    const newSession: Session = {
      id: Date.now().toString(),
      duration: actualDuration > 0 ? actualDuration : duration,
      date: new Date().toLocaleDateString("tr-TR"),
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
      type: "Nefes Meditasyonu",
      title: sessionTitle,
      description: sessionDescription,
    };

    await saveSessions(newSession);
    setShowSaveModal(false);
    setSessionTitle("");
    setSessionDescription("");
  };

  const updateSession = async () => {
    if (!sessionTitle.trim() || !editingSession) {
      alert("Lütfen bir başlık girin!");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('meditation_sessions')
      .update({
        title: sessionTitle,
        description: sessionDescription
      })
      .eq('id', editingSession.id);

    if (!error) {
      loadSessions();
    }
    
    setShowEditModal(false);
    setEditingSession(null);
    setSessionTitle("");
    setSessionDescription("");
  };

  const deleteSession = async (id: string) => {
    if (!confirm("⚠️ Bu seansı silmek istediğinize emin misiniz?")) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('meditation_sessions')
      .delete()
      .eq('id', id);

    if (!error) {
      setSessions(sessions.filter(s => s.id !== id));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
  const totalSessions = sessions.length;
  const progress = ((timeLeft / (duration * 60)) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* İstatistikler */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-3xl font-bold text-purple-600 mb-1">{sessions.length}</div>
            <p className="text-sm text-gray-600">Toplam Seans</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">⏱️</div>
            <div className="text-3xl font-bold text-indigo-600 mb-1">{totalMinutes}</div>
            <p className="text-sm text-gray-600">Dakika</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-3xl font-bold text-pink-600 mb-1">{sessions.filter(s => s.date === new Date().toLocaleDateString('tr-TR')).length}</div>
            <p className="text-sm text-gray-600">Bugün</p>
          </div>
        </div>

        {/* Premium Timer Card */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl p-12 mb-8 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"></div>
          
          {!isActive ? (
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-800 mb-6">🧘‍♂️ Meditasyon</h2>
              <p className="text-gray-600 text-lg mb-12">Huzurlu bir meditasyon deneyimi için hazır mısın?</p>
              
              {/* Large Start Button */}
              <button
                onClick={startMeditation}
                className="w-full px-12 py-8 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white rounded-3xl font-bold text-3xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                🚀 Meditasyona Başla
              </button>
              
              <p className="text-gray-500 text-sm mt-6">En az 1 dakika sonra durdurabilirsin</p>
            </div>
          ) : (
            <div className="text-center">
              {/* Circular Progress Timer */}
              <div className="flex justify-center mb-8">
                <div className="relative w-80 h-80">
                  {/* Background Circle */}
                  <svg className="w-80 h-80 transform -rotate-90">
                    <circle
                      cx="160"
                      cy="160"
                      r="140"
                      stroke="#f3e8ff"
                      strokeWidth="12"
                      fill="none"
                    />
                    {/* Progress Circle */}
                    <circle
                      cx="160"
                      cy="160"
                      r="140"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 140}`}
                      strokeDashoffset={`${2 * Math.PI * 140 * (1 - progress / 100)}`}
                      className="transition-all duration-1000"
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#9333ea" />
                        <stop offset="50%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Timer Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-7xl font-bold text-gray-800 mb-2">
                      {formatTime(timeLeft)}
                    </div>
                    <p className="text-gray-500 text-lg font-medium animate-pulse">
                      Nefes al, rahatla...
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={pauseMeditation}
                  disabled={timeLeft > (duration * 60 - 60)}
                  className={`px-8 py-4 rounded-2xl font-bold transition-all transform ${
                    timeLeft > (duration * 60 - 60)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-white border-2 border-purple-400 text-purple-600 hover:bg-purple-50 hover:scale-105'
                  }`}
                  title={timeLeft > (duration * 60 - 60) ? 'En az 1 dakika bekle' : 'Duraklat'}
                >
                  ⏸️ Duraklat
                </button>
                <button
                  onClick={completeMeditation}
                  disabled={timeLeft > (duration * 60 - 60)}
                  className={`px-8 py-4 rounded-2xl font-bold transition-all transform ${
                    timeLeft > (duration * 60 - 60)
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-xl hover:scale-105'
                  }`}
                  title={timeLeft > (duration * 60 - 60) ? 'En az 1 dakika bekle' : 'Tamamla'}
                >
                  ✓ Tamamla
                </button>
                <button
                  onClick={stopMeditation}
                  className="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-800 text-white rounded-2xl font-bold hover:shadow-xl transition-all transform hover:scale-105"
                >
                  🔄 Sıfırla
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Geçmiş Seanslar */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            Geçmiş Seanslar ({sessions.length})
          </h3>
          {sessions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-500 text-lg">Henüz meditasyon kaydı yok</p>
              <p className="text-gray-400 text-sm mt-2">Yukarıdan bir meditasyon başlatın</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 10).map(session => (
                <div key={session.id} className="group flex justify-between items-start p-5 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 rounded-2xl hover:shadow-lg transition-all border border-purple-100">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <span className="text-3xl">🧘‍♂️</span>
                      <div className="flex-1">
                        <p className="text-xl font-bold text-gray-800 mb-1">
                          {session.title || `${session.duration} dakika meditasyon`}
                        </p>
                        {session.description && (
                          <p className="text-sm text-gray-600 mb-2 italic bg-white bg-opacity-50 p-2 rounded-lg">
                            💬 "{session.description}"
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 ml-12">
                      <span className="flex items-center gap-1">
                        <span className="text-lg">📅</span>
                        {session.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-lg">⏱️</span>
                        {session.time}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-purple-600">
                        <span className="text-lg">⏳</span>
                        {session.duration} dk
                      </span>
                    </div>
                  </div>
                  {/* Minimalist Action Buttons */}
                  <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingSession(session);
                        setShowEditModal(true);
                      }}
                      className="p-2 hover:bg-white rounded-lg transition group/btn"
                      title="Düzenle"
                    >
                      <svg className="w-5 h-5 text-gray-400 group-hover/btn:text-blue-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-2 hover:bg-white rounded-lg transition group/btn"
                      title="Sil"
                    >
                      <svg className="w-5 h-5 text-gray-400 group-hover/btn:text-red-500 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Save Session Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fadeIn">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              🎉 Meditasyon Tamamlandı!
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Başlık *
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="Örn: Sabah Meditasyonu"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition text-gray-800"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Açıklama (Opsiyonel)
                </label>
                <textarea
                  value={sessionDescription}
                  onChange={(e) => setSessionDescription(e.target.value)}
                  placeholder="Nasıl hissettiniz? Notlarınızı yazın..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition resize-none text-gray-800"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSessionTitle("");
                  setSessionDescription("");
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition"
              >
                İptal
              </button>
              <button
                onClick={saveSession}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}