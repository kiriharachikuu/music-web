"use client";

import * as React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

import { useToastStore, toast, type ToastVariant } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";

/**
 * 全局 Toast 渲染容器
 * - 固定底部居中堆叠（避开迷你播放栏）
 * - 三种风格：default / success / error，主色 primary-700 强调
 * - 点击关闭按钮或自动消失
 * - 在 AppShell 中挂载一次即可
 */
const VARIANT_STYLE: Record<
  ToastVariant,
  { bg: string; icon: typeof Info; iconColor: string }
> = {
  default: {
    bg: "bg-foreground text-background",
    icon: Info,
    iconColor: "text-background/80",
  },
  success: {
    bg: "bg-primary-700 text-white",
    icon: CheckCircle2,
    iconColor: "text-white",
  },
  error: {
    bg: "bg-red-500 text-white",
    icon: AlertCircle,
    iconColor: "text-white",
  },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 md:bottom-32">
      {toasts.map((t) => {
        const style = VARIANT_STYLE[t.variant];
        const Icon = style.icon;
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-2.5 rounded-xl px-4 py-2.5 shadow-lg animate-fade-in",
              style.bg
            )}
            role="status"
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.iconColor)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-xs opacity-80 leading-tight">
                  {t.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="关闭"
              className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * useToast hook —— 组件内便捷调用
 * 返回与 toast 函数式 API 一致的对象
 */
export function useToast() {
  return toast;
}
