"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Music2 } from "lucide-react";

import type { DiscoverData } from "@/lib/types";
import { SectionTitle } from "@/components/common/section-title";
import { BannerCarousel } from "@/components/common/banner-carousel";
import { SongCard } from "@/components/common/song-card";
import { PlaylistGrid } from "@/components/common/playlist-grid";
import { EmptyState } from "@/components/common/empty-state";
import { PullToRefresh } from "@/components/common/pull-to-refresh";
import { ArtistCard } from "@/app/search/search-results";

/**
 * 发现页客户端组件
 * - 接收 SSR 数据，渲染各板块
 * - 移动端下拉刷新：调用 router.refresh() 重新拉取服务端数据
 */
export function DiscoverClient({ data }: { data: DiscoverData }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    router.refresh();
    // 等待路由刷新完成（router.refresh 是异步的，给一个最小展示时长）
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

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
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
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
            <div className="sticky top-2 z-20 mx-auto w-fit rounded-full bg-primary-700/90 px-4 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
              刷新中…
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
