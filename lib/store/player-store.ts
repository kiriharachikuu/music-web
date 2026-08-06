"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import type { AudioEngine, AudioEngineEvents } from "@/lib/audio-engine/engine";
import { getCachedAudio } from "@/lib/db/audio-cache";
import { resolveMediaUrl, isExternalMediaUrl } from "@/lib/utils";
import { getPlatform } from "@/lib/platform";
import { androidBridge } from "@/lib/jsbridge/android-bridge";
import type { TrackType, QualityOption } from "@/lib/types";

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
  trackType?: TrackType;
  sessionId?: string;
  sessionName?: string;
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

  // ----- 音质相关状态 -----
  /** 当前播放的音质级别 */
  currentQuality: string;
  /** 当前歌曲的可用音质列表 */
  availableQualities: QualityOption[];
  /** 用户偏好的音质级别 */
  preferredQuality: string;
  /** 是否正在切换音质 */
  isSwitchingQuality: boolean;

  // ----- 操作 -----
  play: (song?: Song, queue?: Song[]) => Promise<void>;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setQueue: (queue: Song[], startIndex?: number) => void;
  /** 加入队列末尾，返回是否成功（已在队列中则返回 false） */
  addToQueue: (song: Song) => boolean;
  /** 下一首播放：将歌曲插入到当前播放位置之后，返回是否成功（已在队列中则返回 false） */
  playNext: (song: Song) => boolean;
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

  // ----- 音质相关操作 -----
  /** 设置当前歌曲的可用音质列表 */
  setAvailableQualities: (qualities: QualityOption[]) => void;
  /** 设置用户偏好音质 */
  setPreferredQuality: (quality: string) => void;
  /** 切换音质 */
  switchQuality: (level: string) => Promise<void>;
  /** 加载用户偏好音质 */
  loadPreferredQuality: () => Promise<void>;
}

// ===== 引擎实例管理（模块作用域，非响应式） =====

/** 当前音频引擎实例（懒创建，由 createAudioEngine 决定 Howler/Native） */
let engine: AudioEngine | null = null;

/** 当前播放用的 blob: URL（命中 IndexedDB 缓存时创建，切换歌曲时 revoke） */
let currentBlobUrl: string | null = null;

/**
 * play() 调用代次计数器（竞态守卫）
 * - 每次 play() 入口自增并捕获本次 id
 * - 在各 await 之后校验：若不再是最新代次则中止，避免慢请求覆盖新点击的曲目
 *   （典型现象：点 A 卡住 → 点 B → A 的慢请求后到，反而播放了 A）
 */
