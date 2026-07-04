"use client";

import type { AudioEngine, AudioEngineEvents, LoadOptions } from "./engine";
import { androidBridge } from "@/lib/jsbridge/android-bridge";
import {
  setupNativeEventListeners,
  clearNativeEventListeners,
} from "@/lib/jsbridge/native-events";

/**
 * NativeEngine —— 原生 Media3 引擎实现（TWA 模式专用）
 *
 * 设计要点：
 * 1. 所有控制指令通过 androidBridge 转发到原生 MediaService
 * 2. 事件回调由原生通过 window.__nativePlayerEvents.onXxx() 主动推送
 *    （见 native-events.ts），通过 setupNativeEventListeners 注册
 * 3. getPosition / getDuration 返回缓存值，由原生 onTimeUpdate / onLoad 同步
 * 4. loadAndPlay 调用原生后立即返回，不等待加载完成
 * 5. metadata（title/artist/coverUrl）通过额外 androidBridge.setMetadata 传递
 *
 * 注意：本引擎仅在 TWA 模式（getPlatform().isTWA === true）下创建，浏览器模式不实例化
 */

/** 当前播放位置缓存（秒，由原生 onTimeUpdate 同步） */
let currentPosition = 0;

/** 当前曲目总时长缓存（秒，由原生 onLoad 同步） */
let currentDuration = 0;

/** 当前音量（0~1） */
let currentVolume = 0.8;

/** 当前已注册的事件回调集合（包装后存原始引用，便于 getPosition 同步） */
let rawEvents: AudioEngineEvents | null = null;

/**
 * 创建 NativeEngine 实例
 * - 返回 AudioEngine 接口实现
 * - 内部不持有状态，状态由原生 MediaService 维护
 */
export function createNativeEngine(): AudioEngine {
  return {
    type: "native",

    async loadAndPlay(url: string, opts?: LoadOptions): Promise<void> {
      if (typeof window === "undefined") return;
      if (!androidBridge.isAvailable()) return;

      // 重置缓存
      currentPosition = opts?.startTime ?? 0;
      currentDuration = 0;

      // 推送媒体元数据（用于原生通知 + 锁屏显示）
      if (opts?.metadata) {
        const { title, artist, coverUrl } = opts.metadata;
        androidBridge.setMetadata(title, artist, coverUrl ?? "");
      }

      // 调用原生加载并播放
      // startTime 单位：秒 → 转换为毫秒传给原生
      const startTimeMs = Math.max(0, Math.floor((opts?.startTime ?? 0) * 1000));
      androidBridge.loadAndPlay(url, opts?.headers, startTimeMs);
    },

    play(): void {
      androidBridge.play();
    },

    pause(): void {
      androidBridge.pause();
    },

    seek(time: number): void {
      // 缓存当前位置（避免原生 onTimeUpdate 延迟导致进度条回跳）
      currentPosition = time;
      androidBridge.seek(time);
    },

    setVolume(volume: number): void {
      currentVolume = Math.min(1, Math.max(0, volume));
      androidBridge.setVolume(currentVolume);
    },

    getPosition(): number {
      return currentPosition;
    },

    getDuration(): number {
      return currentDuration;
    },

    unload(): void {
      androidBridge.unload();
      // 清理事件回调（避免内存泄漏）
      rawEvents = null;
      clearNativeEventListeners();
      // 重置缓存
      currentPosition = 0;
      currentDuration = 0;
    },

    setEvents(events: AudioEngineEvents): void {
      // 包装事件回调：在 onLoad / onTimeUpdate 中同步缓存 position/duration
      // 让 getPosition / getDuration 可读
      rawEvents = events;
      setupNativeEventListeners({
        onPlay: () => events.onPlay(),
        onPause: () => events.onPause(),
        onEnd: () => events.onEnd(),
        onLoad: (duration) => {
          currentDuration = duration;
          events.onLoad(duration);
        },
        onTimeUpdate: (currentTime) => {
          currentPosition = currentTime;
          events.onTimeUpdate(currentTime);
        },
        onError: (message) => events.onError(message),
      });
    },

    preloadNext(url: string, opts?: { headers?: Record<string, string> }): void {
      androidBridge.preloadNext(url, opts?.headers);
    },
  };
}
