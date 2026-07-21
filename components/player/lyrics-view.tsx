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
  /** 点击非歌词区域时触发（移动端切换回封面视图） */
  onToggleView?: () => void;
  /** 是否已完成进入动画，完成后才启用 smooth 滚动，避免与抽屉动画抢资源 */
  animate?: boolean;
}

export function LyricsView({
  lrc,
  currentTime,
  onSeek,
  loading,
  onToggleView,
  animate = true,
}: LyricsViewProps) {
  // 解析歌词（按 lrc 文本缓存）
  const lines = React.useMemo<LyricLine[]>(
    () => (lrc ? parseLRC(lrc) : []),
    [lrc]
  );
  // 当前行索引：仅在真正变化时更新，避免每 200ms 全量重渲染
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const activeIndexRef = React.useRef(-1);

  React.useEffect(() => {
    if (!animate) return;
    const idx = findActiveLineIndex(lines, currentTime);
    if (idx !== activeIndexRef.current) {
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    }
  }, [lines, currentTime, animate]);

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

  // 监听 wheel / touchmove 标记用户主动滚动（touchstart 不标记，避免点击跳转误判）
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = () => markUserScroll();
    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const delta = Math.abs(e.touches[0].clientY - touchStartY);
      // 仅在有实质位移（>5px）时才标记为用户滚动
      if (delta > 5) markUserScroll();
    };
    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
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

    const containerRect = container.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    const target =
      container.scrollTop +
      (elRect.top - containerRect.top) -
      container.clientHeight / 2 +
      elRect.height / 2;

    const rafId = requestAnimationFrame(() => {
      if (userScrollingRef.current) return;
      container.scrollTo({
        top: target,
        behavior: animate ? "smooth" : "auto",
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [activeIndex, animate]);

  /** 容器点击：仅非按钮区域触发切换回封面（需在所有 early return 之前，React Hooks 规则） */
  const handleContainerClick = React.useCallback(
    (e: React.MouseEvent) => {
      if (!onToggleView) return;
      const target = e.target as HTMLElement;
      // 如果点击的是歌词行按钮或其内部元素，不触发切换
      if (target.closest("button")) return;
      onToggleView();
    },
    [onToggleView]
  );

  // 加载中状态
  if (loading) {
    return (
      <div
        className="flex h-full items-center justify-center text-white/50"
        onClick={onToggleView}
      >
        <p className="text-sm">歌词加载中…</p>
      </div>
    );
  }

  // 无歌词降级
  if (lines.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 text-white/50"
        onClick={onToggleView}
      >
        <div className="lyrics-pulse">
          <Music2 className="h-10 w-10" />
        </div>
        <p className="text-sm">暂无歌词</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleContainerClick}
      style={{
        willChange: "transform",
        transform: "translateZ(0)",
        contain: "paint layout",
      }}
      className={cn(
        "relative h-full overflow-y-auto no-scrollbar px-4",
        "[mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]",
        "[-webkit-mask-image:linear-gradient(to_bottom,transparent_0%,black_15%,black_85%,transparent_100%)]"
      )}
    >
      <div className="flex flex-col items-center gap-3 py-[50vh] max-w-3xl mx-auto md:items-start md:mx-0 md:max-w-none">
        {lines.map((line, i) => {
          const isActive = i === activeIndex;
          const isClicked = i === clickedIndex;
          const distance = Math.abs(i - activeIndex);
          const opacity = isActive
            ? 1
            : Math.max(0.25, 0.65 - distance * 0.05);
          return (
            <button
              key={i}
              ref={(el) => {
                lineRefs.current[i] = el;
              }}
              type="button"
              onClick={() => handleSeek(i, line.time)}
              aria-current={isActive ? "true" : undefined}
              aria-label={`跳转到 ${formatLabelTime(line.time)}`}
              className={cn(
                "group relative max-w-full cursor-pointer rounded-lg border-0 bg-transparent px-4 py-1.5 text-center transition-all duration-300 ease-out outline-none md:text-left",
                isActive
                  ? "text-white [transform:scale(1.1)]"
                  : "text-white/70 hover:text-white"
              )}
              style={{
                opacity,
                ...(isActive
                  ? {
                      textShadow:
                        "0 0 22px rgba(139,0,255,0.45), 0 0 8px rgba(255,255,255,0.18)",
                    }
                  : undefined),
              }}
            >
              <span className="block origin-center md:origin-left">
                <LyricLineContent line={line} isActive={isActive} isClicked={isClicked} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LyricLineContent({
  line,
  isActive,
  isClicked,
}: {
  line: LyricLine;
  isActive: boolean;
  isClicked: boolean;
}) {
  return (
    <>
      {/* 点击闪光反馈层 */}
      {isClicked && (
        <span className="lyrics-flash pointer-events-none absolute inset-0 -z-10 rounded-lg bg-primary/30" />
      )}
      {/* 原文：空行用占位符避免高度塌陷 */}
      <span
        className={cn(
          "block text-center text-lg font-semibold leading-relaxed drop-shadow-sm md:text-left md:text-2xl md:leading-relaxed",
          isActive && "font-bold"
        )}
      >
        {line.text || "···"}
      </span>
      {/* 译文：双语歌词，比原文小，颜色 primary-300 */}
      {line.translation && (
        <span
          className={cn(
            "mt-1 block text-center text-sm font-normal md:text-left md:text-base",
            isActive ? "text-primary/60" : "text-white/50"
          )}
        >
          {line.translation}
        </span>
      )}
      {/* 悬停可点击提示（非当前行） */}
      {!isActive && (
        <span className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 md:left-4 md:translate-x-0">
          点击跳转
        </span>
      )}
    </>
  );
}

/** 格式化秒为 mm:ss，用于 aria-label 无障碍提示 */
function formatLabelTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
