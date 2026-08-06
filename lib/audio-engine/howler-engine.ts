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
    try {
      if (!howl) return;
      // howl.seek() 在 howl 被 unload 或 audio 元素被浏览器回收时可能抛 TypeError
      const pos = howl.seek();
      currentPosition = (typeof pos === "number" && Number.isFinite(pos)) ? pos : 0;
      events?.onTimeUpdate(currentPosition);
      onPreloadCheck();
    } catch {
      // 静默失败：下一帧再继续，避免 setInterval 回调抛错冒泡到 global-error
      currentPosition = 0;
    }
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
    // 预加载实例也需补齐 playsinline，复用时直接可用
    ensureIOSBackgroundPlay(preloadHowl);
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
    detachIOSAudioNode(preloadHowl);
    preloadHowl.unload();
    preloadHowl = null;
  }
  preloadUrl = null;
}

/**
 * 给 Howler 内部 HTML5 audio 元素补齐 iOS 后台播放所需属性
 *
 * 根因：Howler 2.x 既不设置 playsinline，也不把 <audio> 附加到 DOM。
 * - 缺少 playsinline：iOS PWA 进入后台（锁屏/切 app）会暂停音频
 * - audio 不在 DOM：iOS WebKit 对游离 audio 元素的后台播放支持不稳定
 *
 * 通过 Howler 私有 API _sounds[0]._node 访问内部 audio 元素，
 * 设置 playsinline / webkit-playsinline，并在未附加时挂到 document.body（隐藏）。
 */
function ensureIOSBackgroundPlay(h: HowlType): void {
  try {
    const sounds = (h as unknown as {
      _sounds?: Array<{ _node?: HTMLAudioElement }>;
    })._sounds;
    if (!sounds || !sounds[0] || !sounds[0]._node) return;
    const node = sounds[0]._node;
    node.setAttribute("playsinline", "true");
    node.setAttribute("webkit-playsinline", "true");
    if (!node.parentNode) {
      node.style.display = "none";
      document.body.appendChild(node);
    }
  } catch {
    // Howler 内部 API 变化时静默失败，不影响正常播放
  }
}

/** 从 DOM 移除 Howler 内部 audio 元素（unload 时清理） */
function detachIOSAudioNode(h: HowlType): void {
  try {
    const sounds = (h as unknown as {
      _sounds?: Array<{ _node?: HTMLAudioElement }>;
    })._sounds;
    if (!sounds || !sounds[0] || !sounds[0]._node) return;
    const node = sounds[0]._node;
    if (node.parentNode) {
      node.parentNode.removeChild(node);
    }
  } catch {
    // noop
  }
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
    // 移除附加到 DOM 的 iOS audio 元素
    detachIOSAudioNode(howl);
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

      try {
        const Howl = await ensureHowlCtor();
        unloadHowl();

        // 竞态保护：await 期间有新 play 调用接管则中止
        if (myCallId !== playCallId) return;

        currentUrl = url;

        // 尝试复用预加载实例
        const preloaded = tryConsumePreload(url);
        // 标记是否已为 load 事件注册过回调，避免复用预加载实例时 onLoad 重复触发
        let loadHandlerRegistered = false;
        if (preloaded) {
          howl = preloaded;
          if (howl.duration() > 0) {
            currentDuration = howl.duration();
            events?.onLoad(currentDuration);
            // 已加载完成，后续 howl.on("load") 不会再触发，无需注册
            loadHandlerRegistered = true;
          } else {
            // 预加载实例尚未加载完成，用 once 处理首次 load 事件
            howl.once("load", () => {
              try {
                if (howl) {
                  currentDuration = howl.duration() || 0;
                  events?.onLoad(currentDuration);
                }
              } catch { /* noop */ }
            });
            loadHandlerRegistered = true;
          }
          howl.volume(currentVolume);
          try { howl.seek(opts?.startTime ?? 0); } catch { /* noop */ }
        } else {
          howl = new Howl({
            src: [url],
            html5: true,
            volume: currentVolume,
            format: ["mp3", "flac", "wav", "ogg"],
          });
        }

        // iOS 后台播放：补齐 playsinline 属性并将 audio 元素附加到 DOM
        // Howler 2.x 不设置 playsinline 也不附加 DOM，导致 iOS PWA 后台音频中断
        ensureIOSBackgroundPlay(howl);

        // 仅在未注册过 load 回调时注册（新建实例的情况）
        if (!loadHandlerRegistered) {
          howl.on("load", () => {
            try {
              if (!howl) return;
              currentDuration = howl.duration() || 0;
              // 断点续播：加载完成后 seek 到 startTime（音质切换/恢复播放场景）
              if (opts?.startTime && opts.startTime > 0) {
                try { howl.seek(opts.startTime); currentPosition = opts.startTime; } catch { /* noop */ }
              }
              events?.onLoad(currentDuration);
            } catch { /* noop */ }
          });
        }
        howl.on("end", () => {
          try { events?.onEnd(); } catch { /* noop */ }
        });
        howl.on("loaderror", () => {
          try { events?.onError("音频加载失败"); } catch { /* noop */ }
        });
        howl.on("playerror", () => {
          try { events?.onError("播放失败"); } catch { /* noop */ }
        });
        howl.on("play", () => {
          try { events?.onPlay(); } catch { /* noop */ }
        });

        try { howl.play(); } catch (err) {
          // 浏览器自动播放策略或移动端切回前台时 play() 可能同步抛 DOMException
          events?.onError(
            err instanceof Error ? `播放失败：${err.message}` : "播放失败"
          );
          return;
        }
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
      } catch (err) {
        // 兜底：任何 howler 内部错误都通过事件回传，不抛给外层
        try {
          events?.onError(
            err instanceof Error ? `加载失败：${err.message}` : "音频加载失败"
          );
        } catch { /* noop */ }
      }
    },

    play(): void {
      try {
        if (!howl) return;
        howl.play();
      } catch {
        // 浏览器后台切回时 howl 实例可能处于中间态抛错，不崩溃应用
        return;
      }
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
      try {
        if (!howl) return;
        howl.pause();
      } catch {
        // noop
      }
      stopProgressTimer();
      events?.onPause();
    },

    seek(time: number): void {
      try {
        if (howl) howl.seek(time);
      } catch {
        // noop
      }
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
