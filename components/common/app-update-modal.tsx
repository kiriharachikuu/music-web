"use client";

import * as React from "react";
import { Download, Loader2, Sparkles } from "lucide-react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import {
  formatReleaseDate,
  trackDownload,
  type AppVersionInfo,
} from "@/lib/api/app-version";
import { androidBridge } from "@/lib/jsbridge/android-bridge";
import { getPlatform } from "@/lib/platform/detect";

interface AppUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  info: AppVersionInfo | null;
}

type DownloadState = "idle" | "downloading" | "success";

export function AppUpdateModal({ open, onOpenChange, info }: AppUpdateModalProps) {
  const downloadUrl = info?.apkUrl || info?.downloadUrl || "";
  const content = info?.content?.slice(0, 5) ?? [];
  const [downloadState, setDownloadState] = React.useState<DownloadState>("idle");
  const [progress, setProgress] = React.useState(0);
  const timersRef = React.useRef<number[]>([]);

  const clearTimers = React.useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  React.useEffect(() => {
    if (!open) {
      clearTimers();
      setDownloadState("idle");
      setProgress(0);
    }
    return clearTimers;
  }, [clearTimers, open, info?.id]);

  const handleDownload = React.useCallback(() => {
    if (!downloadUrl || downloadState === "downloading") return;

    setDownloadState("downloading");
    setProgress(8);
    if (info?.id) void trackDownload(info.id);

    if (getPlatform().isTWA) {
      androidBridge.installApk(downloadUrl, info?.md5 ?? null);
      setProgress(100);
      setDownloadState("success");
      return;
    }

    let current = 8;
    const tick = () => {
      current = Math.min(current + Math.floor(Math.random() * 10 + 6), 95);
      setProgress(current);
      if (current < 95) {
        timersRef.current.push(window.setTimeout(tick, 180));
      }
    };
    timersRef.current.push(window.setTimeout(tick, 180));

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `XingTone-v${info?.versionName || "latest"}.apk`;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    timersRef.current.push(
      window.setTimeout(() => {
        clearTimers();
        setProgress(100);
        setDownloadState("success");
      }, 2400)
    );
  }, [clearTimers, downloadState, downloadUrl, info?.id, info?.md5, info?.versionName]);

  const isDownloading = downloadState === "downloading";

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            发现新版本
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {info?.title || (info ? `v${info.versionName} 已发布` : "有可用的 App 更新")}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {info && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                v{info.versionName}
              </span>
              {info.releaseDate && (
                <span className="text-xs text-foreground/50">
                  发布于 {formatReleaseDate(info.releaseDate)}
                </span>
              )}
            </div>

            {content.length > 0 && (
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="mb-2 text-sm font-medium text-foreground/80">更新摘要</p>
                <ul className="space-y-1.5 text-sm text-foreground/70">
                  {content.map((line, index) => (
                    <li key={`${index}-${line}`} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/80" />
                      <span className="whitespace-pre-wrap">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {downloadState !== "idle" && (
              <div className="space-y-2 rounded-lg border border-primary/10 bg-primary/[0.03] p-3">
                <div className="flex items-center justify-between text-xs text-foreground/60">
                  <span>{downloadState === "success" ? "下载已开始" : "正在准备下载"}</span>
                  <span className="font-mono">{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDownloading}>
            稍后
          </Button>
          <Button
            onClick={handleDownload}
            disabled={!downloadUrl || isDownloading}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {downloadState === "success" ? "重新下载" : isDownloading ? "下载中" : "立即下载"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
