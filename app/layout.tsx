import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmProvider } from "@/components/common/confirm-dialog";
import { BaiduTongji } from "@/components/common/baidu-tongji";
import { colorThemeInitScript } from "@/lib/store/color-theme-store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/**
 * 元数据：通过 Next Metadata API 生成 PWA / iOS Safari 所需 <meta>、<link>
 * - manifest → <link rel="manifest" href="/manifest.json">
 * - appleWebApp → apple-mobile-web-app-capable / status-bar-style / title
 * - icons.apple → <link rel="apple-touch-icon">
 */
export const metadata: Metadata = {
  title: { default: "XingTone", template: "%s · XingTone" },
  description: "XingTone播放器 —— Apple Music 风格的跨端音乐体验",
  applicationName: "XingTone",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "XingTone",
    startupImage: [
      { url: "/icons/apple-touch-icon.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" },
    ],
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

/**
 * viewport：theme-color 主色 + viewport-fit=cover（适配刘海屏 standalone）
 */
export const viewport: Viewport = {
  themeColor: "#8B00FF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* 首屏注入 safe-area CSS 变量，避免 useSafeArea useEffect 前的内容闪烁 */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var r=document.documentElement;r.style.setProperty('--safe-area-top','env(safe-area-inset-top,0px)');r.style.setProperty('--safe-area-bottom','env(safe-area-inset-bottom,0px)');r.style.setProperty('--safe-area-left','env(safe-area-inset-left,0px)');r.style.setProperty('--safe-area-right','env(safe-area-inset-right,0px)');})();` }} />
        {/* 首屏同步颜色主题，避免 SSR/hydration 后闪烁 */}
        <script dangerouslySetInnerHTML={{ __html: colorThemeInitScript }} />

        {/* ============ XingTone 启动页 Splash（方案 A） ============
             - 纯内联 CSS/HTML/JS：在 React 水合之前就显示，保证首屏无白屏
             - 显示时机：页面解析到这里立即显示
             - 消失时机：window load 后 + 1.5s（最早 2.5s，兜底 5s 强制消失）
             - 与 Android TWA 原生 splash 完全一致的设计，过渡无缝
        */}
        <style dangerouslySetInnerHTML={{ __html: XT_SPLASH_CSS }} />
      </head>
      <body className="min-h-full bg-background text-foreground">
        {/* Splash 容器（内联第一优先显示，不依赖 React） */}
        <div id="xt-splash" aria-hidden="true">
          <div className="xts-bg" />
          <div className="xts-glow" />
          <div className="xts-vinyl xts-vb" />
          <div className="xts-vinyl xts-vg" />
          <img className="xts-char" src="/character.png" alt="" draggable="false" />
          <div className="xts-brand">
            <div className="xts-title">XingTone</div>
            <div className="xts-slogan">用音乐点亮每一刻</div>
            <div className="xts-hi">hi ♪</div>
          </div>
          <div className="xts-note xts-n1">♪</div>
          <div className="xts-note xts-n2">♫</div>
          <div className="xts-track"><div className="xts-thumb" /></div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: XT_SPLASH_SCRIPT }} />
        {/* 无障碍：跳转至主内容 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:shadow-lg"
        >
          跳转到主要内容
        </a>
        {/* next-themes：attribute=class 切换 .dark，suppressHydrationWarning 已在 <html> 声明 */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ConfirmProvider>
            <AppShell>{children}</AppShell>
          </ConfirmProvider>
        </ThemeProvider>
        <Suspense fallback={null}>
          <BaiduTongji />
        </Suspense>
      </body>
    </html>
  );
}
