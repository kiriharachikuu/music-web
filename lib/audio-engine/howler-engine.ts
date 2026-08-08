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

/** 同步切换时遗留的旧 Howl 实例（在事件回调中不能 unload，延迟到下次 unloadHowl 清理） */
let staleHowls: HowlType[] = [];

/** 预加载检查函数（由 createHowlerEngine 传入，保存在模块作用域供 onHowlEnd 使用） */
let preloadCheckFn: (() => [string, Record<string, string> | undefined] | null) | null = null;

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
      // 预加载实例静音但不禁用音频元素：
      // - volume: 0 会被 iOS 视为"不活跃"，后续 play() 在非用户手势下被拦截
      // - mute: true 仅静音，iOS 仍把 audio 视作真实媒体资源
      // 复用前由 onHowlEnd / loadAndPlay 调 mute(false) 解除
      mute: true,
    });
    preloadUrl = url;
    // 主动把 audio 元素拉进 DOM 并设好 playsinline：
    // 不通过 play() 激活（play 在非用户手势下会污染 iOS 音频会话），
    // 只触发 audio.load() 让 iOS 提前"认识"这个元素、加载好元数据。
    // 真正播放由 onHowlEnd 在切歌瞬间同步调用 play() 完成。
    primeHowlerNode(preloadHowl);
    ensureIOSBackgroundPlay(preloadHowl);
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

/**
 * 给 Howler 内部 HTML5 audio 元素补齐 iOS 后台播放所需属性
 *
 * 根因：Howler 2.x 既不设置 playsinline，也不把 <audio> 附加到 DOM。
 * - 缺少 playsinline：iOS PWA 进入后台（锁屏/切 app）会暂停音频
 * - audio 不在 DOM：iOS WebKit 对游离 audio 元素的后台播放支持不稳定
 *
 * 通过 Howler 私有 API _sounds[0]._node 访问内部 audio 元素，
 * 设置 playsinline / webkit-playsinline，并在未附加时挂到 document.body（隐藏）。
 *
 * 注意：不提供 detach 函数。Howler 的 _html5AudioPool 会复用 audio 元素，
 * 反复从 DOM 移除/添加会导致 iOS 重新评估自动播放策略，切歌时 play() 被拦截。
 * 让 audio 元素留在 DOM 中（隐藏），供 Howler 池复用。
 */
