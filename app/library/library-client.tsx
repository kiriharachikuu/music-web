"use client";

import * as React from "react";
import { Library, Loader2, Music2, Users } from "lucide-react";

import type { Album, Playlist, Paginated, LiveSession, ArtistBrief, ApiSong, LiveClipTrack } from "@/lib/types";
import { api } from "@/lib/api";
import { AlbumCard } from "@/components/common/album-card";
import { PlaylistCard } from "@/components/common/playlist-card";
import { LiveSessionCard } from "@/components/common/live-session-card";
import { SongList } from "@/components/common/song-list";
import { ArtistCard } from "@/app/search/search-results";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

type Tab = "albums" | "playlists" | "artists" | "songs" | "live_sessions" | "live_clips";
type Sort = "latest" | "oldest";

/** 排序选项（按时间正序/倒序） */
const SORTS: { key: Sort; label: string }[] = [
  { key: "latest", label: "最新" },
  { key: "oldest", label: "最早" },
];

/**
 * 音乐库客户端组件
 * - Tab 切换：专辑 / 歌单 / 歌切
 * - 排序：最新 / 最热 / 名称
 * - 无限滚动加载更多（IntersectionObserver 监听底部哨兵）
 * - 移动端 2 列，平板 3-4 列，PC 6 列
 */
