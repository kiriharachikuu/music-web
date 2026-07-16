"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** 确认弹窗可配置项 */
export interface ConfirmOptions {
  /** 标题，默认「请确认」 */
  title?: string;
  /** 描述文案 */
  description?: string;
  /** 确认按钮文案，默认「确定」 */
  confirmText?: string;
  /** 取消按钮文案，默认「取消」 */
  cancelText?: string;
  /** 确认按钮风格：destructive 用于删除等危险操作 */
  variant?: "default" | "destructive";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

interface ConfirmContextValue {
  /** 异步确认：返回 true 表示用户点击确认，false 表示取消 */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null);

/**
 * 全局确认弹窗 Provider
 * - 在根布局包裹一次，子组件通过 useConfirm() 获取 confirm 函数
 * - 替代原生 confirm()：支持主题、危险操作高亮、无浏览器样式割裂
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState>({ open: false });

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, open: true, resolve });
    });
  }, []);

  const resolve = React.useCallback((result: boolean) => {
    setState((prev) => {
      prev.resolve?.(result);
      return { open: false };
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog
        open={state.open}
        onOpenChange={(v) => !v && resolve(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{state.title ?? "请确认"}</DialogTitle>
            {state.description && (
              <DialogDescription>{state.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => resolve(false)}
              className="rounded-full"
            >
              {state.cancelText ?? "取消"}
            </Button>
            <Button
              variant={state.variant === "destructive" ? "destructive" : "default"}
              onClick={() => resolve(true)}
              className={
                state.variant === "destructive"
                  ? "rounded-full"
                  : "rounded-full bg-primary text-white hover:bg-primary/90"
              }
            >
              {state.confirmText ?? "确定"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

/**
 * 获取异步确认函数
 * 用法：const confirm = useConfirm(); if (!(await confirm({...}))) return;
 */
export function useConfirm() {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm 必须在 ConfirmProvider 内使用");
  }
  return ctx.confirm;
}
