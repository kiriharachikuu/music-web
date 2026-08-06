import { serverFetch } from "@/lib/api";
import type { LiveClipTrack } from "@/lib/types";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { DailyClipsClient } from "@/app/daily-recommend/clips/daily-clips-client";

/**
 * 每日推荐·歌切列表页（Server Component）
 * - SSR 拉取 GET /api/discover/daily-clips?limit=20，revalidate 60s
 * - 失败时传 null，由客户端 fallback
 */
export const revalidate = 60;

export default async function DailyClipsPage() {
  const data = await serverFetch<LiveClipTrack[]>("/discover/daily-clips?limit=20", 60);

  if (!data) {
    return <PageSkeleton variant="row" />;
  }

  return <DailyClipsClient initialClips={data} />;
}
