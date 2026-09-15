"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, ListMusic, ArrowLeft } from "lucide-react";

import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useProfileStore } from "@/lib/store/profile-store";
import { getToken } from "@/lib/auth";
import { FramedAvatar } from "@/components/framed-avatar";

/**
 * 顶部毛玻璃导航栏
 * - sticky 顶部，毛玻璃背景
 * - 滚动时透明度变化（framer-motion useScroll 监听 scrollY）
 * - 移动端：搜索栏 + 用户头像
 * - 桌面端：队列按钮 + 搜索按钮 + 主题切换
 */
export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = React.useState(false);
  // 全局 profile store：佩戴/摘下头像框、编辑资料、登录/登出后实时同步，无需刷新页面
  const profile = useProfileStore((s) => s.profile);
  const isLoggedIn = useProfileStore((s) => s.isLoggedIn);
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const avatarUrl = profile?.avatar ?? null;
  const frameUrl = profile?.avatarFrame?.imageUrl ?? null;
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);

  const isMobileSearch = pathname === "/search";

  const openLogin = useAuthStore((s) => s.openLogin);

  // 原生 scroll 监听替代 framer-motion useScroll，减少 ~40KB 初始包体积
  React.useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 挂载时：已登录且全局 store 尚无资料才拉取一次（路由切换不重复请求；
  // 后续资料变化由 store 驱动，登录成功回调里也会重新拉取）
  React.useEffect(() => {
    if (!getToken()) return;
    if (!useProfileStore.getState().profile) {
      void fetchProfile();
    }
  }, [fetchProfile]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  // 判断是否为一级导航页（首页/发现/排行榜/直播场次列表/资料库等），这些页面不需要返回按钮
  // 详情页（/album/xxx、/artist/xxx、/playlist/xxx、/live-session/xxx）显示返回按钮
  const isTopLevel = React.useMemo(() => {
    const topLevelPaths = [
      "/",
      "/rankings",
      "/live-sessions",
      "/library",
      "/search",
      "/profile",
      "/download",
      "/about",
    ];
    return topLevelPaths.includes(pathname);
  }, [pathname]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleAvatarClick = () => {
    if (isLoggedIn) {
      router.push("/profile");
    } else {
      // 登录成功后拉取资料，顶栏小头像实时出现
      openLogin(() => void fetchProfile());
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b transition-colors duration-300 md:left-64",
        isMobileSearch && "hidden md:block",
        scrolled
          ? "border-primary/10 bg-background/80 backdrop-blur-xl"
          : "border-transparent bg-background/60 backdrop-blur-md"
      )}
    >
      <div className="h-[var(--safe-area-top,0px)]" />
      <div className="flex h-14 w-full items-center gap-3 px-4 max-md:landscape:h-11 md:px-6">
        <div className="flex flex-1 items-center gap-3">
          {/* 返回按钮：非一级页面显示（移动端 + PC 端） */}
          {!isTopLevel && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              aria-label="返回"
              className="h-9 w-9 shrink-0 text-foreground/70 hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Link href="/search" className="flex-1 md:hidden">
            <div className="flex h-10 w-full items-center gap-2 rounded-full border border-border bg-foreground/5 px-4 text-sm text-foreground/50">
              <Search className="h-4 w-4" />
              <span>搜索歌曲、歌单、歌手</span>
            </div>
          </Link>
          <button
            onClick={handleAvatarClick}
            // 戴框时去掉底衬，让头像框成为唯一视觉焦点
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full no-select",
              !frameUrl && "bg-foreground/5"
            )}
            aria-label={isLoggedIn ? "个人中心" : "登录"}
          >
            <FramedAvatar
              avatarUrl={avatarUrl}
              frameUrl={frameUrl}
              // 无框：核心 2.5rem（40px）；有框：核心 2.1rem，容器 = 2.1/0.6 = 3.5rem（56px）恰好填满导航栏高度
              size={frameUrl ? "2.1rem" : "2.5rem"}
              className={frameUrl ? undefined : "border-2 border-primary/30"}
            />
          </button>
        </div>

        <div className="hidden flex-1 md:block" />

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleQueue}
          aria-label={isQueueOpen ? "收起队列" : "展开队列"}
          aria-pressed={isQueueOpen}
          className={cn(
            "hidden h-9 w-9 lg:inline-flex",
            isQueueOpen
              ? "text-primary dark:text-primary/70"
              : "text-foreground/70 hover:text-foreground"
          )}
        >
          <ListMusic className="h-5 w-5" />
        </Button>

        <Link href="/search" aria-label="搜索" className="hidden md:inline-flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-foreground/70 hover:text-foreground"
          >
            <Search className="h-5 w-5" />
          </Button>
        </Link>

        <ThemeToggle />
      </div>
    </header>
  );
}
