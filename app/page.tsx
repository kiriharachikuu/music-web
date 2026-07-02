import { Sparkles } from "lucide-react";

import { serverFetch } from "@/lib/api";
import type { DiscoverData } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { DiscoverClient } from "@/app/discover-client";

/**
 * 发现页（Server Component）
 * - SSR 拉取 GET /api/discover，revalidate 60s
 * - 交互部分（下拉刷新、轮播、播放）由 DiscoverClient 承担
 */
export const revalidate = 60;

export default async function DiscoverPage() {
  const data = await serverFetch<DiscoverData>("/discover", 60);

  // 后端未就绪 / 无数据：降级为空状态
  if (!data) {
    return (
      <section className="animate-fade-in space-y-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">发现</h1>
        <EmptyState
          icon={Sparkles}
          title="暂无推荐内容"
          description="后端服务未就绪或暂无数据，启动 music-server 后即可看到精选内容。"
        />
      </section>
    );
  }

  return <DiscoverClient data={data} />;
}
