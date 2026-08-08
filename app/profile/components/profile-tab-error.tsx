"use client";

import Link from "next/link";
import { ArrowLeft, AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 个人中心子页面错误边界（移动端独立路由专用）。
 * 桌面端 Tab 切换由 <ErrorBoundary> 在 profile-client.tsx 包裹。
 */
export function ProfileTabError({
  error,
  reset,
  title,
  backHref = "/profile",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  backHref?: string;
}) {
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={backHref}
          className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors hover:bg-foreground/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">{title}</h1>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertOctagon className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-semibold">加载失败</h2>
        <p className="max-w-sm text-sm text-foreground/60">
          {error.message || "未知错误，请稍后重试。"}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-foreground/30">
            digest: {error.digest}
          </p>
        )}
        <Button
          variant="outline"
          onClick={reset}
          className="mt-2 rounded-full px-5"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          重试
        </Button>
      </div>
    </div>
  );
}