function ensureIOSBackgroundPlay(h: HowlType): boolean {
  try {
    const sounds = (h as unknown as {
      _sounds?: Array<{ _node?: HTMLAudioElement }>;
    })._sounds;
    if (!sounds || !sounds[0] || !sounds[0]._node) return false;
    const node = sounds[0]._node;
    node.setAttribute("playsinline", "true");
    node.setAttribute("webkit-playsinline", "true");
    // iOS 13+ 要求 element 必须已与用户产生过交互，否则 play() 会被静默拦截
    // 这里把 element 标记为已在 DOM，绕过 WebKit 的游离节点检测
    if (!node.parentNode) {
      node.style.display = "none";
      document.body.appendChild(node);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 强制让 Howler 创建内部的 HTMLAudioElement 并提前进入 DOM
 *
 * 根因：Howler 在第一次 play() 时才懒创建 audio 元素，
 * 如果等到 onHowlEnd 才创建，元素刚出生 + playsinline 还没设，
 * iOS 会拦截 play() 静默失败。
 *
 * 上一版曾尝试 play()→pause() 的"预激"流程，但发现：
 * 1. 在非用户手势上下文里调 play() 会污染 iOS 音频会话状态，
 *    系统可能把音频元素标记为"已尝试启动但失败"，后续 play() 持续被拦；
 * 2. play() 返回的 soundId 在 pause/stop 后并未真正释放音频会话。
 *
 * 新方案：不调 play()，直接通过 Howler 私有 API 拿到（或创建）内部
 * HTMLAudioElement，挂到 DOM 并设置 playsinline，让 iOS 提前"认识"它。
 * 实际播放动作留给 onHowlEnd 在切歌瞬间同步调用。
 */
function primeHowlerNode(h: HowlType): void {
  try {
    type InternalSound = { _node?: HTMLAudioElement; _id?: number };
    const internal = h as unknown as {
      _sounds?: InternalSound[];
      _inactiveSound?: () => InternalSound;
      _soundIds?: number[];
      _pos?: number;
    };
    // 找到当前可复用的 sound 槽位，或主动创建一个
    let sound: InternalSound | null = null;
    if (internal._sounds && internal._sounds.length > 0) {
      sound = internal._sounds[0];
    } else if (typeof internal._inactiveSound === "function") {
      sound = internal._inactiveSound();
    }
    if (!sound || !sound._node) return;
    const node = sound._node;
    // 提前设好 playsinline，并确保在 DOM 中
    node.setAttribute("playsinline", "true");
    node.setAttribute("webkit-playsinline", "true");
    if (!node.parentNode) {
      node.style.display = "none";
      document.body.appendChild(node);
    }
    // 让 audio 元素开始加载（不播放）：iOS 看到这是一个会真实加载的资源
    // 这样后续 play() 时 iOS 已把它视作"就绪的连续媒体"
    try {
      node.preload = "auto";
      node.load();
    } catch { /* noop */ }
  } catch {
    // 预激活失败静默处理，不影响主流程
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
    // 不从 DOM 移除 audio 元素：Howler 的 _html5AudioPool 会复用它，
    // 反复 detach/attach 会导致 iOS 切歌时 play() 被拦截（playerror → 暂停）
    howl.unload();
    howl = null;
  }
  // 清理同步切换时遗留的旧 Howl 实例
  for (const h of staleHowls) {
    try { h.unload(); } catch { /* noop */ }
  }
  staleHowls = [];
  currentDuration = 0;
  currentPosition = 0;
}

/**
 * Howl "pause" 事件处理
 *
 * 关键：iOS Safari / 后台 WebKit 在歌曲自然播完时往往不触发 "end"，
 * 而是触发 "pause"（位置卡在 duration 附近）。若直接派发 onPause
 * 给 store，会导致后台连播中断、锁屏不切歌。
 *
 * 这里判断"位置已接近 duration 且 iOS"时按 onEnd 走同步切歌逻辑，
 * 复用 onHowlEnd 的预加载切换路径，规避 iOS 后台 onEnd 不触发的坑。
 *
 * 其它 iOS pause：通常是系统中断（电话、闹钟、灵动岛接管、AirPods 断开），
 * 此时必须立即停止进度轮询——音频已经不发声，setInterval 继续推
 * currentTime 会导致"灵动岛显示暂停但进度条还在动"的 UI 与状态不一致。
 */
function onHowlPause(): void {
  try {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!isIOS) {
      // 非 iOS 平台：pause 即为用户/系统主动暂停，交给上层 store 同步 isPlaying
      events?.onPause();
      return;
    }
    // iOS：判断位置是否已接近 duration
    let pos = 0;
    try {
      const p = howl?.seek();
      pos = typeof p === "number" && Number.isFinite(p) ? p : currentPosition;
    } catch {
      pos = currentPosition;
    }
    const remain = (currentDuration || 0) - pos;
    // 剩余 ≤ 0.5s 视为已播完：走 end 流程
    if (currentDuration > 0 && remain <= 0.5) {
      onHowlEnd();
      return;
    }
    // 其它 iOS pause：先冻结本地进度，避免 setInterval 在音频已停的状态下
    // 继续推进 currentTime 引发 UI 与实际状态错位
    stopProgressTimer();
    currentPosition = pos;
    events?.onTimeUpdate(currentPosition);
    events?.onPause();
  } catch {
    try { stopProgressTimer(); } catch { /* noop */ }
    try { events?.onPause(); } catch { /* noop */ }
  }
}

/**
 * 给 Howl 实例注册事件回调（不含 "load"，由调用方单独处理）
 * - 提取自 loadAndPlay，供同步切换复用
 * - "end" 事件使用命名函数 onHowlEnd，支持同步切歌
 */
function registerHowlEvents(h: HowlType): void {
  h.on("end", onHowlEnd);
  h.on("loaderror", () => {
    try { events?.onError("音频加载失败"); } catch { /* noop */ }
  });
  h.on("playerror", () => {
    try { events?.onError("播放失败"); } catch { /* noop */ }
  });
  h.on("play", () => {
    try {
      // iOS 系统中断恢复时也会触发 play 事件（如 AirPods 重新连接、
      // 控制中心解除暂停），此时需要把进度轮询重新拉起来，
      // 否则 UI 状态显示正在播放但 currentTime 一直停在中断时的位置
      if (!progressTimer) {
        startProgressTimer(() => {
          if (currentDuration <= 0) return;
          const remaining = currentDuration - currentPosition;
          if (remaining > 0 && remaining <= PRELOAD_THRESHOLD) {
            const preload = preloadCheckFn?.();
            if (preload) {
              const [nextUrl, nextHeaders] = preload;
              if (nextUrl && nextUrl !== preloadUrl && nextUrl !== currentUrl) {
                void preloadNextSong(nextUrl, nextHeaders);
              }
            }
          }
        });
      }
      events?.onPlay();
    } catch { /* noop */ }
  });
  h.on("pause", onHowlPause);
}

/**
 * Howl "end" 事件处理
 *
 * 关键：优先同步切换到预加载的下一首，不依赖 async play()。
 * iOS 后台挂起 JavaScript 时，onEnd → next() → play() 中的 await 不执行，
 * 导致后台无法自动切歌。同步切换规避了这个限制。
 *
 * 如果没有预加载实例，fallback 到 onEnd 回调（走 async play() 流程）。
 */
function onHowlEnd(): void {
  if (preloadHowl && preloadUrl) {
    // 有预加载实例：同步切换
    const oldHowl = howl;
    const nextHowl = preloadHowl;
    const nextUrl = preloadUrl;
    preloadHowl = null;
    preloadUrl = null;

    // 停止进度轮询
    stopProgressTimer();

    // 释放旧 blob URL
    if (currentUrl && currentUrl.startsWith("blob:")) {
      URL.revokeObjectURL(currentUrl);
    }

    // 旧 Howl 已被 _ended 的 stop 暂停，不调用 unload（在事件回调中不安全）
    // 保存引用，延迟到下次 unloadHowl 清理
    if (oldHowl) {
      staleHowls.push(oldHowl);
    }

    // 切换到预加载实例
    howl = nextHowl;
    currentUrl = nextUrl;
    currentDuration = nextHowl.duration() || 0;
    currentPosition = 0;

    // iOS 后台播放属性：再次确保（preloadNextSong 已处理过，但 onHowlEnd 复用时
    // 元素可能因 Howler 内部重启发生变化，再保险一次）
    ensureIOSBackgroundPlay(howl);

    // 恢复音量与静音：预加载阶段用了 muted: true，这里解除静音并设置当前音量
    try { howl.mute(false); } catch { /* noop */ }
    howl.volume(currentVolume);

    // 注册事件（新 Howl 的 end 也走同步切换逻辑）
    registerHowlEvents(howl);

    // 如果已加载完成，通知 duration；否则注册 once load 等待加载
    if (currentDuration > 0) {
      events?.onLoad(currentDuration);
    } else {
      howl.once("load", () => {
        try {
          if (howl !== nextHowl) return;
          currentDuration = howl.duration() || 0;
          events?.onLoad(currentDuration);
        } catch { /* noop */ }
      });
    }

    // iOS 切歌 play 拦截兜底：
    // 根因是 iOS 在歌曲自然结束时触发的"end"事件不在用户手势栈里，
    // 即便 audio 元素已激活，iOS 仍可能因时序问题短暂拦截 play()。
    // 同步抛错 / 异步 playerror 时延迟 50ms 重试一次，绝大多数情况能恢复。
    let retried = false;
    const tryPlay = () => {
      if (howl !== nextHowl) return; // 期间已被新 play() 接管
      try {
        nextHowl.play();
      } catch {
        if (!retried) {
          retried = true;
          setTimeout(tryPlay, 50);
        } else {
          // 重试仍失败：fallback 到正常 onEnd 流程
          try { events?.onEnd(); } catch { /* noop */ }
        }
      }
    };
    // 监听 playerror：iOS 异步拦截时会触发此事件
    try {
      nextHowl.on("playerror", () => {
        if (retried) return;
        retried = true;
        setTimeout(tryPlay, 50);
      });
    } catch { /* noop */ }

    // 同步开始播放（失败时由 tryPlay 内部兜底）
    tryPlay();

    // 立即预加载下一首（后台连播依赖预加载提前就绪）
    const nextPreload = preloadCheckFn?.();
    if (nextPreload) {
      const [nextUrl, nextHeaders] = nextPreload;
      if (nextUrl && nextUrl !== preloadUrl && nextUrl !== currentUrl) {
        void preloadNextSong(nextUrl, nextHeaders);
      }
    }

    // 启动进度轮询
    startProgressTimer(() => {
      if (currentDuration <= 0) return;
      const remaining = currentDuration - currentPosition;
      if (remaining > 0 && remaining <= PRELOAD_THRESHOLD) {
        const preload = preloadCheckFn?.();
        if (preload) {
          const [nextUrl, nextHeaders] = preload;
          if (nextUrl && nextUrl !== preloadUrl && nextUrl !== currentUrl) {
            void preloadNextSong(nextUrl, nextHeaders);
          }
        }
      }
    });

    // 通知 store 同步更新 currentSong 等状态（不调用 async play()）
    events?.onAutoPlayNext?.();
    return;
  }

  // 没有预加载实例：走正常 onEnd 回调（async play()）
  try { events?.onEnd(); } catch { /* noop */ }
}

/**
 * HowlerEngine 实现
 * - 通过构造函数返回 AudioEngine 接口
 * - 闭包持有模块作用域变量，无需 this 状态
 */
export function createHowlerEngine(
  preloadCheckFnArg: () => [string, Record<string, string> | undefined] | null
): AudioEngine {
  // 保存到模块作用域，供 onHowlEnd 同步切换时调用
  preloadCheckFn = preloadCheckFnArg;
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
          // 预加载阶段使用了 muted: true，consume 时需要解除静音
          try { howl.mute(false); } catch { /* noop */ }
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

        // 注册 end / loaderror / playerror / play 事件（含同步切歌逻辑）
        registerHowlEvents(howl);

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

        try { howl.play(); } catch (err) {
          // 浏览器自动播放策略或移动端切回前台时 play() 可能同步抛 DOMException
          events?.onError(
            err instanceof Error ? `播放失败：${err.message}` : "播放失败"
          );
          return;
        }

        // 立即预加载下一首：不依赖进度轮询（后台 setInterval 被暂停时无法触发）
        // 后台连播依赖预加载实例在歌曲结束前就绪
        const initialPreload = preloadCheckFn?.();
        if (initialPreload) {
          const [nextUrl, nextHeaders] = initialPreload;
          if (nextUrl && nextUrl !== preloadUrl && nextUrl !== currentUrl) {
            void preloadNextSong(nextUrl, nextHeaders);
          }
        }

        startProgressTimer(() => {
          // 预加载检查（补充：用户手动切歌或初始预加载失败时兜底）
          if (currentDuration <= 0) return;
          const remaining = currentDuration - currentPosition;
          if (remaining > 0 && remaining <= PRELOAD_THRESHOLD) {
            const preload = preloadCheckFn?.();
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
          const preload = preloadCheckFn?.();
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
