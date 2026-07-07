"use client";

import { ArrowLeft, Smartphone, AlertCircle } from "lucide-react";
import Link from "next/link";
import { DownloadsTab } from "../tabs/downloads-tab";
import { isDownloadAvailable } from "@/lib/download";

export default function DownloadsPage() {
  if (!isDownloadAvailable()) {
    return (
      <div className="animate-fade-in">
        <div className="mb-4 flex items-center gap-2">
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors hover:bg-foreground/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold">下载管理</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-900/30">
            <Smartphone className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">下载功能仅支持 Android 客户端</h2>
          <p className="mt-2 max-w-xs text-sm text-foreground/60">
            下载管理功能仅在 Android TWA 客户端中可用，
            <br />
            请下载 XingTone Android 客户端体验完整功能。
          </p>
          <Link
            href="/download"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-700 px-5 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            <AlertCircle className="h-4 w-4" />
            下载 Android 客户端
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors hover:bg-foreground/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">下载管理</h1>
      </div>
      <DownloadsTab />
    </div>
  );
}