import { serverFetch } from "@/lib/api";
import type { ApiSong } from "@/lib/types";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { DailySongsClient } from "@/app/daily-recommend/songs/daily-songs-client";

/**
 * 每日推荐·单曲列表页（Server Component）
 * - SSR 拉取 GET /api/discover/daily-songs?limit=20，revalidate 60s
 * - 失败时传 null，由客户端 fallback
 */
export const revalidate = 60;

export default async function DailySongsPage() {
  const data = await serverFetch<ApiSong[]>("/discover/daily-songs?limit=20", 60);

  if (!data) {
    return <PageSkeleton variant="row" />;
  }

  return <DailySongsClient initialSongs={data} />;
}
