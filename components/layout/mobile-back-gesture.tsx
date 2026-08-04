"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";

/**
 * 移动端边缘滑动返回手势
 *
 * 仿 iOS 全面屏边缘返回交互：
 * - 从屏幕左边缘 30px 区域开始向右滑动触发
 * - 滑动时主内容区域跟随手指向右移动（阻尼效果）
 * - 松手时滑动距离超过阈值（100px）则执行返回
 * - 仅在移动端非一级页面启用
 * - 不干扰垂直滚动（要求水平位移 > 垂直位移）
 * - passive 事件监听，不阻止任何触摸行为
 */

/** 一级页面路径（无需返回手势） */
const TOP_LEVEL_PATHS = [
  "/",
  "/rankings",
  "/live-sessions",
  "/library",
  "/search",
  "/profile",
  "/download",
  "/about",
];

/** 左边缘触发区域宽度 */
const EDGE_WIDTH = 30;
/** 触发返回的最小滑动距离 */
const THRESHOLD = 100;
/** 最大跟随位移 */
const MAX_TRANSLATE = 200;
/** 阻尼系数（内容跟随手指的比率） */
const DAMPING = 0.4;

export function MobileBackGesture() {
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const isTopLevel = TOP_LEVEL_PATHS.includes(pathname);
    // 仅移动端非一级页面启用
    if (!isMobile || isTopLevel) return;

    let startX = 0;
    let startY = 0;
    let tracking = false;
    let horizontalConfirmed = false;

    const onTouchStart = (e: TouchEvent) => {
      // 只追踪单指触摸
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      // 仅在左边缘区域触发
      if (touch.clientX <= EDGE_WIDTH) {
        startX = touch.clientX;
        startY = touch.clientY;
        tracking = true;
        horizontalConfirmed = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // 判断滑动方向：水平为主时确认跟踪
      if (!horizontalConfirmed) {
        if (deltaX > 10 && deltaX > Math.abs(deltaY)) {
          horizontalConfirmed = true;
        } else if (Math.abs(deltaY) > 10) {
          // 垂直滑动，取消跟踪
          tracking = false;
          return;
        }
      }

      if (!horizontalConfirmed || deltaX <= 0) return;

      // 视觉反馈：主内容跟随手指向右移动（阻尼）
      const main = document.getElementById("main-content");
      if (main) {
        const translate = Math.min(deltaX * DAMPING, MAX_TRANSLATE);
        main.style.transform = `translateX(${translate}px)`;
        main.style.transition = "none";
        // 添加阴影增强层次感
        const opacity = Math.min(deltaX / THRESHOLD, 0.3);
        main.style.boxShadow = `-${translate * 2}px 0 ${translate * 0.5}px rgba(0,0,0,${opacity})`;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - startX;

      const main = document.getElementById("main-content");
      if (main) {
        main.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), box-shadow 0.3s ease-out";
        main.style.transform = "";
        main.style.boxShadow = "";
        // 清除 transition（延迟执行，等动画完成）
        setTimeout(() => {
          if (main) {
            main.style.transition = "";
          }
        }, 350);
      }

      // 超过阈值触发返回
      if (horizontalConfirmed && deltaX > THRESHOLD) {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }

      tracking = false;
      horizontalConfirmed = false;
    };

    // passive: true 确保不阻塞页面滚动
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
      // 清理残留样式
      const main = document.getElementById("main-content");
      if (main) {
        main.style.transform = "";
        main.style.boxShadow = "";
        main.style.transition = "";
      }
    };
  }, [pathname, router]);

  return null;
}
