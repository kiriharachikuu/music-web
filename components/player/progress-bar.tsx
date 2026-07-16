"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/store/player-store";

/**
 * 横向进度条：支持点击跳转 + 拖拽跳转
 * - 已播放部分：from-primary-600 to-primary-700 线性渐变
 * - 拖拽圆点：白边 + primary-700 实心
 * - 使用 Pointer Events + setPointerCapture 保证拖拽中不丢失指针
 */
export interface ProgressBarProps {
  value: number;
  max: number;
  onSeek: (t: number) => void;
}

export function ProgressBar({ value, max, onSeek }: ProgressBarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [dragValue, setDragValue] = React.useState<number | null>(null);

  // 拖拽中显示 dragValue，松开后提交 onSeek
  const currentValue = dragValue ?? value;
  const pct =
    max > 0 ? Math.min(100, Math.max(0, (currentValue / max) * 100)) : 0;

  // 根据 clientX 计算对应时间
  const calcTime = React.useCallback(
    (clientX: number): number | null => {
      const el = ref.current;
      if (!el || max <= 0) return null;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width)
      );
      return ratio * max;
    },
    [max]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (max <= 0) return;
    e.preventDefault();
    const t = calcTime(e.clientX);
    if (t == null) return;
    setDragging(true);
    setDragValue(t);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* 忽略 capture 失败 */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const t = calcTime(e.clientX);
    if (t == null) return;
    setDragValue(t);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const t = calcTime(e.clientX);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* 忽略 release 失败 */
    }
    setDragging(false);
    setDragValue(null);
    if (t != null) onSeek(t);
  };

  // 键盘可达性：方向键步进 5 秒，Home/End 跳到首尾
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (max <= 0) return;
    let t: number | null = null;
    switch (e.key) {
      case "ArrowLeft":
        t = Math.max(0, currentValue - 5);
        break;
      case "ArrowRight":
        t = Math.min(max, currentValue + 5);
        break;
      case "Home":
        t = 0;
        break;
      case "End":
        t = max;
        break;
      default:
        return;
    }
    e.preventDefault();
    onSeek(t);
  };

  return (
    <div
      ref={ref}
      role="slider"
      tabIndex={0}
      aria-label="播放进度"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={currentValue}
      aria-valuetext={`${formatTime(currentValue)} / ${formatTime(max)}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      className="group relative flex h-6 w-full cursor-pointer touch-none items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
    >
      {/* 轨道 */}
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/20" />
      {/* 已播放填充：主题渐变 */}
      <div
        className="absolute left-0 h-1.5 rounded-full progress-fill"
        style={{ width: `${pct}%` }}
      />
      {/* 拖拽圆点：白边 + 主题色实心 */}
      <div
        className={cn(
          "absolute h-4 w-4 rounded-full border-2 border-white bg-primary shadow-md transition-transform",
          "group-hover:scale-110",
          dragging && "scale-125"
        )}
        style={{ left: `calc(${pct}% - 8px)` }}
      />
    </div>
  );
}
