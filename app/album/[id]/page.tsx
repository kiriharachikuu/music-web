import { Disc3 } from "lucide-react";

import { serverFetch } from "@/lib/api";
import type { AlbumDetail, Album, SearchResult } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { AlbumDetailClient } from "@/app/album/[id]/album-detail-client";

/**
 * 专辑详情页（Server Component）
 * - SSR 拉取 GET /api/albums/:id（含歌曲列表）
 * - 并行拉取同歌手其他专辑作为"相关推荐"
 *   注：后端 /albums 列表接口暂不支持 keyword 过滤，
 *   故复用搜索接口 /search?q=歌手名 取 albums，再按 artist 精确匹配
 * - 容错：详情拉取失败返回友好的"不存在"提示
 */
export const revalidate = 60;

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const album = await serverFetch<AlbumDetail>(`/albums/${id}`, 60);

  // 详情缺失：专辑不存在或后端未就绪
  if (!album) {
    return (
      <section className="animate-fade-in">
        <EmptyState
          icon={Disc3}
          title="专辑不存在"
          description="该专辑可能已被删除，或链接有误。"
        />
      </section>
    );
  }

  // 同歌手其他专辑（相关推荐）
  let relatedAlbums: Album[] = [];
  if (album.artist) {
    const search = await serverFetch<SearchResult>(
      `/search?q=${encodeURIComponent(album.artist)}&limit=20`,
      60
    );
    if (search?.albums) {
      relatedAlbums = search.albums
        .filter((a) => a.id !== album.id && a.artist === album.artist)
        .slice(0, 6);
    }
  }

  return <AlbumDetailClient album={album} relatedAlbums={relatedAlbums} />;
}
