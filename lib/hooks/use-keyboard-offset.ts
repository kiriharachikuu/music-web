"use client";
import * as React from "react";

/**
 * 监听软键盘弹出，返回键盘遮挡高度（px）。
 * 基于 visualViewport API：layout viewport - visual viewport = 键盘高度。
 * 仅在输入框聚焦时键盘弹出，visualViewport.height 会小于 window.innerHeight。
 */
export function useKeyboardOffset(): number {
  const [offset, setOffset] = React.useState(0);

  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const layoutHeight = window.innerHeight;
      const visualHeight = vv.height;
      // visualViewport 顶部偏移（键盘弹出时通常为 0）
      const keyboard = layoutHeight - visualHeight - vv.offsetTop;
      setOffset(keyboard > 0 ? keyboard : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}
