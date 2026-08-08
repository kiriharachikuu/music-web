"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";

import {
  CHANGELOG,
  CHANGE_TYPE_LABEL,
  formatReleaseDate,
  type ChangeItem,
  type VersionEntry,
} from "@/lib/constants/changelog";
import { cn } from "@/lib/utils";

interface ChangelogListProps {
  /** 要展示的版本列表，传空或不传则使用全部 CHANGELOG */
  entries?: VersionEntry[];
  /** 默认展开的版本号列表；仅在 entries 模式下生效，留空则展开第一条 */
  defaultOpenVersions?: string[];
  /** 列表整体是否被某容器截断时，传 true 会让最后一项去掉底部圆角 */
  contained?: boolean;
}

/**
 * 通用更新日志列表
 * - 默认展开传入列表的第一条（通常是最新版本）
 * - 其余条目折叠，点击行头展开/收起
 * - 全部展开状态独立管理，互不影响
 */
export function ChangelogList({
  entries = CHANGELOG,
  defaultOpenVersions,
  contained = false,
}: ChangelogListProps) {
  const [openVersions, setOpenVersions] = useState<Set<string>>(
    () => new Set(defaultOpenVersions ?? [entries[0]?.version].filter(Boolean))
  );

  function toggleVersion(version: string) {
    setOpenVersions((current) => {
      const next = new Set(current);
      if (next.has(version)) {
        next.delete(version);
      } else {
        next.add(version);
      }
      return next;
    });
  }

  return (
    <div className={cn("space-y-3", contained && "last:pb-0")}>
      {entries.map((entry, idx) => {
        const isLatest = idx === 0;
        const isOpen = openVersions.has(entry.version);
        const grouped = {
          feature: entry.changes.filter((c) => c.type === "feature"),
          improvement: entry.changes.filter((c) => c.type === "improvement"),
          fix: entry.changes.filter((c) => c.type === "fix"),
          removed: entry.changes.filter((c) => c.type === "removed"),
        };

        return (
          <article
            key={entry.version}
            className={cn(
              "overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors",
              isLatest ? "border-primary/25 ring-1 ring-primary/10" : "border-border/60"
            )}
          >
            <button
              type="button"
              onClick={() => toggleVersion(entry.version)}
              className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-sm font-bold",
                      isLatest ? "bg-primary text-white" : "bg-muted text-foreground/70"
                    )}
                  >
                    v{entry.version}
                  </span>
                  {isLatest && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      当前版本
                    </span>
                  )}
                  <span className="text-xs text-foreground/45 sm:text-sm">
                    {formatReleaseDate(entry.releaseDate)}
                  </span>
                </div>
                {entry.title && (
                  <h3 className="truncate text-sm font-semibold sm:text-base">{entry.title}</h3>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-foreground/45 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {isOpen && (
              <div className="border-t border-border/50 px-4 py-3 sm:px-5 sm:py-4">
                <div className="grid gap-3 md:grid-cols-2">
                  {grouped.feature.length > 0 && (
                    <ChangeGroup label="新增功能" items={grouped.feature} type="feature" />
                  )}
                  {grouped.improvement.length > 0 && (
                    <ChangeGroup label="体验优化" items={grouped.improvement} type="improvement" />
                  )}
                  {grouped.fix.length > 0 && (
                    <ChangeGroup label="问题修复" items={grouped.fix} type="fix" />
                  )}
                  {grouped.removed.length > 0 && (
                    <ChangeGroup label="移除内容" items={grouped.removed} type="removed" />
                  )}
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ChangeGroup({
  label,
  items,
  type,
}: {
  label: string;
  items: ChangeItem[];
  type: ChangeItem["type"];
}) {
  const labelConfig = CHANGE_TYPE_LABEL[type];

  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", labelConfig.color)}>
          {labelConfig.text}
        </span>
        <span className="text-xs font-medium text-foreground/60">{label}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm leading-relaxed text-foreground/70"
          >
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
            <span>{item.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
