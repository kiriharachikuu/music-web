import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmProvider } from "@/components/common/confirm-dialog";
import { BaiduTongji } from "@/components/common/baidu-tongji";
import { colorThemeInitScript } from "@/lib/store/color-theme-store";

/* ===========================================================
   XingTone 启动页 Splash：方案 A 完整内联 CSS
   - 独立作用域：所有类 xts-*，容器 id="xt-splash"
   - 避免与音乐主界面样式冲突（全局 z-index: 9999，dismiss 后 display:none）
=========================================================== */
const XT_SPLASH_CSS = `
#xt-splash{position:fixed;inset:0;z-index:9999;overflow:hidden;background:linear-gradient(180deg,#FEF9FF 0%,#F5EEFF 55%,#EEEAF8 100%);pointer-events:none;user-select:none;-webkit-user-select:none;}
#xt-splash.hide{opacity:0;transition:opacity .4s ease;}
#xt-splash.gone{display:none;}
.xts-bg{position:absolute;inset:0;background:radial-gradient(90% 60% at 110% -10%,rgba(139,0,255,0.08) 0%,transparent 60%),radial-gradient(70% 50% at -10% 110%,rgba(59,130,246,0.10) 0%,transparent 55%);}
.xts-glow{position:absolute;left:5%;right:-20%;bottom:-70px;height:220px;z-index:1;background:radial-gradient(ellipse at 75% 100%,rgba(96,165,250,0.30) 0%,rgba(139,92,246,0.16) 40%,transparent 72%);filter:blur(4px);}
/* Vinyls */
.xts-vinyl{position:absolute;border-radius:50%;background:radial-gradient(circle at center,#1a1a1a 0 12%,#2a2a2a 12.5% 14%,#0b0b0b 14.2% 28%,#181818 28.3% 30%,#0b0b0b 30.2% 44%,#181818 44.3% 46%,#0b0b0b 46.2% 60%,#181818 60.3% 62%,#0b0b0b 62.2% 76%,#181818 76.3% 78%,#0b0b0b 78% 100%);box-shadow:inset 0 0 30px rgba(0,0,0,.7),0 14px 36px rgba(0,0,0,.18);}
.xts-vinyl::after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;}
.xts-vinyl::before{content:"";position:absolute;inset:6%;border-radius:50%;background:linear-gradient(125deg,rgba(255,255,255,0.14) 0%,transparent 40%,rgba(59,130,246,0.08) 60%,transparent 80%);}
.xts-vb{width:320px;height:320px;left:-110px;bottom:-40px;z-index:1;opacity:.42;animation:xts-sb 36s linear infinite;}
.xts-vb::after{width:128px;height:128px;background:radial-gradient(circle at center,#fff 0 8px,#111 9px 12px,transparent 13px),linear-gradient(135deg,#BFDBFE 0%,#3B82F6 55%,#1D4ED8 100%);box-shadow:inset 0 2px 6px rgba(255,255,255,.35),inset 0 -3px 8px rgba(0,0,0,.4);}
.xts-vg{width:200px;height:200px;right:-50px;bottom:30px;z-index:1;opacity:.35;animation:xts-sg 28s linear infinite reverse;}
.xts-vg::after{width:80px;height:80px;background:radial-gradient(circle at center,#fff 0 5px,#111 6px 9px,transparent 10px),linear-gradient(135deg,#FEF3C7 0%,#F59E0B 55%,#B45309 100%);box-shadow:inset 0 2px 5px rgba(255,255,255,.35),inset 0 -2px 6px rgba(0,0,0,.4);}
@keyframes xts-sb{from{transform:rotate(-20deg);}to{transform:rotate(340deg);}}
@keyframes xts-sg{from{transform:rotate(28deg);}to{transform:rotate(-332deg);}}
/* Character */
.xts-char{position:absolute;right:-40px;bottom:0;width:min(540px,110vw);height:auto;max-height:82vh;z-index:3;object-fit:contain;object-position:bottom right;filter:drop-shadow(0 18px 38px rgba(59,130,246,0.28));animation:xts-cb 5s ease-in-out infinite;transform-origin:70% 100%;pointer-events:none;}
@keyframes xts-cb{0%,100%{transform:translateY(0) rotate(0deg);}50%{transform:translateY(-14px) rotate(-1.4deg);}}
/* Brand */
.xts-brand{position:absolute;left:24px;top:64px;z-index:4;}
.xts-title{font-size:44px;font-weight:900;line-height:1.1;letter-spacing:-.02em;background:linear-gradient(135deg,#8B00FF 0%,#6D28D9 55%,#2563EB 100%);-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:3px;}
.xts-slogan{margin-top:6px;color:#6B7280;font-size:14px;opacity:.9;}
.xts-hi{margin-top:18px;margin-left:84px;display:inline-block;background:#111827;color:#fff;font-weight:700;font-size:13px;padding:6px 14px;border-radius:999px;border:.5px solid #374151;}
/* Notes */
.xts-note{position:absolute;font-weight:800;opacity:.55;z-index:4;animation:xts-note 6s ease-in-out infinite;}
.xts-n1{left:24px;bottom:240px;color:#3B82F6;font-size:22px;}
.xts-n2{left:52px;bottom:320px;color:#8B5CF6;font-size:16px;animation-delay:1.4s;}
@keyframes xts-note{0%,100%{transform:translateY(0);opacity:.55;}50%{transform:translateY(-12px);opacity:.3;}}
/* Progress */
.xts-track{position:absolute;bottom:64px;left:50%;transform:translateX(-50%);width:150px;height:6px;border-radius:999px;background:rgba(15,23,42,0.32);border:1px solid rgba(59,130,246,0.35);backdrop-filter:blur(2px);overflow:hidden;z-index:4;}
.xts-thumb{position:absolute;top:0;left:0;bottom:0;width:36%;border-radius:999px;background:linear-gradient(90deg,#3B82F6 0%,#60A5FA 40%,#FCD34D 80%,#F59E0B 100%);box-shadow:0 0 6px rgba(96,165,250,.45),0 0 14px rgba(251,191,36,.22);animation:xts-pg 2.2s ease-in-out infinite;}
@keyframes xts-pg{0%{transform:translateX(-35%);}50%{transform:translateX(178%);}100%{transform:translateX(-35%);}}
/* 大屏幕 PC 端减小 splash 尺寸：居中显示手机尺寸大小的 splash（避免在宽屏上太夸张） */
@media (min-width: 768px){
  #xt-splash{background:radial-gradient(circle at center,#2a1a3a 0%,#0f0a15 80%);display:flex;align-items:center;justify-content:center;}
  #xt-splash::before{content:"";position:relative;width:390px;height:844px;max-width:96vw;max-height:96vh;border-radius:44px;overflow:hidden;box-shadow:0 30px 80px rgba(139,0,255,0.25),0 0 0 10px rgba(255,255,255,0.04);background:linear-gradient(180deg,#FEF9FF 0%,#F5EEFF 55%,#EEEAF8 100%);}
  #xt-splash > *{position:absolute;transform:none;width:390px;height:844px;max-width:96vw;max-height:96vh;left:50%;top:50%;margin-left:-195px;margin-top:-422px;border-radius:44px;overflow:hidden;}
}
`;

/* ===========================================================
   XingTone 启动页 Splash：dismiss 逻辑
   - 优先：window.load 后 + 1500ms 淡出（与原生 overlay 消失时机对齐）
   - 兜底：4.5s 强制开始淡出，5s 移除
   - 监听自定义事件 __XT_APP_READY__：立即淡出（React 水合完成时由 App 主动触发）
=========================================================== */
const XT_SPLASH_SCRIPT = `
(function(){
  var el=document.getElementById('xt-splash');if(!el)return;
  var done=false;
  function dismiss(){
    if(done)return;done=true;
    el.classList.add('hide');
    setTimeout(function(){el.classList.add('gone');try{el.remove();}catch(e){}},450);
  }
  var fallback=setTimeout(dismiss,4500);
  function onLoad(){clearTimeout(fallback);setTimeout(dismiss,1500);}
  if(document.readyState==='complete'){onLoad();}
  else{window.addEventListener('load',onLoad,{once:true});}
  window.addEventListener('__XT_APP_READY__',function(){clearTimeout(fallback);dismiss();},{once:true});
})();
`;

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
