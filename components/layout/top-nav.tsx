"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { Info, Download, Menu, Search, ListMusic, User } from "lucide-react";

import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { getToken } from "@/lib/auth";
import type { UserProfile } from "@/lib/types";
import { API_BASE } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/**
 * 顶部毛玻璃导航栏
 * - sticky 顶部，毛玻璃背景
 * - 滚动时透明度变化（framer-motion useScroll 监听 scrollY）
 * - 移动端汉堡菜单打开侧边抽屉 Sheet
 */
export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);

  // 移动端搜索页：隐藏顶部导航（搜索页有自己的搜索框）
  const isMobileSearch = pathname === "/search";
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  if (isMobileSearch && isMobile) return null;
  const openLogin = useAuthStore((s) => s.openLogin);

  // 滚动状态防抖：避免快速滚动时频繁更新状态导致闪烁
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
        "fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b px-4 pt-safe transition-colors duration-300 md:left-64 md:px-6",
        scrolled
          ? "border-primary-500/10 bg-white/80 backdrop-blur-xl dark:bg-gray-900/60"
          : "border-transparent bg-white/60 backdrop-blur-md dark:bg-gray-900/40"
      )}
    >
      <div className="flex h-12 w-full items-center gap-3">
      {/* 移动端：搜索栏 + 用户头像 */}
      <div className="flex flex-1 items-center gap-3 md:hidden">
        <Link href="/search" className="flex-1">
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

      {/* 桌面端：汉堡菜单（隐藏） */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-11 w-11 md:inline-flex"
            aria-label="打开菜单"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 pt-safe">
          <SheetHeader className="flex h-16 flex-row items-center gap-2 border-b px-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo.png"
              alt="XingTone"
              className="h-9 w-9 rounded-xl"
            />
            <SheetTitle className="text-lg font-semibold">XingTone</SheetTitle>
          </SheetHeader>
          <nav className="space-y-1 p-3">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSheetOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-50/10 text-primary-700 dark:text-primary-300"
                      : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary-700" />
                  )}
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
            {/* 下载 App */}
            <Link
              href="/download"
              onClick={() => setSheetOpen(false)}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/download")
                  ? "bg-primary-50/10 text-primary-700 dark:text-primary-300"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {isActive("/download") && (
                <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary-700" />
              )}
              <Download className="h-5 w-5" />
              下载 App
            </Link>
            {/* 关于项目 */}
            <Link
              href="/about"
              onClick={() => setSheetOpen(false)}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive("/about")
                  ? "bg-primary-50/10 text-primary-700 dark:text-primary-300"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {isActive("/about") && (
                <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary-700" />
              )}
              <Info className="h-5 w-5" />
              关于项目
            </Link>
          </nav>
        </SheetContent>
      </Sheet>

      {/* 桌面端品牌（侧边栏已含完整 Logo，这里不显示） */}

      {/* 占位伸缩区（仅桌面端） */}
      <div className="hidden flex-1 md:block" />

      {/* PC 端队列切换按钮（仅 lg+ 显示，展开状态高亮） */}
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

      {/* 搜索入口：桌面端显示，移动端已在顶栏搜索框 */}
      <Link href="/search" aria-label="搜索" className="hidden md:inline-flex">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-foreground/70 hover:text-foreground"
        >
          <Search className="h-5 w-5" />
        </Button>
      </Link>

      {/* 主题切换 */}
      <ThemeToggle />
      </div>
    </header>
  );
}
