"use client";

import * as React from "react";
import { Play, Heart, ListMusic, User2 } from "lucide-react";

import type { PlaylistDetail, ApiSong } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatPlays } from "@/lib/utils";

/**
 * 歌单详情客户端组件
 * - Apple Music 风格 Hero：封面模糊放大做渐变背景 + 大封面 + 大标题
 * - 展示创建者（头像 + 用户名）、播放次数、歌曲数、描述
 * - 操作：播放全部 / 收藏
 * - 从 playlistSongs 映射出 songs（album.name 平铺到 albumName），传给 SongList
 */
export function PlaylistDetailClient({
  playlist,
}: {
  playlist: PlaylistDetail;
}) {
  const play = usePlayerStore((s) => s.play);
  const [favorited, setFavorited] = React.useState(false);

  // 从 playlistSongs 映射出歌曲数组，按 sort 升序，并把 album.name 平铺到 albumName
  const songs: ApiSong[] = React.useMemo(() => {
    return (playlist.playlistSongs ?? [])
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((ps) => {
        const { album, ...rest } = ps.song;
        return {
          ...rest,
          albumName: rest.albumName ?? album?.name ?? undefined,
        } as ApiSong;
      });
  }, [playlist.playlistSongs]);

  /** 播放全部：从第一首开始，列表循环 */
  const playAll = () => {
    if (songs.length === 0) return;
    play(toPlayerSong(songs[0]), toPlayerSongs(songs));
  };

  const creator = playlist.user;

  return (
    <section className="animate-fade-in space-y-8">
      {/* ===== Hero 区域 ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* 封面模糊放大作为渐变背景（毛玻璃氛围） */}
        <div className="absolute inset-0 -z-10" aria-hidden>
          {playlist.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playlist.cover}
              alt=""
              className="h-full w-full scale-150 object-cover opacity-50 blur-3xl"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/75 to-background" />
        </div>

        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8">
          {/* 大封面 */}
          <div className="h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-primary-700/5 shadow-card-dark md:h-56 md:w-56">
            {playlist.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.cover}
                alt={playlist.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary-700/40">
                <ListMusic className="h-16 w-16" />
              </div>
            )}
          </div>

          {/* 右侧信息 */}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
              歌单
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {playlist.name}
            </h1>

            {/* 创建者 */}
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              {creator?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatar}
                  alt={creator.username}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-700/10 text-primary-700/60">
                  <User2 className="h-3.5 w-3.5" />
                </span>
              )}
              <span>{creator?.username ?? "未知用户"}</span>
            </div>

            {/* 播放次数 / 歌曲数 */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground/40">
              {playlist.playCount > 0 && (
                <>
                  <span>{formatPlays(playlist.playCount)} 次播放</span>
                  <span>·</span>
                </>
              )}
              <span>{songs.length} 首歌</span>
            </div>

            {playlist.description && (
              <p className="mt-2 max-w-2xl line-clamp-3 text-sm text-foreground/60">
                {playlist.description}
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
          icon={ListMusic}
          title="歌单暂无歌曲"
          description="该歌单还没有添加任何歌曲。"
        />
      )}
    </section>
  );
}
