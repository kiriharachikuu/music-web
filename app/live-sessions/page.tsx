import { serverFetch } from "@/lib/api";
import type { LiveSession, Paginated } from "@/lib/types";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { LiveSessionsClient } from "@/app/live-sessions/live-sessions-client";

export const revalidate = 60;

export default async function LiveSessionsPage() {
  const sessions = await serverFetch<Paginated<LiveSession>>(
    "/live-sessions?page=1&limit=12",
    60
  );

  if (!sessions) {
    return <PageSkeleton variant="grid" />;
  }

  return <LiveSessionsClient initialSessions={sessions} />;
}
