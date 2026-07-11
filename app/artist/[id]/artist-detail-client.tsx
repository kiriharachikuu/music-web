"use client";

import * as React from "react";
import { Play, Shuffle, Heart, User2, Music2, Disc3 } from "lucide-react";

import type { ArtistDetail, ApiSong } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { SongList } from "@/components/common/song-list";
import { AlbumCard } from "@/components/common/album-card";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatTotalDuration } from "@/lib/utils";

export function ArtistDetailClient({ artist }: { artist: ArtistDetail }) {
  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const openLogin = useAuthStore((s) => s.openLogin);
  const [favorited, setFavorited] = React.useState(false);
  const [favLoading, setFavLoading] = React.useState(false);

  React.useEffect(() => {
    if (!getToken()) return;
    api
      .get<{ favorited: boolean }>(`/user/artists/${artist.id}/favorite`)
      .then((res) => setFavorited(res.favorited))
      .catch(() => {});
  }, [artist.id]);

  const toggleFavorite = async () => {
    if (!getToken()) {
      openLogin();
      return;
    }
    setFavLoading(true);
    try {
      const res = await api.post<{ favorited: boolean }>(
        `/user/artists/${artist.id}/favorite`
      );
      setFavorited(res.favorited);
    } catch {
      /* 忽略 */
    } finally {
      setFavLoading(false);
    }
  };

  const songs: ApiSong[] = React.useMemo(
    () => (artist.songs ?? []).filter((s) => s.status === "PUBLISHED"),
    [artist.songs]
  );

  const totalDuration = React.useMemo(
    () => songs.reduce((sum, s) => sum + (s.duration || 0), 0),
    [songs]
  );

  const playAll = () => {
    if (songs.length === 0) return;
    play(toPlayerSong(songs[0]), toPlayerSongs(songs));
  };

  const shufflePlay = () => {
    if (songs.length === 0) return;
    setPlayMode("shuffle");
    const random = songs[Math.floor(Math.random() * songs.length)];
    play(toPlayerSong(random), toPlayerSongs(songs));
  };

  return (
    <section className="animate-fade-in space-y-8">
      <div className="relative overflow-hidden rounded-3xl">
        {artist.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.avatar}
            alt=""
            className="absolute inset-0 -z-10 h-full w-full scale-150 object-cover opacity-50 blur-3xl"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/75 to-background" />

        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8">
          <div className="h-44 w-44 shrink-0 overflow-hidden rounded-full bg-primary-700/5 shadow-card-dark md:h-56 md:w-56">
            {artist.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.avatar}
                alt={artist.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary-700/40">
                <User2 className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
              歌手
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {artist.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground/40">
              <span>{artist.songCount} 首歌曲</span>
              <span>·</span>
              <span>{artist.albumCount} 张专辑</span>
              {totalDuration > 0 && (
                <>
                  <span>·</span>
                  <span>{formatTotalDuration(totalDuration)}</span>
                </>
              )}
            </div>
            {artist.bio && (
              <p className="mt-2 max-w-2xl line-clamp-3 text-sm text-foreground/60">
                {artist.bio}
              </p>
            )}
            {artist.representativeWorks && artist.representativeWorks.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-foreground/40">代表作品：</span>
                <div className="flex flex-wrap gap-1.5">
                  {artist.representativeWorks.map((work) => (
                    <span
                      key={work}
                      className="rounded-full bg-primary-700/10 px-2.5 py-0.5 text-xs text-primary-700 dark:text-primary-300"
                    >
                      {work}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
          onClick={toggleFavorite}
          disabled={favLoading}
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

      {songs.length > 0 ? (
        <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
          <SongList songs={songs} />
        </div>
      ) : (
        <EmptyState
          icon={Music2}
          title="歌手暂无歌曲"
          description="该歌手还没有发布任何歌曲。"
        />
      )}

      {artist.albums.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2.5 text-xl font-bold tracking-tight md:text-2xl">
            <span className="h-5 w-[2px] rounded-full bg-primary-700 dark:bg-primary-500" />
            专辑
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {artist.albums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}