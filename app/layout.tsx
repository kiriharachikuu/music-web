import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ConfirmProvider } from "@/components/common/confirm-dialog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      <body className="min-h-full bg-background text-foreground">
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
      </body>
    </html>
  );
}
