"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isActive = (path: string) => pathname === path;

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', user.email)
      .single();

    setIsAdmin(profile?.role === 'admin');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navLinks = [
    { href: "/dashboard", icon: "📈", label: "Dashboard" },
    { href: "/profil", icon: "👨‍💻", label: "Profil" },
    { href: "/ai-chat", icon: "🧠", label: "AI Chat" },
    { href: "/egitimler", icon: "🎓", label: "Eğitimler" },
    { href: "/mantra", icon: "✨", label: "Mantra" },
    { href: "/meditasyon", icon: "🧘‍♂️", label: "Meditasyon" },
    { href: "/kalori", icon: "🍎", label: "Kalori" },
  ];

  // Anasayfada menüyü gizle
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white shadow-xl transition-all duration-300 z-40 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent hover:scale-105 transition-transform block"
          >
            {collapsed ? "M³" : "MentorAi³"}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <div className="space-y-1 px-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  isActive(link.href)
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
                title={collapsed ? link.label : ""}
              >
                <span className="text-2xl">{link.icon}</span>
                {!collapsed && <span>{link.label}</span>}
              </Link>
            ))}
            
            {/* Admin Panel - Sadece adminler görür */}
            {isAdmin && (
              <Link
                href="/admin-dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                  isActive('/admin-dashboard')
                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg"
                    : "text-gray-600 hover:bg-gray-100 border-2 border-red-200"
                }`}
                title={collapsed ? "Admin Panel" : ""}
              >
                <span className="text-2xl">🔒</span>
                {!collapsed && <span>Admin Panel</span>}
              </Link>
            )}
          </div>
        </nav>

        {/* Premium Button */}
        <div className="p-3 border-t">
          <Link
            href="/subscription"
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <span className="text-2xl">⭐</span>
            {!collapsed && <span>Premium</span>}
          </Link>
        </div>

        {/* Logout Button */}
        <div className="p-3 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold bg-red-100 hover:bg-red-200 text-red-700 transition-all"
          >
            <span className="text-2xl">🔴</span>
            {!collapsed && <span>Çıkış Yap</span>}
          </button>
        </div>

        {/* Collapse Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t hover:bg-gray-100 transition text-gray-600 font-semibold text-xl"
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </aside>

      {/* Mobile Top Navigation */}
      <nav className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b shadow-lg z-40">
        <div className="flex justify-around items-center py-2">
          {navLinks.slice(0, 4).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition ${
                isActive(link.href)
                  ? "text-purple-600"
                  : "text-gray-600"
              }`}
            >
              <span className="text-2xl">{link.icon}</span>
              <span className="text-xs font-semibold">{link.label}</span>
            </Link>
          ))}
          {/* Mobile Logout Button */}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition text-red-600"
          >
            <span className="text-2xl">🔴</span>
            <span className="text-xs font-semibold">Çıkış</span>
          </button>
        </div>
      </nav>
    </>
  );
}