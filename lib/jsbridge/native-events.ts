/**
 * XingTone —— 原生事件回调注册中心
 *
 * 原生 music-twa/ MediaService.kt 通过 WebView.evaluateJavascript 主动推送播放状态：
 *   webView.evaluateJavascript("window.__nativePlayerEvents.onPlay()", null)
 *   webView.evaluateJavascript("window.__nativePlayerEvents.onTimeUpdate(30000)", null)
 *   ...
 *
 * 本模块负责：
 * 1. 在 window 上挂载 __nativePlayerEvents 对象（仅注册一次，幂等）
 * 2. 提供 setupNativeEventListeners(events) 让 NativeEngine 注册回调集合
 * 3. 暴露的 onXxx 方法将原生参数（毫秒）转换为秒后转发给回调
 * 4. 所有回调 try/catch 容错，避免单个回调异常影响其他回调
 *
 * 时间单位约定：原生传毫秒（Media3 currentPosition 是毫秒），转换为秒后再回调给 NativeEngine
 */

import type { AudioEngineEvents } from "@/lib/audio-engine/engine";

/** 原生通过 evaluateJavascript 调用的事件接口（参数单位：毫秒） */
export interface NativePlayerEvents {
  /** 实际开始播放 */
  onPlay(): void;
  /** 暂停 */
  onPause(): void;
  /** 当前曲目播放结束 */
  onEnd(): void;
  /** 加载完成，durationMs 为总时长（毫秒） */
  onLoad(durationMs: number): void;
  /** 播放进度更新，currentMs 为当前位置（毫秒） */
  onTimeUpdate(currentMs: number): void;
  /** 错误，message 用于 Toast 提示 */
  onError(message: string): void;
  /** 通知栏/锁屏：下一曲 */
  onSkipToNext(): void;
  /** 通知栏/锁屏：上一曲 */
  onSkipToPrevious(): void;
  /** APK 安装成功 */
  onApkInstalled(): void;
  /** APK 安装失败，msg 为失败原因 */
  onApkInstallFailed(msg: string): void;
  /** 歌曲下载完成，songId 为歌曲 ID，size 为文件大小（字节） */
  onDownloadComplete(songId: string, size: number): void;
  /** 歌曲下载失败，songId 为歌曲 ID，msg 为失败原因 */
  onDownloadError(songId: string, msg: string): void;
}

declare global {
  interface Window {
    __nativePlayerEvents?: NativePlayerEvents;
  }
}

/** 当前注册的事件回调集合（由 NativeEngine 通过 setupNativeEventListeners 设置） */
let currentEvents: AudioEngineEvents | null = null;

/** APK 安装相关额外回调（由 update-dialog 注册，独立于 AudioEngine 事件流） */
interface ApkInstallListeners {
  onInstalled?: () => void;
  onFailed?: (msg: string) => void;
}
let apkListeners: ApkInstallListeners = {};

/** 下载相关回调（由 download.ts 注册） */
interface DownloadListeners {
  onComplete?: (songId: string, size: number) => void;
  onError?: (songId: string, msg: string) => void;
}
let downloadListeners: DownloadListeners = {};

/**
 * 在 window 上注册 __nativePlayerEvents 对象（幂等，仅注册一次）
 * - NativeEngine 模块加载时自动调用
 */
function ensureNativeEventsRegistered(): void {
  if (typeof window === "undefined") return;
  if (window.__nativePlayerEvents) return;

  window.__nativePlayerEvents = {
    onPlay(): void {
      try {
        currentEvents?.onPlay();
      } catch {
        // 容错
      }
    },
    onPause(): void {
      try {
        currentEvents?.onPause();
      } catch {
        // 容错
      }
    },
    onEnd(): void {
      try {
        currentEvents?.onEnd();
      } catch {
        // 容错
      }
    },
    onLoad(durationMs: number): void {
      try {
        // 原生传毫秒，转换为秒
        const durationSec = durationMs > 0 ? durationMs / 1000 : 0;
        currentEvents?.onLoad(durationSec);
      } catch {
        // 容错
      }
    },
    onTimeUpdate(currentMs: number): void {
      try {
        // 原生传毫秒，转换为秒
        const currentSec = currentMs > 0 ? currentMs / 1000 : 0;
        currentEvents?.onTimeUpdate(currentSec);
      } catch {
        // 容错
      }
    },
    onError(message: string): void {
      try {
        currentEvents?.onError(message);
      } catch {
        // 容错
      }
    },
    onSkipToNext(): void {
      try {
        currentEvents?.onSkipToNext?.();
      } catch {
        // 容错
      }
    },
    onSkipToPrevious(): void {
      try {
        currentEvents?.onSkipToPrevious?.();
      } catch {
        // 容错
      }
    },
    onApkInstalled(): void {
      try {
        apkListeners.onInstalled?.();
      } catch {
        // 容错
      }
    },
    onApkInstallFailed(msg: string): void {
      try {
        apkListeners.onFailed?.(msg);
      } catch {
        // 容错
      }
    },
    onDownloadComplete(songId: string, size: number): void {
      try {
        downloadListeners.onComplete?.(songId, size);
      } catch {
        // 容错
      }
    },
    onDownloadError(songId: string, msg: string): void {
      try {
        downloadListeners.onError?.(songId, msg);
      } catch {
        // 容错
      }
    },
  };
}

/**
 * 注册 AudioEngine 事件回调（供 NativeEngine 使用）
 * - 每次调用替换整个回调集合（仅最新一次生效）
 * - 自动确保 __nativePlayerEvents 已挂载到 window
 */
export function setupNativeEventListeners(
  events: AudioEngineEvents
): void {
  ensureNativeEventsRegistered();
  currentEvents = events;
}

/**
 * 注册 APK 安装结果回调（供 update-dialog 使用，独立于 AudioEngine 事件流）
 * - 与 setupNativeEventListeners 解耦，避免 NativeEngine 重绑事件时丢失 APK 回调
 */
export function setupApkInstallListeners(listeners: ApkInstallListeners): void {
  ensureNativeEventsRegistered();
  apkListeners = listeners;
}

/**
 * 注册下载结果回调（供 download.ts 使用，独立于 AudioEngine 事件流）
 */
export function setupDownloadListeners(listeners: DownloadListeners): void {
  ensureNativeEventsRegistered();
  downloadListeners = listeners;
}

/**
 * 清理所有事件回调（用于 NativeEngine.unload）
 * - 仅清空 AudioEngine 事件，APK 安装和下载回调保留
 */
export function clearNativeEventListeners(): void {
  currentEvents = null;
}
