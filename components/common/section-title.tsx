import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 板块标题
 * - 左侧 2px primary-700 竖线装饰
 * - 标题 + 可选"查看更多"链接
 * - 用于发现页 / 音乐库等各板块标题统一样式
 */
export function SectionTitle({
  title,
  moreHref,
  moreText = "查看更多",
  className,
}: {
  title: string;
  moreHref?: string;
  moreText?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between md:mb-4", className)}>
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight md:text-xl">
        {/* 左侧 2px 主色竖线 */}
        <span className="h-5 w-[2px] rounded-full bg-primary-700 dark:bg-primary-500" />
        {title}
      </h2>
      {moreHref && (
        <Link
          href={moreHref}
          className="group flex items-center gap-0.5 text-xs font-medium text-foreground/50 transition-colors hover:text-primary-700 dark:hover:text-primary-300 md:text-sm"
        >
          {moreText}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 md:h-4 md:w-4" />
        </Link>
      )}
    </div>
  );
}
