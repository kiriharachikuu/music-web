import { serverFetch } from "@/lib/api";
import type { RankingsData } from "@/lib/types";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { RankingsClient } from "@/app/rankings/rankings-client";

/**
 * 排行榜页（Server Component）
 * - SSR 拉取 GET /api/rankings（含飙升/新歌/热歌/原创四榜）
 * - 交由 RankingsClient 处理 Tab 切换与播放交互
 */
export const revalidate = 60;

export default async function RankingsPage() {
  const data = await serverFetch<RankingsData>("/rankings", 60);

  if (!data) {
    // 后端未就绪：返回骨架占位（保持页面结构）
    return <PageSkeleton variant="list" />;
  }

  // 兜底空对象，避免 client 端访问 undefined
  const safeData: RankingsData = {
    soar: data.soar ?? [],
    new: data.new ?? [],
    hot: data.hot ?? [],
    original: data.original ?? [],
  };

  return <RankingsClient data={safeData} />;
}
