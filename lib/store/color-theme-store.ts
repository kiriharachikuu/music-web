"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorTheme = "purple" | "sky" | "pink";

interface ColorThemeState {
  theme: ColorTheme;
  setTheme: (theme: ColorTheme) => void;
}

const STORAGE_KEY = "xt-music-color-theme";

/**
 * 颜色主题 Store
 * - 管理三套颜色主题：purple（星瞳紫默认）、sky（天蓝色）、pink（淡粉色）
 * - 通过给 <html> 设置 data-theme 属性驱动 globals.css 的 CSS 变量
 * - 使用 localStorage 持久化，首屏脚本提前注入避免闪烁
 */
export const useColorThemeStore = create<ColorThemeState>()(
  persist(
    (set) => ({
      theme: "purple",
      setTheme: (theme: ColorTheme) => {
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          if (theme === "purple") {
            root.removeAttribute("data-theme");
          } else {
            root.setAttribute("data-theme", theme);
          }
        }
        set({ theme });
      },
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (typeof document !== "undefined" && state) {
          const root = document.documentElement;
          if (state.theme === "purple") {
            root.removeAttribute("data-theme");
          } else {
            root.setAttribute("data-theme", state.theme);
          }
        }
      },
    }
  )
);

/**
 * 首屏同步应用颜色主题（避免 SSR/hydration 闪烁）
 * 在 layout.tsx 的 <head> 中内联注入
 */
export const colorThemeInitScript = `
(function() {
  try {
    var key = '${STORAGE_KEY}';
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var data = JSON.parse(raw);
    var theme = data.state && data.state.theme;
    if (theme && theme !== 'purple') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  } catch (e) {}
})();
`;
