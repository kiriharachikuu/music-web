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
        {/*
          TWA Service Worker 缓存清理：
          - next-pwa 的 StaleWhileRevalidate 策略会缓存 JS bundle，
            TWA 内的 WebView 因网络延迟经常命中老 bundle（包含 #185 旧代码），
            导致死循环 + 整页无法点击。
          - 每次 TWA 启动时强制清空所有 SW 缓存 + 重新注册，确保拿到最新代码。
          - 仅当检测到 TWA UA 时执行（普通 PWA 不受影响）。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
              try {
                var ua = navigator.userAgent || '';
                var isTWA = /XingToneTWA/i.test(ua) || (window.AndroidJSBridge && window.AndroidJSBridge.getAppVersionCode);
                if (!isTWA) return;
                if (!('serviceWorker' in navigator)) return;
                var done = false;
                function reload() {
                  if (done) return;
                  done = true;
                  try { window.location.reload(); } catch(e) {}
                }
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  var ps = regs.map(function(r){ return r.unregister(); });
                  if (caches && caches.keys) {
                    caches.keys().then(function(keys) {
                      keys.forEach(function(k){ caches.delete(k); });
                    });
                  }
                  return Promise.all(ps);
                }).then(function() {
                  if (navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then(reload);
                  }
                }).catch(function(){});
              } catch(e) {}
            })();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground">
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
