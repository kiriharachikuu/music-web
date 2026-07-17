import { serverFetch } from "@/lib/api";
import type { DiscoverData } from "@/lib/types";
import { DiscoverClient } from "@/app/discover-client";

/**
 * 发现页（Server Component）
 * - SSR 拉取 GET /api/discover，revalidate 60s
 * - SSR 失败时传 null，由 DiscoverClient 在客户端自动 fallback 请求
 * - 交互部分（下拉刷新、轮播、播放）由 DiscoverClient 承担
 */
export const revalidate = 60;

export default async function DiscoverPage() {
  const data = await serverFetch<DiscoverData>("/discover", 60);
  return <DiscoverClient data={data} />;
}
