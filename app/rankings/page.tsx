import { serverFetch } from "@/lib/api";
import type { RankingsResponse } from "@/lib/types";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { RankingsClient } from "@/app/rankings/rankings-client";

/**
 * 排行榜页（Server Component）
 * - SSR 默认拉取 GET /api/rankings?type=combined&ranking=soar（综合-飙升榜）
 * - 交由 RankingsClient 处理 9 组合 Tab 切换与播放交互
 */
export const revalidate = 60;

export default async function RankingsPage() {
  // SSR 仅做默认榜单的首屏骨架占位；客户端切 Tab 时走 getRankings(type, ranking)
  const data = await serverFetch<RankingsResponse>(
    "/rankings?type=combined&ranking=soar",
    60,
  );

  if (!data) {
    return <PageSkeleton variant="list" />;
  }

  return <RankingsClient initialData={data} />;
}
