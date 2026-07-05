"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { MiniPlayer } from "@/components/layout/mini-player";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { QueuePanel } from "@/components/layout/queue-panel";
import { FullScreenPlayer } from "@/components/player/full-screen-player";
import { LoginDialog } from "@/components/auth/login-dialog";
import { UpdateDialog } from "@/components/common/update-dialog";
import { InstallPrompt } from "@/components/common/install-prompt";
import { Toaster } from "@/components/ui/toaster";
import { usePlayerStore } from "@/lib/store/player-store";
import { useSafeArea } from "@/lib/hooks/use-safe-area";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

/** 不显示应用外壳的路径（全屏独立页面） */
const STANDALONE_PATHS = ["/login"];

/** 判断元素是否为可输入控件（输入框 / 文本域 / 可编辑区域） */
function isEditableTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    el.isContentEditable
  );
}

/**
 * 应用外壳：组合 侧边栏 + 顶部导航 + 主内容 + 迷你播放栏 + 移动端 Tab
 * - 客户端组件：含 usePathname / scroll 监听 / store 交互
 * - 挂载后手动 rehydrate 持久化的播放状态（store 采用 skipHydration 规避 SSR mismatch）
 * - /login 等独立页面跳过外壳，全屏渲染
 * - LoginDialog 全局挂载，401 或主动调用 openLogin 时弹出，不跳转页面
 * - 全局 "/" 快捷键：聚焦搜索框（不在输入态时触发）
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isStandalone = STANDALONE_PATHS.some((p) => pathname === p);
  const isMobileSearch = pathname === "/search";
  const isMobile = useIsMobile();
  const error = usePlayerStore((s) => s.error);
  const clearError = usePlayerStore((s) => s.clearError);
  useSafeArea();

  // 守卫：自动播放恢复只在首次挂载执行一次（避免 React 严格模式双触发）
  const autoPlayRestoredRef = React.useRef(false);

  React.useEffect(() => {
    // 客户端挂载后从 localStorage 恢复 volume / playMode / queue 等
    usePlayerStore.persist.rehydrate();

    // 自动播放：用户在设置中开启且存在上次播放的歌曲时，恢复播放
    if (autoPlayRestoredRef.current) return;
    autoPlayRestoredRef.current = true;
    try {
      const raw = localStorage.getItem("xt-music-settings");
      const autoplay = raw ? JSON.parse(raw)?.autoplay === true : false;
      if (autoplay) {
        const { currentSong, play } = usePlayerStore.getState();
        if (currentSong) {
          // 恢复播放：重新加载 Howl 并播放（currentTime 不持久化，从头开始）
          void play(currentSong);
        }
      }
    } catch {
      // 忽略设置读取异常
    }
  }, []);

  // 监听播放器错误，3 秒后自动清除
  React.useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => clearError(), 3000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  // 全局 "/" 快捷键：聚焦 / 跳转搜索框
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 仅响应无修饰键的 "/"，且当前焦点不在输入控件中
      if (
        e.key !== "/" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.shiftKey ||
        isEditableTarget(e.target)
      ) {
        return;
      }
      e.preventDefault();
      if (pathname === "/search") {
        // 已在搜索页：直接聚焦
        document.getElementById("search-input")?.focus();
      } else {
        // 其他页：跳转后由 SearchClient 自动聚焦
        sessionStorage.setItem("xt-focus-search", "1");
        router.push("/search");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pathname, router]);

  // 独立页面：全屏渲染，不加载外壳组件，但仍挂载 LoginDialog 以便 401 兜底
  if (isStandalone) {
    return (
      <div className="min-h-dvh">
        {children}
        <LoginDialog />
        <UpdateDialog />
        <Toaster />
        {error && (
          <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-red-500 px-4 py-2 text-sm text-white shadow-lg">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {/* PC 侧边栏 */}
      <Sidebar />

      {/* PC 右侧播放队列面板（lg 及以上） */}
      <QueuePanel />

      {/* 主区域：桌面端左移 w-64 给侧边栏；队列面板改为浮层抽屉，不再占布局 */}
      <div className="md:pl-64">
        <TopNav />
        <main
          className={cn(
            "mx-auto max-w-[1400px] px-4 pb-44 md:px-6 md:pb-32 landscape:pb-36",
            isMobileSearch && isMobile
              ? "pt-0"
              : "pt-[calc(var(--safe-area-top,0px)+5rem)] md:pt-[calc(var(--safe-area-top,0px)+5.5rem)]"
          )}
        >
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

      {/* 版本检查弹窗：挂载 2 秒后检查更新 */}
      <UpdateDialog />

      {/* PWA 安装提示（仅移动端浏览器显示） */}
      <InstallPrompt />

      {/* 全局 Toast 容器：下载/收藏等操作反馈 */}
      <Toaster />

      {/* 播放器错误提示：fixed 底部居中，3 秒自动消失 */}
      {error && (
        <div className="fixed bottom-[calc(7rem+var(--safe-area-bottom,0px))] left-1/2 z-[60] -translate-x-1/2 rounded-lg bg-red-500 px-4 py-2 text-sm text-white shadow-lg md:bottom-32">
          {error}
        </div>
      )}
    </div>
  );
}
