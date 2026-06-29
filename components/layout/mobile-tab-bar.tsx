"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * 移动端底部 Tab 栏
 * - 仅移动端显示（md:hidden）
 * - 5 个图标：发现 / 排行榜 / 音乐库 / 搜索 / 我的
 * - 选中项文字 + 图标 primary-700
 */
export function MobileTabBar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t border-primary-500/10 bg-white/90 pb-safe backdrop-blur-xl dark:bg-gray-900/80 md:hidden">
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
              active
                ? "text-primary-700 dark:text-primary-300"
                : "text-foreground/50"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
