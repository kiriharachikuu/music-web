import { PageSkeleton } from "@/components/common/loading-skeleton";

/**
 * 根级 loading UI
 * - 在 Server Component 数据就绪前展示，避免首屏空白
 * - 默认 grid 变体，适用于首页 / 排行榜等卡片网格页面
 * - 子段可定义自己的 loading.tsx 覆盖此默认
 */
export default function Loading() {
  return <PageSkeleton variant="row" />;
}
