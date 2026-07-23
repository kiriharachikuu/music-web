"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/store/player-store";

export interface ProgressBarProps {
  value: number;
  max: number;
  onSeek: (t: number) => void;
}

export function ProgressBar({ value, max, onSeek }: ProgressBarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [dragValue, setDragValue] = React.useState<number | null>(null);

  const currentValue = dragValue ?? value;
  const pct =
    max > 0 ? Math.min(100, Math.max(0, (currentValue / max) * 100)) : 0;

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
      /* ignore */
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
      /* ignore */
    }
    setDragging(false);
    setDragValue(null);
    if (t != null) onSeek(t);
  };

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
      className="group relative flex h-8 w-full cursor-pointer touch-none items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="absolute inset-x-0 h-1 rounded-full bg-white/15" />
      <div
        className="absolute left-0 h-1 rounded-full transition-all duration-150"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #8B00FF, #A855F7)",
        }}
      />
      <div
        className={cn(
          "absolute h-3 w-3 rounded-full bg-white shadow-lg transition-all duration-200",
          "group-hover:scale-110",
          dragging && "scale-125 shadow-xl"
        )}
        style={{
          left: `calc(${pct}% - 6px)`,
          boxShadow: dragging
            ? "0 0 12px rgba(139, 0, 255, 0.6), 0 4px 20px rgba(0, 0, 0, 0.3)"
            : "0 2px 8px rgba(0, 0, 0, 0.3)",
        }}
      />
    </div>
  );
}
