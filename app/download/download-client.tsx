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
  Monitor,
  PackageOpen,
  Archive,
  History,
} from "lucide-react";

import {
  checkLatestVersion,
  fetchVersionList,
  buildDownloadUrl,
  formatFileSize,
  formatReleaseDate,
  detectDownloadTab,
  type AppVersionInfo,
  type AppVersionListItem,
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

/** 下载目标：Android 完整包 / Windows 安装版 / Windows 便携版 */
type DownloadTarget = "android" | "setup" | "portable";

type PlatformTab = "android" | "windows";

/** 按目标生成下载文件名 */
function buildFileName(target: DownloadTarget, versionName?: string | null): string {
  const v = versionName || APP_VERSION;
  if (target === "android") return `XingTone-v${v}.apk`;
  if (target === "setup") return `XingTone-v${v}-Setup.exe`;
  return `XingTone-v${v}-portable.exe`;
}

export function DownloadClient() {
  const [status, setStatus] = React.useState<DownloadStatus>("loading");
  const [progress, setProgress] = React.useState(0);
  const [downloadTarget, setDownloadTarget] = React.useState<DownloadTarget | null>(null);
  const [activeTab, setActiveTab] = React.useState<PlatformTab>("android");
  const [showAllChangelog, setShowAllChangelog] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [versionsLoading, setVersionsLoading] = React.useState(true);

  // 各目标最新版本
  const [androidLatest, setAndroidLatest] = React.useState<AppVersionInfo | null>(null);
  const [winSetup, setWinSetup] = React.useState<AppVersionInfo | null>(null);
  const [winPortable, setWinPortable] = React.useState<AppVersionInfo | null>(null);

  // 历史版本
  const [historyExpanded, setHistoryExpanded] = React.useState(false);
  const [historyLoading, setHistoryLoading] = React.useState(false);
  const [historyError, setHistoryError] = React.useState<string | null>(null);
  const [historyItems, setHistoryItems] = React.useState<AppVersionListItem[] | null>(null);

  // 页面入场动画 + UA 检测默认 Tab + 并行加载各平台最新版本
  React.useEffect(() => {
    setMounted(true);
    setActiveTab(detectDownloadTab());
    void loadVersions();
  }, []);

  // 切换平台时收起历史版本
  React.useEffect(() => {
    setHistoryExpanded(false);
    setHistoryItems(null);
    setHistoryError(null);
  }, [activeTab]);

  // 并行加载：Android 最新版 + Windows 安装版/便携版
  async function loadVersions() {
    try {
      setVersionsLoading(true);
      const [androidRes, setupRes, portableRes] = await Promise.all([
        checkLatestVersion("android", "stable"),
        checkLatestVersion("windows", "stable", undefined, "setup").catch(() => null),
        checkLatestVersion("windows", "stable", undefined, "portable").catch(() => null),
      ]);
      setAndroidLatest(androidRes.latest);
      setWinSetup(setupRes?.latest ?? null);
      setWinPortable(portableRes?.latest ?? null);
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setVersionsLoading(false);
      setStatus("idle");
    }
  }

  const getTargetVersion = React.useCallback(
    (target: DownloadTarget): AppVersionInfo | null => {
      if (target === "android") return androidLatest;
      if (target === "setup") return winSetup;
      return winPortable;
    },
    [androidLatest, winSetup, winPortable]
  );

  // 处理下载（302 计数链接，浏览器接管真实下载）
  const handleDownload = React.useCallback(
    (target: DownloadTarget) => {
      if (status === "downloading" || status === "preparing" || status === "loading") return;

      const version = getTargetVersion(target);
      // 302 代理链接：服务端计数后跳转真实地址；无版本数据时不可下载
      const downloadUrl = version ? buildDownloadUrl(version.id) : undefined;

      setDownloadTarget(target);
      setStatus("preparing");
      setProgress(0);

      // 模拟准备阶段（真实下载由浏览器接管，这里做视觉反馈）
      const prepareTimer = setTimeout(() => {
        setStatus("downloading");

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
          link.download = buildFileName(target, version?.versionName);
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
      }, 800);
    },
    [status, getTargetVersion]
  );

  // 重新下载
  const handleRetry = React.useCallback(() => {
    setStatus("idle");
    setProgress(0);
    setDownloadTarget(null);
  }, []);

  // 加载历史版本列表
  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetchVersionList(activeTab, "stable", undefined, 1, 10);
      setHistoryItems(res.list);
    } catch (e) {
      setHistoryError(e instanceof Error ? e.message : "加载失败");
    } finally {
      setHistoryLoading(false);
    }
  }

  function toggleHistory() {
    if (!historyExpanded && historyItems === null && !historyLoading) {
      void loadHistory();
    }
    setHistoryExpanded(!historyExpanded);
  }

  // 当前 Tab 展示的版本：优先后端，Windows 优先安装版
  const isWindowsTab = activeTab === "windows";
  const displayVersion = isWindowsTab
    ? winSetup ?? winPortable
    : androidLatest;
  const fallbackSize = isWindowsTab ? "约 85 MB" : "约 8.5 MB";
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
                  : fallbackSize}
              </Badge>
            </div>

            {/* ===== 平台切换 Tab ===== */}
            <div className="flex w-full max-w-md items-center gap-1 rounded-xl bg-white/10 p-1 backdrop-blur-sm">
              <PlatformTabButton
                active={activeTab === "android"}
                onClick={() => setActiveTab("android")}
                icon={Smartphone}
                label="Android"
              />
              <PlatformTabButton
                active={activeTab === "windows"}
                onClick={() => setActiveTab("windows")}
                icon={Monitor}
                label="Windows"
              />
            </div>

            {/* 下载按钮区域 */}
            {!isWindowsTab ? (
              <AndroidDownloadArea
                status={downloadTarget === "android" ? status : "idle"}
                progress={progress}
                versionsLoading={versionsLoading}
                hasVersion={!!androidLatest}
                fileSizeText={
                  androidLatest?.fileSize
                    ? formatFileSize(androidLatest.fileSize)
                    : fallbackSize
                }
                onDownload={() => handleDownload("android")}
                onRetry={handleRetry}
                loadError={loadError}
              />
            ) : (
              <WindowsDownloadArea
                setup={winSetup}
                portable={winPortable}
                versionsLoading={versionsLoading}
                activeStatus={status}
                activeTarget={downloadTarget}
                progress={progress}
                onDownload={handleDownload}
                onRetry={handleRetry}
                loadError={loadError}
              />
            )}
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
            <p className="text-xs text-foreground/50 sm:text-sm">
              What&apos;s New · {isWindowsTab ? "Windows" : "Android"}
            </p>
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
                {isWindowsTab && displayVersion.variant && displayVersion.variant !== "full" && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-foreground/70">
                    {displayVersion.variant === "setup" ? "安装版" : "便携版"}
                  </span>
                )}
              </div>
              {displayVersion.releaseDate && (
                <span className="text-xs text-foreground/50 sm:text-sm">
                  {formatReleaseDate(displayVersion.releaseDate)}
                </span>
              )}
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

      {/* ===== 历史版本 ===== */}
      <HistorySection
        platform={activeTab}
        expanded={historyExpanded}
        loading={historyLoading}
        error={historyError}
        items={historyItems}
        onToggle={toggleHistory}
      />

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
              <Monitor className="h-5 w-5 text-primary dark:text-primary/60" />
              <h3 className="text-base font-semibold">Windows</h3>
            </div>
            <ul className="space-y-2 text-sm text-foreground/70">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                操作系统：Windows 10 及以上（64 位）
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                存储空间：至少 500 MB 可用空间
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                提供：安装版（Setup）与便携版（Portable）
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                便携版：免安装，解压即用，可放 U 盘
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-5 sm:rounded-2xl sm:p-6 sm:col-span-2 lg:col-span-1">
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
            : fallbackSize}
          ，几秒钟即可下载完成
        </p>
        <Button
          onClick={() => handleDownload(isWindowsTab ? (winSetup ? "setup" : "portable") : "android")}
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
              下载 {isWindowsTab ? "Windows" : "Android"} 版 v
              {displayVersion?.versionName || APP_VERSION}
            </>
          )}
        </Button>
      </div>
    </section>
  );
}

