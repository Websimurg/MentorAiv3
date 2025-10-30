"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface BurnEstimate {
  walkMinutes: number;
  runMinutes: number;
  strengthMinutes: number;
}

interface Meal {
  id: string;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  time: string;
  date: string;
  type?: "Kahvaltı" | "Öğle" | "Akşam" | "Atıştırmalık";
  image?: string;
  coachTips?: string;
  burnEstimate?: BurnEstimate;
}

export default function Kalori() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [mealName, setMealName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [mealType, setMealType] = useState<"Kahvaltı" | "Öğle" | "Akşam" | "Atıştırmalık">("Kahvaltı");
  const [dailyGoal, setDailyGoal] = useState(2000);
  const [analyzedMeal, setAnalyzedMeal] = useState<Meal | null>(null);
  const [selectedMealDetail, setSelectedMealDetail] = useState<Meal | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // Filtre kaldırıldı - tüm geçmiş gösteriliyor
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push("/login");
      return;
    }
    loadMeals();
  };

  const loadMeals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Meals yükleme hatası:', error);
      return;
    }

    if (data) {
      const formattedMeals: Meal[] = data.map(meal => {
        const mealData: Meal = {
          id: meal.id.toString(),
          name: meal.name,
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          date: new Date(meal.created_at).toLocaleDateString('tr-TR'),
          time: new Date(meal.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
          type: (meal.meal_type || 'Atıştırmalık') as 'Kahvaltı' | 'Öğle' | 'Akşam' | 'Atıştırmalık',
          image: meal.image || undefined
        };
        
        // Coach tips ve burn estimate oluştur
        if (mealData.calories > 0) {
          mealData.coachTips = generateCoachTips(mealData);
          mealData.burnEstimate = calculateBurnEstimate(mealData.calories);
        }
        
        return mealData;
      });
      setMeals(formattedMeals);
      console.log('Meals yüklendi:', formattedMeals.length);
    }
  };

  const addMeal = async () => {
    if (!mealName.trim() || !calories) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        name: mealName,
        calories: parseInt(calories) || 0,
        protein: parseInt(protein) || 0,
        carbs: parseInt(carbs) || 0,
        fat: parseInt(fat) || 0,
        meal_type: mealType,
        date: (() => {
          const now = new Date();
          const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
          const year = turkeyTime.getFullYear();
          const month = String(turkeyTime.getMonth() + 1).padStart(2, '0');
          const day = String(turkeyTime.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })()
      })
      .select();

    if (error) {
      console.error('Meal ekleme hatası:', error);
      alert('Hata: ' + error.message);
      return;
    }

    console.log('Meal eklendi:', data);
    await loadMeals();
    setMealName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
  };

  const deleteMeal = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id);

    if (!error) {
      setMeals(meals.filter(m => m.id !== id));
    }
  };

  useEffect(() => {
    if (meals.length > 0) {
      try {
        // coachTips ve burnEstimate'i çıkararak kaydet, image'i tut
        const mealsToSave = meals.map((meal) => {
          const { coachTips, burnEstimate, ...mealWithImage } = meal;
          return mealWithImage;
        });
        localStorage.setItem("meals", JSON.stringify(mealsToSave));
      } catch (error) {
        console.error('localStorage kaydetme hatası:', error);
        // Kota aşımında eski kayıtları temizle
        if (error instanceof Error && error.message.includes('quota')) {
          console.log('localStorage dolu, eski kayıtlar temizleniyor...');
          // Sadece son 20 kaydı tut (resimlerle birlikte)
          const recentMeals = meals.slice(-20).map((meal) => {
            const { coachTips, burnEstimate, ...mealWithImage } = meal;
            return mealWithImage;
          });
          try {
            localStorage.setItem("meals", JSON.stringify(recentMeals));
            setMeals(meals.slice(-20)); // State'i de güncelle
          } catch (e) {
            console.error('Temizleme sonrası da hata:', e);
          }
        }
      }
    }
  }, [meals]);

  useEffect(() => {
    localStorage.setItem("dailyCalorieGoal", dailyGoal.toString());
  }, [dailyGoal]);

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: 1280, height: 720 } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Kamera erişim hatası:', error);
      alert('Kamera erişimi reddedildi. Lütfen tarayıcı izinlerini kontrol edin.');
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            closeCamera();
            processImageFile(file);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      // Dosya adını da gönder
      analyzeImage(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(reader.result as string);
      analyzeImage(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (image: string, fileName?: string) => {
    console.log('📸 analyzeImage başlatıldı');
    console.log('📷 Image length:', image.length);
    console.log('📷 Image prefix:', image.substring(0, 50));
    console.log('📝 File name:', fileName);
    
    setIsAnalyzing(true);
    try {
      console.log('🚀 API\'ye istek gönderiliyor...');
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, fileName }),
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Analiz başarısız' }));
        console.error('❌ API Hatası:', errorData);
        throw new Error(errorData.error || 'Analiz başarısız');
      }

      const data = await response.json();
      console.log('✅ API Yanıtı:', data);
      
      // Sabit isim kullan
      const displayName = data.name || "Yüklenen Resim";
      
      const newMeal: Meal = {
        id: Date.now().toString(),
        name: displayName,
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('tr-TR'),
        type: getMealType(),
        image: image
      };
      
      // Kalori Takip Öneri - Akıllı öneriler oluştur
      const coachTips = generateCoachTips(newMeal);
      const burnEstimate = calculateBurnEstimate(newMeal.calories);
      
      setAnalyzedMeal({...newMeal, coachTips, burnEstimate});
    } catch (error) {
      console.error('Analiz hatası:', error);
      alert('Yemek analizi başarısız oldu.');
      setSelectedImage(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

    const generateCoachTips = (meal: Meal): string => {
    const tips: string[] = [];
    
    // 1. Kalori Değerlendirmesi
    if (meal.calories > 900) {
      tips.push(`🔥 Yüksek Kalorili Öğün (${meal.calories} kcal)\nBu öğün günlük kalorinizin büyük bir kısmını oluşturuyor. Sindirimi kolaylaştırmak için yürüyüş yapmanız önerilir. Diğer öğünlerde porsiyonları küçültmeyi düşünün.`);
    } else if (meal.calories > 600) {
      tips.push(`✅ Dengeli Kalori (${meal.calories} kcal)\nOrta kalorili, dengeli bir öğün. Günlük hedeflerinize uygun. Enerji seviyeniz stabil kalacaktır.`);
    } else if (meal.calories > 300) {
      tips.push(`🌿 Hafif Öğün (${meal.calories} kcal)\nDüşük kalorili bir öğün. Atıştırmalık veya hafif öğünler için ideal. Ana öğünlerde daha fazla besin almanız gerekebilir.`);
    } else {
      tips.push(`🥤 Çok Hafif (${meal.calories} kcal)\nÇok düşük kalorili. Sadece atıştırmalık olarak uygun. Ana öğünlerde daha besleyici seçimler yapmalısınız.`);
    }
    
    // 2. Protein Analizi
    const protein = meal.protein ?? 0;
    if (protein > 35) {
      tips.push(`🥩 Mükemmel Protein (${protein}g)\nYüksek protein içeriği kas gelişimi, tokluk hissi ve metabolizma hızı için harika. Spor sonrası ideal bir öğün. Bu şekilde devam edin!`);
    } else if (protein >= 25) {
      tips.push(`💪 İyi Protein (${protein}g)\nProtein miktarı yeterli seviyede. Kas korunumu ve tokluk için iyi. Dengeli beslenmeye devam edin.`);
    } else if (protein >= 15) {
      tips.push(`🔶 Orta Protein (${protein}g)\nProtein miktarı orta seviyede. Bir sonraki öğünde protein kaynaklarını artırmayı düşünün (tavuk, balık, yumurta, baklagiller).`);
    } else {
      tips.push(`⚠️ Düşük Protein (${protein}g)\nProtein miktarı yetersiz. Tokluk hissi kısa sürebilir ve kas kaybı riski var. Mutlaka protein ekleyin: Yumurta, peynir, tavuk, balık, mercimek gibi.`);
    }
    
    // 3. Karbonhidrat Analizi
    const carbs = meal.carbs ?? 0;
    if (carbs > 100) {
      if (meal.type === 'Akşam') {
        tips.push(`🍞 Yüksek Karbonhidrat - Akşam (${carbs}g)\nAkşam saatlerinde yüksek karbonhidrat uyku kalitenizi etkileyebilir. Akşam öğünlerini daha hafif tutmayı deneyin. Protein ağırlıklı seçimler tercih edin.`);
      } else {
        tips.push(`⚡ Yüksek Karbonhidrat (${carbs}g)\nYüksek enerji sağlayan bir öğün. Spor öncesi veya yoğun aktivite günlerinde uygun. Hareketsiz günlerde azaltılabilir.`);
      }
    } else if (carbs > 50) {
      tips.push(`🌾 Dengeli Karbonhidrat (${carbs}g)\nKarbonhidrat miktarı dengeli. Enerji seviyenizi stabil tutar. Tam tahıl, sebze gibi kompleks karbonhidratlar tercih edin.`);
    } else {
      tips.push(`🥒 Düşük Karbonhidrat (${carbs}g)\nDüşük karbonhidratlı bir öğün. Yağ yakma için iyi ama enerji seviyeniz düşebilir. Yoğun aktivite öncesi karbonhidrat ekleyin.`);
    }
    
    // 4. Yağ Analizi
    const fat = meal.fat ?? 0;
    if (fat > 40) {
      tips.push(`🥑 Yüksek Yağ (${fat}g)\nYüksek yağ içeriği. Tokluk hissi uzun sürer ama sindirim yavaşlar. Sağlıklı yağlar tercih edin: Zeytinyağı, avokado, fındık.`);
    } else if (fat > 20) {
      tips.push(`✅ Dengeli Yağ (${fat}g)\nYağ miktarı uygun seviyede. Hormon dengesi ve tokluk için iyi. Sağlıklı yağlardan devam edin.`);
    } else {
      tips.push(`💚 Düşük Yağ (${fat}g)\nDüşük yağlı bir öğün. Hormon dengesi için günde 50-70g yağ hedefleyin. Zeytinyağı, fındık ekleyebilirsiniz.`);
    }
    
    // 5. Öğün Zamanına Göre Öneri
    if (meal.type === 'Kahvaltı') {
      tips.push(`🌅 Kahvaltı Önerisi\nGüne iyi başladınız! Kahvaltıda protein ve kompleks karbonhidrat metabolizmayı hızlandırır. Yumurta, yulaf, meyve gibi besinler ekleyebilirsiniz.`);
    } else if (meal.type === 'Öğle') {
      tips.push(`☀️ Öğle Öğünü Önerisi\nGün ortası enerjinizi dengede tutun. Protein + sebze + kompleks karbonhidrat kombinasyonu ideal. Öğleden sonra enerji düşükleri yaşamayacaksınız.`);
    } else if (meal.type === 'Akşam') {
      tips.push(`🌙 Akşam Öğünü Önerisi\nAkşam öğünlerini hafif tutun. Yüksek protein, düşük karbonhidrat uyku kalitenizi artırır. Yatmadan 2-3 saat önce yemeyi bitirin.`);
    }
    
    return tips.join('\n\n');
  };
  const calculateBurnEstimate = (calories: number): BurnEstimate => {
    return {
      walkMinutes: Math.round(calories / 4),
      runMinutes: Math.round(calories / 9),
      strengthMinutes: Math.round(calories / 6)
    };
  };

  const confirmAnalyzedMeal = async () => {
    if (!analyzedMeal) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: user.id,
        name: analyzedMeal.name,
        calories: analyzedMeal.calories || 0,
        protein: analyzedMeal.protein || 0,
        carbs: analyzedMeal.carbs || 0,
        fat: analyzedMeal.fat || 0,
        meal_type: analyzedMeal.type || 'Atıştırmalık',
        date: (() => {
          const now = new Date();
          const turkeyTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }));
          const year = turkeyTime.getFullYear();
          const month = String(turkeyTime.getMonth() + 1).padStart(2, '0');
          const day = String(turkeyTime.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        image: analyzedMeal.image || null
      })
      .select();

    if (error) {
      console.error('Meal ekleme hatası:', error);
      alert('Hata: ' + error.message);
      return;
    }

    console.log('Meal eklendi:', data);
    
    // Hızlı güncelleme - await kullanma
    setAnalyzedMeal(null);
    setSelectedImage(null);
    loadMeals(); // async ama await yok - hızlı UI güncellemesi
  };

  const cancelAnalysis = () => {
    setAnalyzedMeal(null);
    setSelectedImage(null);
  };

  const getMealType = (): "Kahvaltı" | "Öğle" | "Akşam" | "Atıştırmalık" => {
    const hour = new Date().getHours();
    if (hour < 11) return "Kahvaltı";
    if (hour < 15) return "Öğle";
    if (hour < 20) return "Akşam";
    return "Atıştırmalık";
  };

  // Tüm yemekleri göster (filtre yok)
  const filteredMeals = useMemo(() => meals, [meals]);
  const totalCalories = useMemo(() => filteredMeals.reduce((sum, meal) => sum + meal.calories, 0), [filteredMeals]);
  const totalProtein = useMemo(() => filteredMeals.reduce((sum, meal) => sum + (meal.protein ?? 0), 0), [filteredMeals]);
  const totalCarbs = useMemo(() => filteredMeals.reduce((sum, meal) => sum + (meal.carbs ?? 0), 0), [filteredMeals]);
  const totalFat = useMemo(() => filteredMeals.reduce((sum, meal) => sum + (meal.fat ?? 0), 0), [filteredMeals]);
  const caloriePercentage = useMemo(() => Math.min((totalCalories / dailyGoal) * 100, 100), [totalCalories, dailyGoal]);

  // Filtrelenmiş öğünleri tipe göre grupla
  const mealsByType = {
    "Kahvaltı": filteredMeals.filter(m => m.type === "Kahvaltı"),
    "Öğle": filteredMeals.filter(m => m.type === "Öğle"),
    "Akşam": filteredMeals.filter(m => m.type === "Akşam"),
    "Atıştırmalık": filteredMeals.filter(m => m.type === "Atıştırmalık")
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50 p-6">
      {/* Sayfa Başlığı */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">🔥 Kalori Takip</h1>
            <p className="text-gray-600">Günlük kalori alımını takip et, sağlıklı kal</p>
          </div>
          
          {/* Geçmiş Kayıtlar Başlığı */}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600">
              📋 Tüm Geçmiş Kayıtlar
            </p>
          </div>
        </div>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-3xl">🔥</div>
              <span className="text-xs font-semibold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                Toplam
              </span>
            </div>
            <div className="text-3xl font-bold text-orange-600 mb-1">{totalCalories}</div>
            <p className="text-sm text-gray-600">Kalori</p>
            <div className="mt-2 text-xs text-gray-500">Hedef: {dailyGoal}</div>
            <div className="mt-2 text-xs font-semibold text-orange-600">{filteredMeals.length} öğün</div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">🥩</div>
            <div className="text-3xl font-bold text-red-600 mb-1">{totalProtein}g</div>
            <p className="text-sm text-gray-600">Protein</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">🍞</div>
            <div className="text-3xl font-bold text-yellow-600 mb-1">{totalCarbs}g</div>
            <p className="text-sm text-gray-600">Karbonhidrat</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-3xl mb-2">🥑</div>
            <div className="text-3xl font-bold text-green-600 mb-1">{totalFat}g</div>
            <p className="text-sm text-gray-600">Yağ</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">📊 Günlük İlerleme</h3>
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">Günlük Hedef:</label>
              <input type="number" value={dailyGoal} onChange={(e) => setDailyGoal(parseInt(e.target.value) || 2000)} className="w-24 px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-800 font-semibold" min="1" />
              <span className="text-sm text-gray-600">kcal</span>
            </div>
          </div>
          <div className="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 transition-all duration-500" style={{ width: `${caloriePercentage}%` }} />
            <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-700">
              {totalCalories} / {dailyGoal} kcal ({Math.round(caloriePercentage)}%)
            </div>
          </div>
        </div>
                {analyzedMeal && (
          <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl shadow-xl p-8 mb-8 border border-emerald-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="text-5xl">✅</div>
                <div>
                  <h3 className="text-3xl font-bold text-slate-800">Analiz Tamamlandı!</h3>
<p className="text-slate-600">Kalori Takip Önerileri hazırlandı</p>                </div>
              </div>
              <button onClick={cancelAnalysis} className="px-4 py-2 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all shadow-md">❌ İptal</button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                {analyzedMeal.image && <img src={analyzedMeal.image} alt={analyzedMeal.name} className="w-full h-64 object-cover rounded-xl shadow-lg" />}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">🍽️ Yemek Adı</label>
                  <input type="text" value={analyzedMeal.name} onChange={(e) => setAnalyzedMeal({...analyzedMeal, name: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold text-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">⏰ Öğün Türü</label>
                  <select value={analyzedMeal.type} onChange={(e) => setAnalyzedMeal({...analyzedMeal, type: e.target.value as any})} className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 font-semibold">
                    <option value="Kahvaltı">🌅 Kahvaltı</option>
                    <option value="Öğle">☀️ Öğle</option>
                    <option value="Akşam">🌙 Akşam</option>
                    <option value="Atıştırmalık">🍎 Atıştırmalık</option>
                  </select>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-6 shadow-sm">
                  <h4 className="text-lg font-bold text-gray-800 mb-4">📊 Besin Değerleri</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-2">🔥 Kalori</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={analyzedMeal.calories} onChange={(e) => setAnalyzedMeal({...analyzedMeal, calories: parseInt(e.target.value) || 0})} className="flex-1 px-3 py-2 rounded-lg border-2 border-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold text-base text-orange-600" />
                        <span className="text-sm text-gray-600 whitespace-nowrap">kcal</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-2">🥩 Protein</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={analyzedMeal.protein} onChange={(e) => setAnalyzedMeal({...analyzedMeal, protein: parseInt(e.target.value) || 0})} className="flex-1 px-3 py-2 rounded-lg border-2 border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-base text-red-600" />
                        <span className="text-sm text-gray-600 whitespace-nowrap">g</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-2">🍞 Karbonhidrat</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={analyzedMeal.carbs} onChange={(e) => setAnalyzedMeal({...analyzedMeal, carbs: parseInt(e.target.value) || 0})} className="flex-1 px-3 py-2 rounded-lg border-2 border-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500 font-bold text-base text-yellow-600" />
                        <span className="text-sm text-gray-600 whitespace-nowrap">g</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-2">🥑 Yağ</label>
                      <div className="flex items-center gap-2">
                        <input type="number" value={analyzedMeal.fat} onChange={(e) => setAnalyzedMeal({...analyzedMeal, fat: parseInt(e.target.value) || 0})} className="flex-1 px-3 py-2 rounded-lg border-2 border-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-base text-green-600" />
                        <span className="text-sm text-gray-600 whitespace-nowrap">g</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button onClick={confirmAnalyzedMeal} className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold text-lg hover:shadow-xl transition-all hover:scale-105">✅ Onayla ve Ekle</button>
              </div>
              
              {/* Kalori Takip Öneri - Akıllı Öneriler */}
              {analyzedMeal.coachTips && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-3xl">🧠</span>
                    <h4 className="text-xl font-bold text-slate-800">Kalori Takip Öneri</h4>
                  </div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-line">{analyzedMeal.coachTips}</p>
                </div>
              )}
              
              {/* Burn Estimator */}
              {analyzedMeal.burnEstimate && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-3xl">🔥</span>
                    <h4 className="text-xl font-bold text-slate-800">Yakma Tahmini</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                      <div className="text-3xl mb-2">🚶‍♂️</div>
                      <div className="text-2xl font-bold text-emerald-600">{analyzedMeal.burnEstimate.walkMinutes}</div>
                      <p className="text-sm text-slate-600 mt-1">dk Yürüyüş</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                      <div className="text-3xl mb-2">🏃‍♂️</div>
                      <div className="text-2xl font-bold text-orange-600">{analyzedMeal.burnEstimate.runMinutes}</div>
                      <p className="text-sm text-slate-600 mt-1">dk Koşu</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                      <div className="text-3xl mb-2">💪</div>
                      <div className="text-2xl font-bold text-purple-600">{analyzedMeal.burnEstimate.strengthMinutes}</div>
                      <p className="text-sm text-slate-600 mt-1">dk Güç</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Fotoğrafla Yemek Ekleme */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🍽️ Yemek Ekle</h3>
          <div className="space-y-4">
            {isAnalyzing ? (
              <div className="flex flex-col items-center justify-center w-full p-12 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50">
                <div className="animate-spin text-6xl mb-4">⏳</div>
                <p className="text-lg font-semibold text-purple-600">Analiz ediliyor...</p>
              </div>
            ) : selectedImage ? (
              <div className="flex flex-col items-center justify-center w-full p-8 border-2 border-dashed border-green-300 rounded-xl bg-green-50">
                <img src={selectedImage} alt="Preview" className="w-32 h-32 object-cover rounded-xl shadow-lg mb-4" />
                <p className="text-sm text-gray-600">Analiz tamamlandı</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={openCamera}
                  disabled={isAnalyzing}
                  className="flex flex-col items-center justify-center p-8 border-4 border-dashed border-blue-300 rounded-2xl cursor-pointer bg-gradient-to-br from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 transition-all hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-6xl mb-4">📷</div>
                  <p className="text-xl font-bold text-blue-700">Kamera ile Çek</p>
                  <p className="text-sm text-gray-500 mt-2">Anlık fotoğraf çek</p>
                </button>
                
                <label className="flex flex-col items-center justify-center p-8 border-4 border-dashed border-purple-300 rounded-2xl cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all hover:shadow-xl hover:scale-105">
                  <div className="text-6xl mb-4">📸</div>
                  <p className="text-xl font-bold text-purple-700">Galeri'den Seç</p>
                  <p className="text-sm text-gray-500 mt-2">Fotoğraf yükle</p>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isAnalyzing} />
                </label>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {Object.entries(mealsByType).map(([type, typeMeals]) => (
            <div key={type} className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {type === "Kahvaltı" && "🌅"}{type === "Öğle" && "☀️"}{type === "Akşam" && "🌙"}{type === "Atıştırmalık" && "🍎"} {type}
                </h3>
                <div className="text-sm font-semibold text-gray-600">{typeMeals.reduce((sum, m) => sum + m.calories, 0)} kcal</div>
              </div>
              {typeMeals.length === 0 ? (
                <div className="text-center py-8 text-gray-400"><p>Henüz {type.toLowerCase()} eklenmemiş</p></div>
              ) : (
                <div className="space-y-3">
                  {typeMeals.map((meal) => (
                    <div key={meal.id} className="group relative flex items-center gap-4 p-5 bg-gradient-to-r from-white via-gray-50 to-white rounded-2xl hover:shadow-xl hover:scale-[1.02] transition-all duration-300 cursor-pointer border border-gray-200 hover:border-purple-300" onClick={() => setSelectedMealDetail(meal)}>
                      {meal.image && (
                        <div className="relative">
                          <img src={meal.image} alt={meal.name} className="w-24 h-24 rounded-2xl object-cover shadow-md ring-2 ring-white group-hover:ring-purple-300 transition-all duration-300" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-gray-800 text-xl group-hover:text-purple-700 transition-colors duration-300">{meal.name}</h4>
                          <div className="flex gap-2">
                            <span className="text-sm text-gray-500 font-semibold bg-purple-50 px-3 py-1 rounded-full">📅 {meal.date}</span>
                          </div>
                        </div>
                        <div className="flex gap-3 text-sm font-semibold mb-2">
                          <span className="flex items-center gap-1 bg-orange-50 text-orange-700 px-3 py-1 rounded-lg">🔥 {meal.calories}</span>
                          <span className="flex items-center gap-1 bg-red-50 text-red-700 px-3 py-1 rounded-lg">🥩 {meal.protein}g</span>
                          <span className="flex items-center gap-1 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg">🍞 {meal.carbs}g</span>
                          <span className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-lg">🥑 {meal.fat}g</span>
                        </div>
                        {meal.coachTips && (
                          <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold bg-purple-50 px-3 py-1.5 rounded-lg inline-flex">
                            <span className="animate-pulse">🧠</span>
                            <span>Detaylı analiz için tıklayın</span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); if(confirm('İptal edilemez! Silmek istediğinize emin misiniz?')) deleteMeal(meal.id); }} 
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg hover:shadow-xl hover:scale-110 transform"
                        title="Sil"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-4xl">
            <button 
              onClick={closeCamera}
              className="absolute top-4 right-4 z-10 px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg transition-all hover:scale-105"
            >
              ❌ Kapat
            </button>
            
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="w-full h-auto rounded-2xl"
              />
              
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
                <button
                  onClick={capturePhoto}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-full font-bold text-lg shadow-2xl hover:shadow-green-500/50 transition-all hover:scale-110 flex items-center gap-3"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Fotoğraf Çek
                </button>
              </div>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>
      )}

      {/* Meal Details Modal - Geçmiş Öğün Detayları */}
      {selectedMealDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fadeIn" onClick={() => setSelectedMealDetail(null)}>
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🍽️</span>
                <h3 className="text-3xl font-bold text-slate-800">Öğün Detayları</h3>
              </div>
              <button onClick={() => setSelectedMealDetail(null)} className="px-5 py-2 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition-all shadow-sm">❌ Kapat</button>
            </div>
            
            {selectedMealDetail.image && (
              <img src={selectedMealDetail.image} alt={selectedMealDetail.name} className="w-full h-80 object-cover rounded-2xl shadow-xl mb-6" />
            )}
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-slate-50 to-gray-100 rounded-2xl p-6 border border-slate-200">
                <h4 className="text-2xl font-bold text-slate-800 mb-2">{selectedMealDetail.name}</h4>
                <div className="flex items-center gap-6 text-sm text-slate-600 font-medium">
                  <span className="flex items-center gap-2">⏰ {selectedMealDetail.time}</span>
                  <span className="flex items-center gap-2">🍽️ {selectedMealDetail.type}</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-6 border border-orange-200 shadow-sm">
                <h4 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <span>📊</span> Besin Değerleri
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-orange-100">
                    <div className="text-3xl mb-2">🔥</div>
                    <div className="text-3xl font-bold text-orange-600">{selectedMealDetail.calories}</div>
                    <p className="text-sm text-slate-600 font-medium mt-1">Kalori</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-red-100">
                    <div className="text-3xl mb-2">🥩</div>
                    <div className="text-3xl font-bold text-red-600">{selectedMealDetail.protein}g</div>
                    <p className="text-sm text-slate-600 font-medium mt-1">Protein</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-yellow-100">
                    <div className="text-3xl mb-2">🍞</div>
                    <div className="text-3xl font-bold text-yellow-600">{selectedMealDetail.carbs}g</div>
                    <p className="text-sm text-slate-600 font-medium mt-1">Karbonhidrat</p>
                  </div>
                  <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-green-100">
                    <div className="text-3xl mb-2">🥑</div>
                    <div className="text-3xl font-bold text-green-600">{selectedMealDetail.fat}g</div>
                    <p className="text-sm text-slate-600 font-medium mt-1">Yağ</p>
                  </div>
                </div>
              </div>
              
              {selectedMealDetail.coachTips && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl">🧠</span>
                    <h4 className="text-2xl font-bold text-slate-800">Kalori Takip Önerisi</h4>
                  </div>
                  <div className="bg-white/60 rounded-xl p-5 backdrop-blur-sm">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line font-medium">{selectedMealDetail.coachTips}</p>
                  </div>
                </div>
              )}
              
              {selectedMealDetail.burnEstimate && (
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl">🔥</span>
                    <h4 className="text-2xl font-bold text-slate-800">Yakma Tahmini</h4>
                  </div>
                  <p className="text-slate-600 mb-4 font-medium">Bu öğünü yakmak için gereken egzersiz süresi:</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-xl p-5 text-center shadow-md border border-emerald-100">
                      <div className="text-4xl mb-3">🚶‍♂️</div>
                      <div className="text-3xl font-bold text-emerald-600">{selectedMealDetail.burnEstimate.walkMinutes}</div>
                      <p className="text-sm text-slate-600 mt-2 font-semibold">dakika Yürüyüş</p>
                      <p className="text-xs text-slate-500 mt-1">~5 km/saat</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 text-center shadow-md border border-orange-100">
                      <div className="text-4xl mb-3">🏃‍♂️</div>
                      <div className="text-3xl font-bold text-orange-600">{selectedMealDetail.burnEstimate.runMinutes}</div>
                      <p className="text-sm text-slate-600 mt-2 font-semibold">dakika Koşu</p>
                      <p className="text-xs text-slate-500 mt-1">~10 km/saat</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 text-center shadow-md border border-purple-100">
                      <div className="text-4xl mb-3">💪</div>
                      <div className="text-3xl font-bold text-purple-600">{selectedMealDetail.burnEstimate.strengthMinutes}</div>
                      <p className="text-sm text-slate-600 mt-2 font-semibold">dakika Güç</p>
                      <p className="text-xs text-slate-500 mt-1">Ağırlık çalışması</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
