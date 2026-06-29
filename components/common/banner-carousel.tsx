"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 顶部 Banner 轮播
 * - 大图圆角 2xl
 * - 自动切换（默认 4s）+ 手动左右切换
 * - 主色实心指示器
 * - 点击跳转 linkUrl
 */
export function BannerCarousel({
  banners,
  interval = 4000,
  className,
}: {
  banners: Banner[];
  interval?: number;
  className?: string;
}) {
  const [active, setActive] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const count = banners.length;

  // 自动轮播
  React.useEffect(() => {
    if (count <= 1 || paused) return;
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % count);
    }, interval);
    return () => clearInterval(timer);
  }, [count, interval, paused]);

  // 容错：无 Banner 不渲染
  if (count === 0) return null;

  const go = (idx: number) => {
    setActive(((idx % count) + count) % count);
  };

  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 轨道：横向滑动 */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${active * 100}%)` }}
      >
        {banners.map((b) => {
          const inner = (
            <div className="relative h-44 w-full shrink-0 md:h-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.imageUrl}
                alt={b.title}
                className="h-full w-full object-cover"
              />
              {/* 渐变遮罩，增强文字可读性 */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/20 to-transparent" />
              {/* 标题文字 */}
              <div className="absolute bottom-0 left-0 p-5 md:p-8">
                <h3 className="max-w-md text-lg font-bold text-white drop-shadow-md md:text-2xl">
                  {b.title}
                </h3>
              </div>
            </div>
          );

          return (
            <div key={b.id} className="w-full shrink-0">
              {b.linkUrl ? (
                b.linkUrl.startsWith("http") ? (
                  <a
                    href={b.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {inner}
                  </a>
                ) : (
                  <Link href={b.linkUrl}>{inner}</Link>
                )
              ) : (
                inner
              )}
            </div>
          );
        })}
      </div>

      {/* 左右切换按钮（桌面端） */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(active - 1)}
            aria-label="上一张"
            className="absolute left-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50 md:flex"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            aria-label="下一张"
            className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50 md:flex"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* 指示器 */}
      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`第 ${i + 1} 张`}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === active
                  ? "w-5 bg-primary-700"
                  : "w-1.5 bg-white/60 hover:bg-white"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
