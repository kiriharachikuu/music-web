import { serverFetch } from "@/lib/api";
import type { Album, Playlist, Paginated } from "@/lib/types";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { LibraryClient } from "@/app/library/library-client";

/**
 * 音乐库页（Server Component）
 * - SSR 并行拉取专辑 / 歌单第一页（最新排序）
 * - 交由 LibraryClient 处理 Tab、排序与无限滚动
 */
export const revalidate = 60;

export default async function LibraryPage() {
  const [albums, playlists] = await Promise.all([
    serverFetch<Paginated<Album>>("/albums?page=1&limit=12&sort=latest", 60),
    serverFetch<Paginated<Playlist>>(
      "/playlists?page=1&limit=12&sort=latest",
      60
    ),
  ]);

  // 后端全未就绪：返回骨架占位
  if (!albums && !playlists) {
    return <PageSkeleton variant="grid" />;
  }

  return (
    <LibraryClient initialAlbums={albums} initialPlaylists={playlists} />
  );
}
