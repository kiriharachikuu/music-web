"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Howl as HowlType } from "howler";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * 上报播放记录到后端（静默失败，不阻塞播放）
 * - 未登录时跳过
 * - 网络错误时忽略
 */
async function reportPlayHistory(songId: string) {
  try {
    const token = getToken();
    if (!token) return;
    await fetch(`${API_BASE}/user/history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ songId }),
    });
  } catch {
    // 静默失败：不影响播放体验
  }
}

/**
 * XingTone —— 全局播放状态 store（Zustand）
 *
 * 设计要点：
 * 1. Howler.js 实例放在模块作用域（howl 变量），不进入响应式 state、不参与持久化，
 *    避免序列化失败与无谓重渲染。构造器按需动态 import，规避 SSR 时 howler 访问 window。
 * 2. persist 采用 skipHydration: true，在客户端挂载后由 AppShell 手动 rehydrate，
 *    保证 SSR 与首帧客户端渲染一致（均使用默认空状态），避免 hydration mismatch。
 * 3. 持久化字段：currentSong / queue / currentIndex / volume / playMode
 *    不持久化：currentTime（每次从头）/ isPlaying / duration / isLyricPageOpen
 */

// ===== 类型定义 =====

/** 歌曲数据结构 */
export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  cover?: string;
  /** 音频播放地址 */
  url: string;
  /** 时长（秒），可选，加载后以 Howler 实测为准 */
  duration?: number;
}

/** 播放模式：单曲循环 / 列表循环 / 随机 / 顺序播放（播完不循环） */
export type PlayMode = "single" | "list" | "shuffle" | "sequential";

interface PlayerState {
  // ----- 状态 -----
  currentSong: Song | null;
  queue: Song[];
  currentIndex: number;
  isPlaying: boolean;
  currentTime: number; // 当前播放时间（秒），不持久化
  duration: number; // 当前曲目总时长（秒）
  volume: number; // 0~1
  playMode: PlayMode;
  isLyricPageOpen: boolean;
  /** 播放器错误信息（UI 层监听并显示 Toast），null 表示无错误 */
  error: string | null;

  // ----- 操作 -----
  play: (song?: Song, queue?: Song[]) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setQueue: (queue: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  /** 下一首播放：将歌曲插入到当前播放位置之后 */
  playNext: (song: Song) => void;
  /** 批量加入队列末尾 */
  addManyToQueue: (songs: Song[]) => void;
  /** 批量下一首播放：将多首歌插入到当前播放位置之后 */
  playNextMany: (songs: Song[]) => void;
  setVolume: (volume: number) => void;
  setPlayMode: (mode: PlayMode) => void;
  openLyricPage: () => void;
  closeLyricPage: () => void;
  /** 清除错误状态 */
  clearError: () => void;
}

// ===== Howler 实例管理（模块作用域，非响应式） =====

let howl: HowlType | null = null;
let HowlCtor: typeof HowlType | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;

// ===== 预加载管理 =====

/** 预加载的 Howl 实例（剩余 30s 时预取下一首） */
let preloadHowl: HowlType | null = null;
let preloadUrl: string | null = null;
/** 预加载触发阈值（秒） */
const PRELOAD_THRESHOLD = 30;

/** 动态加载 Howl 构造器（仅客户端） */
async function ensureHowlCtor() {
  if (!HowlCtor) {
    const mod = await import("howler");
    HowlCtor = mod.Howl as unknown as typeof HowlType;
  }
  return HowlCtor;
}

/** 停止进度轮询 */
function stopProgressTimer() {
  if (progressTimer) {
    clearInterval(progressTimer);
    progressTimer = null;
  }
}

/** 启动进度轮询：每 250ms 同步 currentTime + 预加载下一曲 */
function startProgressTimer(get: () => PlayerState) {
  stopProgressTimer();
  progressTimer = setInterval(() => {
    if (!howl) return;
    const seek = (howl.seek() as number) || 0;
    const dur = howl.duration() || 0;
    usePlayerStore.setState({ currentTime: seek });

    // 预加载下一首歌曲
    const remaining = dur - seek;
    if (dur > 0 && remaining > 0 && remaining <= PRELOAD_THRESHOLD) {
      const state = get();
      // 随机模式无法确定下一首，跳过预加载
      if (state.playMode === "shuffle" || state.queue.length === 0) return;
      const nextIdx = (state.currentIndex + 1) % state.queue.length;
      if (nextIdx === state.currentIndex) return;
      const nextSong = state.queue[nextIdx];
      if (nextSong && nextSong.url !== preloadUrl && nextSong.url !== state.currentSong?.url) {
        void preloadNextSong(nextSong.url);
      }
    }
  }, 250);
}

/** 预加载下一首歌曲（创建 Howl 实例但不播放，让浏览器缓存音频） */
async function preloadNextSong(url: string) {
  try {
    // 清理旧的预加载实例
    clearPreload();
    const Howl = await ensureHowlCtor();
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

/** 尝试复用预加载的 Howl 实例（URL 匹配时返回实例并清除引用） */
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
function clearPreload() {
  if (preloadHowl) {
    preloadHowl.unload();
    preloadHowl = null;
  }
  preloadUrl = null;
}

/** 卸载当前 Howl 实例并清理（不含预加载实例） */
function unloadHowl() {
  stopProgressTimer();
  if (howl) {
    howl.unload();
    howl = null;
  }
}

/** 格式化时间 mm:ss */
export function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ===== Store =====

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      // 初始状态
      currentSong: null,
      queue: [],
      currentIndex: 0,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
      playMode: "list",
      isLyricPageOpen: false,
      error: null,

      // 播放：可传入新歌曲与队列；不传则播放队列当前位置
      play: async (song, queue) => {
        if (typeof window === "undefined") return;
        const state = get();

        // 更新队列 / 当前歌曲
        let nextQueue = state.queue;
        let nextIndex = state.currentIndex;
        if (queue && queue.length > 0) {
          nextQueue = queue;
          nextIndex = song ? Math.max(queue.findIndex((s) => s.id === song.id), 0) : state.currentIndex;
        }
        const targetSong = song ?? nextQueue[nextIndex] ?? state.currentSong;
        if (!targetSong) return;

        set({
          currentSong: targetSong,
          queue: nextQueue,
          currentIndex: nextIndex < 0 ? 0 : nextIndex,
          isPlaying: true,
          currentTime: 0,
        });

        // 创建/替换 Howl 实例（优先复用预加载的实例）
        const Howl = await ensureHowlCtor();
        unloadHowl();

        // 尝试复用预加载的实例（音频已缓存，播放更流畅）
        const preloaded = tryConsumePreload(targetSong.url);
        if (preloaded) {
          howl = preloaded;
          // 恢复音量（预加载时设为 0）
          howl.volume(get().volume);
          // 重置到开头
          howl.seek(0);
        } else {
          howl = new Howl({
            src: [targetSong.url],
            html5: true, // 流式播放，适合音频
            volume: get().volume,
            format: ["mp3", "flac", "wav", "ogg"],
          });
        }

        // 加载完成：同步时长
        howl.on("load", () => {
          if (!howl) return;
          usePlayerStore.setState({ duration: howl.duration() || 0 });
        });
        // 播放结束：按播放模式处理
        howl.on("end", () => {
          const cur = get();
          if (cur.playMode === "single") {
            // 单曲循环：重头播放
            if (howl) {
              howl.seek(0);
              howl.play();
            }
          } else if (cur.playMode === "sequential" && cur.currentIndex >= cur.queue.length - 1) {
            // 顺序播放：已到末尾，停止播放
            stopProgressTimer();
            usePlayerStore.setState({ isPlaying: false, currentTime: 0 });
          } else {
            // 列表循环 / 随机 / 顺序（未到末尾）：进入下一首
            get().next();
          }
        });
        // 加载/播放错误：停止状态并设置错误信息
        howl.on("loaderror", () => {
          usePlayerStore.setState({
            isPlaying: false,
            error: `音频加载失败：${targetSong.title}`,
          });
        });
        howl.on("playerror", () => {
          usePlayerStore.setState({
            isPlaying: false,
            error: `播放失败：${targetSong.title}`,
          });
        });

        howl.play();
        startProgressTimer(get);

        // 上报播放记录（静默，不阻塞播放）
        void reportPlayHistory(targetSong.id);
      },

      pause: () => {
        if (!howl) return;
        howl.pause();
        stopProgressTimer();
        set({ isPlaying: false });
      },

      toggle: () => {
        const { isPlaying, currentSong } = get();
        if (!currentSong) {
          // 无当前曲目：播放队列首曲
          void get().play();
          return;
        }
        if (isPlaying) get().pause();
        else {
          if (howl) {
            howl.play();
            startProgressTimer(get);
            set({ isPlaying: true });
          } else {
            void get().play(currentSong);
          }
        }
      },

      next: () => {
        const { queue, currentIndex, playMode } = get();
        if (queue.length === 0) return;
        let idx: number;
        if (playMode === "shuffle") {
          // 随机：尽量选不同于当前的下标
          if (queue.length === 1) idx = 0;
          else {
            do {
              idx = Math.floor(Math.random() * queue.length);
            } while (idx === currentIndex);
          }
        } else if (playMode === "sequential") {
          // 顺序播放：到末尾不循环
          if (currentIndex >= queue.length - 1) {
            stopProgressTimer();
            set({ isPlaying: false, currentTime: 0 });
            return;
          }
          idx = currentIndex + 1;
        } else {
          // 列表循环
          idx = (currentIndex + 1) % queue.length;
        }
        const song = queue[idx];
        set({ currentIndex: idx });
        void get().play(song);
      },

      prev: () => {
        const { queue, currentIndex } = get();
        if (queue.length === 0) return;
        const idx = (currentIndex - 1 + queue.length) % queue.length;
        const song = queue[idx];
        set({ currentIndex: idx });
        void get().play(song);
      },

      seek: (time) => {
        if (howl) howl.seek(time);
        set({ currentTime: time });
      },

      setQueue: (queue, startIndex = 0) => {
        set({ queue, currentIndex: startIndex });
      },

      addToQueue: (song) => {
        const { queue } = get();
        set({ queue: [...queue, song] });
      },

      /** 下一首播放：将歌曲插入到当前播放位置之后 */
      playNext: (song) => {
        const { queue, currentIndex } = get();
        // 去重：如果歌曲已在队列中，先移除
        const filtered = queue.filter((s) => s.id !== song.id);
        // 找到当前歌曲在过滤后队列中的位置
        const curSong = get().currentSong;
        const curIdx = curSong ? filtered.findIndex((s) => s.id === curSong.id) : -1;
        // 插入到当前歌曲之后
        const insertIdx = curIdx >= 0 ? curIdx + 1 : filtered.length;
        const newQueue = [...filtered.slice(0, insertIdx), song, ...filtered.slice(insertIdx)];
        // 更新 currentIndex 以保持当前歌曲不变
        const newCurIdx = curSong ? newQueue.findIndex((s) => s.id === curSong.id) : 0;
        set({ queue: newQueue, currentIndex: newCurIdx >= 0 ? newCurIdx : 0 });
      },

      addManyToQueue: (songs) => {
        if (songs.length === 0) return;
        const { queue } = get();
        // 去重：过滤掉已在队列中的歌曲
        const existing = new Set(queue.map((s) => s.id));
        const newSongs = songs.filter((s) => !existing.has(s.id));
        set({ queue: [...queue, ...newSongs] });
      },

      playNextMany: (songs) => {
        if (songs.length === 0) return;
        const { queue } = get();
        const ids = new Set(songs.map((s) => s.id));
        // 去重：移除已在待插入列表中的歌曲
        const filtered = queue.filter((s) => !ids.has(s.id));
        const curSong = get().currentSong;
        const curIdx = curSong ? filtered.findIndex((s) => s.id === curSong.id) : -1;
        const insertIdx = curIdx >= 0 ? curIdx + 1 : filtered.length;
        const newQueue = [...filtered.slice(0, insertIdx), ...songs, ...filtered.slice(insertIdx)];
        const newCurIdx = curSong ? newQueue.findIndex((s) => s.id === curSong.id) : 0;
        set({ queue: newQueue, currentIndex: newCurIdx >= 0 ? newCurIdx : 0 });
      },

      setVolume: (volume) => {
        const v = Math.min(1, Math.max(0, volume));
        if (howl) howl.volume(v);
        set({ volume: v });
      },

      setPlayMode: (mode) => set({ playMode: mode }),

      openLyricPage: () => set({ isLyricPageOpen: true }),
      closeLyricPage: () => set({ isLyricPageOpen: false }),
      clearError: () => set({ error: null }),
    }),
    {
      name: "xt-music-player",
      storage: createJSONStorage(() => localStorage),
      // SSR 安全：跳过自动 hydration，由 AppShell 在客户端手动 rehydrate
      skipHydration: true,
      // 仅持久化稳定字段：currentSong / queue / currentIndex / volume / playMode
      // 不持久化 currentTime / isPlaying / duration / isLyricPageOpen
      partialize: (state) => ({
        currentSong: state.currentSong,
        queue: state.queue,
        currentIndex: state.currentIndex,
        volume: state.volume,
        playMode: state.playMode,
      }),
    }
  )
);
