"use client";

import * as React from "react";
import {
  Download,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Zap,
  Clock,
  HardDrive,
  Cpu,
  ChevronDown,
  ChevronUp,
  FileDown,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import {
  fetchLatestVersion,
  trackDownload,
  formatFileSize,
  formatReleaseDate,
  detectPlatform,
  type AppVersionInfo,
} from "@/lib/api/app-version";
import { CHANGELOG, APP_VERSION, CHANGE_TYPE_LABEL, type ChangeItem } from "@/lib/constants/changelog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * 下载状态
 */
type DownloadStatus =
  | "idle"      // 未开始
  | "loading"    // 加载版本信息中
  | "preparing" // 准备中
  | "downloading" // 下载中
  | "success"   // 成功
  | "error";    // 失败

export function DownloadClient() {
  const [status, setStatus] = React.useState<DownloadStatus>("loading");
  const [progress, setProgress] = React.useState(0);
  const [latestVersion, setLatestVersion] = React.useState<AppVersionInfo | null>(null);
  const [showAllChangelog, setShowAllChangelog] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const platform = "android"; // 下载页默认展示 Android 版本

  // 页面入场动画 + 加载最新版本
  React.useEffect(() => {
    setMounted(true);
    loadLatestVersion();
  }, []);

  // 加载最新版本信息
  async function loadLatestVersion() {
    try {
      setStatus("loading");
      setLoadError(null);
      const result = await fetchLatestVersion(platform, "stable");
      if (result.latest) {
        setLatestVersion(result.latest);
      }
      setStatus("idle");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "加载失败");
      setStatus("idle"); // 降级：加载失败时仍显示静态版本信息
    }
  }

  // 处理下载
  const handleDownload = React.useCallback(async () => {
    if (status === "downloading" || status === "preparing" || status === "loading") return;

    const downloadUrl = latestVersion?.downloadUrl;
    const versionId = latestVersion?.id;

    setStatus("preparing");
    setProgress(0);

    // 上报下载次数（静默处理
    if (versionId) {
      void trackDownload(versionId);
    }

    // 模拟准备阶段
    const prepareTimer = setTimeout(() => {
      setStatus("downloading");

      // 模拟下载进度（真实场景下浏览器无法获取文件下载进度，用动画效果）
      // 实际下载由浏览器接管，这里做视觉反馈
      let current = 0;
      const interval = setInterval(() => {
        const increment = Math.random() * 8 + 2;
        current = Math.min(current + increment, 95); // 到 95% 等实际下载完成
        setProgress(Math.floor(current));

        if (current >= 95) {
          clearInterval(interval);
        }
      }, 200);

      // 触发真实文件下载
      if (downloadUrl) {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `XingTone-v${latestVersion?.versionName || APP_VERSION}.apk`;
        link.target = "_blank";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      // 浏览器下载启动后延迟标记成功
      const completeTimer = setTimeout(() => {
        clearInterval(interval);
        setProgress(100);
        setStatus("success");
      }, 2500);

      return () => {
        clearTimeout(completeTimer);
      };
    }, 800);

    return () => clearTimeout(prepareTimer);
  }, [status, latestVersion]);

  // 重新下载
  const handleRetry = React.useCallback(() => {
    setStatus("idle");
    setProgress(0);
  }, []);

  // 显示的版本数据：优先后端返回，降级静态数据
  const displayVersion = latestVersion;
  const visibleChangelog = showAllChangelog ? CHANGELOG : CHANGELOG.slice(0, 1);

  // 更新内容展示：优先用后端 content，降级到静态 changelog
  const hasBackendContent = displayVersion?.content && displayVersion.content.length > 0;

  return (
    <section
      className={cn(
        "animate-fade-in space-y-8 opacity-0 transition-all duration-700 md:space-y-12",
        mounted && "opacity-100"
      )}
    >
      {/* ===== Hero 下载区 ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary via-primary/95 to-gray-950 text-white shadow-card md:rounded-3xl">
        {/* 装饰光晕 */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-8 h-48 w-48 rounded-full bg-primary/20 blur-3xl" />

        <div className="relative px-5 py-10 sm:px-10 sm:py-14 md:px-16 md:py-16">
          <div className="flex flex-col items-center gap-6 text-center md:gap-8">
            {/* Logo + 版本徽章 */}
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-white/20 blur-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/logo.png"
                alt="XingTone"
                className="relative h-16 w-16 rounded-2xl shadow-2xl sm:h-20 sm:w-20 sm:rounded-3xl md:h-24 md:w-24"
              />
              {/* 版本徽章 */}
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-0.5 text-[11px] font-bold text-primary shadow-lg">
                v{displayVersion?.versionName || APP_VERSION}
              </span>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                下载 XingTone 音乐
              </h1>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-white/70 sm:text-base">
                原生级播放体验 · 锁屏控制 · 离线缓存
                <br className="hidden sm:inline" />
                随时随地，想听就听
              </p>
            </div>

            {/* 版本信息标签 */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <Badge icon={Sparkles}>
                v{displayVersion?.versionName || APP_VERSION} 最新版
              </Badge>
              <Badge icon={Clock}>
                {displayVersion?.releaseDate
                  ? formatReleaseDate(displayVersion.releaseDate)
                  : formatReleaseDate(CHANGELOG[0].releaseDate)}
              </Badge>
              <Badge icon={HardDrive}>
                {displayVersion?.fileSize
                  ? formatFileSize(displayVersion.fileSize)
                  : "约 8.5 MB"}
              </Badge>
            </div>

            {/* 下载按钮区域 */}
            <div className="w-full max-w-md space-y-3">
              {/* 加载中 */}
              {status === "loading" && (
                <div className="flex h-12 items-center justify-center gap-3 rounded-xl bg-white/15 backdrop-blur-sm sm:h-14">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium sm:text-base">
                    正在获取最新版本...
                  </span>
                </div>
              )}

              {/* 主下载按钮 */}
              {status === "idle" && (
                <Button
                  onClick={handleDownload}
                  size="lg"
                  className="group relative h-12 w-full overflow-hidden bg-white text-primary shadow-xl transition-all hover:bg-white/90 hover:shadow-2xl active:scale-[0.98] sm:h-14"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2 text-base font-semibold">
                    <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
                    立即下载
                  </span>
                  <span className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-500 group-hover:translate-y-0" />
                </Button>
              )}

              {status === "preparing" && (
                <div className="flex h-12 items-center justify-center gap-3 rounded-xl bg-white/15 backdrop-blur-sm sm:h-14">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm font-medium sm:text-base">
                    正在准备下载...
                  </span>
                </div>
              )}

              {status === "downloading" && (
                <div className="space-y-2">
                  <div className="relative h-12 overflow-hidden rounded-xl bg-white/15 backdrop-blur-sm sm:h-14">
                    {/* 进度条背景 */}
                    <div
                      className="absolute inset-y-0 left-0 bg-white/30 transition-all duration-200 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                    {/* 进度文字 */}
                    <div className="relative z-10 flex h-full items-center justify-between px-4">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <FileDown className="h-4 w-4 animate-bounce" />
                        正在下载
                      </span>
                      <span className="font-mono text-sm font-bold">
                        {progress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-white/50">
                    <span>
                      {displayVersion?.fileSize
                        ? formatFileSize(displayVersion.fileSize)
                        : "约 8.5 MB"}
                    </span>
                    <span>浏览器将自动开始下载</span>
                  </div>
                </div>
              )}

              {status === "success" && (
                <div className="space-y-3">
                  <div className="flex h-12 items-center justify-center gap-3 rounded-xl bg-emerald-500/20 text-emerald-200 sm:h-14">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-sm font-medium sm:text-base">
                      下载已开始，请在浏览器中查看
                    </span>
                  </div>
                  <Button
                    onClick={handleRetry}
                    variant="ghost"
                    size="sm"
                    className="w-full text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新下载
                  </Button>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-3">
                  <div className="flex h-12 items-center justify-center gap-3 rounded-xl bg-red-500/20 text-red-200 sm:h-14">
                    <XCircle className="h-5 w-5" />
                    <span className="text-sm font-medium sm:text-base">
                      下载失败，请重试
                    </span>
                  </div>
                  <Button
                    onClick={handleRetry}
                    variant="ghost"
                    size="sm"
                    className="w-full text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    重新下载
                  </Button>
                </div>
              )}

              {/* 辅助链接 */}
              {status === "idle" && (
                <p className="text-center text-[11px] text-white/50 sm:text-xs">
                  点击下载即表示同意{" "}
                  <a href="/about" className="underline hover:text-white/80">
                    用户协议
                  </a>{" "}
                  与{" "}
                  <a href="/about" className="underline hover:text-white/80">
                    隐私政策
                  </a>
                </p>
              )}

              {/* 加载失败提示 */}
              {loadError && status === "idle" && (
                <p className="flex items-center justify-center gap-1 text-[11px] text-amber-300/80 sm:text-xs">
                  <AlertCircle className="h-3.5 w-3.5" />
                  版本信息获取失败，显示的是本地缓存版本
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ===== 核心亮点 ===== */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <HighlightCard
          icon={Smartphone}
          title="原生播放体验"
          desc="Media3 前台服务，锁屏控制，蓝牙耳机完美适配"
          color="from-blue-500 to-cyan-600"
        />
        <HighlightCard
          icon={Zap}
          title="极速启动"
          desc="冷启动 < 1 秒，无广告无打扰，打开即听"
          color="from-amber-500 to-orange-600"
        />
        <HighlightCard
          icon={ShieldCheck}
          title="安全可靠"
          desc="纯音频播放器，无隐私权限索取，安全放心"
          color="from-emerald-500 to-teal-600"
        />
      </div>

      {/* ===== 更新内容 ===== */}
      <div className="space-y-5 md:space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 sm:h-10 sm:w-10 sm:rounded-xl">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
              更新内容
            </h2>
            <p className="text-xs text-foreground/50 sm:text-sm">What's New</p>
          </div>
        </div>

        {/* 后端返回的更新内容 */}
        {hasBackendContent && displayVersion && (
          <div className="overflow-hidden rounded-xl border border-primary/20 bg-card ring-1 ring-primary/10 shadow-sm sm:rounded-2xl">
            {/* 版本头 */}
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-primary px-2.5 py-1 text-sm font-bold text-white sm:text-base">
                  v{displayVersion.versionName}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/10 dark:text-primary/60">
                  <CheckCircle2 className="h-3 w-3" />
                  最新版本
                </span>
              </div>
              <span className="text-xs text-foreground/50 sm:text-sm">
                {formatReleaseDate(displayVersion.releaseDate)}
              </span>
            </div>
            {/* 标题 */}
            {displayVersion.title && (
              <div className="border-b border-border/40 px-4 py-3 sm:px-6 sm:py-4">
                <h3 className="text-sm font-semibold sm:text-base">
                  {displayVersion.title}
                </h3>
              </div>
            )}
            {/* 更新列表 */}
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="mb-2.5 flex items-center gap-2">
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 sm:text-xs">
                  更新
                </span>
                <span className="text-xs font-medium text-foreground/60 sm:text-sm">
                  本次更新
                </span>
              </div>
              <ul className="space-y-1.5 pl-1 sm:space-y-2">
                {displayVersion.content.map((line, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/70 sm:text-[15px]"
                  >
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
                    <span className="leading-relaxed whitespace-pre-wrap">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 静态 changelog（后端无数据时显示） */}
        {!hasBackendContent && (
          <div className="space-y-4">
            {visibleChangelog.map((entry, idx) => (
              <VersionBlock
                key={entry.version}
                entry={entry}
                isLatest={idx === 0}
              />
            ))}
          </div>
        )}

        {/* 展开/收起按钮（仅静态 changelog 有多版本时显示） */}
        {!hasBackendContent && CHANGELOG.length > 1 && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllChangelog(!showAllChangelog)}
              className="text-foreground/60 hover:text-foreground"
            >
              {showAllChangelog ? (
                <>
                  <ChevronUp className="mr-1.5 h-4 w-4" />
                  收起历史版本
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1.5 h-4 w-4" />
                  查看全部 {CHANGELOG.length} 个版本
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* ===== 系统要求 ===== */}
      <div className="space-y-5 md:space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 sm:h-10 sm:w-10 sm:rounded-xl">
            <Cpu className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
              系统要求
            </h2>
            <p className="text-xs text-foreground/50 sm:text-sm">
              System Requirements
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <div className="rounded-xl border border-border/60 bg-card p-5 sm:rounded-2xl sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary dark:text-primary/60" />
              <h3 className="text-base font-semibold">Android</h3>
            </div>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                操作系统：Android 9.0 及以上
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                存储空间：至少 50 MB 可用空间
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                运行内存：2 GB RAM 以上
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                支持：蓝牙耳机 / 线控耳机 / 锁屏控制
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5 sm:rounded-2xl sm:p-6">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary dark:text-primary/60" />
              <h3 className="text-base font-semibold">Web / PWA</h3>
            </div>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                浏览器：Chrome 90+ / Safari 14+ / Edge 90+
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                支持：添加到主屏幕，离线播放
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                推荐：iOS 用户使用 PWA 模式获得最佳体验
              </li>
              <li className="flex items-center gap-2">
                <a
                  href="/"
                  className="text-primary underline-offset-2 hover:underline dark:text-primary/60"
                >
                  立即体验网页版 →
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ===== 底部下载按钮 ===== */}
      <div className="rounded-2xl border border-primary/10 bg-primary/5 p-6 text-center dark:bg-primary/10 sm:p-8">
        <h3 className="mb-2 text-lg font-bold sm:text-xl">
          还在等什么？立即下载吧！
        </h3>
        <p className="mb-4 text-sm text-foreground/60">
          安装包仅{" "}
          {displayVersion?.fileSize
            ? formatFileSize(displayVersion.fileSize)
            : "约 8.5 MB"}
          ，几秒钟即可下载完成
        </p>
        <Button
          onClick={handleDownload}
          disabled={
            status === "downloading" ||
            status === "preparing" ||
            status === "loading"
          }
          size="lg"
          className="h-12 px-8 shadow-lg hover:shadow-xl active:scale-[0.98] sm:h-14"
        >
          {status === "downloading" ||
          status === "preparing" ||
          status === "loading" ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              {status === "loading" ? "加载中..." : "下载中..."}
            </>
          ) : (
            <>
              <Download className="mr-2 h-5 w-5" />
              下载 v{displayVersion?.versionName || APP_VERSION}
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

/**
 * 徽章组件
 */
function Badge({
  icon: Icon,
  children,
}: {
  icon: typeof Sparkles;
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm sm:text-xs">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/**
 * 亮点卡片
 */
function HighlightCard({
  icon: Icon,
  title,
  desc,
  color,
}: {
  icon: typeof Smartphone;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card p-4 transition-all duration-300 hover:shadow-card sm:p-5">
      <div
        className={cn(
          "mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11",
          color
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-1 text-sm font-semibold sm:text-base">{title}</h3>
      <p className="text-xs leading-relaxed text-foreground/60 sm:text-sm">
        {desc}
      </p>
    </div>
  );
}

/**
 * 版本更新块（静态 changelog 使用）
 */
function VersionBlock({
  entry,
  isLatest,
}: {
  entry: (typeof CHANGELOG)[number];
  isLatest: boolean;
}) {
  const features = entry.changes.filter((c) => c.type === "feature");
  const improvements = entry.changes.filter((c) => c.type === "improvement");
  const fixes = entry.changes.filter((c) => c.type === "fix");
  const removed = entry.changes.filter((c) => c.type === "removed");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm sm:rounded-2xl",
        isLatest
          ? "border-primary/20 ring-1 ring-primary/10"
          : "border-border/60"
      )}
    >
      {/* 版本头 */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-bold sm:text-base",
              isLatest
                ? "bg-primary text-white"
                : "bg-muted text-foreground/70"
            )}
          >
            v{entry.version}
          </span>
          {isLatest && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/10 dark:text-primary/60">
              <CheckCircle2 className="h-3 w-3" />
              最新版本
            </span>
          )}
        </div>
        <span className="text-xs text-foreground/50 sm:text-sm">
          {formatReleaseDate(entry.releaseDate)}
        </span>
      </div>

      {/* 标题 */}
      {entry.title && (
        <div className="border-b border-border/40 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-sm font-semibold sm:text-base">{entry.title}</h3>
        </div>
      )}

      {/* 更新内容：按类型分组 */}
      <div className="divide-y divide-border/40">
        {features.length > 0 && (
          <ChangeGroup label="新增功能" items={features} type="feature" />
        )}
        {improvements.length > 0 && (
          <ChangeGroup
            label="体验优化"
            items={improvements}
            type="improvement"
          />
        )}
        {fixes.length > 0 && <ChangeGroup label="问题修复" items={fixes} type="fix" />}
        {removed.length > 0 && (
          <ChangeGroup label="移除内容" items={removed} type="removed" />
        )}
      </div>
    </div>
  );
}

/**
 * 变更分组组件
 */
function ChangeGroup({
  label,
  items,
  type,
}: {
  label: string;
  items: ChangeItem[];
  type: ChangeItem["type"];
}) {
  const labelConfig = CHANGE_TYPE_LABEL[type];

  return (
    <div className="px-4 py-3 sm:px-6 sm:py-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium sm:text-xs",
            labelConfig.color
          )}
        >
          {labelConfig.text}
        </span>
        <span className="text-xs font-medium text-foreground/60 sm:text-sm">
          {label}
        </span>
      </div>
      <ul className="space-y-1.5 pl-1 sm:space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-foreground/70 sm:text-[15px]"
          >
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
            <span className="leading-relaxed whitespace-pre-wrap">{item.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
