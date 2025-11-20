"use client";

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { usePathname } from "next/navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
      </body>
    </html>
  );
}
