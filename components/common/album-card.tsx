import Link from "next/link";
import { Disc3 } from "lucide-react";

import type { Album } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 专辑卡片
 * - 封面 + 名称 + 艺术家 + 歌曲数
 * - hover 上浮 + primary-700/10 渐变蒙层
 */
export function AlbumCard({
  album,
  className,
}: {
  album: Album;
  className?: string;
}) {
  return (
    <Link
      href={`/album/${album.id}`}
      className={cn(
        "group block space-y-2.5 transition-transform duration-300 hover:-translate-y-1",
        className
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-primary/5 shadow-card">
        {album.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={album.cover}
            alt={album.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/30">
            <Disc3 className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{album.name}</p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">
          {album.artist}
          {album.songCount > 0 && ` · ${album.songCount} 首`}
        </p>
      </div>
    </Link>
  );
}
