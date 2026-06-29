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
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-primary-500/20 bg-card/40 px-6 py-16 text-center",
        className
      )}
    >
      {Icon && (
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-700/10 text-primary-700 dark:text-primary-300">
          <Icon className="h-8 w-8" />
        </span>
      )}
      <p className="text-base font-medium text-foreground/70">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-foreground/40">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
