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
        "group block space-y-2.5 transition-transform duration-300 hover:-translate-y-1",
        className
      )}
    >
      {/* 封面容器 */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-primary-700/5 shadow-card">
        {playlist.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={playlist.cover}
            alt={playlist.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary-700/30">
            <ListMusic className="h-10 w-10" />
          </div>
        )}

        {/* hover 主色蒙层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary-700/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

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
            className="absolute bottom-2.5 right-2.5 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-primary-700 text-white opacity-0 shadow-lg shadow-primary-500/40 transition-all duration-300 hover:bg-primary-600 hover:scale-105 group-hover:translate-y-0 group-hover:opacity-100"
          >
            <Play className="h-5 w-5 translate-x-[1px]" />
          </button>
        )}
      </div>

      {/* 文字信息 */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{playlist.name}</p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">
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
