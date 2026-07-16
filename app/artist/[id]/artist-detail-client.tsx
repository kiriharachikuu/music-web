"use client";

import * as React from "react";
import { Play, Shuffle, Heart, User2, Music2, Disc3 } from "lucide-react";

import type { ArtistDetail, ApiSong } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
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
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const loadLikedFromServer = useFavoritesStore((s) => s.loadFromServer);
  const [favorited, setFavorited] = React.useState(false);
  const [favLoading, setFavLoading] = React.useState(false);

  // 加载喜欢的歌曲列表（仅加载一次）
  React.useEffect(() => {
    if (!getToken()) return;
    const loaded = useFavoritesStore.getState().loaded;
    if (!loaded) {
      void loadLikedFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 喜欢/取消喜欢（未登录时触发登录弹窗）
  const handleLike = (song: ApiSong) => {
    if (!getToken()) {
      openLogin();
      return;
    }
    void toggleLike(song.id);
  };

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
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/85 to-background" />

        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
          <div className="h-44 w-44 shrink-0 overflow-hidden rounded-full bg-primary/5 shadow-card-dark md:h-56 md:w-56">
            {artist.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={artist.avatar}
                alt={artist.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary/40">
                <User2 className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/70">
              歌手
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {artist.name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-foreground/70">
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
              <p className="mt-2 max-w-2xl line-clamp-3 text-sm text-foreground/80">
                {artist.bio}
              </p>
            )}
            {artist.representativeWorks && (
              <div className="mt-2">
                <span className="text-sm text-foreground/70">代表作品：</span>
                <span className="text-sm text-foreground/80">
                  {artist.representativeWorks}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={playAll}
          disabled={songs.length === 0}
          className="rounded-full bg-primary px-5 text-white shadow-card hover:bg-primary/90 active:bg-primary/95"
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
              favorited && "fill-current text-primary dark:text-primary/60"
            )}
          />
          {favorited ? "已收藏" : "收藏"}
        </Button>
        <span className="ml-auto text-xs text-foreground/40">
          共 {songs.length} 首
        </span>
      </div>

      {songs.length > 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
          <SongList
            songs={songs}
            likedIds={likedIds}
            onLike={handleLike}
          />
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
            <span className="h-5 w-[2px] rounded-full bg-primary dark:bg-primary/80" />
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