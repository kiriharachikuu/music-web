"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { Info, Download, Menu, Search, ListMusic } from "lucide-react";

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

/**
 * 顶部毛玻璃导航栏
 * - sticky 顶部，毛玻璃背景
 * - 滚动时透明度变化（framer-motion useScroll 监听 scrollY）
 * - 移动端汉堡菜单打开侧边抽屉 Sheet
 */
export function TopNav() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const toggleQueue = usePlayerStore((s) => s.toggleQueue);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);

  useMotionValueEvent(scrollY, "change", (y) => {
    setScrolled(y > 8);
  });

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "sticky top-safe z-30 flex h-16 items-center gap-3 border-b px-4 transition-colors duration-300 md:px-6",
        scrolled
          ? "border-primary-500/10 bg-white/80 backdrop-blur-xl dark:bg-gray-900/60"
          : "border-transparent bg-transparent backdrop-blur-0"
      )}
    >
      {/* 移动端：汉堡菜单 + 品牌 */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            // 移动端触控目标 ≥ 44px
            className="h-11 w-11 md:hidden"
            aria-label="打开菜单"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
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

      {/* 桌面端品牌缩写（侧边栏已含完整 Logo，这里仅移动端显示） */}
      <div className="flex items-center gap-2 md:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo.png"
          alt="XingTone"
          className="h-8 w-8 rounded-lg"
        />
        <span className="font-semibold">XingTone</span>
      </div>

      {/* 占位伸缩区 */}
      <div className="flex-1" />

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

      {/* 搜索入口：搜索 Tab 已合并至顶栏 */}
      <Link href="/search" aria-label="搜索">
        <Button
          variant="ghost"
          size="icon"
          // 移动端触控目标 ≥ 44px，桌面端保持 36px
          className="h-11 w-11 text-foreground/70 hover:text-foreground md:h-9 md:w-9"
        >
          <Search className="h-5 w-5" />
        </Button>
      </Link>

      {/* 主题切换 */}
      <ThemeToggle />
    </header>
  );
}
