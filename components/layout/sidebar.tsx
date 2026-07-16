"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { navItems } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Info, Download } from "lucide-react";

/**
 * PC 侧边栏（md 及以上显示）
 * - 固定左侧 w-64
 * - 毛玻璃 backdrop-blur-xl + 极淡主色描边
 * - 选中项：左侧 3px primary-700 竖条 + 文字 primary-700 + primary-50/10 背景
 */
export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-primary/10 bg-white/80 backdrop-blur-xl dark:bg-gray-900/60 md:flex">
      {/* 品牌 Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/logo.png"
          alt="XingTone"
          className="h-9 w-9 rounded-xl shadow-card"
        />
        <span className="text-lg font-semibold tracking-tight">
          XingTone
        </span>
      </div>

      {/* 导航 */}
      <nav className="space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/5 text-primary dark:text-primary/70"
                  : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
              )}
            >
              {/* 选中左侧 3px 竖条 */}
              {active && (
                <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary" />
              )}
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-primary dark:text-primary/70" : ""
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* 立绘装饰 */}
      <div className="flex-1 relative overflow-hidden">
        <img
          src="/character.png"
          alt="Character"
          className="absolute bottom-0 right-0 h-full w-auto max-w-full object-contain object-bottom opacity-80 drop-shadow-2xl animate-fade-in"
          style={{
            filter: "drop-shadow(0 8px 20px rgba(139, 0, 255, 0.25))",
          }}
        />
      </div>

      {/* 底部：下载 + 关于链接 */}
      <div className="border-t border-primary-500/10 px-3 py-3 space-y-1">
        <Link
          href="/download"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive("/download")
              ? "bg-primary-50/10 text-primary-700 dark:text-primary-300"
              : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
          )}
        >
          {isActive("/download") && (
            <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary-700" />
          )}
          <Download className="h-5 w-5 shrink-0" />
          下载 App
        </Link>
        <Link
          href="/about"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive("/about")
              ? "bg-primary-50/10 text-primary-700 dark:text-primary-300"
              : "text-foreground/70 hover:bg-foreground/5 hover:text-foreground"
          )}
        >
          {isActive("/about") && (
            <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-full bg-primary-700" />
          )}
          <Info className="h-5 w-5 shrink-0" />
          关于项目
        </Link>
        <p className="px-3 pt-2 text-xs text-foreground/40">© XingTone</p>
      </div>
    </aside>
  );
}