let playRequestId = 0;

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
  if (token && !isExternalMediaUrl(url)) headers["Authorization"] = `Bearer ${token}`;
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

      // 音质相关初始状态
      currentQuality: "low",
      availableQualities: [],
      preferredQuality: "low",
      isSwitchingQuality: false,

      // 播放：可传入新歌曲与队列；不传则播放队列当前位置
      play: async (song, queue) => {
        if (typeof window === "undefined") return;
        const state = get();
        // 竞态守卫：本次 play 的代次；后续每个 await 后校验，过期则中止
        const myRequestId = ++playRequestId;

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

        try {
          // 2. 懒创建引擎（仅一次，后续复用）
          if (!engine) {
            const { createAudioEngine } = await import("@/lib/audio-engine/factory");
            engine = createAudioEngine(getNextPreloadInfo);
          }
          // 守卫：创建引擎期间若用户又点了别的歌，中止本次（不覆盖新点击）
          if (myRequestId !== playRequestId) return;

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
            onAutoPlayNext: () => {
              // HowlerEngine 已同步切换到预加载实例并开始播放
              // 只需同步更新 store 状态，不调用 async play()
              // 预加载仅在非 shuffle 模式工作，所以这里只处理列表循环 / 顺序模式
              const cur = get();
              if (cur.queue.length === 0) return;
              if (cur.playMode === "sequential" && cur.currentIndex >= cur.queue.length - 1) {
                // 顺序播放到末尾：预加载不会触发，但以防万一
                usePlayerStore.setState({ isPlaying: false, currentTime: 0 });
                return;
              }
              const idx = (cur.currentIndex + 1) % cur.queue.length;
              const song = cur.queue[idx];
              usePlayerStore.setState({
                currentSong: song,
                currentIndex: idx,
                currentTime: 0,
                duration: 0,
                error: null,
              });
              // 静默上报播放记录
              void reportPlayHistory(song.id);
            },
          };
          engine.setEvents(events);

          // 4. URL 解析：
          //    - TWA 模式：优先查原生下载的本地文件（file://），真正实现离线播放；
          //      未下载时走网络 URL（OkHttp 会自动缓存）
          //    - 浏览器模式：命中 IndexedDB 用 blob: URL，未命中用网络 URL
          const platform = getPlatform();
          let url: string;
          let headers: Record<string, string> | undefined;
          let usedLocalCache = false;

          if (platform.isTWA) {
            const localPath = androidBridge.getLocalSongPath(targetSong.id);
            if (localPath) {
              url = `file://${localPath}`;
              headers = undefined;
              usedLocalCache = true;
            } else {
              url = resolveMediaUrl(targetSong.url);
              const token = getToken();
              headers = token && !isExternalMediaUrl(url) ? { Authorization: `Bearer ${token}` } : undefined;
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
                usedLocalCache = true;
              } else {
                url = resolveMediaUrl(targetSong.url);
                const token = getToken();
                headers = token && !isExternalMediaUrl(url) ? { Authorization: `Bearer ${token}` } : undefined;
              }
            } catch {
              url = resolveMediaUrl(targetSong.url);
              const token = getToken();
              headers = token && !isExternalMediaUrl(url) ? { Authorization: `Bearer ${token}` } : undefined;
            }
          }

          // 守卫：缓存查询 await 期间若用户又点了别的歌，中止本次
          if (myRequestId !== playRequestId) return;

          // 4.5 如果使用网络 URL 且有偏好音质，先加载音质列表选择正确 URL
          //     避免先播放高音质再切换到低音质
          const preferred = get().preferredQuality;
          if (!usedLocalCache && preferred && preferred !== "default") {
            try {
              const { getSongQualities } = await import("@/lib/api");
              const qualities = await getSongQualities(targetSong.id);
              // 守卫：音质查询（网络）期间若用户又点了别的歌，中止本次，避免慢请求覆盖新点击
              if (myRequestId !== playRequestId) return;
              set({ availableQualities: qualities as QualityOption[] });

              const match = qualities.find((q) => q.level === preferred);
              if (match && match.level !== "default") {
                url = resolveMediaUrl(match.fileUrl);
                const token = getToken();
                headers = token && !isExternalMediaUrl(url) ? { Authorization: `Bearer ${token}` } : undefined;
                set({ currentQuality: preferred });
              } else {
                set({ currentQuality: "default" });
              }
            } catch {
              set({ availableQualities: [], currentQuality: "default" });
            }
          } else {
            set({ currentQuality: "default", availableQualities: [] });
          }

          // 5. 调用引擎加载并播放
          let coverUrl = targetSong.cover ? resolveMediaUrl(targetSong.cover) : undefined;
          // TWA 模式：优先使用本地封面路径（离线可用）
          if (platform.isTWA) {
            const localCoverPath = androidBridge.getLocalCoverPath(targetSong.id);
            if (localCoverPath) {
              coverUrl = `file://${localCoverPath}`;
            }
          }
          // 守卫：最终加载前再次确认仍是最新请求，防止过期 play 覆盖新点击的曲目
          if (myRequestId !== playRequestId) return;
          await engine.loadAndPlay(url, {
            headers,
            startTime: 0,
            metadata: {
              title: targetSong.title,
              artist: targetSong.artist,
              coverUrl,
            },
          });

          // 6. 上报播放记录（静默，不阻塞播放）
          void reportPlayHistory(targetSong.id);

          // 6.5 TWA 播放缓存：已缓存则刷新 LRU 时间戳，未缓存则后台静默下载音频+封面
          //     歌词缓存由 lyric-cache.ts 在获取歌词时同步写入原生存储
          if (platform.isTWA) {
            if (usedLocalCache) {
              androidBridge.touchCachedSong(targetSong.id);
            } else {
              androidBridge.cacheSongOnPlay(
                targetSong.id,
                url,
                headers,
                {
                  title: targetSong.title,
                  artist: targetSong.artist,
                  albumName: targetSong.album ?? "",
                  coverUrl: targetSong.cover ? resolveMediaUrl(targetSong.cover) : undefined,
                  fileUrl: targetSong.url,
                }
              );
            }
          }

          // 7. 如果使用了本地缓存（TWA/IndexedDB），异步加载音质列表供 UI 展示
          //     网络播放的音质列表已在步骤 4.5 中加载完毕
          if (usedLocalCache) {
            (async () => {
              try {
                const { getSongQualities } = await import("@/lib/api");
                const qualities = await getSongQualities(targetSong.id);
                set({ availableQualities: qualities as QualityOption[] });
              } catch {
                set({ availableQualities: [] });
              }
            })();
          }
        } catch (err) {
          // 外层兜底：任何未捕获的错误都不让 Promise 变成 unhandled rejection
          // （旧代码里可能抛同步异常直达 useEffect，冒泡到 ErrorBoundary 崩溃）
          // eslint-disable-next-line no-console
          console.error("[player-store] play() 异常:", err);
          set({
            isPlaying: false,
            isSwitchingQuality: false,
            error: `播放失败：${targetSong.title}`,
          });
        }
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
            // 不乐观设置 isPlaying：依赖引擎 onPlay 事件同步状态，
            // 避免浏览器自动播放策略拦截时 UI 显示正在播放但实际无声音
            engine.play();
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
        // 去重：已在队列中则不重复添加
        if (queue.some((s) => s.id === song.id)) return false;
        set({ queue: [...queue, song] });
        return true;
      },

      /** 下一首播放：将歌曲插入到当前播放位置之后 */
      playNext: (song) => {
        const { queue } = get();
        // 去重：如果歌曲已在队列中，先移除（避免重复）
        const filtered = queue.filter((s) => s.id !== song.id);
        // 如果原队列中已存在该歌曲（且不是当前在播放的），视为"已在队列中"提示
        const wasInQueue = queue.length !== filtered.length;
        // 找到当前歌曲在过滤后队列中的位置
        const curSong = get().currentSong;
        const curIdx = curSong ? filtered.findIndex((s) => s.id === curSong.id) : -1;
        // 插入到当前歌曲之后
        const insertIdx = curIdx >= 0 ? curIdx + 1 : filtered.length;
        const newQueue = [...filtered.slice(0, insertIdx), song, ...filtered.slice(insertIdx)];
        // 更新 currentIndex 以保持当前歌曲不变
        const newCurIdx = curSong ? newQueue.findIndex((s) => s.id === curSong.id) : 0;
        set({ queue: newQueue, currentIndex: newCurIdx >= 0 ? newCurIdx : 0 });
        // 如果原来不在队列中（新增），返回 true；如果已在队列中（被移动），返回 false
        return !wasInQueue;
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

      // ----- 音质相关操作 -----
      setAvailableQualities: (qualities) => {
        set({ availableQualities: qualities });
      },

      setPreferredQuality: (quality) => {
        set({ preferredQuality: quality });
      },

      switchQuality: async (level) => {
        const state = get();
        const currentSong = state.currentSong;
        if (!currentSong || !engine) return;

        const quality = state.availableQualities.find((q) => q.level === level);
        if (!quality) return;

        // 保存当前播放位置（切换后从该位置继续播放，实现无缝切换）
        const currentTime = state.currentTime;

        // 标记切换中，但不改 isPlaying（避免 UI 闪烁暂停）
        // engine.loadAndPlay 内部会卸载旧实例并加载新实例，无需手动 pause
        set({ isSwitchingQuality: true });

        try {
          const url = resolveMediaUrl(quality.fileUrl);
          const token = getToken();
          const headers = token && !isExternalMediaUrl(url) ? { Authorization: `Bearer ${token}` } : undefined;

          await engine.loadAndPlay(url, {
            headers,
            startTime: currentTime,
            metadata: {
              title: currentSong.title,
              artist: currentSong.artist,
              coverUrl: currentSong.cover ? resolveMediaUrl(currentSong.cover) : undefined,
            },
          });

          set({ currentQuality: level });
        } catch {
          set({ error: "切换音质失败" });
        } finally {
          set({ isSwitchingQuality: false });
        }
      },

      loadPreferredQuality: async () => {
        try {
          const { getQualityPreference } = await import("@/lib/api");
          const result = await getQualityPreference();
          set({ preferredQuality: result.preferredQuality.toLowerCase() });
        } catch {
          set({ preferredQuality: "low" });
        }
      },
    }),
    {
      name: "xt-music-player",
      // 自定义 storage：兜底损坏数据 + 非法 JSON，
      // 避免 rehydrate 时抛错直达 global-error（切后台再回来的常见崩溃路径）
      storage: (() => {
        const base = createJSONStorage(() => localStorage);
        return {
          ...base,
          getItem: (name: string) => {
            try {
              const raw = localStorage.getItem(name);
              if (!raw) return null;
              const parsed = JSON.parse(raw);
              // 校验字段合法性，避免存储了半写数据导致后续渲染链崩溃
              if (parsed?.state?.currentSong && typeof parsed.state.currentSong !== "object") {
                parsed.state.currentSong = null;
              }
              if (!Array.isArray(parsed?.state?.queue)) {
                if (parsed?.state) parsed.state.queue = [];
              }
              if (typeof parsed?.state?.currentIndex !== "number") {
                if (parsed?.state) parsed.state.currentIndex = 0;
              }
              return parsed;
            } catch {
              // 损坏数据：清除后以空值启动，避免反复崩溃
              try { localStorage.removeItem(name); } catch { /* noop */ }
              return null;
            }
          },
        } as ReturnType<typeof createJSONStorage>;
      })(),
      // SSR 安全：跳过自动 hydration，由 AppShell 在客户端手动 rehydrate
      skipHydration: true,
      // 仅持久化稳定字段：currentSong / queue / currentIndex / volume / playMode / preferredQuality
      // 不持久化 currentTime / isPlaying / duration / isLyricPageOpen / isQueueOpen / availableQualities
      partialize: (state) => ({
        currentSong: state.currentSong,
        queue: state.queue,
        currentIndex: state.currentIndex,
        volume: state.volume,
        playMode: state.playMode,
        preferredQuality: state.preferredQuality,
      }),
      onRehydrateStorage: () => (state, error) => {
        // zustand 4 内置的 rehydrate 错误回调，任何异常都走这里，不再冒泡到 React
        if (error) {
          // eslint-disable-next-line no-console
          console.warn("[player-store] rehydrate error -> fallback clean", error);
          try { localStorage.removeItem("xt-music-player"); } catch { /* noop */ }
          if (state) {
            state.currentSong = null;
            state.queue = [];
            state.currentIndex = 0;
            state.isPlaying = false;
          }
        }
      },
    }
  )
);
