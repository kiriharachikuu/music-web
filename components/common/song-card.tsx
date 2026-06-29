"use client";

import { Play, Music2 } from "lucide-react";

import type { ApiSong } from "@/lib/types";
import { toPlayerSong } from "@/lib/types";
import { usePlayerStore, formatTime } from "@/lib/store/player-store";
import { cn } from "@/lib/utils";

/**
 * 单曲卡片
 * - 封面为主，下方歌名 + 歌手 + 时长
 * - hover 上浮 + 主色播放按钮
 * - 用于发现页"新歌推送"等横向滚动场景
 * - 点击直接播放（调用 playerStore.play）
 */
export function SongCard({
  song,
  queue,
  className,
}: {
  song: ApiSong;
  /** 播放队列（默认仅本曲） */
  queue?: ApiSong[];
  className?: string;
}) {
  const play = usePlayerStore((s) => s.play);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentSong?.id === song.id;

  const handlePlay = () => {
    const list = queue && queue.length > 0 ? queue : [song];
    play(toPlayerSong(song), list.map(toPlayerSong));
  };

  return (
    <div
      className={cn(
        "group w-40 shrink-0 space-y-2.5 md:w-44",
        className
      )}
    >
      <button
        type="button"
        onClick={handlePlay}
        aria-label={`播放 ${song.title}`}
        className="relative block aspect-square w-full overflow-hidden rounded-xl bg-primary-700/5 text-left shadow-card transition-transform duration-300 hover:-translate-y-1"
      >
        {song.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.coverUrl}
            alt={song.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary-700/30">
            <Music2 className="h-10 w-10" />
          </div>
        )}

        {/* hover 主色蒙层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-700/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* 播放按钮 */}
        <span
          className={cn(
            "absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center rounded-full bg-primary-700 text-white shadow-lg shadow-primary-500/40 transition-all duration-300 hover:scale-105 hover:bg-primary-600",
            isActive
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
          )}
        >
          <Play className="h-5 w-5 translate-x-[1px]" />
        </span>

        {/* 正在播放标识 */}
        {isActive && isPlaying && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-primary-700/90 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            正在播放
          </span>
        )}
      </button>

      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-medium",
            isActive && "text-primary-700 dark:text-primary-300"
          )}
        >
          {song.title}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className="truncate text-xs text-foreground/50">{song.artist}</p>
          <span className="shrink-0 font-mono text-[10px] text-foreground/40">
            {formatTime(song.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
