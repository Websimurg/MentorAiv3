"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface UserSubscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'standard' | 'unlimited';
  status: 'active' | 'expired' | 'cancelled';
  message_credits: number;
  calorie_credits: number;
  is_unlimited: boolean;
  expires_at: string | null;
  created_at: string;
}

export default function Subscription() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [showFAQ, setShowFAQ] = useState<number | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
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

    await loadUserSubscription(user.id);
    setLoading(false);
  };

  const loadUserSubscription = async (userId: string) => {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (data) {
      setUserSubscription(data);
    }
  };

  const plans = [
    {
      id: "standard",
      name: "Standard Paketi",
      price: 27,
      badge: "🎯 Popüler",
      features: [
        { icon: "💬", text: "1000 AI Mesaj Hakkı (Aylık)", included: true },
        { icon: "🍽️", text: "365 Kalori Ölçüm (Aylık)", included: true },
        { icon: "🧘", text: "Sınırsız Meditasyon", included: true },
        { icon: "💭", text: "Sınırsız Mantra Oluşturma", included: true },
        { icon: "📚", text: "Tüm Eğitimlere Erişim", included: true },
        { icon: "📊", text: "Gelişmiş İstatistikler", included: true },
        { icon: "🎯", text: "Kişiselleştirilmiş Öneriler", included: true },
        { icon: "⚡", text: "Öncelikli Destek", included: true },
      ],
      description: "Her ay 1000 mesaj ve 365 kalori ölçüm hakkı yenilenir"
    },
    {
      id: "unlimited",
      name: "Unlimited Paketi",
      price: 97,
      badge: "⭐ En İyi Değer",
      features: [
        { icon: "💬", text: "∞ Sınırsız AI Mesaj (Aylık)", included: true },
        { icon: "🍽️", text: "∞ Sınırsız Kalori Ölçüm (Aylık)", included: true },
        { icon: "🧘", text: "Sınırsız Meditasyon", included: true },
        { icon: "💭", text: "Sınırsız Mantra Oluşturma", included: true },
        { icon: "📚", text: "Tüm Eğitimlere Erişim", included: true },
        { icon: "📊", text: "Gelişmiş İstatistikler", included: true },
        { icon: "🎯", text: "Kişiselleştirilmiş Öneriler", included: true },
        { icon: "⚡", text: "VIP Öncelikli Destek", included: true },
        { icon: "👑", text: "Özel VIP Badge", included: true },
        { icon: "🎁", text: "Erken Erişim Özellikleri", included: true },
      ],
      description: "Aylık hiçbir limite takılmadan tam özgürlük"
    }
  ];

  const additionalPackages = [
    {
      id: "addon-100",
      name: "Ek 100 Mesaj",
      price: 10,
      message_credits: 100,
      calorie_credits: 10,
      description: "100 AI mesaj + 10 kalori ölçüm"
    },
    {
      id: "addon-250",
      name: "Ek 250 Mesaj",
      price: 20,
      message_credits: 250,
      calorie_credits: 30,
      description: "250 AI mesaj + 30 kalori ölçüm"
    },
    {
      id: "addon-500",
      name: "Ek 500 Mesaj",
      price: 35,
      message_credits: 500,
      calorie_credits: 60,
      description: "500 AI mesaj + 60 kalori ölçüm"
    }
  ];

  const faqs = [
    {
      question: "Standard ve Unlimited paketleri arasındaki fark nedir?",
      answer: "Standard paket (27$/ay) her ay yenilenen 1000 mesaj ve 365 kalori ölçüm hakkı sunar (günde ortalama 33 mesaj, 12 ölçüm). Unlimited paket (97$/ay) ise aylık hiçbir limit olmadan sınırsız mesaj ve kalori ölçümü ile VIP özellikler sunar."
    },
    {
      question: "Unlimited pakette gerçekten sınır yok mu?",
      answer: "Evet! Unlimited paketinizle istediğiniz kadar AI mesajlaşma yapabilir ve istediğiniz kadar kalori analizi gerçekleştirebilirsiniz. Hiçbir limit, hiçbir kısıtlama yoktur."
    },
    {
      question: "Hangi paketi seçmeliyim?",
      answer: "Eğer ayda 1000 mesaj ve 365 kalori ölçümü (günde 33 mesaj, 12 ölçüm) yeterli geliyorsa Standard paket (27$/ay) ideal. Yoğun kullanım yapacaksanız, hiçbir limit olmadan tam özgürlük istiyorsanız Unlimited paket (97$/ay) size göre."
    },
    {
      question: "AI mesaj hakkı ne demek?",
      answer: "AI Chat bölümünde yapay zeka asistanımızla yaptığınız her konuşma bir mesaj hakkı kullanır. Standard pakette her ay yenilenen 1000 mesaj hakkınız bulunur. Unlimited pakette ise aylık sınırsız mesajlaşabilirsiniz."
    },
    {
      question: "Kalori ölçüm hakkı nasıl kullanılır?",
      answer: "Kalori sayfasında yemek fotoğrafı yüklediğinizde veya kamera ile çektiğinizde, AI sistemi yemeğinizi analiz eder ve besin değerlerini hesaplar. Her analiz bir kalori ölçüm hakkı kullanır. Standard pakette her ay yenilenen 365 ölçüm (günlük 12), Unlimited pakette aylık sınırsız hakkınız vardır."
    },
    {
      question: "Mesaj haklarım biterse ne olur?",
      answer: "Standard paket kullanıcıları için haklar bittiğinde 10$'dan başlayan ek paketler satın alabilirsiniz. 10$ ile 100 mesaj, 20$ ile 250 mesaj veya 35$ ile 500 mesaj hakkı ekleyebilirsiniz. Unlimited pakette ise bu sorun hiç yaşanmaz!"
    },
    {
      question: "Paketler arasında geçiş yapabilir miyim?",
      answer: "Evet! Standard'dan Unlimited'a geçiş yapabilirsiniz. Geçiş yaptığınızda kalan krediniz korunur ve Unlimited özellikleriniz hemen aktif olur."
    },
    {
      question: "Aboneliğimi iptal edebilir miyim?",
      answer: "Evet, istediğiniz zaman aboneliğinizi iptal edebilirsiniz. İptal ettiğinizde mevcut dönem sonuna kadar özellikleriniz aktif kalır. Kalan mesaj haklarınız da kullanılabilir durumda olur."
    },
    {
      question: "Meditasyon ve Mantra özellikleri ücretli mi?",
      answer: "Hayır! Meditasyon ve Mantra özellikleri hem ücretsiz hem de premium kullanıcılar için tamamen sınırsızdır. İstediğiniz kadar meditasyon yapabilir ve mantra oluşturabilirsiniz."
    },
    {
      question: "Ödeme yöntemleri nelerdir?",
      answer: "Kredi kartı, banka kartı ile güvenli ödeme yapabilirsiniz. Tüm ödemeler SSL ile şifrelenir ve güvenli bir şekilde işlenir. Ödeme bilgileriniz bizde saklanmaz."
    },
    {
      question: "VIP özellikler nelerdir?",
      answer: "Unlimited paket kullanıcıları VIP Badge, erken erişim özellikleri ve öncelikli destek hizmeti alır. Yeni özellikler ilk sizlere sunulur ve destek talepleriniz öncelikli olarak yanıtlanır."
    }
  ];

  // Ek paketlerin gösterilip gösterilmeyeceğini kontrol et
  const shouldShowAdditionalPackages = () => {
    // Admin her zaman görsün
    const isAdmin = userEmail === 'websimurg@gmail.com';
    if (isAdmin) return true;

    // Kredisi biten kullanıcılar görsün
    if (userSubscription) {
      const hasNoCredits = userSubscription.message_credits <= 0 || userSubscription.calorie_credits <= 0;
      return hasNoCredits;
    }

    return false;
  };

  const handlePurchase = async (packageId: string) => {
    alert("Ödeme sistemi yakında aktif olacak! Şu an için sadece önizleme modunda.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⭐</div>
          <p className="text-xl font-semibold text-gray-700">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-4">
            <div className="text-6xl mb-2">⭐</div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Premium'a Geçiş Yap
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Yapay zeka destekli kişisel gelişim platformunda tam potansiyelini ortaya çıkar
          </p>
        </div>

        {/* Mevcut Abonelik Durumu */}
        {userSubscription && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border-2 border-purple-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  {userSubscription.plan_type === 'unlimited' ? '👑 Unlimited Üye' : 
                   userSubscription.plan_type === 'standard' ? '🎯 Standard Üye' : '🌟 Ücretsiz Üye'}
                </h3>
                <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">💬 Mesaj:</span>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full font-bold">
                      {userSubscription.is_unlimited ? '∞ Sınırsız' : userSubscription.message_credits}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">🍽️ Kalori:</span>
                    <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full font-bold">
                      {userSubscription.is_unlimited ? '∞ Sınırsız' : userSubscription.calorie_credits}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">Durum:</span>
                    <span className={`px-3 py-1 rounded-full font-bold ${
                      userSubscription.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {userSubscription.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Premium Plans - Ana Paketler */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-2">💎 Premium Paketler</h2>
            <p className="text-gray-600 text-lg">Sana en uygun paketi seç ve gelişimine hız ver</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => (
              <div
                key={plan.id}
                className={`relative ${
                  plan.id === 'unlimited' 
                    ? 'lg:scale-105 shadow-2xl' 
                    : 'shadow-xl'
                }`}
              >
                {/* Badge */}
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className={`px-6 py-2 rounded-full font-bold shadow-lg ${
                    plan.id === 'unlimited'
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                      : 'bg-gradient-to-r from-blue-400 to-purple-500 text-white'
                  }`}>
                    {plan.badge}
                  </div>
                </div>

                <div className={`rounded-3xl p-8 border-4 hover:shadow-3xl transition-all duration-300 ${
                  plan.id === 'unlimited'
                    ? 'bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 border-orange-300'
                    : 'bg-gradient-to-br from-white to-purple-50 border-purple-300'
                }`}>
                  {/* Header */}
                  <div className="text-center mb-8">
                    <div className="text-6xl mb-4">{plan.id === 'unlimited' ? '👑' : '🎯'}</div>
                    <h3 className="text-3xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <div className="flex items-end justify-center gap-2 mb-3">
                      <span className="text-6xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 text-xl mb-3">/ay</span>
                    </div>
                    <p className="text-gray-600 font-medium">{plan.description}</p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 bg-white/80 rounded-xl shadow-sm hover:shadow-md transition-all"
                      >
                        <span className="text-2xl">{feature.icon}</span>
                        <span className="font-semibold text-gray-800 flex-1">{feature.text}</span>
                        <span className="text-green-500 text-xl">✓</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handlePurchase(plan.id)}
                    className={`w-full py-4 rounded-xl font-bold text-xl hover:shadow-2xl transition-all transform hover:scale-105 ${
                      plan.id === 'unlimited'
                        ? 'bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 text-white'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                    }`}
                  >
                    🚀 Hemen Başla - ${plan.price}/ay
                  </button>

                  <p className="text-center text-sm text-gray-500 mt-4">
                    İstediğin zaman iptal edebilirsin. Her ay otomatik yenilenir.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ek Mesaj Paketleri - Sadece kredi bitenlere veya admin'e göster */}
        {shouldShowAdditionalPackages() && (
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">💰 Ek Mesaj Paketleri</h2>
              <p className="text-gray-600">Mesaj haklarınız bittiğinde ek paketler alabilirsiniz</p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-8">
            {additionalPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200 hover:border-purple-400 hover:shadow-xl transition-all transform hover:scale-105"
              >
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">💎</div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{pkg.name}</h3>
                  <div className="flex items-end justify-center gap-1 mb-2">
                    <span className="text-4xl font-bold text-purple-600">${pkg.price}</span>
                  </div>
                  <p className="text-sm text-gray-600">{pkg.description}</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700">💬 AI Mesaj</span>
                    <span className="font-bold text-purple-600">{pkg.message_credits}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700">🍽️ Kalori Ölçüm</span>
                    <span className="font-bold text-orange-600">{pkg.calorie_credits}</span>
                  </div>
                </div>

                <button
                  onClick={() => handlePurchase(pkg.id)}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Satın Al - ${pkg.price}
                </button>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* SSS Bölümü */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">❓ Sıkça Sorulan Sorular</h2>
            <p className="text-gray-600">Merak ettiğin her şey burada</p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 hover:border-purple-300 transition-all"
              >
                <button
                  onClick={() => setShowFAQ(showFAQ === idx ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-bold text-gray-800 text-lg">{faq.question}</span>
                  <span className="text-2xl text-purple-600">{showFAQ === idx ? '−' : '+'}</span>
                </button>
                {showFAQ === idx && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-700 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
