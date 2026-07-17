"use client";

import * as React from "react";
import { Play, Shuffle, Heart, Radio, Music2 } from "lucide-react";

import type { LiveSession, LiveClipTrack } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { getToken } from "@/lib/auth";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime, formatTotalDuration } from "@/lib/utils";

export function LiveSessionDetailClient({
  session,
}: {
  session: LiveSession & { clips: LiveClipTrack[] };
}) {
  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const openLogin = useAuthStore((s) => s.openLogin);
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const isSessionLiked = useFavoritesStore((s) => s.isSessionLiked);
  const toggleFavoriteSession = useFavoritesStore((s) => s.toggleFavoriteSession);
  const loadFavoriteSessionsFromServer = useFavoritesStore(
    (s) => s.loadFavoriteSessionsFromServer
  );
  const [favLoading, setFavLoading] = React.useState(false);

  React.useEffect(() => {
    if (!getToken()) return;
    const loading = useFavoritesStore.getState().loadingSessions;
    const sessionIds = useFavoritesStore.getState().likedSessionIds;
    if (!loading && sessionIds.size === 0) {
      void loadFavoriteSessionsFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clips: LiveClipTrack[] = React.useMemo(
    () => session.clips ?? [],
    [session.clips]
  );

  const totalDuration = React.useMemo(
    () => clips.reduce((sum, c) => sum + (c.duration || 0), 0),
    [clips]
  );

  const favorited = isSessionLiked(session.id);

  const handleToggleFavorite = async () => {
    if (!getToken()) {
      openLogin();
      return;
    }
    setFavLoading(true);
    try {
      await toggleFavoriteSession(session.id);
    } catch {
      /* 忽略 */
    } finally {
      setFavLoading(false);
    }
  };

  const playAll = () => {
    if (clips.length === 0) return;
    play(toPlayerSong(clips[0]), toPlayerSongs(clips));
  };

  const shufflePlay = () => {
    if (clips.length === 0) return;
    setPlayMode("shuffle");
    const random = clips[Math.floor(Math.random() * clips.length)];
    play(toPlayerSong(random), toPlayerSongs(clips));
  };

  return (
    <section className="animate-fade-in space-y-8">
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 -z-10" aria-hidden>
          {session.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.cover}
              alt=""
              className="h-full w-full scale-150 object-cover opacity-50 blur-3xl"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/75 to-background" />
        </div>

        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8">
          <div className="h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-primary/5 shadow-card-dark md:h-56 md:w-56">
            {session.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.cover}
                alt={session.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary/40">
                <Radio className="h-16 w-16" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
              歌切专辑
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {session.title}
            </h1>
            <p className="text-sm text-foreground/60">{session.artist}</p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground/40">
              {session.liveTime && (
                <span>{formatDateTime(session.liveTime)}</span>
              )}
              <span>·</span>
              <span>{clips.length} 首歌</span>
              {totalDuration > 0 && (
                <>
                  <span>·</span>
                  <span>{formatTotalDuration(totalDuration)}</span>
                </>
              )}
            </div>
            {session.description && (
              <p className="mt-2 max-w-2xl line-clamp-3 text-sm text-foreground/60">
                {session.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={playAll}
          disabled={clips.length === 0}
          className="rounded-full bg-primary px-5 text-white shadow-card hover:bg-primary/90 active:bg-primary/95"
        >
          <Play className="h-4 w-4 translate-x-[1px]" />
          播放整场
        </Button>
        <Button
          onClick={shufflePlay}
          disabled={clips.length === 0}
          variant="outline"
          className="rounded-full px-5"
        >
          <Shuffle className="h-4 w-4" />
          随机播放
        </Button>
        <Button
          onClick={handleToggleFavorite}
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
          共 {clips.length} 首
        </span>
      </div>

      {clips.length > 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
          <SongList
            songs={clips}
            showTrackType={true}
            likedIds={likedIds}
          />
        </div>
      ) : (
        <EmptyState
          icon={Music2}
          title="本场暂无歌切"
          description="该歌切专辑还没有任何曲目。"
        />
      )}
    </section>
  );
}
