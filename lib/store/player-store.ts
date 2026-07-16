"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { AudioEngine, AudioEngineEvents } from "@/lib/audio-engine/engine";
import { getCachedAudio } from "@/lib/db/audio-cache";
import { resolveMediaUrl } from "@/lib/utils";
import { getPlatform } from "@/lib/platform";
import { androidBridge } from "@/lib/jsbridge/android-bridge";

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
 * 1. 音频引擎通过 AudioEngine 抽象层解耦：
 *    - 浏览器模式：HowlerEngine（html5 流式 + 预加载下一首）
 *    - TWA 模式：NativeEngine（转发到原生 Media3 前台 Service）
 * 2. 引擎实例放在模块作用域（engine 变量），不进入响应式 state、不参与持久化，
 *    避免序列化失败与无谓重渲染。引擎由 createAudioEngine() 懒创建。
 * 3. persist 采用 skipHydration: true，在客户端挂载后由 AppShell 手动 rehydrate，
 *    保证 SSR 与首帧客户端渲染一致（均使用默认空状态），避免 hydration mismatch。
 * 4. 持久化字段：currentSong / queue / currentIndex / volume / playMode
 *    不持久化：currentTime（每次从头）/ isPlaying / duration / isLyricPageOpen / isQueueOpen
 * 5. IndexedDB 离线缓存：play() 先查 getCachedAudio，命中传 blob: URL 给引擎，
 *    未命中传网络 URL + Authorization headers
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
  /** 时长（秒），可选，加载后以引擎实测为准 */
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
  /** PC 端播放队列面板展开状态（不持久化，默认收起） */
  isQueueOpen: boolean;
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
  /** 设置 PC 队列面板展开状态 */
  setQueueOpen: (open: boolean) => void;
  /** 切换 PC 队列面板展开状态 */
  toggleQueue: () => void;
  /** 清除错误状态 */
  clearError: () => void;
}

// ===== 引擎实例管理（模块作用域，非响应式） =====

/** 当前音频引擎实例（懒创建，由 createAudioEngine 决定 Howler/Native） */
let engine: AudioEngine | null = null;

/** 当前播放用的 blob: URL（命中 IndexedDB 缓存时创建，切换歌曲时 revoke） */
let currentBlobUrl: string | null = null;

/**
 * 构造下一首预加载信息（仅 HowlerEngine 使用）
 * - 返回 [url, headers] 或 null
 * - 随机模式或空队列时返回 null
 */
