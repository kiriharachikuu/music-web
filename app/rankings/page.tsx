import { serverFetch } from "@/lib/api";
import type { RankingsData, ApiSong } from "@/lib/types";
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

  // 后端返回 soaring/newSongs，前端类型用 soar/new，做字段映射
  const raw = data as unknown as Record<string, ApiSong[] | undefined>;
  const safeData: RankingsData = {
    soar: raw.soaring ?? data.soar ?? [],
    new: raw.newSongs ?? data.new ?? [],
    hot: data.hot ?? [],
  };

  return <RankingsClient data={safeData} />;
}