/**
 * 平台切换 Tab 按钮
 */
function PlatformTabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Smartphone;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
        active
          ? "bg-white text-primary shadow-md"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

/**
 * Android 下载区（主按钮状态机）
 */
function AndroidDownloadArea({
  status,
  progress,
  versionsLoading,
  hasVersion,
  fileSizeText,
  onDownload,
  onRetry,
  loadError,
}: {
  status: DownloadStatus;
  progress: number;
  versionsLoading: boolean;
  hasVersion: boolean;
  fileSizeText: string;
  onDownload: () => void;
  onRetry: () => void;
  loadError: string | null;
}) {
  return (
    <div className="w-full max-w-md space-y-3">
      {/* 加载中 */}
      {(versionsLoading || status === "loading") && (
        <div className="flex h-12 items-center justify-center gap-3 rounded-xl bg-white/15 backdrop-blur-sm sm:h-14">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm font-medium sm:text-base">
            正在获取最新版本...
          </span>
        </div>
      )}

      {/* 主下载按钮 */}
      {status === "idle" && !versionsLoading && (
        <Button
          onClick={onDownload}
          disabled={!hasVersion}
          size="lg"
          className="group relative h-12 w-full overflow-hidden bg-white text-primary shadow-xl transition-all hover:bg-white/90 hover:shadow-2xl active:scale-[0.98] sm:h-14"
        >
          <span className="relative z-10 flex items-center justify-center gap-2 text-base font-semibold">
            <Download className="h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
            {hasVersion ? "立即下载 APK" : "暂未发布"}
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
            <div
              className="absolute inset-y-0 left-0 bg-white/30 transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
            <div className="relative z-10 flex h-full items-center justify-between px-4">
              <span className="flex items-center gap-2 text-sm font-medium">
                <FileDown className="h-4 w-4 animate-bounce" />
                正在下载
              </span>
              <span className="font-mono text-sm font-bold">{progress}%</span>
            </div>
          </div>
          <div className="flex justify-between text-[11px] text-white/50">
            <span>{fileSizeText}</span>
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
            onClick={onRetry}
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
            onClick={onRetry}
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
      {status === "idle" && !versionsLoading && (
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
      {loadError && !versionsLoading && (
        <p className="flex items-center justify-center gap-1 text-[11px] text-amber-300/80 sm:text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          版本信息获取失败，请稍后重试
        </p>
      )}
    </div>
  );
}

/**
 * Windows 下载区：安装版 + 便携版双卡片
 */
function WindowsDownloadArea({
  setup,
  portable,
  versionsLoading,
  activeStatus,
  activeTarget,
  progress,
  onDownload,
  onRetry,
  loadError,
}: {
  setup: AppVersionInfo | null;
  portable: AppVersionInfo | null;
  versionsLoading: boolean;
  activeStatus: DownloadStatus;
  activeTarget: DownloadTarget | null;
  progress: number;
  onDownload: (target: DownloadTarget) => void;
  onRetry: () => void;
  loadError: string | null;
}) {
  const noWindowsVersion = !versionsLoading && !setup && !portable;

  return (
    <div className="w-full max-w-2xl space-y-3">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        <WinVariantCard
          title="安装版"
          desc="标准 Windows 安装程序，支持开始菜单与桌面快捷方式"
          icon={PackageOpen}
          version={setup}
          target="setup"
          versionsLoading={versionsLoading}
          status={activeTarget === "setup" ? activeStatus : "idle"}
          progress={progress}
          onDownload={onDownload}
          onRetry={onRetry}
        />
        <WinVariantCard
          title="便携版"
          desc="免安装绿色版，解压即用，可放 U 盘随身携带"
          icon={Archive}
          version={portable}
          target="portable"
          versionsLoading={versionsLoading}
          status={activeTarget === "portable" ? activeStatus : "idle"}
          progress={progress}
          onDownload={onDownload}
          onRetry={onRetry}
        />
      </div>

      {noWindowsVersion && !loadError && (
        <p className="text-center text-[11px] text-white/60 sm:text-xs">
          Windows 版本正在准备中，敬请期待
        </p>
      )}

      {loadError && !versionsLoading && (
        <p className="flex items-center justify-center gap-1 text-[11px] text-amber-300/80 sm:text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          版本信息获取失败，请稍后重试
        </p>
      )}
    </div>
  );
}

/**
 * Windows 单形态下载卡片（安装版/便携版共用）
 */
function WinVariantCard({
  title,
  desc,
  icon: Icon,
  version,
  target,
  versionsLoading,
  status,
  progress,
  onDownload,
  onRetry,
}: {
  title: string;
  desc: string;
  icon: typeof PackageOpen;
  version: AppVersionInfo | null;
  target: Extract<DownloadTarget, "setup" | "portable">;
  versionsLoading: boolean;
  status: DownloadStatus;
  progress: number;
  onDownload: (target: DownloadTarget) => void;
  onRetry: () => void;
}) {
  const busy = status === "preparing" || status === "downloading" || status === "loading";

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm sm:p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
          <Icon className="h-5 w-5" />
        </span>
        <div className="text-left">
          <p className="text-sm font-semibold sm:text-base">{title}</p>
          <p className="text-[11px] text-white/60 sm:text-xs">
            {versionsLoading
              ? "获取版本中..."
              : version
                ? `v${version.versionName} · ${version.fileSize ? formatFileSize(version.fileSize) : "大小未知"}`
                : "暂未发布"}
          </p>
        </div>
      </div>
      <p className="hidden text-[11px] leading-relaxed text-white/60 sm:block sm:text-xs">
        {desc}
      </p>

      {versionsLoading || status === "loading" ? (
        <div className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white/15">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-medium sm:text-sm">加载中...</span>
        </div>
      ) : status === "preparing" ? (
        <div className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white/15">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs font-medium sm:text-sm">准备下载...</span>
        </div>
      ) : status === "downloading" ? (
        <div className="w-full space-y-1.5">
          <div className="relative h-10 overflow-hidden rounded-lg bg-white/15">
            <div
              className="absolute inset-y-0 left-0 bg-white/30 transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
            <div className="relative z-10 flex h-full items-center justify-between px-3">
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <FileDown className="h-3.5 w-3.5 animate-bounce" />
                下载中
              </span>
              <span className="font-mono text-xs font-bold">{progress}%</span>
            </div>
          </div>
        </div>
      ) : status === "success" ? (
        <div className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/20 text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-xs font-medium sm:text-sm">下载已开始</span>
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 flex items-center gap-1 text-[11px] text-white/70 underline-offset-2 hover:underline sm:text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            重新下载
          </button>
        </div>
      ) : (
        <Button
          onClick={() => onDownload(target)}
          disabled={!version || busy}
          size="sm"
          className="h-10 w-full bg-white text-primary shadow-lg transition-all hover:bg-white/90 active:scale-[0.98]"
        >
          <Download className="mr-1.5 h-4 w-4" />
          {version ? `下载${title}` : "暂未发布"}
        </Button>
      )}
    </div>
  );
}

/**
 * 历史版本折叠区（当前平台，走 302 计数直链）
 */
function HistorySection({
  platform,
  expanded,
  loading,
  error,
  items,
  onToggle,
}: {
  platform: PlatformTab;
  expanded: boolean;
  loading: boolean;
  error: string | null;
  items: AppVersionListItem[] | null;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20 sm:h-10 sm:w-10 sm:rounded-xl">
            <History className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
              历史版本
            </h2>
            <p className="text-xs text-foreground/50 sm:text-sm">
              Version Archive · {platform === "windows" ? "Windows" : "Android"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onToggle}>
          {expanded ? (
            <>
              <ChevronUp className="mr-1.5 h-4 w-4" />
              收起
            </>
          ) : (
            <>
              <ChevronDown className="mr-1.5 h-4 w-4" />
              查看历史版本
            </>
          )}
        </Button>
      </div>

      {expanded && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card sm:rounded-2xl">
          {loading && (
            <div className="flex h-24 items-center justify-center gap-2 text-sm text-foreground/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载历史版本...
            </div>
          )}
          {!loading && error && (
            <div className="flex h-24 flex-col items-center justify-center gap-2 text-sm text-foreground/60">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              {error}
            </div>
          )}
          {!loading && !error && items && items.length === 0 && (
            <div className="flex h-24 items-center justify-center text-sm text-foreground/60">
              暂无历史版本
            </div>
          )}
          {!loading && !error && items && items.length > 0 && (
            <ul className="divide-y divide-border/40">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 px-4 py-3 sm:px-6"
                >
                  <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs font-semibold text-foreground/80 sm:text-sm">
                    v{item.versionName}
                  </span>
                  {platform === "windows" && item.variant && item.variant !== "full" && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary dark:text-primary/60">
                      {item.variant === "setup" ? "安装版" : "便携版"}
                    </span>
                  )}
                  <span className="hidden flex-1 truncate text-xs text-foreground/60 sm:block sm:text-sm">
                    {item.title || (item.content[0] ?? "")}
                  </span>
                  <span className="ml-auto whitespace-nowrap text-xs text-foreground/50 sm:text-sm">
                    {item.releaseDate ? formatReleaseDate(item.releaseDate) : "未知日期"}
                  </span>
                  <span className="hidden whitespace-nowrap text-xs text-foreground/50 md:inline">
                    {item.fileSize ? formatFileSize(item.fileSize) : ""}
                  </span>
                  <a
                    href={buildDownloadUrl(item.id)}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-1 rounded-md border border-border/60 px-2.5 py-1 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Download className="h-3.5 w-3.5" />
                    下载
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
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
