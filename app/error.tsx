"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * 路由级错误边界
 * - 捕获同段及子段 Server / Client Component 抛出的运行时错误
 * - 提供「重试」按钮调用 reset() 重置错误状态
 * - 不替代 layout，仅替换抛出错误的页面内容
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // 静默上报：可对接监控（Sentry / 自建日志），此处仅占位
    // eslint-disable-next-line no-console
    console.error("[route-error]", error);
  }, [error]);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">出错了</h1>
        <p className="max-w-md text-sm text-foreground/60">
          页面加载时遇到问题，可以尝试重试。若持续出现，请稍后再来。
        </p>
        {error?.digest ? (
          <p className="text-xs text-foreground/30">错误编号：{error.digest}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (typeof window !== "undefined") {
              window.location.href = "/";
            }
          }}
        >
          回首页
        </Button>
        <Button
          onClick={reset}
          className="bg-primary text-white hover:bg-primary/90"
        >
          <RotateCcw className="h-4 w-4" />
          重试
        </Button>
      </div>
    </section>
  );
}
