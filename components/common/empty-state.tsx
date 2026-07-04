import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 空状态
 * - 插画位用 lucide 图标 + 主色淡底圆形容器
 * - 标题 + 描述 + 可选操作按钮
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary-500/20 bg-card/40 px-4 py-10 text-center md:px-6 md:py-16",
        className
      )}
    >
      {Icon && (
        <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-700/10 text-primary-700 dark:text-primary-300 md:mb-4 md:h-16 md:w-16">
          <Icon className="h-7 w-7 md:h-8 md:w-8" />
        </span>
      )}
      <p className="text-sm font-medium text-foreground/70 md:text-base">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs text-foreground/40 md:text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4 md:mt-5">{action}</div>}
    </div>
  );
}
