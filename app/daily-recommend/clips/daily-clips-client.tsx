"use client";

import * as React from "react";
import { Music2 } from "lucide-react";

import type { LiveClipTrack } from "@/lib/types";
import { api } from "@/lib/api";
import { readDailySnapshot } from "@/lib/daily-snapshot";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";

/**
 * 每日推荐·歌切 客户端组件
 * - 优先复用 Discover 页写入的 sessionStorage 快照（与首页推荐歌切完全一致）
 * - 无快照时回退请求 /discover/daily-clips 独立接口
 */
export function DailyClipsClient({ initialClips }: { initialClips: LiveClipTrack[] | null }) {
  const [clips, setClips] = React.useState<LiveClipTrack[] | null>(initialClips);
  const [loading, setLoading] = React.useState(!initialClips);

  React.useEffect(() => {
    if (initialClips) return;
    let cancelled = false;
    // 1) 优先从 sessionStorage 读 Discover 写入的同一份快照
    const snap = readDailySnapshot();
    if (snap?.clips && Array.isArray(snap.clips) && snap.clips.length > 0) {
      setClips(snap.clips as LiveClipTrack[]);
      setLoading(false);
      return;
    }
    // 2) 无快照时再回退独立接口
    api.get<LiveClipTrack[]>("/discover/daily-clips?limit=20")
      .then((res) => { if (!cancelled) setClips(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialClips]);

  if (loading && !clips) {
    return <PageSkeleton variant="row" />;
  }

  return (
    <section className="animate-fade-in space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          每日推荐·歌切
        </h1>
        <p className="mt-0.5 text-sm text-foreground/50">
          每日随机推荐 20 首直播歌切
        </p>
      </header>

      {clips && clips.length > 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
          <SongList songs={clips} showTrackType />
        </div>
      ) : (
        <EmptyState
          icon={Music2}
          title="暂无推荐歌切"
          description="后端服务未就绪或暂无已发布歌切。"
        />
      )}
    </section>
  );
}
