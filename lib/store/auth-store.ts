"use client";

import { create } from "zustand";

/**
 * XingTone —— 全局登录弹窗状态 store（Zustand）
 *
 * 设计要点：
 * 1. 任意页面内点击「登录」或 401 响应触发时，调用 openLogin() 即可在当前页弹出登录框
 *    避免跳转到独立 /login 页面，提升用户体验
 * 2. 登录成功后调用 onSuccess 回调（若调用方传入），如刷新页面数据
 * 3. 全局单例，避免多个组件同时触发 401 时重复打开弹窗
 * 4. 与 lib/auth.ts 中的 token/user 存储解耦：本 store 仅管理弹窗 UI 开关
 */

interface AuthDialogState {
  /** 弹窗是否打开 */
  isOpen: boolean;
  /** 登录成功后的回调（可选，由调用方传入，如刷新当前页数据） */
  onSuccess?: () => void;
  /** 打开登录弹窗 */
  openLogin: (onSuccess?: () => void) => void;
  /** 关闭登录弹窗 */
  closeLogin: () => void;
}

export const useAuthStore = create<AuthDialogState>((set) => ({
  isOpen: false,
  onSuccess: undefined,
  openLogin: (onSuccess) =>
    set((state) => {
      // 已打开则不重复触发（避免 401 风暴）
      if (state.isOpen) return state;
      return { isOpen: true, onSuccess };
    }),
  closeLogin: () => set({ isOpen: false, onSuccess: undefined }),
}));
