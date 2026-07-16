import Link from "next/link";
import { Play, ListMusic } from "lucide-react";

import type { Playlist } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 歌单卡片
 * - 封面圆角，hover 显示主色圆形播放按钮
 * - hover 上浮 -translate-y-1 + 阴影 + primary-700/10 渐变蒙层
 * - 用于发现页 / 音乐库 / 个人中心等
 */
export function PlaylistCard({
  playlist,
  onPlay,
  className,
}: {
  playlist: Playlist;
  /** 点击播放按钮回调（客户端注入，避免本组件成为 client） */
  onPlay?: (playlist: Playlist) => void;
  className?: string;
}) {
  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className={cn(
        "group block space-y-2 transition-transform duration-300 active:scale-95 md:hover:-translate-y-1",
        className
      )}
    >
      {/* 封面容器 */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-primary/5 shadow-card">
        {playlist.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.cover}
            alt={playlist.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 md:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/30">
            <ListMusic className="h-10 w-10" />
          </div>
        )}

        {/* 官方歌单角标 */}
        {playlist.isSystem && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm backdrop-blur-sm">
            官方
          </span>
        )}

        {/* hover 主色蒙层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 md:group-hover:opacity-100" />

        {/* 播放按钮 */}
        {onPlay && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlay(playlist);
            }}
            aria-label={`播放 ${playlist.name}`}
            className="absolute bottom-2 right-2 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-primary text-white opacity-0 shadow-lg shadow-primary/40 transition-all duration-300 md:h-11 md:w-11 md:hover:bg-primary/90 md:hover:scale-105 md:group-hover:translate-y-0 md:group-hover:opacity-100"
          >
            <Play className="h-4 w-4 translate-x-[1px] md:h-5 md:w-5" />
          </button>
        )}
      </div>

      {/* 文字信息 */}
      <div className="min-w-0 px-0.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {playlist.isSystem && (
            <span className="mr-1 inline-block rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 align-middle">
              官方
            </span>
          )}
          {playlist.name}
        </p>
        <p className="mt-1 truncate text-xs text-foreground/50">
          {playlist.songCount != null
            ? `${playlist.songCount} 首`
            : playlist.playCount > 0
            ? `${playlist.playCount} 次播放`
            : playlist.description || "歌单"}
        </p>
      </div>
    </Link>
  );
}
