import { Radio } from "lucide-react";

import { serverFetch } from "@/lib/api";
import type { LiveSession, LiveClipTrack } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { LiveSessionDetailClient } from "@/app/live-session/[id]/live-session-detail-client";

export const revalidate = 60;

export default async function LiveSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await serverFetch<LiveSession & { clips: LiveClipTrack[] }>(
    `/live-sessions/${id}`,
    60
  );

  if (!session) {
    return (
      <section className="animate-fade-in">
        <EmptyState
          icon={Radio}
          title="歌切专辑不存在"
          description="该歌切专辑可能已被删除，或链接有误。"
        />
      </section>
    );
  }

  return <LiveSessionDetailClient session={session} />;
}
