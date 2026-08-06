"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Shuffle, Music2, ArrowLeft } from "lucide-react";

import type { ArtistDetail, LiveClipTrack, Paginated } from "@/lib/types";
import { toPlayerSong } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { api } from "@/lib/api";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

export function ArtistClipsClient({
  artist,
  initialClips,
}: {
  artist: ArtistDetail;
  initialClips: Paginated<LiveClipTrack>;
}) {
  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const [clips, setClips] = React.useState<LiveClipTrack[]>(initialClips.list);
  const [page, setPage] = React.useState(2);
  const [hasMore, setHasMore] = React.useState(initialClips.hasMore);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get<Paginated<LiveClipTrack>>(
        `/artists/${artist.id}/clips?page=${page}&limit=30`
      );
      setClips((prev) => [...prev, ...res.list]);
      setPage((p) => p + 1);
      setHasMore(res.hasMore);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  };

  const playAll = () => {
    if (clips.length === 0) return;
    play(toPlayerSong(clips[0]), clips.map(toPlayerSong));
  };

  const shufflePlay = () => {
    if (clips.length === 0) return;
    setPlayMode("shuffle");
    const random = clips[Math.floor(Math.random() * clips.length)];
    play(toPlayerSong(random), clips.map(toPlayerSong));
  };

  return (
    <section className="animate-fade-in space-y-6">
      <header className="space-y-3">
        <Link
          href={`/artist/${artist.id}`}
          className="inline-flex items-center gap-1 text-sm text-foreground/50 transition-colors hover:text-primary dark:hover:text-primary/60"
        >
          <ArrowLeft className="h-4 w-4" />
          返回歌手页
        </Link>
        <div className="flex items-center gap-4">
          {artist.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artist.avatar}
              alt={artist.name}
              className="h-16 w-16 rounded-full object-cover md:h-20 md:w-20"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {artist.name}的歌切
            </h1>
            <p className="mt-0.5 text-sm text-foreground/50">
              共 {initialClips.total} 首歌切
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={playAll}
            disabled={clips.length === 0}
            size="sm"
            className="rounded-full bg-primary px-4 text-white shadow-card hover:bg-primary/90 active:bg-primary/95"
          >
            <Play className="h-3.5 w-3.5 translate-x-[1px]" />
            播放全部
          </Button>
          <Button
            onClick={shufflePlay}
            disabled={clips.length === 0}
            size="sm"
            variant="outline"
            className="rounded-full px-4"
          >
            <Shuffle className="h-3.5 w-3.5" />
            随机播放
          </Button>
        </div>
      </header>

      {clips.length > 0 ? (
        <>
          <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
            <SongList songs={clips} showTrackType />
          </div>
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-full px-6"
              >
                {loadingMore ? "加载中..." : "加载更多"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={Music2}
          title="暂无歌切"
          description="该歌手还没有任何已发布的直播歌切。"
        />
      )}
    </section>
  );
}
