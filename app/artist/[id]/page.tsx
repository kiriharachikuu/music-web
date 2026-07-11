import { User2 } from "lucide-react";

import { serverFetch } from "@/lib/api";
import type { ArtistDetail } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { ArtistDetailClient } from "@/app/artist/[id]/artist-detail-client";

export const revalidate = 60;

export default async function ArtistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const artist = await serverFetch<ArtistDetail>(`/artists/${id}`, 60);

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

  return <ArtistDetailClient artist={artist} />;
}