"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { Download, Sparkles } from "lucide-react";

/**
 * 版本检查结果（后端 GET /api/app/version/latest 返回格式）
 */
interface VersionCheckResult {
  hasUpdate: boolean;
  forceUpdate: boolean;
  latest: {
    id: string;
    versionCode: number;
    versionName: string;
    title?: string | null;
    content: string[];
    downloadUrl: string;
    fileSize: number;
    channel: string;
    platform: string;
    releaseDate: string;
  } | null;
}

/** 当前应用版本码（通过环境变量注入，默认 1） */
const CURRENT_VERSION_CODE = Number(
  process.env.NEXT_PUBLIC_APP_VERSION_CODE ?? 1
);

/** sessionStorage key：记录本次会话已忽略的版本 */
const IGNORE_KEY = "xt_music_ignored_version";

/**
 * 版本检查弹窗
 * - 应用挂载时调用 GET /api/app/version/latest 检查更新
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
        const result = await api.get<VersionCheckResult>(
          `/app/version/latest?platform=desktop&versionCode=${CURRENT_VERSION_CODE}`
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

  const handleUpdate = () => {
    if (checkResult?.latest?.downloadUrl) {
      window.open(checkResult.latest.downloadUrl, "_blank", "noopener");
    }
    if (!checkResult?.forceUpdate) {
      setOpen(false);
    }
  };

  const latest = checkResult?.latest;
  const isForce = checkResult?.forceUpdate ?? false;

  return (
    <Dialog open={open} onOpenChange={(v) => !isForce && setOpen(v)}>
      <DialogContent
        className="max-w-md"
        // 强制更新时禁用 ESC 和遮罩点击关闭
        onPointerDownOutside={(e) => isForce && e.preventDefault()}
        onEscapeKeyDown={(e) => isForce && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-700/10 text-primary-700">
              <Sparkles className="h-4 w-4" />
            </span>
            发现新版本
          </DialogTitle>
          <DialogDescription>
            {latest?.title || `v${latest?.versionName} 已发布`}
          </DialogDescription>
        </DialogHeader>

        {latest && (
          <div className="space-y-4">
            {/* 版本号 */}
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-primary-700/10 px-2 py-0.5 text-sm font-medium text-primary-700">
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
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary-500" />
                      <span>{line}</span>
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
            className="bg-primary-700 text-white hover:bg-primary-600"
          >
            <Download className="h-4 w-4" />
            立即更新
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
