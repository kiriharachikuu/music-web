"use client";

import { Play, Music2 } from "lucide-react";

import type { ApiSong, LiveClipTrack } from "@/lib/types";
import { toPlayerSong } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { cn } from "@/lib/utils";
import { AppImage } from "@/components/ui/app-image";
import { LiveClipBadge } from "@/components/common/live-clip-badge";

type SongCardItem = ApiSong | LiveClipTrack;

/**
 * 单曲卡片
 * - 封面为主，下方歌名 + 歌手 + 专辑/场次
 * - 支持 ApiSong（官方单曲）和 LiveClipTrack（直播歌切）
 * - 歌切显示 LIVE 徽章 + 场次名
 * - hover 上浮 + 主色播放按钮
 * - 用于发现页"新歌推送"/"每日推荐"等横向滚动场景
 * - 点击直接播放（调用 playerStore.play）
 */
export function SongCard({
  song,
  queue,
  className,
}: {
  song: SongCardItem;
  /** 播放队列（默认仅本曲） */
  queue?: SongCardItem[];
  className?: string;
}) {
  const play = usePlayerStore((s) => s.play);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isActive = currentSong?.id === song.id;
  const isLiveClip = song.trackType === "live_clip";

  const handlePlay = () => {
    const list = queue && queue.length > 0 ? queue : [song];
    play(toPlayerSong(song), list.map(toPlayerSong));
  };

  // 封面来源：歌切用 cover，官方用 coverUrl 或 album.cover
  const coverSrc = isLiveClip
    ? (song as LiveClipTrack).cover
    : (song as ApiSong).coverUrl || (song as ApiSong).album?.cover || undefined;

  // 副标题：歌切显示场次名，官方显示专辑名
  const subtitle = isLiveClip
    ? (song as LiveClipTrack).sessionName
    : (song as ApiSong).albumName || (song as ApiSong).album?.name || "";

  return (
    <div
      className={cn(
        "group w-36 shrink-0 space-y-2 md:w-44",
        className
      )}
    >
      <button
        type="button"
        onClick={handlePlay}
        aria-label={`播放 ${song.title}`}
        className="relative block aspect-square w-full overflow-hidden rounded-xl bg-primary/5 text-left shadow-card transition-transform duration-300 active:scale-95 md:hover:-translate-y-1"
      >
        {coverSrc ? (
          <AppImage
            src={coverSrc}
            alt={song.title}
            fill
            className="transition-transform duration-500 md:group-hover:scale-105"
            sizes="(max-width: 768px) 40vw, 20vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/30">
            <Music2 className="h-10 w-10" />
          </div>
        )}

        {/* hover 主色蒙层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 md:group-hover:opacity-100" />

        {/* 播放按钮 */}
        <span
          className={cn(
            "absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/40 transition-all duration-300 md:h-11 md:w-11 md:hover:scale-105 md:hover:bg-primary/90",
            isActive
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          )}
        >
          <Play className="h-4 w-4 translate-x-[1px] md:h-5 md:w-5" />
        </span>

        {/* 正在播放标识 */}
        {isActive && isPlaying && (
          <span className="absolute left-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            正在播放
          </span>
        )}

        {/* 歌切 LIVE 徽章 */}
        {isLiveClip && (
          <span className="absolute left-2 top-2">
            <LiveClipBadge />
          </span>
        )}
      </button>

      <div className="min-w-0 px-0.5">
        <p
          className={cn(
            "flex items-center gap-1 truncate text-sm font-medium",
            isActive && "text-primary dark:text-primary/60"
          )}
        >
          {isLiveClip && <LiveClipBadge className="shrink-0" />}
          <span className="truncate">{song.title}</span>
        </p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">
          {song.artist}
          {subtitle && (
            <>
              <span className="mx-0.5">·</span>
              <span>{subtitle}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
