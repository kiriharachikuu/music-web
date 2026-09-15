"use client";

import { create } from "zustand";

import type { UserProfile } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * 全局用户资料 store（Zustand）
 * - ProfileClient（个人中心）与 TopNav（顶栏小头像）共享同一份 profile
 * - 佩戴/摘下头像框、编辑资料、登录/登出后同步更新本 store，
 *   顶栏小头像即可实时变化，无需刷新页面
 */
interface ProfileState {
  profile: UserProfile | null;
  isLoggedIn: boolean;
  /** 写入/更新用户资料 */
  setProfile: (profile: UserProfile | null) => void;
  /** 从服务端拉取最新资料并写入 store（未登录/会话失效时同步清空登录态） */
  fetchProfile: () => Promise<void>;
  /** 登出：清空资料与登录态 */
  clear: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile: null,
  isLoggedIn: false,
  setProfile: (profile) => set({ profile }),
  fetchProfile: async () => {
    const token = getToken();
    if (!token) {
      set({ isLoggedIn: false, profile: null });
      return;
    }
    set({ isLoggedIn: true });
    try {
      const res = await fetch(`${API_BASE}/user/profile`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.status === 401) {
        set({ isLoggedIn: false, profile: null });
        return;
      }
      if (res.ok) {
        const json = await res.json();
        set({ profile: (json.data as UserProfile | null) ?? null });
      }
    } catch {
      // 网络异常：保留现有资料
    }
  },
  clear: () => set({ profile: null, isLoggedIn: false }),
}));
