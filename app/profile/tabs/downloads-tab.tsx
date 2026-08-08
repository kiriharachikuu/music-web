"use client";

import * as React from "react";
import { Download, Music2, Play, Loader2, Trash2, X, AlertCircle } from "lucide-react";

import type { DownloadListItem } from "@/lib/download";
import { toPlayerSong } from "@/lib/types";
import {
  listDownloads,
  removeDownload,
  clearAllDownloads,
  getCacheSize,
  getCachedUrl,
} from "@/lib/download";
import { usePlayerStore } from "@/lib/store/player-store";
import { useToast } from "@/components/ui/toaster";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/common/confirm-dialog";
import { cn, resolveMediaUrl, formatDate } from "@/lib/utils";
import { getPlatform } from "@/lib/platform/detect";
import {
  useDownloadProgressStore,
  selectInFlightOrdered,
  type InFlightDownload,
} from "@/lib/store/download-progress-store";
import { useShallow } from "zustand/react/shallow";

/** 子模块 4：下载管理（区分下载中与已下载） */
export function DownloadsTab() {
  // 已下载列表（null = 加载中，[] = 已加载为空）
  const [downloads, setDownloads] = React.useState<DownloadListItem[] | null>(
    null
  );
  const [totalSize, setTotalSize] = React.useState(0);
  const [loadingPlayId, setLoadingPlayId] = React.useState<string | null>(null);
  // 正在下载的任务（来自 download-progress-store）
  const inFlight = useDownloadProgressStore((s) => selectInFlightOrdered(s));
  const play = usePlayerStore((s) => s.play);
  const toast = useToast();
  const confirm = useConfirm();

  /** 从底层加载已下载列表与总占用 */
  const load = async () => {
    try {
      const [list, size] = await Promise.all([
        listDownloads(),
        getCacheSize(),
      ]);
      setDownloads(list);
      setTotalSize(size);
    } catch {
      setDownloads([]);
      setTotalSize(0);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  // 下载中 → 已下载的过渡：监听 inFlight 数量变化，
  // 一旦减少（任务完成）就重新拉取已下载列表，确保已下载区能即时出现新条目
  const inFlightCount = inFlight.filter((d) => d.state === "downloading").length;
  React.useEffect(() => {
    void load();
    // 仅依赖 inFlight 数量变化
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inFlightCount]);

  /** 播放：优先用本地 URL（离线可用），失败回退在线 URL */
  const handlePlay = async (item: DownloadListItem) => {
    setLoadingPlayId(item.songId);
    try {
      const localUrl = await getCachedUrl(item.songId);
      const ps = toPlayerSong(item.song);
      const queue = (downloads ?? []).map((d) => toPlayerSong(d.song));
      const idx = queue.findIndex((q) => q.id === ps.id);
      if (localUrl) {
        ps.url = localUrl;
        if (idx >= 0) queue[idx] = { ...queue[idx], url: localUrl };
      }
      void play(ps, queue);
    } catch {
      toast.error("播放失败", { description: item.song.title });
    } finally {
      setLoadingPlayId(null);
    }
  };

  /** 删除单条 */
  const handleRemove = async (item: DownloadListItem) => {
    try {
      await removeDownload(item.songId);
      toast.success("已删除", { description: item.song.title });
      void load();
    } catch {
      toast.error("删除失败");
    }
  };

  /** 取消正在下载的任务（仅清空 store 条目；底层 IPC/原生请求暂不中断） */
  const handleCancelInFlight = (item: InFlightDownload) => {
    useDownloadProgressStore.getState().clear(item.song.id);
    toast.show("已从下载队列移除", { description: item.song.title });
  };

  /** 清空全部（需确认） */
  const handleClearAll = async () => {
    if (
      !(await confirm({
        title: "清空下载缓存",
        description: "此操作不可恢复，确定清空所有下载缓存吗？",
        confirmText: "清空",
        variant: "destructive",
      }))
    )
      return;
    try {
      await clearAllDownloads();
      toast.success("已清空下载缓存");
      void load();
    } catch {
      toast.error("清空失败");
    }
  };

  if (downloads === null) return <PageSkeleton variant="list" />;

  const hasDownloads = downloads.length > 0;
  // 下载中区只展示 downloading 状态；error 状态临时保留在 inFlight 内展示后会自动消失
  const activeInFlight = inFlight.filter((d) => d.state === "downloading");
  const errorInFlight = inFlight.filter((d) => d.state === "error");
  const hasInFlight = activeInFlight.length > 0;
  const hasError = errorInFlight.length > 0;
  const empty = !hasDownloads && !hasInFlight && !hasError;

  return (
    <div className="space-y-5">
      {/* 顶部统计 + 清空按钮 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/40">
          已下载 {downloads.length} 首 · 占用 {formatBytes(totalSize)}
          {hasInFlight && ` · 下载中 ${activeInFlight.length} 首`}
        </span>
        {hasDownloads && (
          <Button
            variant="ghost"
            onClick={handleClearAll}
            className="rounded-full px-3 text-sm text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            清空全部
          </Button>
        )}
      </div>

      {/* 下载中区域 */}
      {hasInFlight && (
        <section>
          <SectionHeader
            icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />}
            title="下载中"
            count={activeInFlight.length}
          />
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card/40 p-2 shadow-sm md:p-3">
            {activeInFlight.map((item) => (
              <InFlightRow
                key={item.song.id}
                item={item}
                onCancel={() => handleCancelInFlight(item)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 失败提示区域（仅短暂存在，4s 后自动清理） */}
      {hasError && (
        <section>
          <SectionHeader
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            title="下载失败"
            count={errorInFlight.length}
            tone="destructive"
          />
          <div className="overflow-hidden rounded-2xl border border-destructive/20 bg-destructive/[0.04] p-2 shadow-sm md:p-3">
            {errorInFlight.map((item) => (
              <ErrorRow
                key={item.song.id}
                item={item}
                onDismiss={() =>
                  useDownloadProgressStore.getState().clear(item.song.id)
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* 已下载区域 */}
      {hasDownloads && (
        <section>
          <SectionHeader
            icon={<Download className="h-3.5 w-3.5" />}
            title="已下载"
            count={downloads.length}
          />
          <div className="overflow-hidden rounded-2xl border border-primary/10 bg-card/40 p-2 shadow-sm md:p-3">
            {downloads.map((item) => {
              if (!item || !item.song) return null;
              const isTWA = getPlatform().isTWA;
              const localCoverPath = item.localCoverPath;
              // TWA 下使用 WebViewAssetLoader 映射的安全 URL
              // （https://appassets.androidplatform.net/assets/covers/{songId}.{ext}）
              const coverUrl = isTWA && localCoverPath
                ? `https://appassets.androidplatform.net/assets/covers/${localCoverPath.split("/").pop()}`
                : resolveMediaUrl(item.song.coverUrl || item.song.album?.cover);
              const isLoadingPlay = loadingPlayId === item.songId;
              return (
                <div
                  key={item.songId}
                  className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-foreground/[0.03] md:gap-4 md:px-4"
                >
                  {/* 封面 */}
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary/5 md:h-12 md:w-12">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt={item.song.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-primary/40">
                        <Music2 className="h-5 w-5" />
                      </span>
                    )}
                  </div>

                  {/* 歌名 + 歌手 + 元信息 */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.song.title}
                    </p>
                    <p className="truncate text-xs text-foreground/50">
                      {item.song.artist}
                      {item.song.albumName ? ` · ${item.song.albumName}` : ""}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-[11px] text-foreground/40">
                      <span>{formatBytes(item.size)}</span>
                      <span aria-hidden>·</span>
                      <span>{formatDate(new Date(item.cachedAt))}</span>
                    </p>
                  </div>

                  {/* 操作：播放 / 删除 */}
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => void handlePlay(item)}
                      disabled={isLoadingPlay}
                      aria-label="播放"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-primary/10 hover:text-primary dark:hover:text-primary/60"
                    >
                      {isLoadingPlay ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 translate-x-[1px]" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleRemove(item)}
                      aria-label="删除"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {empty && (
        <EmptyState
          icon={Download}
          title="暂无下载"
          description="去发现页下载歌曲吧，离线也能听。"
        />
      )}
    </div>
  );
}

/** 分区标题 */
function SectionHeader({
  icon,
  title,
  count,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  tone?: "default" | "destructive";
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-center gap-1.5 px-1 text-xs font-medium",
        tone === "destructive"
          ? "text-destructive/80"
          : "text-foreground/60"
      )}
    >
      {icon}
      <span>{title}</span>
      <span className="text-foreground/30">· {count}</span>
    </div>
  );
}

/** 下载中行：封面 / 标题 / 进度条 / 取消按钮 */
function InFlightRow({
  item,
  onCancel,
}: {
  item: InFlightDownload;
  onCancel: () => void;
}) {
  // indeterminate：content-length 不可得或 TWA 场景，进度条用脉冲动画
  const indeterminate = item.progress <= 0;
  return (
    <div className="rounded-xl px-2.5 py-2.5 transition-colors hover:bg-foreground/[0.03] md:px-4">
      <div className="flex items-center gap-3 md:gap-4">
        {/* 封面 */}
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary/5 md:h-12 md:w-12">
          {item.song.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.song.coverUrl}
              alt={item.song.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-primary/40">
              <Music2 className="h-5 w-5" />
            </span>
          )}
        </div>

        {/* 标题 + 歌手 */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.song.title}</p>
          <p className="truncate text-xs text-foreground/50">
            {item.song.artist}
            {item.song.albumName ? ` · ${item.song.albumName}` : ""}
          </p>
        </div>

        {/* 进度百分比 */}
        <span className="shrink-0 font-mono text-xs tabular-nums text-primary/80">
          {indeterminate ? "准备中" : `${Math.floor(item.progress)}%`}
        </span>

        {/* 取消按钮 */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="取消下载"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 进度条 */}
      <div
        className="mt-2 h-1 w-full overflow-hidden rounded-full bg-foreground/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(item.progress)}
      >
        {indeterminate ? (
          // 未知进度：横向脉冲条
          <div className="h-full w-1/3 rounded-full bg-primary/70 animate-indeterminate" />
        ) : (
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
            style={{ width: `${item.progress}%` }}
          />
        )}
      </div>
    </div>
  );
}

/** 失败行：展示错误信息，提供移除按钮 */
function ErrorRow({
  item,
  onDismiss,
}: {
  item: InFlightDownload;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-destructive/[0.04] md:gap-4 md:px-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <AlertCircle className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.song.title}</p>
        <p className="truncate text-xs text-destructive/80">
          {item.error || "下载失败"}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="移除"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/40 transition-colors hover:bg-foreground/5 hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/** 格式化字节 */
function formatBytes(bytes: number): string {
  if (typeof bytes !== "number" || !isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    units.length - 1,
    Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024)))
  );
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
