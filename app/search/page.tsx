import { serverFetch } from "@/lib/api";
import { SearchClient } from "@/app/search/search-client";

/**
 * 搜索页（Server Component）
 * - SSR 拉取热门关键词 GET /api/search/hot（失败时 client 使用默认热门词）
 * - 交互（防抖 / 历史 / 筛选）由 SearchClient 承担
 */
export const revalidate = 300;

export default async function SearchPage() {
  const hot = await serverFetch<string[]>("/search/hot", 300);
  return <SearchClient hotKeywords={hot ?? []} />;
}
