import { User2 } from "lucide-react";

import { serverFetch } from "@/lib/api";
import type { ArtistDetail, Paginated, ApiSong } from "@/lib/types";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ArtistSongsClient } from "@/app/artist/[id]/songs/artist-songs-client";

export const revalidate = 60;

export default async function ArtistSongsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [artist, songs] = await Promise.all([
    serverFetch<ArtistDetail>(`/artists/${id}`, 60),
    serverFetch<Paginated<ApiSong>>(`/artists/${id}/songs?limit=30`, 60),
  ]);

  if (!artist) {
    return (
      <section className="animate-fade-in">
        <EmptyState
          icon={User2}
          title="歌手不存在"
          description="该歌手可能已被删除，或链接有误。"
        />
      </section>
    );
  }

  if (!songs) {
    return <PageSkeleton variant="row" />;
  }

  return <ArtistSongsClient artist={artist} initialSongs={songs} />;
}
