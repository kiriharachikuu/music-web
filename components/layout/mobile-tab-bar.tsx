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
    <nav className="fixed inset-x-0 bottom-0 z-30 flex flex-col border-t border-primary/10 bg-white/90 backdrop-blur-xl dark:bg-gray-900/80 md:hidden">
      <div className="flex h-14 items-stretch landscape:h-12">
        {navItems.filter((item) => !item.mobileHidden).map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors no-select landscape:gap-0 landscape:text-[10px]",
                active
                  ? "text-primary dark:text-primary/70"
                  : "text-foreground/50"
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center landscape:h-6 landscape:w-6">
                <Icon className="h-5 w-5 landscape:h-[18px] landscape:w-[18px]" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
      <div className="h-[var(--safe-area-bottom,0px)]" />
    </nav>
  );
}
