import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * 骨架屏集合
 * - 复用 shadcn Skeleton（animate-pulse + bg-primary/10）
 * - 提供 banner / 卡片网格 / 歌曲列表 / 页面级等常用变体
 */

/** Banner 轮播骨架 */
export function BannerSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-44 w-full rounded-2xl md:h-64", className)} />
  );
}

/** 单张卡片骨架（封面 + 两行文字） */
export function CardSkeleton() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <Skeleton className="h-3.5 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  );
}

/** 卡片网格骨架 */
export function CardGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6",
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/** 横向滚动卡片骨架 */
export function CardRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-40 shrink-0 space-y-2.5 md:w-44">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-3.5 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

/** 单行歌曲骨架 */
export function SongRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-1/3 rounded" />
        <Skeleton className="h-3 w-1/4 rounded" />
      </div>
      <Skeleton className="h-3 w-10 rounded" />
    </div>
  );
}

/** 歌曲列表骨架 */
export function SongListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/60">
      {Array.from({ length: count }).map((_, i) => (
        <SongRowSkeleton key={i} />
      ))}
    </div>
  );
}

/** 页面级骨架（标题 + 内容区） */
export function PageSkeleton({
  variant = "grid",
}: {
  variant?: "grid" | "list" | "row";
}) {
  return (
    <section className="animate-fade-in space-y-6">
      <Skeleton className="h-8 w-48 rounded-lg" />
      {variant === "grid" && <CardGridSkeleton />}
      {variant === "list" && <SongListSkeleton />}
      {variant === "row" && (
        <div className="space-y-8">
          <CardRowSkeleton />
          <CardRowSkeleton />
        </div>
      )}
    </section>
  );
}
