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
import { cn } from "@/lib/utils";
import { AddToPlaylistDialog } from "@/components/common/add-to-playlist-dialog";
import { SwipeableRow } from "@/components/common/swipeable-row";

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
        // Top3 渐变填充
        const isTop3 = showRank && rank <= 3;

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
            className={onDelete ? "md:hidden" : undefined}
          >
          <div
            className={cn(
              "group flex items-center gap-3 px-2.5 py-2.5 transition-colors md:gap-4 md:px-4",
              isActive
                ? "bg-primary-700/5"
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
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors",
                  isSelected
                    ? "border-primary-700 bg-primary-700 text-white"
                    : "border-foreground/20 hover:border-primary-500"
                )}
              >
                {isSelected && <Check className="h-4 w-4" />}
              </button>
            ) : showRank ? (
              <div className="flex w-8 shrink-0 justify-center md:w-10">
                {isTop3 ? (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-b from-primary-500 to-primary-700 text-sm font-bold text-white shadow-lg shadow-primary-500/50">
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
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-primary-700/10 hover:text-primary-700 dark:hover:text-primary-300"
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
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary-700/5 md:h-12 md:w-12"
            >
              {song.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={song.coverUrl}
                  alt={song.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-primary-700/40">
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
                  isActive && "text-primary-700 dark:text-primary-300"
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
            <div className="flex shrink-0 items-center gap-0.5">
              {onLike && (
                <button
                  type="button"
                  onClick={() => onLike(song)}
                  aria-label={isLiked ? "取消喜欢" : "喜欢"}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                    isLiked
                      ? "text-primary-700 dark:text-primary-300"
                      : "text-foreground/40 opacity-0 hover:bg-primary-700/10 hover:text-primary-700 group-hover:opacity-100 dark:hover:text-primary-300"
                  )}
                >
                  <Heart
                    className={cn("h-4 w-4", isLiked && "fill-current")}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={() => addToQueue(toPlayerSong(song))}
                aria-label="添加到队列"
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-primary-700/10 hover:text-primary-700 group-hover:opacity-100 dark:hover:text-primary-300"
              >
                <Plus className="h-4 w-4" />
              </button>
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(song)}
                  aria-label="删除"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="更多操作"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-foreground/5 hover:text-foreground group-hover:opacity-100"
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
                          isLiked && "fill-current text-primary-700 dark:text-primary-300"
                        )}
                      />
                      {isLiked ? "取消喜欢" : "喜欢"}
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

/** 格式化播放次数（万为单位） */
function formatPlays(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}
