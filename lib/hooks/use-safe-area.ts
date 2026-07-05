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

function getEnvValue(key: keyof typeof SAFE_AREA_VARS): string {
  if (typeof window === "undefined") return "0px";
  const envKey = `safe-area-inset-${key}`;
  return window.getComputedStyle(document.documentElement).getPropertyValue(`env(${envKey})`) || "0px";
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

  let top = parsePx(getEnvValue("top"));
  let bottom = parsePx(getEnvValue("bottom"));
  let left = parsePx(getEnvValue("left"));
  let right = parsePx(getEnvValue("right"));

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

  const visualViewport = window.visualViewport;
  if (platform.isAndroid && !platform.isTWA && visualViewport) {
    const webViewTop = visualViewport.offsetTop + visualViewport.scale;
    if (webViewTop > 0 && top === 0) {
      top = webViewTop;
    }
  }

  if (visualViewport) {
    const viewportTop = visualViewport.offsetTop;
    if (viewportTop > 0 && top === 0) {
      top = viewportTop;
    }
  }

  if (platform.isIOS) {
    const defaultSafariTop = 44;
    const defaultPwaTop = 47;
    if (top === 0) {
      top = platform.isStandalone ? defaultPwaTop : defaultSafariTop;
    }
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

      let top = parsePx(getEnvValue("top"));
      let bottom = parsePx(getEnvValue("bottom"));
      let left = parsePx(getEnvValue("left"));
      let right = parsePx(getEnvValue("right"));

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

      const visualViewport = window.visualViewport;
      if (platform.isAndroid && !platform.isTWA && visualViewport) {
        const webViewTop = visualViewport.offsetTop + visualViewport.scale;
        if (webViewTop > 0 && top === 0) {
          top = webViewTop;
        }
      }

      if (visualViewport) {
        const viewportTop = visualViewport.offsetTop;
        if (viewportTop > 0 && top === 0) {
          top = viewportTop;
        }
      }

      if (platform.isIOS) {
        const defaultSafariTop = 44;
        const defaultPwaTop = 47;
        if (top === 0) {
          top = platform.isStandalone ? defaultPwaTop : defaultSafariTop;
        }
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
