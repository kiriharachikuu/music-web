/**
 * XingTone —— 运行时平台检测
 *
 * 判定维度：
 * - isDesktopApp：window.__XINGTONE_DESKTOP__（Electron 桌面客户端预加载脚本注入）
 * - isTWA：window.AndroidJSBridge 是否注入（自制增强 TWA 标识）
 * - isStandalone：display-mode: standalone 或 navigator.standalone（PWA 安装态）
 * - isIOS / isAndroid / isDesktop：UA 推断
 *
 * 综合平台：
 * - "desktop"      : Electron 桌面客户端（Windows / macOS / Linux）
 * - "twa"          : 已注入 AndroidJSBridge，原生接管播放
 * - "browser-pwa"  : 浏览器以 standalone 模式运行（PWA 已安装）
 * - "browser"      : 普通浏览器（含未安装 PWA 的移动端）
 *
 * SSR 安全：所有访问均做 typeof window 检查
 */

export type Platform = "desktop" | "twa" | "browser-pwa" | "browser";

export interface PlatformInfo {
  platform: Platform;
  /** 是否处于 standalone 模式（display-mode: standalone 或 iOS Safari navigator.standalone） */
  isStandalone: boolean;
  /** 是否为自制增强 TWA（注入了 AndroidJSBridge） */
  isTWA: boolean;
  /** 是否为 Electron 桌面客户端 */
  isElectron: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  /** UA 字符串（小写），用于调试；SSR 返回空串 */
  ua: string;
}

/**
 * 检测 AndroidJSBridge 是否已注入
 * - 由 music-twa/ JsBridge.kt 通过 WebView.addJavascriptInterface(jsBridge, "AndroidJSBridge") 注入
 */
export function isAndroidJSBridgeAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as unknown as { AndroidJSBridge?: unknown }).AndroidJSBridge !==
      "undefined"
  );
}

/**
 * 检测是否运行在 Electron 桌面客户端中
 * - 由 music-desktop 的 preload 脚本注入 window.__XINGTONE_DESKTOP__ = true
 */
export function isElectronApp(): boolean {
  return (
    typeof window !== "undefined" &&
    (window as unknown as { __XINGTONE_DESKTOP__?: boolean }).__XINGTONE_DESKTOP__ === true
  );
}

/**
 * 检测当前是否处于 standalone 模式
 * - 标准 PWA：window.matchMedia("(display-mode: standalone)")
 * - iOS Safari（不完整支持 display-mode）：navigator.standalone
 */
export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (
      window.matchMedia &&
      window.matchMedia("(display-mode: standalone)").matches
    ) {
      return true;
    }
  } catch {
    // 部分浏览器对 matchMedia 支持不完整，忽略
  }
  // iOS Safari 特性
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** 推断 UA 设备类型 */
function detectDevice(ua: string): {
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
} {
  if (!ua) return { isIOS: false, isAndroid: false, isDesktop: true };
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /android/.test(ua);
  return {
    isIOS,
    isAndroid,
    isDesktop: !isIOS && !isAndroid,
  };
}

/** 全屏检测缓存（同一次会话内不变） */
let _cached: PlatformInfo | null = null;

/**
 * 完整平台检测（不缓存，每次调用都重读）
 * - 用于需要实时感知平台切换的场景（极少）
 */
export function detectPlatform(): PlatformInfo {
  if (typeof window === "undefined") {
    return {
      platform: "browser",
      isStandalone: false,
      isTWA: false,
      isElectron: false,
      isIOS: false,
      isAndroid: false,
      isDesktop: true,
      ua: "",
    };
  }
  const ua = navigator.userAgent.toLowerCase();
  const { isIOS, isAndroid, isDesktop } = detectDevice(ua);
  const isElectron = isElectronApp();
  const isTWA = isAndroidJSBridgeAvailable();
  const isStandalone = isStandaloneMode();

  let platform: Platform;
  if (isElectron) {
    platform = "desktop";
  } else if (isTWA) {
    platform = "twa";
  } else if (isStandalone) {
    platform = "browser-pwa";
  } else {
    platform = "browser";
  }

  return {
    platform,
    isStandalone,
    isTWA,
    isElectron,
    isIOS,
    isAndroid,
    // Electron 桌面客户端强制 isDesktop=true（UA 可能是 Chromium 而非传统桌面 UA）
    isDesktop: isElectron || isDesktop,
    ua,
  };
}

/**
 * 获取平台信息（带缓存，推荐入口）
 * - 一次会话内只检测一次，后续直接返回缓存
 * - 平台切换（如安装 PWA 后刷新）需要重新加载页面才会生效
 */
export function getPlatform(): PlatformInfo {
  if (!_cached) {
    _cached = detectPlatform();
  }
  return _cached;
}

/** 重置缓存（仅用于测试） */
export function _resetPlatformCache(): void {
  _cached = null;
}
