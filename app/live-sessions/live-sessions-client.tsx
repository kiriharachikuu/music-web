"use client";

import * as React from "react";
import { Radio, Loader2 } from "lucide-react";

import type { LiveSession, Paginated } from "@/lib/types";
import { api } from "@/lib/api";
import { LiveSessionCard } from "@/components/common/live-session-card";
import { EmptyState } from "@/components/common/empty-state";

export function LiveSessionsClient({
  initialSessions,
}: {
  initialSessions: Paginated<LiveSession> | null;
}) {
  const [items, setItems] = React.useState<LiveSession[]>(
    initialSessions?.list ?? []
  );
  const [page, setPage] = React.useState(2);
  const [hasMore, setHasMore] = React.useState(
    (initialSessions?.list?.length ?? 0) < (initialSessions?.total ?? 0)
  );
  const [loading, setLoading] = React.useState(false);

  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const loadMore = React.useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const res = await api.get<Paginated<LiveSession>>(
        `/live-sessions?page=${page}&limit=12`
      );
      const list = res.list ?? [];
      setItems((prev) => [...prev, ...list]);
      setPage((p) => p + 1);
      setHasMore(res.hasMore ?? list.length >= 12);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page, hasMore, loading]);

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

  return (
    <section className="animate-fade-in space-y-6">
      <header className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:text-primary/60">
          <Radio className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            歌切场次
          </h1>
          <p className="mt-0.5 text-sm text-foreground/50">
            浏览所有歌切专辑
          </p>
        </div>
      </header>

      {items.length === 0 && !loading ? (
        <EmptyState
          icon={Radio}
          title="暂无歌切场次"
          description="后端服务未就绪或暂无歌切数据。"
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
          {items.map((session) => (
            <LiveSessionCard key={session.id} session={session} />
          ))}
        </div>
      )}

      <div ref={sentinelRef} className="h-1" />
      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-foreground/40">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      )}
      {!hasMore && items.length > 0 && (
        <p className="py-4 text-center text-xs text-foreground/30">
          已经到底啦
        </p>
      )}
    </section>
  );
}
