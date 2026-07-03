"use client";

import { create } from "zustand";

/**
 * 轻量 Toast 状态管理（基于 zustand，零依赖）
 * - 不引入第三方 toast 库，沿用项目现有模式
 * - 固定底部居中堆叠，自动消失
 */

export type ToastVariant = "default" | "success" | "error";

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
  /** 自动消失时长（ms），0 表示不自动关闭 */
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (t: Omit<ToastItem, "id">) => number;
  dismiss: (id: number) => void;
}

let _seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  // 推入一条 toast，启动自动消失定时器
  push: (t) => {
    const id = ++_seq;
    const item: ToastItem = { id, ...t };
    set((s) => ({ toasts: [...s.toasts, item] }));
    if (t.duration > 0 && typeof window !== "undefined") {
      window.setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
      }, t.duration);
    }
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

/**
 * toast 函数式 API（非 hook 场景也可调用）
 * - success / error 默认 3 秒消失
 * - default 默认 2.5 秒消失
 */
export const toast = {
  show: (title: string, opts?: Partial<Omit<ToastItem, "id" | "title">>) =>
    useToastStore.getState().push({
      title,
      variant: "default",
      duration: 2500,
      ...opts,
    }),
  success: (title: string, opts?: Partial<Omit<ToastItem, "id" | "title">>) =>
    useToastStore.getState().push({
      title,
      variant: "success",
      duration: 3000,
      ...opts,
    }),
  error: (title: string, opts?: Partial<Omit<ToastItem, "id" | "title">>) =>
    useToastStore.getState().push({
      title,
      variant: "error",
      duration: 3000,
      ...opts,
    }),
  dismiss: (id: number) => useToastStore.getState().dismiss(id),
};
