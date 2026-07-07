"use client";

import * as React from "react";
import { Download, Music2, Play, Loader2, Trash2 } from "lucide-react";

import type { DownloadListItem } from "@/lib/db/audio-cache";
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
import { resolveMediaUrl, formatDate } from "@/lib/utils";

/** 子模块 4：下载管理（IndexedDB 离线缓存） */
export function DownloadsTab() {
  // null 表示加载中，[] 表示已加载但为空
  const [downloads, setDownloads] = React.useState<DownloadListItem[] | null>(
    null
  );
  const [totalSize, setTotalSize] = React.useState(0);
  const [loadingPlayId, setLoadingPlayId] = React.useState<string | null>(null);
  const play = usePlayerStore((s) => s.play);
  const toast = useToast();
  const confirm = useConfirm();

  /** 从 IndexedDB 加载下载列表与总占用 */
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

  /** 播放：优先用本地 blob URL（离线可用），失败回退在线 URL */
  const handlePlay = async (item: DownloadListItem) => {
    setLoadingPlayId(item.songId);
    try {
      const localUrl = await getCachedUrl(item.songId);
      const ps = toPlayerSong(item.song);
      // 构造队列：整个下载列表（其他歌曲保持在线 URL，当前歌曲用本地 URL）
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

  return (
    <div className="space-y-4">
      {/* 顶部统计 + 清空按钮 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/40">
          已下载 {downloads.length} 首 · 占用 {formatBytes(totalSize)}
        </span>
        {downloads.length > 0 && (
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

      {downloads.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-primary-500/10 bg-card/40 p-2 shadow-sm md:p-3">
          {downloads.map((item) => {
            const cover = resolveMediaUrl(item.song.coverUrl || item.song.album?.cover);
            const isLoadingPlay = loadingPlayId === item.songId;
            return (
              <div
                key={item.songId}
                className="group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-foreground/[0.03] md:gap-4 md:px-4"
              >
                {/* 封面 */}
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary-700/5 md:h-12 md:w-12">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt={item.song.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-primary-700/40">
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
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/50 transition-colors hover:bg-primary-700/10 hover:text-primary-700 dark:hover:text-primary-300"
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
      ) : (
        <EmptyState
          icon={Download}
          title="暂无下载"
          description="去发现页下载歌曲吧，离线也能听。"
        />
      )}
    </div>
  );
}

/** 格式化字节 */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
