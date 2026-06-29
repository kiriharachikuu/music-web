"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { MiniPlayer } from "@/components/layout/mini-player";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { FullScreenPlayer } from "@/components/player/full-screen-player";
import { LoginDialog } from "@/components/auth/login-dialog";
import { usePlayerStore } from "@/lib/store/player-store";

/** 不显示应用外壳的路径（全屏独立页面） */
const STANDALONE_PATHS = ["/login"];

/**
 * 应用外壳：组合 侧边栏 + 顶部导航 + 主内容 + 迷你播放栏 + 移动端 Tab
 * - 客户端组件：含 usePathname / scroll 监听 / store 交互
 * - 挂载后手动 rehydrate 持久化的播放状态（store 采用 skipHydration 规避 SSR mismatch）
 * - /login 等独立页面跳过外壳，全屏渲染
 * - LoginDialog 全局挂载，401 或主动调用 openLogin 时弹出，不跳转页面
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone = STANDALONE_PATHS.some((p) => pathname === p);

  React.useEffect(() => {
    // 客户端挂载后从 localStorage 恢复 volume / playMode / queue 等
    usePlayerStore.persist.rehydrate();
  }, []);

  // 独立页面：全屏渲染，不加载外壳组件，但仍挂载 LoginDialog 以便 401 兜底
  if (isStandalone) {
    return (
      <div className="min-h-dvh">
        {children}
        <LoginDialog />
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* PC 侧边栏 */}
      <Sidebar />

      {/* 主区域：桌面端左移 w-64 */}
      <div className="md:pl-64">
        <TopNav />
        <main className="mx-auto max-w-[1400px] px-4 pb-40 pt-6 md:px-6 md:pb-32">
          {children}
        </main>
      </div>

      {/* 底部常驻迷你播放栏 */}
      <MiniPlayer />

      {/* 移动端底部 Tab */}
      <MobileTabBar />

      {/* 全屏歌词播放页：由 isLyricPageOpen 控制，z-50 覆盖所有内容 */}
      <FullScreenPlayer />

      {/* 全局登录弹窗：401 或主动触发时弹出，z-50 */}
      <LoginDialog />
    </div>
  );
}
