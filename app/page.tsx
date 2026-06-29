import { Music2, Sparkles } from "lucide-react";

import { serverFetch } from "@/lib/api";
import type { DiscoverData } from "@/lib/types";
import { SectionTitle } from "@/components/common/section-title";
import { BannerCarousel } from "@/components/common/banner-carousel";
import { SongCard } from "@/components/common/song-card";
import { PlaylistCard } from "@/components/common/playlist-card";
import { PlaylistGrid } from "@/components/common/playlist-grid";
import { EmptyState } from "@/components/common/empty-state";

/**
 * 发现页（Server Component）
 * - SSR 拉取 GET /api/discover，revalidate 60s
 * - 板块：Banner 轮播 / 每日推荐 / 新歌推送 / 精选歌单
 * - 交互部分（轮播、播放）由子 client 组件承担
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

  const {
    banners = [],
    dailyRecommend = [],
    newSongs = [],
    featuredPlaylists = [],
  } = data;

  return (
    <section className="animate-fade-in space-y-10">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">发现</h1>

      {/* Banner 轮播 */}
      {banners.length > 0 && <BannerCarousel banners={banners} />}

      {/* 每日推荐 */}
      {dailyRecommend.length > 0 && (
        <div>
          <SectionTitle title="每日推荐" moreHref="/library" />
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
            {dailyRecommend.map((pl) => (
              <PlaylistCard
                key={pl.id}
                playlist={pl}
                className="w-40 md:w-44"
              />
            ))}
          </div>
        </div>
      )}

      {/* 新歌推送 */}
      {newSongs.length > 0 && (
        <div>
          <SectionTitle title="新歌推送" moreHref="/rankings" />
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">
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
    </section>
  );
}