function getNextPreloadInfo(): [string, Record<string, string>] | null {
  const state = usePlayerStore.getState();
  if (state.playMode === "shuffle" || state.queue.length === 0) return null;
  const nextIdx = (state.currentIndex + 1) % state.queue.length;
  if (nextIdx === state.currentIndex) return null;
  const nextSong = state.queue[nextIdx];
  if (!nextSong || !nextSong.url) return null;
  const url = resolveMediaUrl(nextSong.url);
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return [url, headers];
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
      isQueueOpen: false,
      error: null,

      // 播放：可传入新歌曲与队列；不传则播放队列当前位置
      play: async (song, queue) => {
        if (typeof window === "undefined") return;
        const state = get();

        // 1. 更新队列 / 当前歌曲
        let nextQueue = state.queue;
        let nextIndex = state.currentIndex;
        if (queue && queue.length > 0) {
          nextQueue = queue;
          nextIndex = song ? Math.max(queue.findIndex((s) => s.id === song.id), 0) : state.currentIndex;
        }
        const targetSong = song ?? nextQueue[nextIndex] ?? state.currentSong;
        if (!targetSong) return;

        // 注意：isPlaying 不在此处预设，改为监听引擎 onPlay 事件再同步，
        // 避免浏览器拦截自动播放时 UI 显示正在播放但实际没声音
        set({
          currentSong: targetSong,
          queue: nextQueue,
          currentIndex: nextIndex < 0 ? 0 : nextIndex,
          currentTime: 0,
          duration: 0,
          error: null,
        });

        // 2. 懒创建引擎（仅一次，后续复用）
        if (!engine) {
          const { createAudioEngine } = await import("@/lib/audio-engine/factory");
          engine = createAudioEngine(getNextPreloadInfo);
        }

        // 3. 绑定事件回调（每次 play 都重新绑定，确保闭包拿到最新 get()）
        const events: AudioEngineEvents = {
          onPlay: () => usePlayerStore.setState({ isPlaying: true }),
          onPause: () => usePlayerStore.setState({ isPlaying: false }),
          onEnd: () => {
            const cur = get();
            if (cur.playMode === "single") {
              // 单曲循环：重头播放
              engine?.seek(0);
              engine?.play();
            } else if (cur.playMode === "sequential" && cur.currentIndex >= cur.queue.length - 1) {
              // 顺序播放：已到末尾，停止播放
              usePlayerStore.setState({ isPlaying: false, currentTime: 0 });
            } else {
              // 列表循环 / 随机 / 顺序（未到末尾）：进入下一首
              get().next();
            }
          },
          onLoad: (duration) => usePlayerStore.setState({ duration }),
          onTimeUpdate: (currentTime) => usePlayerStore.setState({ currentTime }),
          onError: (message) =>
            usePlayerStore.setState({
              isPlaying: false,
              error: message || `音频加载失败：${targetSong.title}`,
            }),
          onSkipToNext: () => get().next(),
          onSkipToPrevious: () => get().prev(),
        };
        engine.setEvents(events);

        // 4. URL 解析：
        //    - TWA 模式：优先查原生下载的本地文件（file://），真正实现离线播放；
        //      未下载时走网络 URL（OkHttp 会自动缓存）
        //    - 浏览器模式：命中 IndexedDB 用 blob: URL，未命中用网络 URL
        const platform = getPlatform();
        let url: string;
        let headers: Record<string, string> | undefined;

        if (platform.isTWA) {
          const localPath = androidBridge.getLocalSongPath(targetSong.id);
          if (localPath) {
            url = `file://${localPath}`;
            headers = undefined;
          } else {
            url = resolveMediaUrl(targetSong.url);
            const token = getToken();
            headers = token ? { Authorization: `Bearer ${token}` } : undefined;
          }
        } else {
          try {
            const cached = await getCachedAudio(targetSong.id);
            if (cached) {
              if (currentBlobUrl) {
                URL.revokeObjectURL(currentBlobUrl);
                currentBlobUrl = null;
              }
              url = URL.createObjectURL(cached.blob);
              currentBlobUrl = url;
              headers = undefined;
            } else {
              url = resolveMediaUrl(targetSong.url);
              const token = getToken();
              headers = token ? { Authorization: `Bearer ${token}` } : undefined;
            }
          } catch {
            url = resolveMediaUrl(targetSong.url);
            const token = getToken();
            headers = token ? { Authorization: `Bearer ${token}` } : undefined;
          }
        }

        // 5. 调用引擎加载并播放
        await engine.loadAndPlay(url, {
          headers,
          startTime: 0,
          metadata: {
            title: targetSong.title,
            artist: targetSong.artist,
            coverUrl: targetSong.cover ? resolveMediaUrl(targetSong.cover) : undefined,
          },
        });

        // 6. 上报播放记录（静默，不阻塞播放）
        void reportPlayHistory(targetSong.id);
      },

      pause: () => {
        if (!engine) return;
        engine.pause();
        set({ isPlaying: false });
      },

      toggle: () => {
        const { isPlaying, currentSong } = get();
        if (!currentSong) {
          // 无当前曲目：播放队列首曲
          void get().play();
          return;
        }
        if (isPlaying) {
          get().pause();
        } else {
          if (engine) {
            engine.play();
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
        if (engine) engine.seek(time);
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
        if (engine) engine.setVolume(v);
        set({ volume: v });
      },

      setPlayMode: (mode) => set({ playMode: mode }),

      openLyricPage: () => set({ isLyricPageOpen: true }),
      closeLyricPage: () => set({ isLyricPageOpen: false }),
      setQueueOpen: (open) => set({ isQueueOpen: open }),
      toggleQueue: () => set((s) => ({ isQueueOpen: !s.isQueueOpen })),
      clearError: () => set({ error: null }),
    }),
    {
      name: "xt-music-player",
      storage: createJSONStorage(() => localStorage),
      // SSR 安全：跳过自动 hydration，由 AppShell 在客户端手动 rehydrate
      skipHydration: true,
      // 仅持久化稳定字段：currentSong / queue / currentIndex / volume / playMode
      // 不持久化 currentTime / isPlaying / duration / isLyricPageOpen / isQueueOpen
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
