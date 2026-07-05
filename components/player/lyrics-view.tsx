"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Music2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  parseLRC,
  findActiveLineIndex,
  type LyricLine,
} from "@/lib/lrc-parser";

/**
 * XingTone —— 全屏歌词列表组件
 *
 * 视觉特性（Apple Music 级）：
 * 1. 当前行：放大 scale-110、白色不透明、紫色辉光 text-shadow
 * 2. 非当前行：半透明，远离当前行更淡（按距离衰减）
 * 3. 上下两端 mask-image 渐隐柔化
 * 4. 自动滚动：当前行始终居中（scrollTo + smooth）
 * 5. 用户主动滚动后暂停跟随 3 秒，避免与手动浏览冲突
 * 6. 点击任意行 → onSeek 跳转播放 + 闪光反馈 + 触感反馈 + 按压缩放
 * 7. 无歌词降级显示文案
 */

interface LyricsViewProps {
  /** LRC 原始文本（null/空表示无歌词） */
  lrc: string | null | undefined;
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 点击歌词行跳转 */
  onSeek: (time: number) => void;
  /** 是否正在加载歌词 */
  loading?: boolean;
}

export function LyricsView({
  lrc,
  currentTime,
  onSeek,
  loading,
}: LyricsViewProps) {
  // 解析歌词（按 lrc 文本缓存）
  const lines = React.useMemo<LyricLine[]>(
    () => (lrc ? parseLRC(lrc) : []),
    [lrc]
  );
  // 当前行索引（按 lines + currentTime 缓存）
  const activeIndex = React.useMemo(
    () => findActiveLineIndex(lines, currentTime),
    [lines, currentTime]
  );

  const containerRef = React.useRef<HTMLDivElement>(null);
  const lineRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  // 点击跳转：记录最近点击的行索引，用于闪光反馈
  const [clickedIndex, setClickedIndex] = React.useState<number | null>(null);
  const clickTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSeek = React.useCallback(
    (index: number, time: number) => {
      // 触觉反馈（移动端）
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(15);
      }
      // 闪光反馈：标记该行 400ms
      setClickedIndex(index);
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      clickTimerRef.current = setTimeout(() => setClickedIndex(null), 400);
      onSeek(time);
    },
    [onSeek]
  );

  // 卸载时清理定时器
  React.useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  // 用户主动滚动检测：滚动后暂停自动跟随 3 秒
  const userScrollingRef = React.useRef(false);
  const userScrollTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const markUserScroll = React.useCallback(() => {
    userScrollingRef.current = true;
    if (userScrollTimerRef.current) {
      clearTimeout(userScrollTimerRef.current);
    }
    userScrollTimerRef.current = setTimeout(() => {
      userScrollingRef.current = false;
    }, 3000);
  }, []);

  // 监听 wheel / touchstart 标记用户主动滚动
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = () => markUserScroll();
    const onTouchStart = () => markUserScroll();
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      if (userScrollTimerRef.current) {
        clearTimeout(userScrollTimerRef.current);
      }
    };
  }, [markUserScroll]);

  // 当前行变化时自动滚动到容器中心
  React.useEffect(() => {
    if (activeIndex < 0) return;
    if (userScrollingRef.current) return;
    const container = containerRef.current;
    const activeEl = lineRefs.current[activeIndex];
    if (!container || !activeEl) return;
    
    const target =
      activeEl.offsetTop -
      container.clientHeight / 2 +
      activeEl.clientHeight / 2;
    
    // 使用 requestAnimationFrame 优化滚动性能
    let rafId: number;
    const animateScroll = () => {
      // 用户滚动时中止自动跟随
      if (userScrollingRef.current) return;
      const current = container.scrollTop;
      const diff = target - current;
      if (Math.abs(diff) < 1) {
        container.scrollTop = target;
        return;
      }
      container.scrollTop = current + diff * 0.2;
      rafId = requestAnimationFrame(animateScroll);
    };
    
    animateScroll();
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [activeIndex]);

  // 加载中状态
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-white/50">
        <p className="text-sm">歌词加载中…</p>
      </div>
    );
  }

  // 无歌词降级
  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-white/50">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Music2 className="h-10 w-10" />
        </motion.div>
        <p className="text-sm">暂无歌词</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-full overflow-y-auto no-scrollbar px-4",
        // 上下两端 mask 渐隐（兼容 -webkit- 前缀）
        "[mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]",
        "[-webkit-mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]"
      )}
    >
      {/* 上下留白让首尾行能滚到容器中心 */}
      <div className="flex min-h-full flex-col items-center justify-center gap-6 py-[35vh] text-center">
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          const isClicked = i === clickedIndex;
          const distance = Math.abs(i - activeIndex);
          // 当前行 1，非当前行按距离衰减（最低 0.25）
          const opacity = isActive
            ? 1
            : Math.max(0.25, 0.6 - distance * 0.08);
          return (
            <motion.button
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              type="button"
              onClick={() => handleSeek(i, line.time)}
              animate={{ scale: isActive ? 1.1 : 1, opacity }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              aria-current={isActive ? "true" : undefined}
              aria-label={`跳转到 ${formatLabelTime(line.time)}`}
              className={cn(
                "group relative max-w-full cursor-pointer rounded-lg px-2 transition-colors",
                isActive
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              )}
              style={
                isActive
                  ? { textShadow: "0 0 24px rgba(139,0,255,0.6)" }
                  : undefined
              }
            >
              {/* 点击闪光反馈层 */}
              {isClicked && (
                <motion.span
                  className="pointer-events-none absolute inset-0 -z-10 rounded-lg bg-primary-500/30"
                  initial={{ opacity: 0.8, scale: 0.9 }}
                  animate={{ opacity: 0, scale: 1.15 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              )}
              {/* 原文：空行用占位符避免高度塌陷 */}
              <span className="block text-lg font-semibold leading-relaxed drop-shadow-sm md:text-2xl md:leading-relaxed">
                {line.text || "···"}
              </span>
              {/* 译文：双语歌词，比原文小，颜色 primary-300 */}
              {line.translation && (
                <span
                  className={cn(
                    "mt-1 block text-sm font-normal md:text-base",
                    isActive ? "text-primary-300" : "text-white/50"
                  )}
                >
                  {line.translation}
                </span>
              )}
              {/* 悬停可点击提示（非当前行） */}
              {!isActive && (
                <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                  点击跳转
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/** 格式化秒为 mm:ss，用于 aria-label 无障碍提示 */
function formatLabelTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
