"use client";

import * as React from "react";
import Link from "next/link";
import { Play, Shuffle, Music2, ArrowLeft } from "lucide-react";

import type { ArtistDetail, ApiSong, Paginated } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { api } from "@/lib/api";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";

type Sort = "latest" | "hottest" | "name";

const SORTS: { key: Sort; label: string }[] = [
  { key: "latest", label: "最新" },
  { key: "hottest", label: "最热" },
  { key: "name", label: "名称" },
];

export function ArtistSongsClient({
  artist,
  initialSongs,
}: {
  artist: ArtistDetail;
  initialSongs: Paginated<ApiSong>;
}) {
  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const [songs, setSongs] = React.useState<ApiSong[]>(initialSongs.list);
  const [page, setPage] = React.useState(2);
  const [hasMore, setHasMore] = React.useState(initialSongs.hasMore);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [sort, setSort] = React.useState<Sort>("latest");
  const [reloading, setReloading] = React.useState(false);

  const reload = React.useCallback(
    async (nextSort: Sort) => {
      setReloading(true);
      try {
        const res = await api.get<Paginated<ApiSong>>(
          `/artists/${artist.id}/songs?page=1&limit=30&sort=${nextSort}`
        );
        setSongs(res.list);
        setPage(2);
        setHasMore(res.hasMore);
      } catch {
        /* ignore */
      } finally {
        setReloading(false);
      }
    },
    [artist.id]
  );

  const handleSortChange = (nextSort: Sort) => {
    if (nextSort === sort) return;
    setSort(nextSort);
    void reload(nextSort);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get<Paginated<ApiSong>>(
        `/artists/${artist.id}/songs?page=${page}&limit=30&sort=${sort}`
      );
      setSongs((prev) => [...prev, ...res.list]);
      setPage((p) => p + 1);
      setHasMore(res.hasMore);
    } catch {
      /* ignore */
    } finally {
      setLoadingMore(false);
    }
  };

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
              {artist.name}的单曲
            </h1>
            <p className="mt-0.5 text-sm text-foreground/50">
              共 {initialSongs.total} 首歌曲
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={playAll}
            disabled={songs.length === 0}
            size="sm"
            className="rounded-full bg-primary px-4 text-white shadow-card hover:bg-primary/90 active:bg-primary/95"
          >
            <Play className="h-3.5 w-3.5 translate-x-[1px]" />
            播放全部
          </Button>
          <Button
            onClick={shufflePlay}
            disabled={songs.length === 0}
            size="sm"
            variant="outline"
            className="rounded-full px-4"
          >
            <Shuffle className="h-3.5 w-3.5" />
            随机播放
          </Button>
          <div className="ml-auto flex items-center gap-1.5">
            {SORTS.map((s) => {
              const isActive = sort === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => handleSortChange(s.key)}
                  disabled={reloading}
                  className={
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 " +
                    (isActive
                      ? "bg-primary text-white"
                      : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground")
                  }
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {songs.length > 0 ? (
        <>
          <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
            <SongList songs={songs} />
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
          title="暂无单曲"
          description="该歌手还没有发布任何歌曲。"
        />
      )}
    </section>
  );
}