export function LibraryClient({
  initialAlbums,
  initialPlaylists,
}: {
  initialAlbums: Paginated<Album> | null;
  initialPlaylists: Paginated<Playlist> | null;
}) {
  const [tab, setTab] = React.useState<Tab>("albums");
  const [sort, setSort] = React.useState<Sort>("latest");

  const [items, setItems] = React.useState<(Album | Playlist)[]>(
    initialAlbums?.list ?? []
  );
  const [liveSessions, setLiveSessions] = React.useState<LiveSession[]>([]);
  const [artists, setArtists] = React.useState<ArtistBrief[]>([]);
  const [songs, setSongs] = React.useState<ApiSong[]>([]);
  const [liveClips, setLiveClips] = React.useState<LiveClipTrack[]>([]);
  const [page, setPage] = React.useState(2);
  const [hasMore, setHasMore] = React.useState(
    (initialAlbums?.list?.length ?? 0) < (initialAlbums?.total ?? 0)
  );
  const [loading, setLoading] = React.useState(false);

  const firstRun = React.useRef(true);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const fetchPath = tab === "albums" ? "/albums" : "/playlists";
  const isLiveSessionsTab = tab === "live_sessions";
  const isArtistsTab = tab === "artists";
  const isLiveClipsTab = tab === "live_clips";
  const isSongsTab = tab === "songs";

  /** 从第一页重新加载（tab / sort 变化时） */
  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      if (isArtistsTab) {
        const res = await api.get<Paginated<ArtistBrief>>(
          `/artists?page=1&limit=12&sort=${sort}`
        );
        setArtists(res.list ?? []);
        setPage(2);
        setHasMore(
          res.hasMore ?? (res.list?.length ?? 0) < (res.total ?? 0)
        );
      } else if (isLiveSessionsTab) {
        const res = await api.get<Paginated<LiveSession>>(
          `/live-sessions?page=1&limit=12&sort=${sort}`
        );
        setLiveSessions(res.list ?? []);
        setPage(2);
        setHasMore(
          res.hasMore ?? (res.list?.length ?? 0) < (res.total ?? 0)
        );
      } else if (isSongsTab) {
        const res = await api.get<Paginated<ApiSong>>(
          `/songs?page=1&limit=12&sort=${sort}`
        );
        setSongs(res.list ?? []);
        setPage(2);
        setHasMore(
          res.hasMore ?? (res.list?.length ?? 0) < (res.total ?? 0)
        );
      } else if (isLiveClipsTab) {
        const res = await api.get<Paginated<LiveClipTrack>>(
          `/live-sessions/clips?page=1&limit=12&sort=${sort}`
        );
        setLiveClips(res.list ?? []);
        setPage(2);
        setHasMore(
          res.hasMore ?? (res.list?.length ?? 0) < (res.total ?? 0)
        );
      } else {
        const res = await api.get<Paginated<Album | Playlist>>(
          `${fetchPath}?page=1&limit=12&sort=${sort}`
        );
        setItems(res.list ?? []);
        setPage(2);
        setHasMore(
          res.hasMore ?? (res.list?.length ?? 0) < (res.total ?? 0)
        );
      }
    } catch {
      if (isArtistsTab) {
        setArtists([]);
      } else if (isLiveSessionsTab) {
        setLiveSessions([]);
      } else if (isSongsTab) {
        setSongs([]);
      } else if (isLiveClipsTab) {
        setLiveClips([]);
      } else {
        setItems([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPath, sort, isLiveSessionsTab, isArtistsTab, isSongsTab, isLiveClipsTab]);

  // tab / sort 变化触发重新加载（跳过首帧，首帧用 SSR 数据）
  React.useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    void reload();
  }, [tab, sort, reload]);

  /** 加载下一页 */
  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      if (isArtistsTab) {
        const res = await api.get<Paginated<ArtistBrief>>(
          `/artists?page=${page}&limit=12&sort=${sort}`
        );
        const list = res.list ?? [];
        setArtists((prev) => [...prev, ...list]);
        setPage((p) => p + 1);
        setHasMore(res.hasMore ?? list.length >= 12);
      } else if (isLiveSessionsTab) {
        const res = await api.get<Paginated<LiveSession>>(
          `/live-sessions?page=${page}&limit=12&sort=${sort}`
        );
        const list = res.list ?? [];
        setLiveSessions((prev) => [...prev, ...list]);
        setPage((p) => p + 1);
        setHasMore(res.hasMore ?? list.length >= 12);
      } else if (isSongsTab) {
        const res = await api.get<Paginated<ApiSong>>(
          `/songs?page=${page}&limit=12&sort=${sort}`
        );
        const list = res.list ?? [];
        setSongs((prev) => [...prev, ...list]);
        setPage((p) => p + 1);
        setHasMore(res.hasMore ?? list.length >= 12);
      } else if (isLiveClipsTab) {
        const res = await api.get<Paginated<LiveClipTrack>>(
          `/live-sessions/clips?page=${page}&limit=12&sort=${sort}`
        );
        const list = res.list ?? [];
        setLiveClips((prev) => [...prev, ...list]);
        setPage((p) => p + 1);
        setHasMore(res.hasMore ?? list.length >= 12);
      } else {
        const res = await api.get<Paginated<Album | Playlist>>(
          `${fetchPath}?page=${page}&limit=12&sort=${sort}`
        );
        const list = res.list ?? [];
        setItems((prev) => [...prev, ...list]);
        setPage((p) => p + 1);
        setHasMore(res.hasMore ?? list.length >= 12);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPath, sort, page, hasMore, loading, isLiveSessionsTab, isArtistsTab, isSongsTab, isLiveClipsTab]);

  // 无限滚动：IntersectionObserver
  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) void loadMore();
      },
      { rootMargin: "300px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, [loadMore]);

  const currentItems = isArtistsTab
    ? artists
    : isLiveSessionsTab
      ? liveSessions
      : isSongsTab
        ? songs
        : isLiveClipsTab
          ? liveClips
          : items;

  return (
    <section className="animate-fade-in space-y-6">
      {/* 页面标题 */}
      <header className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:text-primary/60">
          <Library className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            音乐库
          </h1>
          <p className="mt-0.5 text-sm text-foreground/50">
            浏览专辑、歌单、歌手与歌切
          </p>
        </div>
      </header>

      {/* 顶部：Tab + 排序 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Tab：专辑 / 歌单 / 歌切（下划线式） */}
        <div className="flex items-center gap-6 border-b border-border sm:border-0">
          {(
            [
              { key: "albums", label: "专辑" },
              { key: "playlists", label: "歌单" },
              { key: "artists", label: "歌手" },
              { key: "songs", label: "单曲" },
              { key: "live_sessions", label: "直播" },
              { key: "live_clips", label: "歌切" },
            ] as { key: Tab; label: string }[]
          ).map((t) => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative shrink-0 pb-2.5 text-sm font-medium transition-colors sm:pb-0 sm:pt-1.5",
                  isActive
                    ? "text-primary dark:text-primary/60"
                    : "text-foreground/50 hover:text-foreground"
                )}
              >
                {t.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary sm:hidden" />
                )}
              </button>
            );
          })}
        </div>

        {/* 排序选项（所有 Tab 均按时间排序） */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground/40">排序</span>
          <div className="flex items-center gap-1.5">
            {SORTS.map((s) => {
              const isActive = sort === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 内容网格 */}
      {currentItems.length === 0 && !loading ? (
        <EmptyState
          icon={
            isArtistsTab
              ? Users
              : isSongsTab || isLiveClipsTab
                ? Music2
                : Library
          }
          title={
            isArtistsTab
              ? "暂无歌手"
              : isLiveSessionsTab
                ? "暂无直播"
                : isSongsTab
                  ? "暂无单曲"
                  : isLiveClipsTab
                    ? "暂无歌切"
                    : "暂无内容"
          }
          description={
            isArtistsTab
              ? "还没有已收录的歌手。"
              : isLiveSessionsTab
                ? "还没有已发布的直播场次。"
                : isSongsTab
                  ? "还没有已发布的单曲。"
                  : isLiveClipsTab
                    ? "还没有已发布的歌切。"
                    : "后端服务未就绪或暂无数据。"
          }
        />
      ) : (
        <div
          className={cn(
            isSongsTab || isLiveClipsTab
              ? ""
              : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4"
          )}
        >
          {isArtistsTab
            ? artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))
            : isLiveSessionsTab
              ? liveSessions.map((session) => (
                  <LiveSessionCard key={session.id} session={session} />
                ))
              : isSongsTab
                ? <SongList songs={songs} showTrackType />
                : isLiveClipsTab
                  ? <SongList songs={liveClips} showTrackType />
                  : items.map((item) =>
                      tab === "albums" ? (
                        <AlbumCard key={item.id} album={item as Album} />
                      ) : (
                        <PlaylistCard key={item.id} playlist={item as Playlist} />
                      )
                    )}
        </div>
      )}

      {/* 底部哨兵 + 加载指示 */}
      <div ref={sentinelRef} className="h-1" />
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-foreground/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      )}
      {!hasMore && currentItems.length > 0 && (
        <p className="py-4 text-center text-xs text-foreground/30">
          已经到底啦
        </p>
      )}
    </section>
  );
}
