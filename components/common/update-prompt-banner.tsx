"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useUpdatePromptStore } from "@/lib/store/update-prompt-store";

async function clearBrowserCaches() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }
}

export function UpdatePromptBanner() {
  const open = useUpdatePromptStore((s) => s.open);
  const version = useUpdatePromptStore((s) => s.version);
  const dismiss = useUpdatePromptStore((s) => s.dismiss);
  const [refreshing, setRefreshing] = React.useState(false);

  if (!open) return null;

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await clearBrowserCaches();
    } finally {
      const reloadWebView = (window as any).AndroidJSBridge?.reloadWebView;
      if (typeof reloadWebView === "function") {
        reloadWebView.call((window as any).AndroidJSBridge);
        return;
      }
      window.location.reload();
    }
  };

  return (
    <div className="fixed left-0 right-0 top-0 z-[80] border-b border-primary/20 bg-background/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 text-sm md:flex-row md:items-center md:justify-center">
        <p className="font-medium text-foreground">
          发现新版本 {version}，点击刷新以应用
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleRefresh} disabled={refreshing}>
            立即刷新
          </Button>
          <Button size="sm" variant="outline" onClick={dismiss} disabled={refreshing}>
            稍后
          </Button>
        </div>
      </div>
    </div>
  );
}
