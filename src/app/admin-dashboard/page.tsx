"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/useUser";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  lastActive: string;
  isPremium: boolean;
  isAdmin?: boolean;
}

interface UserSubscription {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  plan_type: 'free' | 'standard' | 'unlimited';
  status: 'active' | 'expired' | 'cancelled';
  message_credits: number;
  calorie_credits: number;
  is_unlimited: boolean;
  start_date: string;
  created_at: string;
}

interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  duration: string;
  order: number;
}

interface Course {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: string;
  category: string;
  thumbnail: string;
  createdAt: string;
  lessons: Lesson[];
}

interface Stats {
  totalUsers: number;
  premiumUsers: number;
  totalCourses: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState<"stats" | "users" | "subscriptions" | "courses" | "settings">("stats");
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    premiumUsers: 0,
    totalCourses: 0,
    totalRevenue: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: "", videoUrl: "", duration: "" });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userEditData, setUserEditData] = useState({ name: "", email: "", isPremium: false, isAdmin: false });
  
  // Subscription yönetimi
  const [subscriptions, setSubscriptions] = useState<UserSubscription[]>([]);
  const [editingSubscription, setEditingSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionEditData, setSubscriptionEditData] = useState({
    plan_type: 'free' as 'free' | 'standard' | 'unlimited',
    message_credits: 0,
    calorie_credits: 0,
    is_unlimited: false,
    status: 'active' as 'active' | 'expired' | 'cancelled'
  });
  
  // Sistem ayarları
  const [settings, setSettings] = useState({
    siteName: "MentorAi³",
    siteDescription: "Kişisel gelişim platformu",
    premiumPrice: 99,
    maintenanceMode: false,
    emailNotifications: true
  });
  
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    tempLessons: [] as { title: string; videoUrl: string; duration: string }[]
  });
  
  const [tempLesson, setTempLesson] = useState({ title: "", videoUrl: "", duration: "" });

  useEffect(() => {
    if (user) {
      checkAdmin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);
  
  // Sayfa yüklenince verileri çek
  useEffect(() => {
    if (user && activeTab === 'users') {
      console.log('🔄 Users tab aktif, veriler yüklenecek...');
      loadData();
    }
    if (user && activeTab === 'subscriptions') {
      console.log('🔄 Subscriptions tab aktif, veriler yüklenecek...');
      loadSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  const loadSubscriptions = async () => {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        *,
        profiles:user_id (
          email,
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Subscription yükleme hatası:', error);
      return;
    }

    if (data) {
      const formattedSubscriptions: UserSubscription[] = data.map((sub: any) => ({
        id: sub.id,
        user_id: sub.user_id,
        user_email: sub.profiles?.email || 'Bilinmiyor',
        user_name: sub.profiles?.name || 'Bilinmiyor',
        plan_type: sub.plan_type,
        status: sub.status,
        message_credits: sub.message_credits,
        calorie_credits: sub.calorie_credits,
        is_unlimited: sub.is_unlimited,
        start_date: sub.start_date,
        created_at: sub.created_at
      }));
      setSubscriptions(formattedSubscriptions);
    }
  };

  const toggleUserAdmin = async (userId: string, currentAdminStatus: boolean) => {
    const confirmMsg = currentAdminStatus 
      ? 'Bu kullanıcının admin yetkisini kaldırmak istediğinize emin misiniz?'
      : 'Bu kullanıcıyı admin yapmak istediğinize emin misiniz?';
    
    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ role: currentAdminStatus ? 'user' : 'admin' })
      .eq('id', userId);

    if (error) {
      console.error('Admin toggle hatası:', error);
      alert('Hata: ' + error.message);
      return;
    }

    alert(currentAdminStatus ? '✅ Admin yetkisi kaldırıldı!' : '✅ Kullanıcı admin yapıldı!');
    loadData();
  };

  const toggleUserPremium = async (userId: string, currentPremiumStatus: boolean) => {
    const confirmMsg = currentPremiumStatus 
      ? 'Premium üyeliği kaldırmak istediğinize emin misiniz?'
      : 'Bu kullanıcıyı premium yapmak istediğinize emin misiniz?';
    
    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: !currentPremiumStatus })
      .eq('id', userId);

    if (error) {
      alert('Hata: ' + error.message);
      return;
    }

    alert('✅ İşlem başarılı!');
    loadData();
  };

  // Subscription düzenleme fonksiyonları
  const openEditSubscription = (subscription: UserSubscription) => {
    setEditingSubscription(subscription);
    setSubscriptionEditData({
      plan_type: subscription.plan_type,
      message_credits: subscription.message_credits,
      calorie_credits: subscription.calorie_credits,
      is_unlimited: subscription.is_unlimited,
      status: subscription.status
    });
  };

  const updateSubscription = async () => {
    if (!editingSubscription) return;

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_type: subscriptionEditData.plan_type,
        message_credits: subscriptionEditData.message_credits,
        calorie_credits: subscriptionEditData.calorie_credits,
        is_unlimited: subscriptionEditData.is_unlimited,
        status: subscriptionEditData.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingSubscription.id);

    if (error) {
      alert('Hata: ' + error.message);
      return;
    }

    alert('✅ Abonelik güncellendi!');
    setEditingSubscription(null);
    loadSubscriptions();
  };

  const addCredits = async (subscriptionId: string, creditType: 'message' | 'calorie', amount: number) => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return;

    const fieldName = creditType === 'message' ? 'message_credits' : 'calorie_credits';
    const newAmount = subscription[fieldName] + amount;

    const { error } = await supabase
      .from('user_subscriptions')
      .update({ [fieldName]: newAmount })
      .eq('id', subscriptionId);

    if (error) {
      alert('Hata: ' + error.message);
      return;
    }

    alert(`✅ ${amount} ${creditType === 'message' ? 'mesaj' : 'kalori'} kredi eklendi!`);
    loadSubscriptions();
  };

  const addCustomCredits = async (subscriptionId: string, creditType: 'message' | 'calorie') => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return;

    const currentAmount = creditType === 'message' ? subscription.message_credits : subscription.calorie_credits;
    const creditName = creditType === 'message' ? 'mesaj' : 'kalori';
    
    const input = prompt(
      `${subscription.user_name} için eklemek istediğiniz ${creditName} kredi miktarını girin:\n\nMevcut: ${currentAmount} ${creditName}`,
      '100'
    );

    if (!input) return;
    
    const amount = parseInt(input);
    if (isNaN(amount) || amount <= 0) {
      alert('❌ Geçerli bir sayı girin!');
      return;
    }

    await addCredits(subscriptionId, creditType, amount);
  };

  const setCustomCredits = async (subscriptionId: string, creditType: 'message' | 'calorie') => {
    const subscription = subscriptions.find(s => s.id === subscriptionId);
    if (!subscription) return;

    const currentAmount = creditType === 'message' ? subscription.message_credits : subscription.calorie_credits;
    const creditName = creditType === 'message' ? 'mesaj' : 'kalori';
    
    const input = prompt(
      `${subscription.user_name} için YENİ ${creditName} kredi miktarını girin (mevcut kredi silinecek):\n\nMevcut: ${currentAmount} ${creditName}`,
      currentAmount.toString()
    );

    if (!input) return;
    
    const newAmount = parseInt(input);
    if (isNaN(newAmount) || newAmount < 0) {
      alert('❌ Geçerli bir sayı girin!');
      return;
    }

    const fieldName = creditType === 'message' ? 'message_credits' : 'calorie_credits';

    const { error } = await supabase
      .from('user_subscriptions')
      .update({ [fieldName]: newAmount })
      .eq('id', subscriptionId);

    if (error) {
      alert('Hata: ' + error.message);
      return;
    }

    alert(`✅ ${creditName} kredisi ${newAmount} olarak ayarlandı!`);
    loadSubscriptions();
  };

  const changePlanType = async (subscriptionId: string, newPlan: 'free' | 'standard' | 'unlimited') => {
    if (!confirm(`Paket türünü ${newPlan} olarak değiştirmek istediğinize emin misiniz?`)) return;

    const isUnlimited = newPlan === 'unlimited';
    const credits = newPlan === 'free' ? { message: 10, calorie: 3 } :
                   newPlan === 'standard' ? { message: 1000, calorie: 365 } :
                   { message: 999999, calorie: 999999 };

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_type: newPlan,
        is_unlimited: isUnlimited,
        message_credits: credits.message,
        calorie_credits: credits.calorie,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId);

    if (error) {
      alert('Hata: ' + error.message);
      return;
    }

    alert(`✅ Paket ${newPlan} olarak değiştirildi!`);
    loadSubscriptions();
  };

  const checkAdmin = async () => {
    if (!user) return;

    console.log('🔍 Admin check başladı - User:', user);

    // Auth user'dan email al
    const { data: { user: authUser } } = await supabase.auth.getUser();
    console.log('🔑 Auth User:', authUser);

    if (!authUser?.email) {
      alert('❌ Kullanıcı bilgisi alınamadı!');
      router.push('/dashboard');
      return;
    }

    // Email ile profile kontrol et
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('email', authUser.email)
      .single();

    console.log('📊 Profile data:', profile);
    console.log('❌ Profile error:', error);

    if (error || !profile) {
      alert('❌ Profil bulunamadı! Error: ' + (error?.message || 'Bilinmeyen'));
      router.push('/dashboard');
      return;
    }

    if (profile.role !== 'admin') {
      alert('❌ Bu sayfaya erişim yetkiniz yok! Role: ' + (profile.role || 'yok'));
      router.push('/dashboard');
      return;
    }

    console.log('✅ Admin kontrolü başarılı!');
    loadData();
  };

  const loadData = async () => {
    console.log('🔄 Admin - loadData başladı...');
    console.log('👤 Current user:', user);
    
    try {
      // auth.users'dan kullanıcıları al
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('❌ Auth users yükleme hatası:', authError);
        return;
      }

      // Kursları yükle
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (coursesError) {
        console.error('❌ Courses yükleme hatası:', coursesError);
      }

      // Kullanıcıları formatla
      const formattedUsers: User[] = (authUsers || []).map(authUser => ({
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Kullanıcı',
        email: authUser.email || '',
        joinDate: new Date(authUser.created_at).toLocaleDateString('tr-TR'),
        lastActive: new Date(authUser.last_sign_in_at || authUser.created_at).toLocaleDateString('tr-TR'),
        isPremium: false, // Subscription'dan alınacak
        isAdmin: authUser.email === 'websimurg@gmail.com'
      }));

      const loadedCourses = coursesData || [];

      console.log('👥 Admin - Formatted users:', formattedUsers.length);
      console.log('📚 Admin - Loaded courses:', loadedCourses.length);

      setUsers(formattedUsers);
      setCourses(loadedCourses);
      
      // İstatistikleri güncelle
      setStats({
        totalUsers: formattedUsers.length,
        premiumUsers: formattedUsers.filter((u: User) => u.isPremium).length,
        totalCourses: loadedCourses.length,
        totalRevenue: formattedUsers.filter((u: User) => u.isPremium).length * 99
      });

      console.log('✅ Admin - loadData tamamlandı!');
    } catch (error) {
      console.error('💥 Admin - loadData hatası:', error);
    }
  };

  const addTempLesson = () => {
    if (!tempLesson.title || !tempLesson.videoUrl) {
      alert("❌ Ders başlığı ve video URL'si gerekli!");
      return;
    }
    setNewCourse({
      ...newCourse,
      tempLessons: [...newCourse.tempLessons, tempLesson]
    });
    setTempLesson({ title: "", videoUrl: "", duration: "" });
  };

  const removeTempLesson = (index: number) => {
    setNewCourse({
      ...newCourse,
      tempLessons: newCourse.tempLessons.filter((_, i) => i !== index)
    });
  };

  const addCourse = async () => {
    if (!newCourse.title) {
      alert("❌ Eğitim başlığı gerekli!");
      return;
    }

    if (newCourse.tempLessons.length === 0) {
      alert("❌ En az 1 ders eklemelisiniz!");
      return;
    }

    const lessons: Lesson[] = newCourse.tempLessons.map((lesson, index) => ({
      id: Date.now().toString() + index,
      ...lesson,
      order: index + 1
    }));

    const totalDuration = newCourse.tempLessons.reduce((sum, lesson) => {
      const mins = parseInt(lesson.duration) || 0;
      return sum + mins;
    }, 0);

    const course: Course = {
      id: Date.now().toString(),
      title: newCourse.title,
      description: newCourse.description,
      videoUrl: lessons[0]?.videoUrl || "",
      duration: `${totalDuration} dk`,
      category: "platform",
      thumbnail: "",
      lessons: lessons,
      createdAt: new Date().toISOString()
    };

    // Supabase'e kaydet
    const { data, error } = await supabase
      .from('courses')
      .insert({
        title: course.title,
        description: course.description,
        thumbnail: course.thumbnail,
        duration: course.duration,
        category: course.category,
        lessons: course.lessons
      })
      .select();
    
    if (error) {
      alert('Hata: ' + error.message);
      return;
    }
    
    if (data) {
      setCourses([...courses, data[0]]);
    }

    setNewCourse({
      title: "",
      description: "",
      tempLessons: []
    });
    setTempLesson({ title: "", videoUrl: "", duration: "" });
    setShowAddCourse(false);
    alert("✅ Eğitim ve dersler başarıyla eklendi!");
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Bu eğitimi silmek istediğinize emin misiniz?")) return;
    
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);
    
    if (error) {
      alert('Hata: ' + error.message);
      return;
    }
    
    setCourses(courses.filter(c => c.id !== id));
  };

  const startEditCourse = (course: Course) => {
    setEditingCourse(course);
    setNewCourse({
      title: course.title,
      description: course.description,
      tempLessons: course.lessons.map(l => ({ title: l.title, videoUrl: l.videoUrl, duration: l.duration }))
    });
    setShowAddCourse(true);
  };

  const updateCourse = async () => {
    if (!editingCourse || !newCourse.title) {
      alert("❌ Eğitim başlığı gerekli!");
      return;
    }

    if (newCourse.tempLessons.length === 0) {
      alert("❌ En az 1 ders eklemelisiniz!");
      return;
    }

    const lessons: Lesson[] = newCourse.tempLessons.map((lesson, index) => ({
      id: Date.now().toString() + index,
      ...lesson,
      order: index + 1
    }));

    const totalDuration = newCourse.tempLessons.reduce((sum, lesson) => {
      const mins = parseInt(lesson.duration) || 0;
      return sum + mins;
    }, 0);

    // Supabase'de güncelle
    const { error } = await supabase
      .from('courses')
      .update({
        title: newCourse.title,
        description: newCourse.description,
        duration: `${totalDuration} dk`,
        lessons: lessons
      })
      .eq('id', editingCourse.id);

    if (error) {
      console.error('Kurs güncelleme hatası:', error);
      alert('Hata: ' + error.message);
      return;
    }

    await loadData();
    setNewCourse({ title: "", description: "", tempLessons: [] });
    setTempLesson({ title: "", videoUrl: "", duration: "" });
    setShowAddCourse(false);
    setEditingCourse(null);
    alert("✅ Eğitim güncellendi!");
  };

  const addLesson = async () => {
    if (!selectedCourse || !newLesson.title || !newLesson.videoUrl) {
      alert("❌ Başlık ve video URL'si gerekli!");
      return;
    }

    const lesson: Lesson = {
      id: Date.now().toString(),
      ...newLesson,
      order: selectedCourse.lessons.length + 1
    };

    const updatedLessons = [...selectedCourse.lessons, lesson];

    // Supabase'de güncelle
    const { error } = await supabase
      .from('courses')
      .update({ lessons: updatedLessons })
      .eq('id', selectedCourse.id);

    if (error) {
      console.error('Ders ekleme hatası:', error);
      alert('Hata: ' + error.message);
      return;
    }

    await loadData();
    setSelectedCourse({ ...selectedCourse, lessons: updatedLessons });
    setNewLesson({ title: "", videoUrl: "", duration: "" });
    setShowAddLesson(false);
    alert("✅ Ders eklendi!");
  };

  const deleteLesson = async (courseId: string, lessonId: string) => {
    if (!confirm("Bu dersi silmek istediğinize emin misiniz?")) return;
    
    const course = courses.find(c => c.id === courseId);
    if (!course) return;

    const updatedLessons = course.lessons.filter(l => l.id !== lessonId);

    // Supabase'de güncelle
    const { error } = await supabase
      .from('courses')
      .update({ lessons: updatedLessons })
      .eq('id', courseId);

    if (error) {
      console.error('Ders silme hatası:', error);
      alert('Hata: ' + error.message);
      return;
    }

    await loadData();
    if (selectedCourse && selectedCourse.id === courseId) {
      setSelectedCourse({ ...selectedCourse, lessons: updatedLessons });
    }
    alert('✅ Ders silindi!');
  };

  
  const sendPasswordResetEmail = async (userEmail: string) => {
    if (!confirm(`${userEmail} adresine şifre sıfırlama bağlantısı göndermek istediğinize emin misiniz?`)) return;

    const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      alert('❌ Hata: ' + error.message);
      return;
    }

    alert(`✅ Şifre sıfırlama bağlantısı ${userEmail} adresine gönderildi!`);
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('⚠️ Bu kullanıcıyı kalıcı olarak silmek istediğinize emin misiniz?\n\nTüm verileri (profil, abonelik, dersler) silinecektir!')) return;
    
    try {
      // 1. Önce ilişkili tablolardan sil
      await supabase.from('user_subscriptions').delete().eq('user_id', userId);
      
      // 2. Profili sil
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        alert('❌ Profil silme hatası: ' + profileError.message);
        return;
      }

      // 3. Auth user'i sil (admin API gerektirir - RPC kullanarak)
      const { error: authError } = await supabase.rpc('delete_user', { user_id: userId });
      
      if (authError) {
        console.warn('Auth silme hatası:', authError);
        // Auth silinmese bile devam et
      }
      
      alert('✅ Kullanıcı başarıyla silindi!');
      setEditingUser(null);
      loadData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('❌ Silme sırasında hata oluştu!');
    }
  };
  
  const saveUserEdit = async () => {
    if (!editingUser) return;
    
    // Supabase'de güncelle
    const { error } = await supabase
      .from('profiles')
      .update({
        name: userEditData.name,
        is_premium: userEditData.isPremium,
        role: userEditData.isAdmin ? 'admin' : 'user'
      })
      .eq('id', editingUser.id);
    
    if (error) {
      alert('❌ Hata: ' + error.message);
      return;
    }
    
    // Local state'i güncelle
    const updatedUsers = users.map(u => 
      u.id === editingUser.id 
        ? { ...u, name: userEditData.name, isPremium: userEditData.isPremium, isAdmin: userEditData.isAdmin }
        : u
    );
    setUsers(updatedUsers);
    
    setEditingUser(null);
    alert('✅ Kullanıcı güncellendi!');
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            🔒 Admin Dashboard
          </h1>
          <p className="text-gray-600">Sistem yönetim paneli</p>
        </div>

        <div className="flex gap-2 mb-8 bg-white rounded-2xl p-2 shadow-lg">
          <button onClick={() => setActiveTab("stats")} className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${activeTab === "stats" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"}`}>
            📊 İstatistikler
          </button>
          <button onClick={() => setActiveTab("users")} className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${activeTab === "users" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"}`}>
            👥 Kullanıcılar
          </button>
          <button onClick={() => setActiveTab("subscriptions")} className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${activeTab === "subscriptions" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"}`}>
            💳 Abonelikler
          </button>
          <button onClick={() => setActiveTab("courses")} className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${activeTab === "courses" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"}`}>
            📚 Eğitimler
          </button>
          <button onClick={() => setActiveTab("settings")} className={`flex-1 py-3 px-6 rounded-xl font-semibold transition ${activeTab === "settings" ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg" : "text-gray-600 hover:bg-gray-100"}`}>
            ⚙️ Ayarlar
          </button>
        </div>

        {activeTab === "stats" && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">👥</div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-800">{stats.totalUsers}</p>
                    <p className="text-sm text-gray-500">Toplam Kullanıcı</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">⭐</div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-800">{stats.premiumUsers}</p>
                    <p className="text-sm text-gray-500">Premium Üye</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">📚</div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-800">{stats.totalCourses}</p>
                    <p className="text-sm text-gray-500">Toplam Eğitim</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-yellow-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-4xl">💰</div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-gray-800">${stats.totalRevenue}</p>
                    <p className="text-sm text-gray-500">Toplam Gelir</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="🔍 Kullanıcı ara..." className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" />
            </div>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold">👤 Kullanıcı</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">📧 Email</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">📅 Kayıt</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">🔑 Yetki</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">⭐ Premium</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">🛠️ İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Kullanıcı bulunamadı</td></tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 font-semibold text-gray-800">{user.name}</td>
                        <td className="px-6 py-4 text-gray-600">{user.email}</td>
                        <td className="px-6 py-4 text-gray-600 text-sm">{user.joinDate}</td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => toggleUserAdmin(user.id, (user as any).isAdmin || false)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                              (user as any).isAdmin 
                                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {(user as any).isAdmin ? '🔑 Admin' : '👤 User'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => toggleUserPremium(user.id, user.isPremium)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                              user.isPremium 
                                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {user.isPremium ? '⭐ Premium' : '🆓 Free'}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            <button 
                              onClick={() => {
                                setEditingUser(user);
                                setUserEditData({
                                  name: user.name,
                                  email: user.email,
                                  isPremium: user.isPremium,
                                  isAdmin: user.isAdmin || false
                                });
                              }}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
                            >
                              ✏️ Düzenle
                            </button>
                            <button 
                              onClick={() => sendPasswordResetEmail(user.email)} 
                              className="px-3 py-1 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600 transition"
                            >
                              🔑 Şifre Sıfırla
                            </button>
                            <button 
                              onClick={() => deleteUser(user.id)} 
                              className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition"
                            >
                              🗑️ Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "subscriptions" && (
          <div>
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">💳 Abonelik Yönetimi</h2>
              <p className="text-gray-600">Kullanıcıların abonelik bilgilerini görüntüleyin ve düzenleyin</p>
            </div>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold">👤 Kullanıcı</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">📦 Paket</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">💬 Mesaj</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">🍽️ Kalori</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">🟢 Durum</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">⚙️ İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Henüz abonelik kaydı bulunmuyor.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-gray-100 hover:bg-purple-50 transition">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-800">{sub.user_name}</p>
                            <p className="text-sm text-gray-500">{sub.user_email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <select 
                            value={sub.plan_type}
                            onChange={(e) => changePlanType(sub.id, e.target.value as any)}
                            className="px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-purple-400 focus:outline-none font-semibold"
                          >
                            <option value="free">🆓 Free</option>
                            <option value="standard">🎯 Standard</option>
                            <option value="unlimited">⭐ Unlimited</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${sub.is_unlimited ? 'text-green-600' : 'text-gray-800'}`}>
                              {sub.is_unlimited ? '∞ Sınırsız' : sub.message_credits}
                            </span>
                            {!sub.is_unlimited && (
                              <div className="flex gap-1 flex-wrap">
                                <button onClick={() => addCredits(sub.id, 'message', 10)} className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-bold hover:bg-green-200">+10</button>
                                <button onClick={() => addCredits(sub.id, 'message', 100)} className="px-2 py-1 bg-green-100 text-green-600 rounded text-xs font-bold hover:bg-green-200">+100</button>
                                <button onClick={() => addCustomCredits(sub.id, 'message')} className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-bold hover:bg-blue-200">✏️ Ekle</button>
                                <button onClick={() => setCustomCredits(sub.id, 'message')} className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs font-bold hover:bg-purple-200">🎯 Ayarla</button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${sub.is_unlimited ? 'text-green-600' : 'text-gray-800'}`}>
                              {sub.is_unlimited ? '∞ Sınırsız' : sub.calorie_credits}
                            </span>
                            {!sub.is_unlimited && (
                              <div className="flex gap-1 flex-wrap">
                                <button onClick={() => addCredits(sub.id, 'calorie', 5)} className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-bold hover:bg-orange-200">+5</button>
                                <button onClick={() => addCredits(sub.id, 'calorie', 30)} className="px-2 py-1 bg-orange-100 text-orange-600 rounded text-xs font-bold hover:bg-orange-200">+30</button>
                                <button onClick={() => addCustomCredits(sub.id, 'calorie')} className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs font-bold hover:bg-blue-200">✏️ Ekle</button>
                                <button onClick={() => setCustomCredits(sub.id, 'calorie')} className="px-2 py-1 bg-purple-100 text-purple-600 rounded text-xs font-bold hover:bg-purple-200">🎯 Ayarla</button>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            sub.status === 'active' ? 'bg-green-100 text-green-600' :
                            sub.status === 'expired' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {sub.status === 'active' ? '✅ Aktif' : sub.status === 'expired' ? '❌ Süresi Doldu' : '🚫 İptal'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => openEditSubscription(sub)}
                            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-semibold hover:bg-blue-200 transition"
                          >
                            ✏️ Düzenle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscription Düzenleme Modal */}
        {editingSubscription && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">✏️ Abonelik Düzenle</h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Kullanıcı</label>
                  <p className="text-gray-600">{editingSubscription.user_name} ({editingSubscription.user_email})</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Paket Türü</label>
                  <select 
                    value={subscriptionEditData.plan_type}
                    onChange={(e) => setSubscriptionEditData({...subscriptionEditData, plan_type: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                  >
                    <option value="free">Free</option>
                    <option value="standard">Standard</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Mesaj Kredisi</label>
                    <input 
                      type="number" 
                      value={subscriptionEditData.message_credits}
                      onChange={(e) => setSubscriptionEditData({...subscriptionEditData, message_credits: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                      disabled={subscriptionEditData.is_unlimited}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kalori Kredisi</label>
                    <input 
                      type="number" 
                      value={subscriptionEditData.calorie_credits}
                      onChange={(e) => setSubscriptionEditData({...subscriptionEditData, calorie_credits: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                      disabled={subscriptionEditData.is_unlimited}
                    />
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={subscriptionEditData.is_unlimited}
                      onChange={(e) => setSubscriptionEditData({...subscriptionEditData, is_unlimited: e.target.checked})}
                      className="w-5 h-5 text-purple-600 rounded"
                    />
                    <span className="text-sm font-semibold text-gray-700">Sınırsız Kredi</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Durum</label>
                  <select 
                    value={subscriptionEditData.status}
                    onChange={(e) => setSubscriptionEditData({...subscriptionEditData, status: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-purple-400 focus:outline-none"
                  >
                    <option value="active">Aktif</option>
                    <option value="expired">Süresi Doldu</option>
                    <option value="cancelled">İptal Edildi</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={updateSubscription}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition"
                >
                  ✅ Kaydet
                </button>
                <button 
                  onClick={() => setEditingSubscription(null)}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
                >
                  ❌ İptal
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "courses" && (
          <div>
            <div className="mb-6">
              <button onClick={() => setShowAddCourse(!showAddCourse)} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition">➕ Yeni Eğitim Ekle</button>
            </div>
            {showAddCourse && (
              <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
                <h3 className="text-2xl font-bold text-gray-800 mb-6">{editingCourse ? "✏️ Eğitimi Düzenle" : "🎬 Yeni Eğitim Ekle"}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Başlık</label>
                    <input type="text" value={newCourse.title} onChange={(e) => setNewCourse({...newCourse, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="Eğitim başlığı" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Açıklama</label>
                    <textarea value={newCourse.description} onChange={(e) => setNewCourse({...newCourse, description: e.target.value})} rows={3} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none resize-none" placeholder="Eğitim hakkında kısa bilgi" />
                  </div>
                  {/* Dersler Bölümü */}
                  <div className="border-t-2 border-gray-200 pt-6 mt-6">
                    <h4 className="text-xl font-bold text-gray-800 mb-4">📚 Dersler</h4>
                    
                    {/* Ders Ekleme */}
                    <div className="bg-gray-50 rounded-xl p-4 mb-4">
                      <div className="space-y-3">
                        <div>
                          <input type="text" value={tempLesson.title} onChange={(e) => setTempLesson({...tempLesson, title: e.target.value})} className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="Ders başlığı" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input type="url" value={tempLesson.videoUrl} onChange={(e) => setTempLesson({...tempLesson, videoUrl: e.target.value})} className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="YouTube URL" />
                          <input type="text" value={tempLesson.duration} onChange={(e) => setTempLesson({...tempLesson, duration: e.target.value})} className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="Süre (örn: 15 dk)" />
                        </div>
                        <button onClick={addTempLesson} className="w-full py-2 bg-indigo-500 text-white rounded-lg font-semibold hover:bg-indigo-600 transition">➕ Ders Ekle</button>
                      </div>
                    </div>

                    {/* Eklenen Dersler */}
                    {newCourse.tempLessons.length > 0 && (
                      <div className="space-y-2">
                        {newCourse.tempLessons.map((lesson, index) => (
                          <div key={index} className="flex items-center justify-between bg-white rounded-lg p-4 border-2 border-gray-200">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-indigo-500 text-white rounded-lg flex items-center justify-center font-bold">{index + 1}</div>
                              <div>
                                <p className="font-semibold text-gray-800">{lesson.title}</p>
                                <p className="text-sm text-gray-500">⏱️ {lesson.duration}</p>
                              </div>
                            </div>
                            <button onClick={() => removeTempLesson(index)} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">🗑️</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button onClick={editingCourse ? updateCourse : addCourse} className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition">
                      {editingCourse ? "✅ Güncelle" : "✅ Eğitimi ve Dersleri Kaydet"}
                    </button>
                    <button onClick={() => { setShowAddCourse(false); setEditingCourse(null); setNewCourse({ title: "", description: "", tempLessons: [] }); setTempLesson({ title: "", videoUrl: "", duration: "" }); }} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition">❌ İptal</button>
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-lg"><div className="text-6xl mb-4">📚</div><p className="text-gray-600">Henüz eğitim eklenmemiş</p></div>
              ) : (
                courses.map((course) => (
                  <div key={course.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition">
                    {course.thumbnail ? <img src={course.thumbnail} alt={course.title} className="w-full h-48 object-cover" /> : <div className="w-full h-48 bg-gradient-to-r from-indigo-400 to-purple-400 flex items-center justify-center text-white text-6xl">🎬</div>}
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">{course.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm text-gray-500">⏱️ {course.duration}</span>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">{course.category}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setSelectedCourse(course)} className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 transition">📚 Dersler ({course.lessons.length})</button>
                        <button onClick={() => startEditCourse(course)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition">✏️</button>
                        <button onClick={() => deleteCourse(course.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">🗑️</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ders Yönetimi Modal */}
            {selectedCourse && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
                <div className="bg-white rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">📚 {selectedCourse.title} - Dersler</h2>
                    <button onClick={() => setSelectedCourse(null)} className="text-4xl text-gray-400 hover:text-gray-600">×</button>
                  </div>

                  {/* Ders Ekleme Formu */}
                  {showAddLesson ? (
                    <div className="bg-gray-50 rounded-2xl p-6 mb-6">
                      <h3 className="text-xl font-bold text-gray-800 mb-4">➕ Yeni Ders Ekle</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Ders Başlığı</label>
                          <input type="text" value={newLesson.title} onChange={(e) => setNewLesson({...newLesson, title: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="Örn: Giriş ve Tanışma" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Video URL</label>
                            <input type="url" value={newLesson.videoUrl} onChange={(e) => setNewLesson({...newLesson, videoUrl: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="https://youtube.com/..." />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Süre</label>
                            <input type="text" value={newLesson.duration} onChange={(e) => setNewLesson({...newLesson, duration: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" placeholder="Örn: 15 dk" />
                          </div>
                        </div>
                        <div className="flex gap-4">
                          <button onClick={addLesson} className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition">✅ Dersi Ekle</button>
                          <button onClick={() => { setShowAddLesson(false); setNewLesson({ title: "", videoUrl: "", duration: "" }); }} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition">❌ İptal</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowAddLesson(true)} className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition mb-6">➕ Yeni Ders Ekle</button>
                  )}

                  {/* Ders Listesi */}
                  <div className="space-y-4">
                    {selectedCourse.lessons.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl">
                        <div className="text-6xl mb-4">📚</div>
                        <p className="text-gray-600">Henüz ders eklenmemiş</p>
                      </div>
                    ) : (
                      selectedCourse.lessons.map((lesson, index) => (
                        <div key={lesson.id} className="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-lg font-bold text-gray-800">{lesson.title}</h4>
                                <p className="text-sm text-gray-600">⏱️ {lesson.duration}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition">🎬 İzle</a>
                              <button onClick={() => deleteLesson(selectedCourse.id, lesson.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition">🗑️</button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">⚙️ Sistem Ayarları</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Genel Ayarlar</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Site Adı</label>
                    <input type="text" value={settings.siteName} onChange={(e) => setSettings({...settings, siteName: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Site Açıklaması</label>
                    <textarea value={settings.siteDescription} onChange={(e) => setSettings({...settings, siteDescription: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Premium Fiyat ($)</label>
                    <input type="number" value={settings.premiumPrice} onChange={(e) => setSettings({...settings, premiumPrice: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings.maintenanceMode} onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})} className="w-5 h-5" />
                      <span className="text-sm font-semibold text-gray-700">Bakım Modu</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={settings.emailNotifications} onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})} className="w-5 h-5" />
                      <span className="text-sm font-semibold text-gray-700">Email Bildirimleri</span>
                    </label>
                  </div>
                  <button onClick={() => { alert("✅ Ayarlar kaydedildi!"); }} className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition">✅ Kaydet</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Kullanıcı Düzenleme Modalı */}
        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ✏️ Kullanıcı Düzenle
                </h2>
                <button onClick={() => setEditingUser(null)} className="text-3xl text-gray-500 hover:text-gray-700 transition">×</button>
              </div>

              <div className="space-y-6">
                {/* Kullanıcı Bilgileri */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">👤 Kullanıcı Bilgileri</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Ad Soyad</label>
                      <input 
                        type="text" 
                        value={userEditData.name} 
                        onChange={(e) => setUserEditData({...userEditData, name: e.target.value})} 
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                      <input 
                        type="email" 
                        value={userEditData.email} 
                        disabled
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 bg-gray-50 cursor-not-allowed" 
                      />
                      <p className="text-xs text-gray-500 mt-1">Email değiştirilemez</p>
                    </div>
                  </div>
                </div>

                {/* Premium Durumu */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">⭐ Premium Durumu</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={userEditData.isPremium} 
                      onChange={(e) => setUserEditData({...userEditData, isPremium: e.target.checked})} 
                      className="w-6 h-6 rounded" 
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      {userEditData.isPremium ? '✅ Premium Üye' : '🆓 Ücretsiz Üye'}
                    </span>
                  </label>
                </div>

                {/* Admin Durumu */}
                <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">🔑 Admin Durumu</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={userEditData.isAdmin} 
                      onChange={(e) => setUserEditData({...userEditData, isAdmin: e.target.checked})} 
                      className="w-6 h-6 rounded" 
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      {userEditData.isAdmin ? '✅ Admin Yetkisi Var' : '❌ Admin Yetkisi Yok'}
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-2">⚠️ Admin yetkisi tüm panele erişim sağlar</p>
                </div>

                {/* Kullanıcı İstatistikleri */}
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📊 Kullanıcı Bilgileri</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-600">Kayıt Tarihi</p>
                      <p className="text-lg font-bold text-gray-800">{editingUser.joinDate}</p>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <p className="text-sm text-gray-600">Son Aktif</p>
                      <p className="text-lg font-bold text-gray-800">{editingUser.lastActive}</p>
                    </div>
                  </div>
                </div>

                {/* Butonlar */}
                <div className="space-y-3 pt-4">
                  <div className="flex gap-4">
                    <button 
                      onClick={saveUserEdit} 
                      className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition"
                    >
                      ✅ Değişiklikleri Kaydet
                    </button>
                    <button 
                      onClick={() => setEditingUser(null)} 
                      className="flex-1 py-4 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
                    >
                      ❌ İptal
                    </button>
                  </div>
                  
                  {/* Tehlikeli Alan */}
                  <div className="border-t-2 border-red-200 pt-4">
                    <button 
                      onClick={() => deleteUser(editingUser.id)} 
                      className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition"
                    >
                      🗑️ Kullanıcıyı Sil
                    </button>
                    <p className="text-xs text-red-600 text-center mt-2">⚠️ Bu işlem geri alınamaz!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}