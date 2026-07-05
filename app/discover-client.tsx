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
  } = data;

  return (
    <div className="animate-fade-in space-y-8 md:space-y-10">
      <h1 className="text-xl font-bold tracking-tight md:text-3xl">发现</h1>
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-8 md:space-y-10">
          {/* Banner 轮播 */}
          {banners.length > 0 && <BannerCarousel banners={banners} />}

          {/* 每日推荐：30 首歌曲随机推荐 */}
          {dailyRecommend.length > 0 && (
            <div>
              <SectionTitle title="每日推荐" moreHref="/rankings" />
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar md:gap-4">
                {dailyRecommend.map((song) => (
                  <SongCard
                    key={song.id}
                    song={song}
                    queue={dailyRecommend}
                    className="w-36 md:w-44"
                  />
                ))}
              </div>
            </div>
          )}

          {/* 新歌推送 */}
          {newSongs.length > 0 && (
            <div>
              <SectionTitle title="新歌推送" moreHref="/rankings" />
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar md:gap-4">
                {newSongs.map((song) => (
                  <SongCard key={song.id} song={song} queue={newSongs} />
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
            featuredPlaylists.length === 0 && (
              <EmptyState
                icon={Music2}
                title="还没有推荐内容"
                description="稍后再来看看吧～"
              />
            )}

          {/* 刷新中提示（桌面端无下拉手势时可见） */}
          {refreshing && (
            <p className="text-center text-xs text-foreground/40">刷新中…</p>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
