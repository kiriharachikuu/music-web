"use client";

import * as React from "react";
import { Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPlatform } from "@/lib/platform/detect";

declare global {
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
      outcome: "accepted" | "dismissed";
      platform: string;
    }>;
    prompt(): Promise<void>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

/**
 * PWA 安装提示
 * - 监听 beforeinstallprompt 事件，显示安装按钮
 * - iOS Safari 引导用户手动添加到主屏幕
 * - 7天内不重复显示（localStorage 记录）
 */
export function InstallPrompt() {
  const [show, setShow] = React.useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const platform = getPlatform();

  const dismissedKey = "xt_install_dismissed";

  const isDismissed = React.useCallback(() => {
    try {
      const raw = localStorage.getItem(dismissedKey);
      if (!raw) return false;
      const time = parseInt(raw, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      return Date.now() - time < sevenDays;
    } catch {
      return false;
    }
  }, []);

  React.useEffect(() => {
    if (platform.isTWA) return;
    if (platform.isStandalone) return;
    if (platform.isDesktop) return;
    if (isDismissed()) return;

    // Android / Chrome：监听 beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari：没有 beforeinstallprompt，延迟显示引导
    if (platform.isIOS && !platform.isStandalone) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [platform, isDismissed]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShow(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(dismissedKey, String(Date.now()));
    } catch {
      // ignore
    }
  };

  if (!show) return null;

  const isIOS = platform.isIOS;

  return (
    <div className="fixed inset-x-4 bottom-24 z-50 rounded-2xl border border-primary-500/20 bg-card p-4 shadow-xl backdrop-blur-xl md:inset-x-auto md:left-1/2 md:w-96 md:-translate-x-1/2 md:bottom-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-700/10 text-primary-700">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">添加到主屏幕</h3>
          <p className="mt-1 text-xs text-foreground/60">
            {isIOS
              ? "点击 Safari 底部的分享按钮，选择「添加到主屏幕」"
              : "安装 XingTone 到桌面，享受原生应用般的体验"}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 text-foreground/40 hover:text-foreground/70"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {!isIOS && deferredPrompt && (
        <div className="mt-3 flex justify-end">
          <Button
            onClick={handleInstall}
            size="sm"
            className="bg-primary-700 text-white hover:bg-primary-600"
          >
            立即安装
          </Button>
        </div>
      )}
    </div>
  );
}
