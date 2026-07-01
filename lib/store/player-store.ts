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

/** 播放模式：单曲循环 / 列表循环 / 随机 */
export type PlayMode = "single" | "list" | "shuffle";

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

  // ----- 操作 -----
  play: (song?: Song, queue?: Song[]) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setQueue: (queue: Song[], startIndex?: number) => void;
  addToQueue: (song: Song) => void;
  setVolume: (volume: number) => void;
  setPlayMode: (mode: PlayMode) => void;
  openLyricPage: () => void;
  closeLyricPage: () => void;
}

// ===== Howler 实例管理（模块作用域，非响应式） =====

let howl: HowlType | null = null;
let HowlCtor: typeof HowlType | null = null;
let progressTimer: ReturnType<typeof setInterval> | null = null;

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

/** 启动进度轮询：每 250ms 同步 currentTime */
function startProgressTimer(get: () => PlayerState) {
  stopProgressTimer();
  progressTimer = setInterval(() => {
    if (!howl) return;
    const seek = (howl.seek() as number) || 0;
    usePlayerStore.setState({ currentTime: seek });
    // 标记未使用，避免 lint 误报（get 保留以便后续扩展）
    void get;
  }, 250);
}

/** 卸载当前 Howl 实例并清理 */
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

        // 创建/替换 Howl 实例
        const Howl = await ensureHowlCtor();
        unloadHowl();
        howl = new Howl({
          src: [targetSong.url],
          html5: true, // 流式播放，适合音频
          volume: get().volume,
          format: ["mp3", "flac", "wav", "ogg"],
        });

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
          } else {
            // 列表循环 / 随机：进入下一首
            get().next();
          }
        });
        // 加载/播放错误：停止状态
        howl.on("loaderror", () => usePlayerStore.setState({ isPlaying: false }));
        howl.on("playerror", () => usePlayerStore.setState({ isPlaying: false }));

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
        } else {
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

      setVolume: (volume) => {
        const v = Math.min(1, Math.max(0, volume));
        if (howl) howl.volume(v);
        set({ volume: v });
      },

      setPlayMode: (mode) => set({ playMode: mode }),

      openLyricPage: () => set({ isLyricPageOpen: true }),
      closeLyricPage: () => set({ isLyricPageOpen: false }),
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
