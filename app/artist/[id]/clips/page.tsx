import { User2 } from "lucide-react";

import { serverFetch } from "@/lib/api";
import type { ArtistDetail, Paginated, LiveClipTrack } from "@/lib/types";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ArtistClipsClient } from "@/app/artist/[id]/clips/artist-clips-client";

export const revalidate = 60;

export default async function ArtistClipsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [artist, clips] = await Promise.all([
    serverFetch<ArtistDetail>(`/artists/${id}`, 60),
    serverFetch<Paginated<LiveClipTrack>>(`/artists/${id}/clips?limit=30`, 60),
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

  if (!clips) {
    return <PageSkeleton variant="row" />;
  }

  return <ArtistClipsClient artist={artist} initialClips={clips} />;
}
