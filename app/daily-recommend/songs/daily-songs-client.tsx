"use client";

import * as React from "react";
import { Music2 } from "lucide-react";

import type { ApiSong } from "@/lib/types";
import { api } from "@/lib/api";
import { readDailySnapshot } from "@/lib/daily-snapshot";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";

/**
 * 每日推荐·单曲 客户端组件
 * - 优先复用 Discover 页写入的 sessionStorage 快照（与首页推荐列表完全一致）
 * - 无快照时回退请求 /discover/daily-songs 独立接口（深链直进 / 隐私模式 / 跨日）
 */
export function DailySongsClient({ initialSongs }: { initialSongs: ApiSong[] | null }) {
  const [songs, setSongs] = React.useState<ApiSong[] | null>(initialSongs);
  const [loading, setLoading] = React.useState(!initialSongs);

  React.useEffect(() => {
    if (initialSongs) return;
    let cancelled = false;
    // 1) 优先从 sessionStorage 读 Discover 写入的同一份快照
    const snap = readDailySnapshot();
    if (snap?.songs && Array.isArray(snap.songs) && snap.songs.length > 0) {
      setSongs(snap.songs as ApiSong[]);
      setLoading(false);
      return;
    }
    // 2) 无快照时再回退独立接口（深链直进、隐私模式、跨日首次访问）
    api.get<ApiSong[]>("/discover/daily-songs?limit=20")
      .then((res) => { if (!cancelled) setSongs(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialSongs]);

  if (loading && !songs) {
    return <PageSkeleton variant="row" />;
  }

  return (
    <section className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          每日推荐·单曲
        </h1>
        <p className="mt-0.5 text-sm text-foreground/50">
          每日随机推荐 20 首发行单曲
        </p>
      </header>

      {songs && songs.length > 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
          <SongList songs={songs} showTrackType />
        </div>
      ) : (
        <EmptyState
          icon={Music2}
          title="暂无推荐单曲"
          description="后端服务未就绪或暂无已发布单曲。"
        />
      )}
    </section>
  );
}
