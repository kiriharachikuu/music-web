"use client";

import { ArrowLeft, Smartphone, AlertCircle } from "lucide-react";
import Link from "next/link";
import { DownloadsTab } from "../tabs/downloads-tab";
import { isDownloadAvailable } from "@/lib/download";
import { getPlatform } from "@/lib/platform/detect";

export default function DownloadsPage() {
  if (!isDownloadAvailable()) {
    // 下载管理功能仅对 Android 增强壳（TWA）与桌面客户端（Electron）开放；
    // 其余平台通过 /download 引导页跳转到对应客户端
    const p = getPlatform();
    const isAndroidTWA = p.isTWA;
    const isDesktop = p.isElectron;
    return (
      <div className="animate-fade-in">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/profile"
            className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors hover:bg-foreground/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold">下载管理</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
            <Smartphone className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            下载功能仅支持 {isAndroidTWA || isDesktop ? "" : "Android 客户端和桌面端"}
          </h2>
          <p className="mt-2 max-w-xs text-sm text-foreground/60">
            {isAndroidTWA
              ? "当前已是 Android 客户端，但下载管理模块未启用。"
              : isDesktop
                ? "当前已是桌面客户端，但下载管理模块未启用。"
                : "下载管理功能仅在 Android 客户端和桌面端可用，请下载 XingTone 客户端体验完整功能。"}
          </p>
          {!isAndroidTWA && !isDesktop && (
            <Link
              href="/download"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <AlertCircle className="h-4 w-4" />
              下载客户端
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/profile"
          className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors hover:bg-foreground/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">下载管理</h1>
      </div>
      <DownloadsTab />
    </div>
  );
}