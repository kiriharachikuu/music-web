"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { Info, Download, Search, ListMusic, User } from "lucide-react";

import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { getToken } from "@/lib/auth";
import type { UserProfile } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);

  const isMobileSearch = pathname === "/search";
  const isMobile = useIsMobile();

  const openLogin = useAuthStore((s) => s.openLogin);

  const scrollTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  useMotionValueEvent(scrollY, "change", (y) => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      setScrolled(y > 8);
    }, 50);
  });

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoggedIn(false);
      setAvatarUrl(null);
      return;
    }
    setIsLoggedIn(true);
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/user/profile`, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          const profile: UserProfile | null = json.data ?? null;
          setAvatarUrl(profile?.avatar ?? null);
        }
      } catch {
        // ignore
      }
    };
    void fetchProfile();
  }, [pathname]);

  if (isMobileSearch && isMobile) return null;

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const handleAvatarClick = () => {
    if (isLoggedIn) {
      router.push("/profile");
    } else {
      openLogin();
    }
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-30 border-b transition-colors duration-300 md:left-64",
        scrolled
          ? "border-primary-500/10 bg-white/80 backdrop-blur-xl dark:bg-gray-900/60"
          : "border-transparent bg-white/60 backdrop-blur-md dark:bg-gray-900/40"
      )}
    >
      <div className="h-[var(--safe-area-top,0px)]" />
      <div className="flex h-12 w-full items-center gap-3 px-4 max-md:landscape:h-11 md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/search" className="flex-1 md:hidden">
            <div className="flex h-10 items-center gap-2 rounded-full border border-border bg-foreground/5 px-4 text-sm text-foreground/50">
              <Search className="h-4 w-4" />
              <span>搜索歌曲、歌单、歌手</span>
            </div>
          </Link>
          <button
            onClick={handleAvatarClick}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground/5 no-select"
            aria-label={isLoggedIn ? "个人中心" : "登录"}
          >
            <Avatar className="h-10 w-10 border-2 border-primary-700/30">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt="avatar" />
              ) : (
                <AvatarFallback className="bg-primary-700/10 text-primary-700">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              )}
            </Avatar>
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
              ? "text-primary-700 dark:text-primary-300"
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
