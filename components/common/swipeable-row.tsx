"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * 可左滑删除的行组件（移动端专用）
 *
 * 使用方式：
 * ```tsx
 * <SwipeableRow onDelete={() => remove(id)}>
 *   <div>行内容...</div>
 * </SwipeableRow>
 * ```
 *
 * - 向左滑动超过阈值（80px）后松手 → 打开删除按钮
 * - 再次点击或向右滑动 → 关闭
 * - 仅水平滑动生效（垂直滚动不触发）
 * - 桌面端不启用（md:hidden 包裹）
 */
const ACTION_WIDTH = 80;
const THRESHOLD = 40;

export function SwipeableRow({
  children,
  onDelete,
  className,
}: {
  children: React.ReactNode;
  onDelete?: (() => void) | null;
  className?: string;
}) {
  // 未提供 onDelete 时直接渲染，不包裹滑动逻辑
  if (!onDelete) return <>{children}</>;
  const [offset, setOffset] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const startX = React.useRef(0);
  const startY = React.useRef(0);
  const dragging = React.useRef(false);
  const horizontal = React.useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    dragging.current = true;
    horizontal.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;

    // 首次移动判断方向：水平才拦截
    if (!horizontal.current) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dx) < Math.abs(dy)) {
        // 垂直滚动，不拦截
        dragging.current = false;
        return;
      }
      horizontal.current = true;
    }

    // 水平拖拽：计算偏移（已打开时基准为 -ACTION_WIDTH）
    const base = open ? -ACTION_WIDTH : 0;
    let next = base + dx;
    next = Math.min(0, Math.max(-ACTION_WIDTH, next));
    setOffset(next);
  };

  const handleTouchEnd = () => {
    if (!dragging.current && !horizontal.current) return;
    dragging.current = false;

    if (offset < -THRESHOLD) {
      // 滑过阈值 → 打开
      setOffset(-ACTION_WIDTH);
      setOpen(true);
    } else {
      // 未过阈值 → 关闭
      setOffset(0);
      setOpen(false);
    }
  };

  // 关闭打开状态（外部点击时）
  const handleClose = () => {
    setOffset(0);
    setOpen(false);
  };

  return (
    <div className="relative overflow-hidden">
      {/* 内容层 */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => open && handleClose()}
        className={cn("relative bg-background transition-transform", className)}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging.current ? "none" : "transform 0.25s ease",
        }}
      >
        {children}
      </div>

      {/* 删除按钮（固定在右侧） */}
      <button
        type="button"
        onClick={() => {
          handleClose();
          onDelete();
        }}
        className="absolute right-0 top-0 flex h-full w-[80px] items-center justify-center bg-red-500 text-sm font-medium text-white"
        style={{ opacity: open || offset < -5 ? 1 : 0 }}
        aria-label="删除"
      >
        删除
      </button>
    </div>
  );
}
