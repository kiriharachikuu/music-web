import Link from "next/link";
import Image from "next/image";
import { Radio } from "lucide-react";

import type { LiveSession } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export function LiveSessionCard({
  session,
  className,
}: {
  session: LiveSession;
  className?: string;
}) {
  return (
    <Link
      href={`/live-session/${session.id}`}
      className={cn(
        "group block space-y-2.5 transition-transform duration-300 hover:-translate-y-1",
        className
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-primary/5 shadow-card">
        {session.cover ? (
          <Image
            src={session.cover}
            alt={session.title}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/30">
            <Radio className="h-10 w-10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{session.title}</p>
        <p className="mt-0.5 truncate text-xs text-foreground/50">
          {session.artist}
        </p>
        <p className="mt-0.5 truncate text-xs text-foreground/40">
          {session.sessionNumber != null && `#${session.sessionNumber} · `}
          {formatDate(session.liveTime)}
          {session.songCount > 0 && ` · ${session.songCount} 首歌`}
        </p>
      </div>
    </Link>
  );
}
