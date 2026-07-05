"use client";

import * as React from "react";

import { detectPlatform } from "@/lib/platform/detect";
import { androidBridge } from "@/lib/jsbridge/android-bridge";

const SAFE_AREA_VARS = {
  top: "--safe-area-top",
  bottom: "--safe-area-bottom",
  left: "--safe-area-left",
  right: "--safe-area-right",
} as const;

/**
 * 通过 probe 元素读取 env(safe-area-inset-*) 的真实计算值
 * getPropertyValue('env(...)') 不会解析 env()，必须用实际 DOM 元素
 */
function getEnvSafeAreaValues(): { top: number; bottom: number; left: number; right: number } {
  if (typeof window === "undefined") return { top: 0, bottom: 0, left: 0, right: 0 };
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;width:0;height:0;" +
    "padding-top:env(safe-area-inset-top,0px);" +
    "padding-bottom:env(safe-area-inset-bottom,0px);" +
    "padding-left:env(safe-area-inset-left,0px);" +
    "padding-right:env(safe-area-inset-right,0px)";
  document.documentElement.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const result = {
    top: parsePx(style.paddingTop),
    bottom: parsePx(style.paddingBottom),
    left: parsePx(style.paddingLeft),
    right: parsePx(style.paddingRight),
  };
  document.documentElement.removeChild(probe);
  return result;
}

function parsePx(str: string): number {
  const match = str.match(/^(\d+(?:\.\d+)?)px$/);
  return match ? parseFloat(match[1]) : 0;
}

function getAndroidStatusBarHeight(): number {
  const height = androidBridge.getStatusBarHeight();
  return height ? parseInt(height, 10) || 0 : 0;
}

function getAndroidNavigationBarHeight(): number {
  const height = androidBridge.getNavigationBarHeight();
  return height ? parseInt(height, 10) || 0 : 0;
}

function getInitialSafeArea(): { top: number; bottom: number; left: number; right: number } {
  if (typeof window === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }

  const platform = detectPlatform();
  const envValues = getEnvSafeAreaValues();

  let top = envValues.top;
  let bottom = envValues.bottom;
  let left = envValues.left;
  let right = envValues.right;

  if (platform.isTWA) {
    const statusBarHeight = getAndroidStatusBarHeight();
    const navBarHeight = getAndroidNavigationBarHeight();
    if (statusBarHeight > 0) {
      top = statusBarHeight;
    }
    if (navBarHeight > 0) {
      bottom = navBarHeight;
    }
  }

  // Android 浏览器：visualViewport.offsetTop 反映地址栏高度
  const visualViewport = window.visualViewport;
  if (platform.isAndroid && !platform.isTWA && visualViewport && top === 0) {
    const webViewTop = visualViewport.offsetTop;
    if (webViewTop > 0) {
      top = webViewTop;
    }
  }

  // iOS PWA：env() 未返回值时使用回退值（灵动岛机型 env() 正常返回）
  if (platform.isIOS && platform.isStandalone && top === 0) {
    top = 47;
  }

  return { top, bottom, left, right };
}

export function useSafeArea() {
  const [safeArea, setSafeArea] = React.useState<{
    top: number;
    bottom: number;
    left: number;
    right: number;
  }>(getInitialSafeArea());

  React.useEffect(() => {
    let rafId: number | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const updateSafeArea = () => {
      const platform = detectPlatform();
      const envValues = getEnvSafeAreaValues();

      let top = envValues.top;
      let bottom = envValues.bottom;
      let left = envValues.left;
      let right = envValues.right;

      if (platform.isTWA) {
        const androidStatusBarHeight = getAndroidStatusBarHeight();
        const androidNavBarHeight = getAndroidNavigationBarHeight();
        if (androidStatusBarHeight > 0) {
          top = androidStatusBarHeight;
        }
        if (androidNavBarHeight > 0) {
          bottom = androidNavBarHeight;
        }
      }

      // Android 浏览器：visualViewport.offsetTop 反映地址栏高度
      const visualViewport = window.visualViewport;
      if (platform.isAndroid && !platform.isTWA && visualViewport && top === 0) {
        const webViewTop = visualViewport.offsetTop;
        if (webViewTop > 0) {
          top = webViewTop;
        }
      }

      // iOS PWA：env() 未返回值时使用回退值
      if (platform.isIOS && platform.isStandalone && top === 0) {
        top = 47;
      }

      setSafeArea({ top, bottom, left, right });

      const html = document.documentElement;

      html.classList.remove("platform-twa", "platform-ios-pwa", "platform-android-browser", "platform-ios-browser", "platform-desktop");
      if (platform.isTWA) {
        html.classList.add("platform-twa");
      } else if (platform.isIOS && platform.isStandalone) {
        html.classList.add("platform-ios-pwa");
      } else if (platform.isIOS) {
        html.classList.add("platform-ios-browser");
      } else if (platform.isAndroid) {
        html.classList.add("platform-android-browser");
      } else {
        html.classList.add("platform-desktop");
      }

      const adjustRaw = window.getComputedStyle(html).getPropertyValue("--safe-area-top-adjust");
      const adjustPx = parsePx(adjustRaw.trim());
      const adjustedTop = top + adjustPx;

      html.style.setProperty(SAFE_AREA_VARS.top, `${Math.max(0, adjustedTop)}px`);
      html.style.setProperty(SAFE_AREA_VARS.bottom, `${bottom}px`);
      html.style.setProperty(SAFE_AREA_VARS.left, `${left}px`);
      html.style.setProperty(SAFE_AREA_VARS.right, `${right}px`);
    };

    updateSafeArea();

    const handleResize = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          updateSafeArea();
          rafId = null;
        });
      }, 100);
    };

    window.addEventListener("resize", handleResize, { passive: true });

    const vp = window.visualViewport;
    if (vp) {
      vp.addEventListener("resize", handleResize, { passive: true });
      vp.addEventListener("scroll", handleResize, { passive: true });
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (vp) {
        vp.removeEventListener("resize", handleResize);
        vp.removeEventListener("scroll", handleResize);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, []);

  return safeArea;
}
