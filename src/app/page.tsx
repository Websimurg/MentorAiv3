"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const [scrollY, setScrollY] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeFAQ, setActiveFAQ] = useState<number | null>(null);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("scroll", handleScroll);
    window.addEventListener("mousemove", handleMouseMove);

    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 4000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(interval);
    };
  }, []);

  const features = [
    {
      icon: "🧠",
      title: "AI Destekli Koçluk",
      description: "7/24 kişisel AI asistanınız ile hedeflerinize ulaşın",
      color: "from-purple-500 to-pink-500",
      link: "/ai-chat"
    },
    {
      icon: "🎓",
      title: "Ücretsiz Eğitimler",
      description: "Profesyonel video dersler ile kendinizi geliştirin",
      color: "from-blue-500 to-cyan-500",
      link: "/egitimler"
    },
    {
      icon: "🧘‍♂️",
      title: "Meditasyon & Mindfulness",
      description: "Rehberli meditasyonlar ile zihinsel huzur",
      color: "from-green-500 to-emerald-500",
      link: "/meditasyon"
    },
    {
      icon: "🍎",
      title: "Akıllı Kalori Takibi",
      description: "Fotoğraf çek, AI analiz etsin, sağlıklı yaşa",
      color: "from-orange-500 to-red-500",
      link: "/kalori"
    },
    {
      icon: "✨",
      title: "Günlük Mantralar",
      description: "Her gün yeni motivasyon ve pozitif enerji",
      color: "from-pink-500 to-purple-500",
      link: "/mantra"
    },
    {
      icon: "📈",
      title: "İlerleme Takibi",
      description: "Hedeflerinizi görselleştirin, başarıyı yakalayın",
      color: "from-indigo-500 to-blue-500",
      link: "/dashboard"
    }
  ];

  const stats = [
    { number: "50K+", label: "Aktif Kullanıcı", icon: "👥" },
    { number: "100+", label: "Video Ders", icon: "🎓" },
    { number: "24/7", label: "AI Desteği", icon: "🤖" },
    { number: "100%", label: "Ücretsiz", icon: "✨" }
  ];

  const testimonials = [
    {
      name: "Ayşe Yılmaz",
      role: "Girişimci",
      image: "A",
      text: "MentorAi³ hayatımı değiştirdi! AI koçluk özelliği sayesinde hedeflerime çok daha hızlı ulaştım.",
      rating: 5
    },
    {
      name: "Mehmet Kaya",
      role: "Yazılım Geliştirici",
      image: "M",
      text: "Meditasyon ve eğitim içerikleri muhteşem. Her gün kullanıyorum ve çok memnunum!",
      rating: 5
    },
    {
      name: "Zeynep Demir",
      role: "Öğrenci",
      image: "Z",
      text: "Ücretsiz olması inanılmaz! Kalori takibi özelliği sayesinde sağlıklı yaşam yolculuğuma başladım.",
      rating: 5
    }
  ];

  const faqs = [
    {
      question: "MentorAi³ gerçekten ücretsiz mi?",
      answer: "Evet! Tüm temel özelliklerimiz tamamen ücretsiz. Kredi kartı bilgisi gerektirmez."
    },
    {
      question: "AI koçluk nasıl çalışır?",
      answer: "Gelişmiş yapay zeka modelimiz, kişisel hedeflerinize göre özelleştirilmiş öneriler ve rehberlik sağlar."
    },
    {
      question: "Mobil uygulama var mı?",
      answer: "Web uygulamamız tüm cihazlarda mükemmel çalışır. Yakında iOS ve Android uygulamaları da yayınlanacak!"
    },
    {
      question: "Verilerim güvende mi?",
      answer: "Kesinlikle! Tüm verileriniz şifrelenir ve gizlilik politikamıza uygun şekilde korunur."
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(139, 92, 246, 0.3), transparent 50%)`
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            MentorAi³
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-gray-300 hover:text-white transition">Özellikler</Link>
            <Link href="#testimonials" className="text-gray-300 hover:text-white transition">Yorumlar</Link>
            <Link href="#faq" className="text-gray-300 hover:text-white transition">SSS</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-6xl mx-auto text-center">
          <div 
            className="inline-block mb-6 px-6 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full border border-purple-500/30 backdrop-blur-sm"
            style={{
              transform: `translateY(${scrollY * 0.1}px)`,
              opacity: 1 - scrollY / 500
            }}
          >
            <span className="text-purple-300">✨ AI Destekli Kişisel Gelişim Platformu</span>
          </div>

          <h1 
            className="text-6xl md:text-8xl font-bold mb-8 leading-tight"
            style={{
              transform: `translateY(${scrollY * 0.2}px)`,
              opacity: 1 - scrollY / 400
            }}
          >
            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Hayallerini
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Gerçeğe Dönüştür
            </span>
          </h1>

          <p 
            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto"
            style={{
              transform: `translateY(${scrollY * 0.15}px)`,
              opacity: 1 - scrollY / 450
            }}
          >
            Yapay zeka destekli koçluk, ücretsiz eğitimler, meditasyon ve daha fazlası.
            <br />
            <span className="text-purple-400 font-semibold">Tamamen ücretsiz.</span>
          </p>

          <div 
            className="flex flex-wrap gap-4 justify-center mb-16"
            style={{
              transform: `translateY(${scrollY * 0.1}px)`,
              opacity: 1 - scrollY / 500
            }}
          >
            <Link
              href="#features"
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full font-bold text-lg shadow-2xl shadow-purple-500/50 hover:shadow-purple-500/70 transition-all transform hover:scale-105"
            >
              Özellikleri Keşfet ↓
            </Link>
          </div>

          {/* Floating Cards Preview */}
          <div className="relative h-96 mt-20">
            {features.slice(0, 3).map((feature, index) => (
              <div
                key={index}
                className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl"
                style={{
                  transform: `translate(-50%, -50%) translateX(${(index - 1) * 120}px) translateY(${Math.sin(scrollY * 0.01 + index) * 20}px) rotate(${(index - 1) * 5}deg)`,
                  zIndex: 3 - index,
                  opacity: 0.8
                }}
              >
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-purple-500/50 transition-all transform hover:scale-105"
              >
                <div className="text-5xl mb-4">{stat.icon}</div>
                <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Güçlü Özellikler
              </span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Kişisel gelişiminiz için ihtiyacınız olan her şey, tek bir platformda
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Link
                key={index}
                href={feature.link}
                className={`group relative p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border transition-all transform hover:scale-105 ${
                  activeFeature === index
                    ? 'border-purple-500/50 shadow-2xl shadow-purple-500/20'
                    : 'border-white/10 hover:border-purple-500/30'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity`} />
                
                <div className="relative z-10">
                  <div className="text-6xl mb-6 transform group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-gray-400 mb-6">{feature.description}</p>
                  <div className={`inline-flex items-center gap-2 text-sm font-semibold bg-gradient-to-r ${feature.color} bg-clip-text text-transparent`}>
                    Keşfet
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Kullanıcılarımız Ne Diyor?
              </span>
            </h2>
            <p className="text-xl text-gray-400">Binlerce mutlu kullanıcıdan bazıları</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="p-8 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/10 hover:border-purple-500/30 transition-all transform hover:scale-105"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400 text-2xl">⭐</span>
                  ))}
                </div>
                <p className="text-gray-300 mb-8 text-lg italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {testimonial.image}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{testimonial.name}</div>
                    <div className="text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Sıkça Sorulan Sorular
              </span>
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setActiveFAQ(activeFAQ === index ? null : index)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-white/5 transition-all"
                >
                  <span className="text-lg font-semibold">{faq.question}</span>
                  <span className={`text-2xl transition-transform ${activeFAQ === index ? 'rotate-180' : ''}`}>
                    ↓
                  </span>
                </button>
                {activeFAQ === index && (
                  <div className="px-6 pb-6 text-gray-400">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-3xl shadow-2xl shadow-purple-500/50">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              Kışisel Gelişimin İçin Her Şey
            </h2>
            <p className="text-2xl text-purple-100">
              AI destekli koçluk, ücretsiz eğitimler, meditasyon ve daha fazlası.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                MentorAi³
              </h3>
              <p className="text-gray-400">AI destekli kişisel gelişim platformu</p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Özellikler</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/ai-chat" className="hover:text-white transition">AI Chat</Link></li>
                <li><Link href="/egitimler" className="hover:text-white transition">Eğitimler</Link></li>
                <li><Link href="/meditasyon" className="hover:text-white transition">Meditasyon</Link></li>
                <li><Link href="/kalori" className="hover:text-white transition">Kalori Takibi</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Şirket</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition">Hakkımızda</Link></li>
                <li><Link href="#" className="hover:text-white transition">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition">Kariyer</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Destek</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white transition">Yardım</Link></li>
                <li><Link href="#" className="hover:text-white transition">İletişim</Link></li>
                <li><Link href="#" className="hover:text-white transition">Gizlilik</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 text-center text-gray-400">
            <p>© 2024 MentorAi³. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}