"use client";

import type { Howl as HowlType } from "howler";

import type { AudioEngine, AudioEngineEvents, LoadOptions } from "./engine";

/**
 * Howler.js 引擎实现（浏览器模式专用）
 *
 * 设计要点：
 * 1. Howler 实例放在模块作用域，不进入响应式 state、不参与序列化
 * 2. 构造器按需动态 import，规避 SSR 时 howler 访问 window
 * 3. html5: true 流式播放，适合 200MB 大文件
 * 4. playCallId 守卫并发 play 调用，避免竞态
 * 5. 预加载下一首（剩余 ≤ 30s 时预热），点击下一首时复用
 * 6. blob: URL 在 unload 时 revoke，避免内存泄漏
 *
 * 注意：本类只在浏览器模式使用，TWA 模式 player-store 不创建本实例。
 */

/** 预加载触发阈值（秒） */
const PRELOAD_THRESHOLD = 30;

/** Howler 构造器（懒加载） */
let HowlCtor: typeof HowlType | null = null;

/** 当前 Howl 实例 */
let howl: HowlType | null = null;

/** 进度轮询定时器 */
let progressTimer: ReturnType<typeof setInterval> | null = null;

/** 当前 howl 的 URL（用于卸载时 revoke blob: URL） */
let currentUrl: string | null = null;

/** play 调用计数器：检测并发 play 调用，避免竞态 */
let playCallId = 0;

/** 预加载 Howl 实例 */
let preloadHowl: HowlType | null = null;
let preloadUrl: string | null = null;

/** 当前音量（0~1） */
let currentVolume = 0.8;

/** 事件回调集合 */
let events: AudioEngineEvents | null = null;

/** 当前 duration（秒） */
let currentDuration = 0;

/** 当前 position（秒） */
let currentPosition = 0;

/** 动态加载 Howl 构造器 */
async function ensureHowlCtor(): Promise<typeof HowlType> {
  if (!HowlCtor) {
    const mod = await import("howler");
    HowlCtor = mod.Howl as unknown as typeof HowlType;
  }
  return HowlCtor;
}

