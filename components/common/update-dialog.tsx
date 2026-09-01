"use client";

import * as React from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import {
  checkLatestVersion,
  detectPlatform,
  trackDownload,
  type VersionCheckResult,
} from "@/lib/api/app-version";
import { androidBridge } from "@/lib/jsbridge/android-bridge";
import { getPlatform } from "@/lib/platform";
import { Download, Sparkles } from "lucide-react";

/**
 * 获取当前应用版本码
 * - TWA 模式：从原生 BuildConfig.VERSION_CODE 读取（androidBridge.getAppVersionCode）
 * - 浏览器模式：从 NEXT_PUBLIC_APP_VERSION_CODE 环境变量读取（默认 1）
 */
function getCurrentVersionCode(): number {
  if (getPlatform().isTWA) {
    const code = androidBridge.getAppVersionCode();
    const n = Number(code);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return Number(process.env.NEXT_PUBLIC_APP_VERSION_CODE ?? 1);
}

/** sessionStorage key：记录本次会话已忽略的版本 */
const IGNORE_KEY = "xt_music_ignored_version";

/**
 * 版本检查弹窗
 * - 应用挂载时检查更新：Android/TWA 走独立端点 /update/android，
 *   iOS / 桌面浏览器保持旧统一接口 /app/version/latest（均经 checkLatestVersion 封装）
 * - 有新版本时弹出弹窗：版本名 + changelog + 立即更新 / 本次忽略
 * - "本次忽略"用 sessionStorage 标记，同一会话不重复弹窗
 * - 强制更新时不显示"忽略"按钮，且不可关闭
 */
export function UpdateDialog() {
  const [checkResult, setCheckResult] =
    React.useState<VersionCheckResult | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function checkVersion() {
      try {
        const result = await checkLatestVersion(
          detectPlatform(),
          "stable",
          getCurrentVersionCode()
        );
        if (cancelled || !result.hasUpdate || !result.latest) return;

        // 检查是否本次会话已忽略该版本
        const ignored = sessionStorage.getItem(IGNORE_KEY);
        if (ignored === String(result.latest.versionCode) && !result.forceUpdate) {
          return;
        }

        setCheckResult(result);
        setOpen(true);
      } catch {
        // 版本检查失败静默处理，不影响正常使用
      }
    }

    // 延迟 2 秒检查，避免与首屏渲染竞争
    const timer = setTimeout(checkVersion, 2000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const handleIgnore = () => {
    if (checkResult?.latest) {
      sessionStorage.setItem(IGNORE_KEY, String(checkResult.latest.versionCode));
    }
    setOpen(false);
  };

  const handleUpdate = async () => {
    const latest = checkResult?.latest;
    if (!latest?.downloadUrl) return;

    if (getPlatform().isTWA) {
      // TWA 模式：调用原生 APK 下载 + 安装流程
      androidBridge.installApk(latest.downloadUrl, latest.md5 ?? null);
      // 上报下载次数（302 代理端点，后端 downloadCount +1）
      void trackDownload(latest.id);
    } else {
      // 浏览器模式：新窗口打开下载链接
      window.open(latest.downloadUrl, "_blank", "noopener");
    }

    if (!checkResult?.forceUpdate) {
      setOpen(false);
    }
  };

  const latest = checkResult?.latest;
  const isForce = checkResult?.forceUpdate ?? false;

  return (
    <ResponsiveDialog open={open} onOpenChange={(v) => !isForce && setOpen(v)}>
      <ResponsiveDialogContent
        className="max-w-md"
        // 强制更新时禁用 ESC 和遮罩点击关闭
        onPointerDownOutside={(e) => isForce && e.preventDefault()}
        onEscapeKeyDown={(e) => isForce && e.preventDefault()}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            发现新版本
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {latest?.title || `v${latest?.versionName} 已发布`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {latest && (
          <div className="space-y-4">
            {/* 版本号 */}
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-sm font-medium text-primary">
                v{latest.versionName}
              </span>
              {isForce && (
                <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-500">
                  强制更新
                </span>
              )}
            </div>

            {/* 更新日志 */}
            {latest.content.length > 0 && (
              <div className="max-h-48 overflow-y-auto rounded-lg bg-muted/30 p-3">
                <ul className="space-y-1.5 text-sm text-foreground/70">
                  {latest.content.map((line, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/80" />
                      <span className="whitespace-pre-wrap">{line}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 文件大小 */}
            {latest.fileSize > 0 && (
              <p className="text-xs text-foreground/40">
                文件大小：{formatFileSize(latest.fileSize)}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2">
          {!isForce && (
            <Button variant="outline" onClick={handleIgnore}>
              本次忽略
            </Button>
          )}
          <Button
            onClick={handleUpdate}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Download className="h-4 w-4" />
            立即更新
          </Button>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
