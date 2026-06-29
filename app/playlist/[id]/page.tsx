import { ListMusic } from "lucide-react";

import { serverFetch } from "@/lib/api";
import type { PlaylistDetail } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { PlaylistDetailClient } from "@/app/playlist/[id]/playlist-detail-client";

/**
 * 歌单详情页（Server Component）
 * - SSR 拉取 GET /api/playlists/:id（含创建者与歌曲列表）
 * - 容错：详情拉取失败返回友好的"不存在"提示
 */
export const revalidate = 60;

export default async function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const playlist = await serverFetch<PlaylistDetail>(`/playlists/${id}`, 60);

  // 详情缺失：歌单不存在 / 不公开 / 后端未就绪
  if (!playlist) {
    return (
      <section className="animate-fade-in">
        <EmptyState
          icon={ListMusic}
          title="歌单不存在"
          description="该歌单可能已被删除或不可见。"
        />
      </section>
    );
  }

  return <PlaylistDetailClient playlist={playlist} />;
}
