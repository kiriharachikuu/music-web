"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { MiniPlayer } from "@/components/layout/mini-player";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { Toaster } from "@/components/ui/toaster";
import { usePlayerStore } from "@/lib/store/player-store";
import { useSafeArea } from "@/lib/hooks/use-safe-area";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { cn } from "@/lib/utils";

// 动态导入非首屏重型组件，减少初始 JS 包体积
// FullScreenPlayer: ~440 行 + framer-motion（AnalyzePresence/motion/drag）
// QueuePanel: PC 端队列面板
// LoginSheet: 401 时弹出
// UpdateDialog: 延迟 2s 检查
// InstallPrompt: 移动端浏览器 PWA 安装提示
const FullScreenPlayer = dynamic(() => import("@/components/player/full-screen-player").then(m => ({ default: m.FullScreenPlayer })), { ssr: false });
const QueuePanel = dynamic(() => import("@/components/layout/queue-panel").then(m => ({ default: m.QueuePanel })), { ssr: false });
const LoginSheet = dynamic(() => import("@/components/auth/login-sheet").then(m => ({ default: m.LoginSheet })), { ssr: false });
const UpdateDialog = dynamic(() => import("@/components/common/update-dialog").then(m => ({ default: m.UpdateDialog })), { ssr: false });
const InstallPrompt = dynamic(() => import("@/components/common/install-prompt").then(m => ({ default: m.InstallPrompt })), { ssr: false });

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

    // 自动播放：用户在设置中开启且存在上次播放的歌曲时，延迟恢复播放
    // 使用 requestIdleCallback / setTimeout 延迟到首屏渲染完成后执行，
    // 避免阻塞初始水合和首屏展示
    if (autoPlayRestoredRef.current) return;
    autoPlayRestoredRef.current = true;
    const idleCb = typeof requestIdleCallback !== "undefined" ? requestIdleCallback : (fn: () => void) => setTimeout(fn, 200);
    idleCb(() => {
      try {
        const raw = localStorage.getItem("xt-music-settings");
        const autoplay = raw ? JSON.parse(raw)?.autoplay === true : false;
        if (autoplay) {
          const { currentSong, play } = usePlayerStore.getState();
          if (currentSong) {
            void play(currentSong);
          }
        }
      } catch {
        // 忽略设置读取异常
      }
    });
  }, []);

  // 监听播放器错误，3 秒后自动清除
  React.useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => clearError(), 3000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  // 全局键盘快捷键：搜索 + 播放控制
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 输入控件中不触发全局快捷键
      if (isEditableTarget(e.target)) return;

      // "/" 搜索快捷键
      if (
        e.key === "/" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        if (pathname === "/search") {
          document.getElementById("search-input")?.focus();
        } else {
          sessionStorage.setItem("xt-focus-search", "1");
          router.push("/search");
        }
        return;
      }

      // 空格：播放/暂停
      if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const state = usePlayerStore.getState();
        if (state.currentSong) {
          state.toggle();
        }
        return;
      }

      // 箭头右：下一首
      if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        usePlayerStore.getState().next();
        return;
      }

      // 箭头左：上一首
      if (e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        usePlayerStore.getState().prev();
        return;
      }

      // 箭头上：音量 +10%
      if (e.key === "ArrowUp" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const state = usePlayerStore.getState();
        state.setVolume(Math.min(1, state.volume + 0.1));
        return;
      }

      // 箭头下：音量 -10%
      if (e.key === "ArrowDown" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const state = usePlayerStore.getState();
        state.setVolume(Math.max(0, state.volume - 0.1));
        return;
      }

      // M：静音切换
      if (
        (e.key === "m" || e.key === "M") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const state = usePlayerStore.getState();
        state.setVolume(state.volume === 0 ? 0.8 : 0);
        return;
      }

      // F：全屏歌词
      if (
        (e.key === "f" || e.key === "F") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        const state = usePlayerStore.getState();
        if (state.isLyricPageOpen) {
          state.closeLyricPage();
        } else {
          state.openLyricPage();
        }
        return;
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
        <LoginSheet />
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
          id="main-content"
          className={cn(
            "mx-auto max-w-[1400px] px-4 pb-44 md:px-[6.5rem] md:pb-32 max-md:landscape:pb-36",
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

      {/* 全局登录底部抽屉：401 或主动触发时从底部滑出，z-50 */}
      <LoginSheet />

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
