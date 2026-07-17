"use client";

import * as React from "react";
import { Library, Loader2 } from "lucide-react";

import type { Album, Playlist, Paginated, LiveSession } from "@/lib/types";
import { api } from "@/lib/api";
import { AlbumCard } from "@/components/common/album-card";
import { PlaylistCard } from "@/components/common/playlist-card";
import { LiveSessionCard } from "@/components/common/live-session-card";
import { EmptyState } from "@/components/common/empty-state";
import { cn } from "@/lib/utils";

type Tab = "albums" | "playlists" | "live_sessions";
type Sort = "latest" | "hottest" | "name";

/** 排序选项 */
const SORTS: { key: Sort; label: string }[] = [
  { key: "latest", label: "最新" },
  { key: "hottest", label: "最热" },
  { key: "name", label: "名称" },
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
  const [page, setPage] = React.useState(2);
  const [hasMore, setHasMore] = React.useState(
    (initialAlbums?.list?.length ?? 0) < (initialAlbums?.total ?? 0)
  );
  const [loading, setLoading] = React.useState(false);

  const firstRun = React.useRef(true);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const fetchPath = tab === "albums" ? "/albums" : "/playlists";
  const isLiveSessionsTab = tab === "live_sessions";

  /** 从第一页重新加载（tab / sort 变化时） */
  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      if (isLiveSessionsTab) {
        const res = await api.get<Paginated<LiveSession>>(
          "/live-sessions?page=1&limit=12"
        );
        setLiveSessions(res.list ?? []);
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
      if (isLiveSessionsTab) {
        setLiveSessions([]);
      } else {
        setItems([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [fetchPath, sort, isLiveSessionsTab]);

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
      if (isLiveSessionsTab) {
        const res = await api.get<Paginated<LiveSession>>(
          `/live-sessions?page=${page}&limit=12`
        );
        const list = res.list ?? [];
        setLiveSessions((prev) => [...prev, ...list]);
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
  }, [fetchPath, sort, page, hasMore, loading, isLiveSessionsTab]);

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

  const currentItems = isLiveSessionsTab ? liveSessions : items;

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
            浏览专辑、歌单与歌切
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
              { key: "live_sessions", label: "歌切" },
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

        {/* 排序选项（歌切 Tab 不显示） */}
        {!isLiveSessionsTab && (
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
        )}
      </div>

      {/* 内容网格 */}
      {currentItems.length === 0 && !loading ? (
        <EmptyState
          icon={Library}
          title={isLiveSessionsTab ? "暂无歌切" : "暂无内容"}
          description={
            isLiveSessionsTab
              ? "还没有已发布的直播歌切专辑。"
              : "后端服务未就绪或暂无数据。"
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {isLiveSessionsTab
            ? liveSessions.map((session) => (
                <LiveSessionCard key={session.id} session={session} />
              ))
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
