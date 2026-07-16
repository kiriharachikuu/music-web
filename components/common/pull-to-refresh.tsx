"use client";

import * as React from "react";
import { Loader2, ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils";

/** 最大下拉距离（像素） */
const MAX_PULL = 80;
/** 触发刷新的下拉阈值（像素） */
const THRESHOLD = 60;
/** 阻尼系数，让下拉手感更自然 */
const RESISTANCE = 0.5;

/**
 * 移动端下拉刷新
 * - 仅在页面滚动到顶部时启用
 * - 下拉显示箭头指示器，达到阈值后翻转并触发 onRefresh
 * - 刷新中显示旋转 loading
 * - 使用原生非 passive touchmove 以便 preventDefault 阻止页面回弹
 */
export function PullToRefresh({
  onRefresh,
  children,
  className,
}: {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
}) {
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const pullRef = React.useRef(0);
  const startYRef = React.useRef(0);
  const pullingRef = React.useRef(false);
  const refreshingRef = React.useRef(false);
  const contentRef = React.useRef<HTMLDivElement>(null);
  // 用 ref 持有最新 onRefresh，避免 effect deps 变化导致 touch 监听器重挂
  const onRefreshRef = React.useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const setPullBoth = React.useCallback((v: number) => {
    pullRef.current = v;
    setPull(v);
  }, []);

  React.useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      // 仅在页面已滚动到顶部时启用下拉
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    };

    const onMove = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      // 惯性滚动到顶部后，同一手势中重新初始化下拉
      if (!pullingRef.current) {
        if (window.scrollY === 0) {
          startYRef.current = e.touches[0].clientY;
          pullingRef.current = true;
        }
        return;
      }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) {
        if (pullRef.current !== 0) setPullBoth(0);
        return;
      }
      if (window.scrollY === 0) {
        // 阻止页面默认回弹
        e.preventDefault();
        const resisted = Math.min(delta * RESISTANCE, MAX_PULL);
        setPullBoth(resisted);
      }
    };

    const onEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPullBoth(THRESHOLD);
        onRefreshRef.current().finally(() => {
          setRefreshing(false);
          setPullBoth(0);
        });
      } else {
        setPullBoth(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [setPullBoth]);

  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div className={cn("relative", className)}>
      {/* 下拉指示器：箭头 / loading */}
      {(pull > 0 || refreshing) && (
        <div
          className="pointer-events-none absolute left-1/2 z-10"
          style={{ top: pull, transform: "translate(-50%, -100%)" }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-md backdrop-blur-sm">
            {refreshing ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <ArrowDown
                className={cn(
                  "h-5 w-5 text-primary transition-transform duration-200",
                  progress >= 1 && "rotate-180"
                )}
              />
            )}
          </div>
        </div>
      )}

      {/* 可下拉的内容区 */}
      <div
        ref={contentRef}
        style={{
          transform: `translateY(${pull}px)`,
          transition: pullingRef.current ? "none" : "transform 0.2s ease-out",
        }}
      >
        {children}
      </div>
    </div>
  );
}
