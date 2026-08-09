"use client";

import { useEffect, useState } from "react";

import { getPlatformChangelogs, type PlatformChangelogEntry } from "@/lib/api";

/**
 * 关于页 / 仪表中的"当前平台版本"徽标
 * - 从后端 /platform-changelogs 拉取最新已发布版本
 * - 失败时静默降级隐藏
 */
export function PlatformVersionBadge() {
  const [latest, setLatest] = useState<PlatformChangelogEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPlatformChangelogs(1)
      .then((list) => {
        if (!cancelled && list.length > 0) {
          setLatest(list[0]);
        }
      })
      .catch(() => {
        // 静默
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latest) return null;

  const date = (() => {
    try {
      const d = new Date(latest.releaseDate);
      if (Number.isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 10);
    } catch {
      return "";
    }
  })();

  return (
    <div className="flex items-center gap-2 text-xs text-white/70">
      <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-medium">
        v{latest.version}
      </span>
      {date && <span>{date}</span>}
    </div>
  );
}
