"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Music2, Sparkles } from "lucide-react";

import { api } from "@/lib/api";
import type { DiscoverData } from "@/lib/types";
import { SectionTitle } from "@/components/common/section-title";
import { BannerCarousel } from "@/components/common/banner-carousel";
import { SongCard } from "@/components/common/song-card";
import { PlaylistGrid } from "@/components/common/playlist-grid";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { ArtistCard } from "@/app/search/search-results";

/**
 * 发现页客户端组件
 * - 接收 SSR 数据（可能为 null），渲染各板块
 * - SSR 数据为空时自动在客户端 fallback 请求
 * - 移动端下拉刷新：调用 router.refresh() 重新拉取服务端数据
 */
export function DiscoverClient({ data: ssrData }: { data: DiscoverData | null }) {
  const router = useRouter();
  const [data, setData] = React.useState<DiscoverData | null>(ssrData);
  const [loading, setLoading] = React.useState(!ssrData);
  const [refreshing, setRefreshing] = React.useState(false);

  // SSR 数据为空时，客户端自动 fallback 请求
  React.useEffect(() => {
    if (ssrData) return;
    let cancelled = false;
    api.get<DiscoverData>("/discover")
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ssrData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    // 同时客户端重新拉取，确保数据更新
    try {
      const fresh = await api.get<DiscoverData>("/discover");
      setData(fresh);
    } catch { /* 忽略 */ }
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  // 加载中：骨架屏
  if (loading && !data) {
    return <PageSkeleton variant="row" />;
  }

  // 客户端也请求失败：空状态
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

  const {
    banners = [],
    dailyRecommend = [],
    newSongs = [],
    featuredPlaylists = [],
    hotArtists = [],
  } = data;

  return (
    <div className="animate-fade-in space-y-8 md:space-y-10">
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-8 md:space-y-10">
          <h1 className="text-xl font-bold tracking-tight md:text-3xl">发现</h1>
          {/* Banner 轮播 */}
          {banners.length > 0 && <BannerCarousel banners={banners} />}

          {/* 新歌推送 */}
          {newSongs.length > 0 && (
            <div>
              <SectionTitle title="新歌推送" moreHref="/rankings" />
              <div className="flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar md:gap-4">
                {newSongs.map((song) => (
                  <SongCard key={song.id} song={song} queue={newSongs} />
                ))}
              </div>
            </div>
          )}

          {/* 热门歌手 */}
          {hotArtists.length > 0 && (
            <div>
              <SectionTitle title="热门歌手" />
              <div className="flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar md:gap-5">
                {hotArtists.map((artist) => (
                  <ArtistCard key={artist.id} artist={artist} />
                ))}
              </div>
            </div>
          )}

          {/* 精选歌单 */}
          {featuredPlaylists.length > 0 && (
            <div>
              <SectionTitle title="精选歌单" moreHref="/library" />
              <PlaylistGrid playlists={featuredPlaylists} />
            </div>
          )}

          {/* 全空兜底 */}
          {banners.length === 0 &&
            dailyRecommend.length === 0 &&
            newSongs.length === 0 &&
            featuredPlaylists.length === 0 &&
            hotArtists.length === 0 && (
              <EmptyState
                icon={Music2}
                title="还没有推荐内容"
                description="稍后再来看看吧～"
              />
            )}

          {/* 刷新中提示：sticky 顶部，避免被底部固定栏遮挡 */}
          {refreshing && (
            <div className="sticky top-2 z-20 mx-auto w-fit rounded-full bg-primary/90 px-4 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
              刷新中…
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
