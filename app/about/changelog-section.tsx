"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CHANGELOG } from "@/lib/constants/changelog";
import { ChangelogList } from "./changelog-list";

/** 关于页默认展示的版本数：仅显示最新 N 条，剩余点击"查看更多"跳转独立页面 */
const PREVIEW_COUNT = 3;

export function ChangelogSection() {
  const visibleEntries = CHANGELOG.slice(0, PREVIEW_COUNT);
  const hiddenCount = CHANGELOG.length - visibleEntries.length;

  return (
    <div className="space-y-3">
      <ChangelogList entries={visibleEntries} />
      {hiddenCount > 0 && (
        <div className="flex justify-center pt-1">
          <Link
            href="/about/changelog"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium text-foreground/70 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
          >
            查看更多（{hiddenCount}）
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
