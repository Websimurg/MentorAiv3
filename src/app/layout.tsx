"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { usePathname } from "next/navigation";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/lib/useUser';
import Link from 'next/link';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

interface UserSubscription {
  message_credits: number;
  calorie_credits: number;
  is_unlimited: boolean;
  plan_type: 'free' | 'standard' | 'unlimited';
}

function CreditCounter() {
  const { user } = useUser();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const pathname = usePathname();

  // Admin dashboard ve login sayfalarında gösterme
  const hideOnPages = ['/admin-dashboard', '/login', '/'];
  if (hideOnPages.includes(pathname)) return null;

  useEffect(() => {
    if (user) {
      loadCredits();
      
      // Her 30 saniyede bir kredileri güncelle
      const interval = setInterval(loadCredits, 30000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadCredits = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('message_credits, calorie_credits, is_unlimited, plan_type')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setSubscription(data);
    }
  };

  if (!subscription) return null;

  const getPlanColor = () => {
    switch (subscription.plan_type) {
      case 'unlimited': return 'from-purple-500 to-pink-500';
      case 'standard': return 'from-blue-500 to-indigo-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const getPlanIcon = () => {
    switch (subscription.plan_type) {
      case 'unlimited': return '⭐';
      case 'standard': return '🎯';
      default: return '🆓';
    }
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className={`bg-gradient-to-r ${getPlanColor()} text-white px-4 py-3 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 flex items-center gap-2 font-bold`}
        >
          {getPlanIcon()}
          <span className="text-sm">
            {subscription.is_unlimited ? '∞' : `${subscription.message_credits}+${subscription.calorie_credits}`}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className={`bg-gradient-to-br ${getPlanColor()} rounded-2xl shadow-2xl p-6 text-white backdrop-blur-lg border border-white/20 max-w-xs`}>
        {/* Minimize butonu */}
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition"
        >
          <span className="text-xs">—</span>
        </button>

        {/* Plan Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{getPlanIcon()}</span>
          <div>
            <p className="text-xs opacity-80">Paket</p>
            <p className="font-bold text-sm uppercase">
              {subscription.plan_type === 'unlimited' ? 'Sınırsız' :
               subscription.plan_type === 'standard' ? 'Standard' : 'Ücretsiz'}
            </p>
          </div>
        </div>

        {/* Kredi Göstergesi */}
        <div className="space-y-3">
          {/* Mesaj Kredisi */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs opacity-90 flex items-center gap-1">
                💬 Mesaj
              </span>
              <span className="font-bold text-sm">
                {subscription.is_unlimited ? '∞' : subscription.message_credits}
              </span>
            </div>
            {!subscription.is_unlimited && (
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((subscription.message_credits / (subscription.plan_type === 'standard' ? 1000 : 10)) * 100, 100)}%` 
                  }}
                />
              </div>
            )}
          </div>

          {/* Kalori Kredisi */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs opacity-90 flex items-center gap-1">
                🍽️ Kalori
              </span>
              <span className="font-bold text-sm">
                {subscription.is_unlimited ? '∞' : subscription.calorie_credits}
              </span>
            </div>
            {!subscription.is_unlimited && (
              <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${Math.min((subscription.calorie_credits / (subscription.plan_type === 'standard' ? 365 : 3)) * 100, 100)}%` 
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Yükselt Butonu */}
        {subscription.plan_type !== 'unlimited' && (
          <Link 
            href="/subscription"
            className="mt-4 block w-full bg-white text-center py-2 rounded-lg font-bold text-sm hover:scale-105 transition-transform"
            style={{ color: 'rgb(124, 58, 237)' }}
          >
            🚀 Paketi Yükselt
          </Link>
        )}

        {/* Yenileme */}
        <div className="mt-3 text-center">
          <button
            onClick={loadCredits}
            className="text-xs opacity-70 hover:opacity-100 transition flex items-center gap-1 mx-auto"
          >
            🔄 Yenile
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isFullWidth = pathname === "/" || pathname === "/login";

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <title>MentorAi³ - Kişisel Gelişim Asistanı</title>
        <meta name="description" content="AI destekli kişisel gelişim, meditasyon, mantra ve sağlık takip platformu" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <Header />
        <div className={isFullWidth ? "" : "pt-20 lg:pt-0 lg:ml-64"}>
          {children}
        </div>
        <CreditCounter />
      </body>
    </html>
  );
}
