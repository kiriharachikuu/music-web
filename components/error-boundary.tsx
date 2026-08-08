"use client";

import * as React from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** 错误时显示的标题 */
  title?: string;
  /** 自定义 fallback；不传则使用内置 UI */
  fallback?: (
    error: Error,
    reset: () => void
  ) => React.ReactNode;
  /** 仅在桌面端或移动端显示。默认 'both' */
  scope?: "mobile" | "desktop" | "both";
  /** 给区域加一层样式（min-h-180 之类）防止布局塌陷 */
  className?: string;
  /** 上报回调：父级可以接住错误并发到日志服务 */
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * 通用错误边界：用于隔离单个 Tab / 区块的崩溃，避免炸掉整页路由。
 *
 * 注意：
 * - 仅捕获其子树的渲染期错误，不捕获事件回调、异步代码、SSR 错误
 * - 事件回调请用 try/catch 自行处理
 *
 * 使用示例：
 * ```tsx
 * <ErrorBoundary title="我喜欢的音乐加载失败">
 *   <FavoritesTab />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // 始终打到 console，方便 DevTools / logcat 抓取
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
    this.props.onError?.(error, info);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/[0.04] py-10 text-center",
          this.props.className
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertOctagon className="h-6 w-6" />
        </div>
        <p className="text-sm font-medium text-destructive/90">
          {this.props.title ?? "该模块加载失败"}
        </p>
        <p className="max-w-xs px-4 text-xs text-foreground/60">
          {error.message || "未知错误，请稍后重试。"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={this.reset}
          className="mt-1 rounded-full px-4"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          重试
        </Button>
      </div>
    );
  }
}
