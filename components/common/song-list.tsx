"use client";

import * as React from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Heart,
  Plus,
  MoreHorizontal,
  Music2,
  Check,
  ListMusic,
  ListStart,
  Disc,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";

import type { ApiSong } from "@/lib/types";
import { toPlayerSong } from "@/lib/types";
import { usePlayerStore, formatTime } from "@/lib/store/player-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, formatPlays } from "@/lib/utils";
import { AddToPlaylistDialog } from "@/components/common/add-to-playlist-dialog";
import { SwipeableRow } from "@/components/common/swipeable-row";
import { downloadSong, listDownloads, isDownloadAvailable } from "@/lib/download";
import { useToast } from "@/components/ui/toaster";

/**
 * 通用歌曲列表
 * - 行式布局：排名序号(可选) / 封面 / 歌名+歌手 / 时长 / 操作按钮
 * - Top3 序号用 primary 渐变填充 + 发光
 * - 点击行播放（队列 = 当前列表）
 * - 支持多选（用于个人中心"我喜欢的音乐"批量管理）
 * - 操作按钮：播放/暂停、喜欢、添加到队列
 */
export function SongList({
  songs,
  showRank = false,
  startRank = 1,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onLike,
  likedIds,
  onDelete,
  className,
  emptyText,
}: {
  songs: ApiSong[];
  /** 是否显示排名序号（排行榜用） */
  showRank?: boolean;
  /** 排名起始值（分页/分榜时偏移） */
  startRank?: number;
  /** 是否启用多选 */
  selectable?: boolean;
  /** 已选中的歌曲 id 集合 */
  selectedIds?: Set<string>;
  /** 切换选中回调 */
  onToggleSelect?: (id: string) => void;
  /** 喜欢回调 */
  onLike?: (song: ApiSong) => void;
  /** 已喜欢的歌曲 id 集合 */
  likedIds?: Set<string>;
  /** 删除回调（用于播放历史单条删除） */
  onDelete?: (song: ApiSong) => void;
  className?: string;
  emptyText?: string;
}) {
  const play = usePlayerStore((s) => s.play);
  const toggle = usePlayerStore((s) => s.toggle);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const [addToPlaylistSongIds, setAddToPlaylistSongIds] = React.useState<
    string[]
  >([]);
  const [playlistDialogOpen, setPlaylistDialogOpen] = React.useState(false);
  // 下载状态：已缓存 id 集合 + 正在下载 id 集合
  const [downloadedIds, setDownloadedIds] = React.useState<Set<string>>(
    new Set()
  );
  const [downloadingIds, setDownloadingIds] = React.useState<Set<string>>(
    new Set()
  );
  const toast = useToast();

  // 初始化：加载本地已缓存歌曲 id（listDownloads 一次性查回，避免逐条查 IndexedDB）
  // 仅在 TWA 环境下查询（非 TWA 环境下载功能已隐藏）
  React.useEffect(() => {
    if (!isDownloadAvailable()) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await listDownloads();
        if (!cancelled && list.length > 0) {
          setDownloadedIds(new Set(list.map((d) => d.songId)));
        }
      } catch {
        /* DB 不可用时静默降级，按钮统一显示为未下载态 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 触发下载某首歌曲，更新下载态并 toast 反馈 */
  const handleDownload = async (song: ApiSong) => {
    if (downloadingIds.has(song.id)) return;
    // 已下载则不重复下载，提示已在本地
    if (downloadedIds.has(song.id)) {
      toast.show("已下载到本地", { description: song.title });
      return;
    }
    setDownloadingIds((prev) => new Set(prev).add(song.id));
    try {
      const result = await downloadSong(song);
      setDownloadedIds((prev) => new Set(prev).add(song.id));
      if (result.newlyDownloaded) {
        toast.success("下载完成", { description: song.title });
      } else {
        toast.show("已在本地缓存", { description: song.title });
      }
    } catch (e) {
      toast.error("下载失败", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }
  };

  if (songs.length === 0 && emptyText) {
    return (
      <p className="py-10 text-center text-sm text-foreground/40">{emptyText}</p>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl", className)}>
      {songs.map((song, idx) => {
        const rank = startRank + idx;
        const isActive = currentSong?.id === song.id;
        const isLiked = likedIds?.has(song.id) ?? false;
        const isSelected = selectedIds?.has(song.id) ?? false;
        // Top3 金银铜徽章：第1名金、第2名银、第3名铜
        const isTop3 = showRank && rank <= 3;
        const top3BadgeClass =
          rank === 1
            ? "bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/50"
            : rank === 2
              ? "bg-gradient-to-b from-gray-300 to-gray-500 shadow-lg shadow-gray-400/50"
              : "bg-gradient-to-b from-orange-400 to-orange-600 shadow-lg shadow-orange-500/50";

        const handlePlay = () => {
          if (isActive) {
            toggle();
          } else {
            play(toPlayerSong(song), songs.map(toPlayerSong));
          }
        };

        return (
          <SwipeableRow
            key={song.id}
            onDelete={onDelete ? () => onDelete(song) : undefined}
          >
          <div
            className={cn(
              "group flex items-center gap-3 px-2 py-2 transition-colors md:gap-4 md:px-4 md:py-2.5 [content-visibility:auto] [contain-intrinsic-size:56px]",
              isActive
                ? "bg-primary/5"
                : "hover:bg-foreground/[0.03]"
            )}
          >
            {/* 多选框 / 排名序号 / 播放按钮 */}
            {selectable ? (
              <button
                type="button"
                onClick={() => onToggleSelect?.(song.id)}
                aria-label={isSelected ? "取消选择" : "选择"}
                className={cn(
                  "flex h-10 w-6 shrink-0 items-center justify-center rounded-md border transition-colors md:h-8 md:w-6",
                  isSelected
                    ? "border-primary bg-primary text-white"
                    : "border-foreground/20 hover:border-primary"
                )}
              >
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            ) : showRank ? (
              <div className="flex w-8 shrink-0 justify-center md:w-10">
                {isTop3 ? (
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white",
                      top3BadgeClass
                    )}
                  >
                    {rank}
                  </span>
                ) : (
                  <span className="font-mono text-sm font-medium text-foreground/40">
                    {rank.toString().padStart(2, "0")}
                  </span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePlay}
                aria-label={isActive && isPlaying ? "暂停" : "播放"}
                className="flex h-10 w-8 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-primary/10 hover:text-primary dark:hover:text-primary/60 md:h-8 md:w-8"
              >
                {isActive && isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 translate-x-[1px]" />
                )}
              </button>
            )}

            {/* 封面 */}
            <button
              type="button"
              onClick={handlePlay}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary/5 md:h-12 md:w-12"
            >
              {song.coverUrl || (song.album?.cover && song.album.cover) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={song.coverUrl || song.album?.cover || undefined}
                  alt={song.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-primary/40">
                  <Music2 className="h-5 w-5" />
                </span>
              )}
            </button>

            {/* 歌名 + 歌手 */}
            <button
              type="button"
              onClick={handlePlay}
              className="min-w-0 flex-1 text-left"
            >
              <p
                className={cn(
                  "truncate text-sm font-medium",
                  isActive && "text-primary dark:text-primary/60"
                )}
              >
                {song.title}
              </p>
              <p className="truncate text-xs text-foreground/50">
                {song.artist}
                {song.albumName ? ` · ${song.albumName}` : ""}
              </p>
            </button>

            {/* 播放数（若有，仅排行榜等场景展示） */}
            {song.plays > 0 && (
              <span className="hidden shrink-0 text-xs text-foreground/40 sm:inline">
                {formatPlays(song.plays)}
              </span>
            )}

            {/* 时长 */}
            <span className="shrink-0 font-mono text-xs text-foreground/40">
              {formatTime(song.duration)}
            </span>

            {/* 操作按钮组 */}
            <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
              {onLike && (
                <button
                  type="button"
                  onClick={() => onLike(song)}
                  aria-label={isLiked ? "取消喜欢" : "喜欢"}
                  className={cn(
                    "flex h-10 w-8 items-center justify-center rounded-full transition-colors md:h-8 md:w-8",
                    isLiked
                      ? "text-primary dark:text-primary/60"
                      : "text-foreground/40 md:opacity-0 md:hover:bg-primary/10 md:hover:text-primary md:group-hover:opacity-100 dark:md:hover:text-primary/60"
                  )}
                >
                  <Heart
                    className={cn("h-4 w-4", isLiked && "fill-current")}
                  />
                </button>
              )}
              {/* 下载按钮：未下载(空心 hover 显示) / 已下载(实心 primary 常显) / 下载中(旋转) */}
              {isDownloadAvailable() && (() => {
                const isDownloading = downloadingIds.has(song.id);
                const isDownloaded = downloadedIds.has(song.id);
                return (
                  <button
                    type="button"
                    onClick={() => void handleDownload(song)}
                    disabled={isDownloading}
                    aria-label={
                      isDownloading
                        ? "下载中"
                        : isDownloaded
                          ? "已下载"
                          : "下载"
                    }
                    className={cn(
                      "flex h-10 w-8 items-center justify-center rounded-full transition-colors md:h-8 md:w-8",
                      isDownloading || isDownloaded
                        ? "text-primary dark:text-primary/60"
                        : "text-foreground/40 md:opacity-0 md:hover:bg-primary/10 md:hover:text-primary md:group-hover:opacity-100 dark:md:hover:text-primary/60",
                      isDownloading && "cursor-wait"
                    )}
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download
                        className={cn(
                          "h-4 w-4",
                          isDownloaded && "fill-current"
                        )}
                      />
                    )}
                  </button>
                );
              })()}
              <button
                type="button"
                onClick={() => addToQueue(toPlayerSong(song))}
                aria-label="添加到队列"
                className="hidden h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100 dark:hover:text-primary/60 md:flex"
              >
                <Plus className="h-4 w-4" />
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(song)}
                  aria-label="删除"
                  className="hidden h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 md:flex"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="更多操作"
                    className="flex h-10 w-8 items-center justify-center rounded-full text-foreground/40 transition-all hover:bg-foreground/5 hover:text-foreground md:h-8 md:w-8 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {onLike && (
                    <DropdownMenuItem onClick={() => onLike(song)}>
                      <Heart
                        className={cn(
                          "mr-2 h-4 w-4",
                          isLiked && "fill-current text-primary dark:text-primary/60"
                        )}
                      />
                      {isLiked ? "取消喜欢" : "喜欢"}
                    </DropdownMenuItem>
                  )}
                  {isDownloadAvailable() && (
                    <DropdownMenuItem
                      disabled={
                        downloadingIds.has(song.id) || downloadedIds.has(song.id)
                      }
                      onClick={() => void handleDownload(song)}
                    >
                      {downloadingIds.has(song.id) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download
                          className={cn(
                            "mr-2 h-4 w-4",
                            downloadedIds.has(song.id) &&
                              "fill-current text-primary dark:text-primary/60"
                          )}
                        />
                      )}
                      {downloadingIds.has(song.id)
                        ? "下载中…"
                        : downloadedIds.has(song.id)
                          ? "已下载"
                          : "下载"}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => addToQueue(toPlayerSong(song))}
                  >
                    <ListMusic className="mr-2 h-4 w-4" />
                    添加到队列
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => playNext(toPlayerSong(song))}
                  >
                    <ListStart className="mr-2 h-4 w-4" />
                    下一首播放
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setAddToPlaylistSongIds([song.id]);
                      setPlaylistDialogOpen(true);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    添加到歌单
                  </DropdownMenuItem>
                  {song.albumId && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/album/${song.albumId}`}
                          className="flex items-center"
                        >
                          <Disc className="mr-2 h-4 w-4" />
                          查看专辑
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          </SwipeableRow>
        );
      })}
      <AddToPlaylistDialog
        songIds={addToPlaylistSongIds}
        open={playlistDialogOpen}
        onOpenChange={setPlaylistDialogOpen}
      />
    </div>
  );
}
