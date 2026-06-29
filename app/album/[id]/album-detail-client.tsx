"use client";

import * as React from "react";
import { Play, Shuffle, Heart, Disc3, Music2 } from "lucide-react";

import type { AlbumDetail, Album, ApiSong } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { SongList } from "@/components/common/song-list";
import { AlbumCard } from "@/components/common/album-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatTotalDuration } from "@/lib/utils";

/**
 * 专辑详情客户端组件
 * - Apple Music 风格 Hero：封面模糊放大做渐变背景 + 大封面 + 大标题
 * - 操作：播放全部 / 随机播放 / 收藏
 * - 曲目列表复用 SongList
 * - 底部"更多来自 {歌手}"相关专辑推荐
 */
export function AlbumDetailClient({
  album,
  relatedAlbums,
}: {
  album: AlbumDetail;
  relatedAlbums: Album[];
}) {
  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const [favorited, setFavorited] = React.useState(false);

  // 仅展示已发布歌曲（公开页面不暴露 DRAFT）
  const songs: ApiSong[] = React.useMemo(
    () => (album.songs ?? []).filter((s) => s.status === "PUBLISHED"),
    [album.songs]
  );

  const totalDuration = React.useMemo(
    () => songs.reduce((sum, s) => sum + (s.duration || 0), 0),
    [songs]
  );

  /** 播放全部：从第一首开始，列表循环 */
  const playAll = () => {
    if (songs.length === 0) return;
    play(toPlayerSong(songs[0]), toPlayerSongs(songs));
  };

  /** 随机播放：切随机模式并从随机一首开始 */
  const shufflePlay = () => {
    if (songs.length === 0) return;
    setPlayMode("shuffle");
    const random = songs[Math.floor(Math.random() * songs.length)];
    play(toPlayerSong(random), toPlayerSongs(songs));
  };

  return (
    <section className="animate-fade-in space-y-8">
      {/* ===== Hero 区域 ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* 封面模糊放大作为渐变背景（毛玻璃氛围） */}
        <div className="absolute inset-0 -z-10" aria-hidden>
          {album.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={album.cover}
              alt=""
              className="h-full w-full scale-150 object-cover opacity-50 blur-3xl"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/75 to-background" />
        </div>

        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8">
          {/* 大封面 */}
          <div className="h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-primary-700/5 shadow-card-dark md:h-56 md:w-56">
            {album.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={album.cover}
                alt={album.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary-700/40">
                <Disc3 className="h-16 w-16" />
              </div>
            )}
          </div>

          {/* 右侧信息 */}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
              专辑
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {album.name}
            </h1>
            <p className="text-sm text-foreground/60">{album.artist}</p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground/40">
              {album.releaseDate && (
                <span>{formatDate(album.releaseDate)}</span>
              )}
              <span>·</span>
              <span>{songs.length} 首</span>
              {totalDuration > 0 && (
                <>
                  <span>·</span>
                  <span>{formatTotalDuration(totalDuration)}</span>
                </>
              )}
            </div>
            {album.description && (
              <p className="mt-2 max-w-2xl line-clamp-3 text-sm text-foreground/60">
                {album.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== 操作按钮 ===== */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={playAll}
          disabled={songs.length === 0}
          className="rounded-full bg-primary-700 px-5 text-white shadow-card hover:bg-primary-600 active:bg-primary-800"
        >
          <Play className="h-4 w-4 translate-x-[1px]" />
          播放全部
        </Button>
        <Button
          onClick={shufflePlay}
          disabled={songs.length === 0}
          variant="outline"
          className="rounded-full px-5"
        >
          <Shuffle className="h-4 w-4" />
          随机播放
        </Button>
        <Button
          onClick={() => setFavorited((f) => !f)}
          variant="outline"
          className="rounded-full px-5"
          aria-label={favorited ? "取消收藏" : "收藏"}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              favorited && "fill-current text-primary-700 dark:text-primary-300"
            )}
          />
          {favorited ? "已收藏" : "收藏"}
        </Button>
        <span className="ml-auto text-xs text-foreground/40">
          共 {songs.length} 首
        </span>
      </div>

      {/* ===== 曲目列表 ===== */}
      {songs.length > 0 ? (
        <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
          <SongList songs={songs} />
        </div>
      ) : (
        <EmptyState
          icon={Music2}
          title="专辑暂无曲目"
          description="该专辑还没有发布任何歌曲。"
        />
      )}

      {/* ===== 相关推荐：同歌手其他专辑 ===== */}
      {relatedAlbums.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight md:text-2xl">
            <span className="h-5 w-[2px] rounded-full bg-primary-700 dark:bg-primary-500" />
            更多来自 {album.artist}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {relatedAlbums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