/** 停止进度轮询 */
function stopProgressTimer(): void {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

/** 启动进度轮询：每 250ms 同步 position + 预加载下一曲 */
function startProgressTimer(onPreloadCheck: () => void): void {
  stopProgressTimer();
  progressTimer = setInterval(() => {
    if (!howl) return;
    currentPosition = (howl.seek() as number) || 0;
    events?.onTimeUpdate(currentPosition);
    onPreloadCheck();
  }, 250);
}

/** 预加载下一首（创建 Howl 实例但不播放，让浏览器缓存音频） */
async function preloadNextSong(
  url: string,
  headers?: Record<string, string>
): Promise<void> {
  try {
    clearPreload();
    const Howl = await ensureHowlCtor();
    // Howler 不直接支持自定义 headers，依靠 cookie / 同源鉴权
    // 若需要 Authorization，浏览器 fetch 已被 Service Worker / 代理处理
    preloadHowl = new Howl({
      src: [url],
      html5: true,
      preload: true,
      volume: 0, // 静音，仅用于预加载
    });
    preloadUrl = url;
  } catch {
    // 预加载失败静默处理
  }
}

/** 尝试复用预加载的 Howl 实例 */
function tryConsumePreload(url: string): HowlType | null {
  if (preloadUrl === url && preloadHowl) {
    const h = preloadHowl;
    preloadHowl = null;
    preloadUrl = null;
    return h;
  }
  return null;
}

/** 清理预加载实例 */
function clearPreload(): void {
  if (preloadHowl) {
    preloadHowl.unload();
    preloadHowl = null;
  }
  preloadUrl = null;
}

/** 卸载当前 Howl 实例 */
function unloadHowl(): void {
  stopProgressTimer();
  if (howl) {
    // 释放 blob: URL 避免内存泄漏
    if (currentUrl && currentUrl.startsWith("blob:")) {
      URL.revokeObjectURL(currentUrl);
    }
    currentUrl = null;
    howl.unload();
    howl = null;
  }
  currentDuration = 0;
  currentPosition = 0;
}

/**
 * HowlerEngine 实现
 * - 通过构造函数返回 AudioEngine 接口
 * - 闭包持有模块作用域变量，无需 this 状态
 */
export function createHowlerEngine(
  preloadCheckFn: () => [string, Record<string, string> | undefined] | null
): AudioEngine {
  return {
    type: "howler",

    async loadAndPlay(url: string, opts?: LoadOptions): Promise<void> {
      if (typeof window === "undefined") return;
      const myCallId = ++playCallId;

      const Howl = await ensureHowlCtor();
      unloadHowl();

      // 竞态保护：await 期间有新 play 调用接管则中止
      if (myCallId !== playCallId) return;

      currentUrl = url;

      // 尝试复用预加载实例
      const preloaded = tryConsumePreload(url);
      if (preloaded) {
        howl = preloaded;
        if (howl.duration() > 0) {
          currentDuration = howl.duration();
          events?.onLoad(currentDuration);
        } else {
          howl.once("load", () => {
            if (howl) {
              currentDuration = howl.duration() || 0;
              events?.onLoad(currentDuration);
            }
          });
        }
        howl.volume(currentVolume);
        howl.seek(opts?.startTime ?? 0);
      } else {
        howl = new Howl({
          src: [url],
          html5: true,
          volume: currentVolume,
          format: ["mp3", "flac", "wav", "ogg"],
        });
      }

      howl.on("load", () => {
        if (!howl) return;
        currentDuration = howl.duration() || 0;
        events?.onLoad(currentDuration);
      });
      howl.on("end", () => {
        events?.onEnd();
      });
      howl.on("loaderror", () => {
        events?.onError("音频加载失败");
      });
      howl.on("playerror", () => {
        events?.onError("播放失败");
      });
      howl.on("play", () => {
        events?.onPlay();
      });

      howl.play();
      startProgressTimer(() => {
        // 预加载检查
        if (currentDuration <= 0) return;
        const remaining = currentDuration - currentPosition;
        if (remaining > 0 && remaining <= PRELOAD_THRESHOLD) {
          const preload = preloadCheckFn();
          if (preload) {
            const [nextUrl, nextHeaders] = preload;
            if (nextUrl && nextUrl !== preloadUrl && nextUrl !== currentUrl) {
              void preloadNextSong(nextUrl, nextHeaders);
            }
          }
        }
      });
    },

    play(): void {
      if (!howl) return;
      howl.play();
      startProgressTimer(() => {
        if (currentDuration <= 0) return;
        const remaining = currentDuration - currentPosition;
        if (remaining > 0 && remaining <= PRELOAD_THRESHOLD) {
          const preload = preloadCheckFn();
          if (preload) {
            const [nextUrl, nextHeaders] = preload;
            if (nextUrl && nextUrl !== preloadUrl && nextUrl !== currentUrl) {
              void preloadNextSong(nextUrl, nextHeaders);
            }
          }
        }
      });
    },

    pause(): void {
      if (!howl) return;
      howl.pause();
      stopProgressTimer();
      events?.onPause();
    },

    seek(time: number): void {
      if (howl) howl.seek(time);
      currentPosition = time;
    },

    setVolume(volume: number): void {
      currentVolume = Math.min(1, Math.max(0, volume));
      if (howl) howl.volume(currentVolume);
    },

    getPosition(): number {
      return currentPosition;
    },

    getDuration(): number {
      return currentDuration;
    },

    unload(): void {
      unloadHowl();
      clearPreload();
    },

    setEvents(e: AudioEngineEvents): void {
      events = e;
    },

    preloadNext(url: string, opts?: { headers?: Record<string, string> }): void {
      void preloadNextSong(url, opts?.headers);
    },
  };
}
