import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 路由占位页面（骨架阶段统一外观，下批任务再实现具体内容）
 */
export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <section className="animate-fade-in">
      <header className="mb-8 flex items-center gap-4">
        {Icon && (
          <span
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl",
              "bg-primary/10 text-primary dark:text-primary/70"
            )}
          >
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-foreground/50">{description}</p>
          )}
        </div>
      </header>

      <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-dashed border-primary/20 bg-card/40 p-10 text-center">
        <div>
          <p className="text-sm text-foreground/40">
            该页面为占位骨架，将在后续任务中实现。
          </p>
          <p className="mt-1 text-xs text-foreground/30">
            Task 8 · 全局架构已就绪
          </p>
        </div>
      </div>
    </section>
  );
}
