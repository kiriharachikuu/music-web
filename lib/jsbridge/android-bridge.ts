/**
 * XingTone —— AndroidJSBridge 类型声明与封装
 *
 * 由 music-twa/ JsBridge.kt 通过 WebView.addJavascriptInterface(jsBridge, "AndroidJSBridge")
 * 注入到 window 上下文。所有方法带 @JavascriptInterface 注解，由 WebView 自动暴露。
 *
 * 调用约定：
 * - 全部同步返回 void / 字符串，不阻塞 JS 线程
 * - 实际状态变化通过 WebView.evaluateJavascript("window.__nativePlayerEvents.onXxx()") 回传
 * - 见 native-events.ts 注册的 window.__nativePlayerEvents
 *
 * SSR 安全：所有访问做 typeof window 检查，服务端渲染时 isAvailable() 返回 false
 */

/** 原生注入的 JSBridge 接口（与 music-twa/ JsBridge.kt 的 @JavascriptInterface 方法一一对应） */
export interface AndroidJSBridge {
  /** 加载并播放指定 URL（http(s):// 或 blob:），headersJson 为 JSON 字符串，startTimeMs 为起始位置 */
  loadAndPlay(url: string, headersJson: string, startTimeMs: number): void;
  /** 继续播放（已暂停） */
  play(): void;
  /** 暂停 */
  pause(): void;
  /** 跳转到指定位置（毫秒） */
  seek(ms: number): void;
  /** 设置音量 0~1 */
  setVolume(volume: number): void;
  /** 卸载当前实例，释放原生资源 */
  unload(): void;
  /** 预加载下一首（不播放，仅预热网络/磁盘） */
  preloadNext(url: string, headersJson: string): void;
  /** 设置媒体元数据（用于原生通知 + 锁屏显示） */
  setMetadata(title: string, artist: string, coverUrl: string): void;
  /** 触发 APK 下载 + 安装对话框（downloadUrl 直链，md5 可选校验） */
  installApk(downloadUrl: string, md5: string | null): void;
  /** 获取原生 BuildConfig.VERSION_CODE（供版本检查使用） */
  getAppVersionCode(): string;
  /** 获取 JSBridge 接口版本（用于兼容性降级） */
  getBridgeVersion(): string;
  /** 退出 App（finishAffinity） */
  exitApp(): void;
  /** 获取状态栏高度（像素），用于 WebView safe-area 适配 */
  getStatusBarHeight(): string;
  /** 获取底部导航栏高度（像素），用于 WebView safe-area 适配 */
  getNavigationBarHeight(): string;
}

declare global {
  interface Window {
    AndroidJSBridge?: AndroidJSBridge;
  }
}

/**
 * 安全获取原生 Bridge 实例
 * - SSR 或非 TWA 环境返回 null
 */
function getNativeBridge(): AndroidJSBridge | null {
  if (typeof window === "undefined") return null;
  return window.AndroidJSBridge ?? null;
}

/** 将 headers 对象序列化为 JSON 字符串（原生侧 JSONObject 解析） */
function serializeHeaders(headers?: Record<string, string>): string {
  return headers ? JSON.stringify(headers) : "{}";
}

/**
 * AndroidJSBridge 封装入口
 * - 所有方法先 isAvailable() 守卫，避免非 TWA 环境误调
 * - 调用失败静默处理（原生层负责回传 onError）
 */
export const androidBridge = {
  /** 是否可用（已注入原生 Bridge） */
  isAvailable(): boolean {
    return getNativeBridge() !== null;
  },

  /** 获取 JSBridge 接口版本（用于兼容性降级，老版本 TWA 不支持新方法） */
  getBridgeVersion(): string {
    const bridge = getNativeBridge();
    if (!bridge) return "";
    try {
      return bridge.getBridgeVersion();
    } catch {
      return "";
    }
  },

  /** 获取原生 App versionCode（TWA 模式优先使用，浏览器模式回退 env） */
  getAppVersionCode(): string {
    const bridge = getNativeBridge();
    if (!bridge) return "";
    try {
      return bridge.getAppVersionCode();
    } catch {
      return "";
    }
  },

  /**
   * 加载并播放指定 URL
   * @param url http(s):// 网络地址或 blob: 本地地址
   * @param headers 鉴权头（如 Authorization），blob: 时可省略
   * @param startTimeMs 起始位置（毫秒），断点续播用
   */
  loadAndPlay(
    url: string,
    headers: Record<string, string> | undefined,
    startTimeMs: number
  ): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.loadAndPlay(url, serializeHeaders(headers), startTimeMs);
    } catch {
      // 原生异常由 onError 回传，JS 侧静默
    }
  },

  /** 继续播放 */
  play(): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.play();
    } catch {
      // 静默
    }
  },

  /** 暂停 */
  pause(): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.pause();
    } catch {
      // 静默
    }
  },

  /** 跳转（秒，内部转毫秒传给原生） */
  seek(seconds: number): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.seek(Math.max(0, Math.floor(seconds * 1000)));
    } catch {
      // 静默
    }
  },

  /** 设置音量 0~1 */
  setVolume(volume: number): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.setVolume(Math.min(1, Math.max(0, volume)));
    } catch {
      // 静默
    }
  },

  /** 卸载当前实例 */
  unload(): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.unload();
    } catch {
      // 静默
    }
  },

  /** 预加载下一首 */
  preloadNext(
    url: string,
    headers: Record<string, string> | undefined
  ): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.preloadNext(url, serializeHeaders(headers));
    } catch {
      // 静默
    }
  },

  /** 设置媒体元数据（用于原生通知 + 锁屏显示） */
  setMetadata(title: string, artist: string, coverUrl: string): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.setMetadata(title, artist, coverUrl);
    } catch {
      // 静默
    }
  },

  /**
   * 触发 APK 下载 + 安装
   * @param downloadUrl APK 直链
   * @param md5 可选 MD5 校验值
   */
  installApk(downloadUrl: string, md5: string | null): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.installApk(downloadUrl, md5);
    } catch {
      // 静默
    }
  },

  /** 退出 App */
  exitApp(): void {
    const bridge = getNativeBridge();
    if (!bridge) return;
    try {
      bridge.exitApp();
    } catch {
      // 静默
    }
  },

  /** 获取状态栏高度（像素），用于 WebView safe-area 适配 */
  getStatusBarHeight(): string {
    const bridge = getNativeBridge();
    if (!bridge) return "";
    try {
      return bridge.getStatusBarHeight();
    } catch {
      return "";
    }
  },

  /** 获取底部导航栏高度（像素），用于 WebView safe-area 适配 */
  getNavigationBarHeight(): string {
    const bridge = getNativeBridge();
    if (!bridge) return "";
    try {
      return bridge.getNavigationBarHeight();
    } catch {
      return "";
    }
  },
};
