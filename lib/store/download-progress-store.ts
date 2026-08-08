/**
 * XingTone —— 下载进度订阅中心
 *
 * 设计目的：
 * - 任何位置（歌曲行 / 抽屉 / 下载管理页）都能即时观察某首歌曲的下载状态与进度
 * - 单一订阅入口，避免在每个组件单独桥接 Desktop IPC / TWA 事件
 *
 * 数据结构：
 * - inFlight: songId -> { song, progress, state }
 *   state 取值："downloading" | "error"
 *   进入已下载时由 download.ts 主动 remove（避免与已下载列表重复）
 *
 * 平台差异：
 * - Desktop（Electron）：onDesktopDownloadProgress 实时回传 0~100 进度
 * - TWA：原生仅回传 onDownloadComplete / onDownloadError，无中间进度，按 0% 占位
 * - 浏览器（IndexedDB）：fetch 流式下载，本地根据 Response.body 的 reader 计算进度
 */

import { create } from "zustand";
import type { ApiSong } from "@/lib/types";

export type DownloadProgressState = "downloading" | "error";

export interface InFlightDownload {
  song: ApiSong;
  /** 0~100，未知进度时返回 0；TWA 环境下仅在完成/失败时变化 */
  progress: number;
  state: DownloadProgressState;
  /** 错误信息（仅 state === "error" 时存在） */
  error?: string;
  /** 进入下载中的时间戳（用于排序与展示耗时） */
  startedAt: number;
}

interface DownloadProgressStore {
  inFlight: Map<string, InFlightDownload>;
  /** 注册一个下载任务；重复注册将覆盖并重置进度 */
  register: (song: ApiSong) => void;
  /** 更新进度（0~100） */
  updateProgress: (songId: string, progress: number) => void;
  /** 标记为失败并附带错误信息 */
  markError: (songId: string, error?: string) => void;
  /** 下载成功完成后清除（已转移到 listDownloads 展示） */
  clear: (songId: string) => void;
  /** 全部清空（页面卸载/调试用） */
  reset: () => void;
}

export const useDownloadProgressStore = create<DownloadProgressStore>((set) => ({
  inFlight: new Map(),
  register: (song) =>
    set((s) => {
      const next = new Map(s.inFlight);
      next.set(song.id, {
        song,
        progress: 0,
        state: "downloading",
        startedAt: Date.now(),
      });
      return { inFlight: next };
    }),
  updateProgress: (songId, progress) =>
    set((s) => {
      const cur = s.inFlight.get(songId);
      if (!cur) return s;
      const next = new Map(s.inFlight);
      next.set(songId, { ...cur, progress: Math.max(0, Math.min(100, progress)) });
      return { inFlight: next };
    }),
  markError: (songId, error) =>
    set((s) => {
      const cur = s.inFlight.get(songId);
      if (!cur) return s;
      const next = new Map(s.inFlight);
      next.set(songId, { ...cur, state: "error", error });
      return { inFlight: next };
    }),
  clear: (songId) =>
    set((s) => {
      if (!s.inFlight.has(songId)) return s;
      const next = new Map(s.inFlight);
      next.delete(songId);
      return { inFlight: next };
    }),
  reset: () => set({ inFlight: new Map() }),
}));

// 上次返回的数组 + 对应的 Map 引用，用于浅比较缓存：
// Map 引用未变时直接复用旧数组，避免每次渲染都生成新数组，
// 触发 React 的"Maximum update depth exceeded"（#185）。
let _cachedOrdered: InFlightDownload[] = [];
let _cachedMapRef: Map<string, InFlightDownload> | null = null;

/** 选择器：按 startedAt 升序的 in-flight 任务数组（稳定引用） */
export function selectInFlightOrdered(
  state: DownloadProgressStore
): InFlightDownload[] {
  const map = state.inFlight;
  if (map === _cachedMapRef) return _cachedOrdered;

  const next = Array.from(map.values()).sort(
    (a, b) => a.startedAt - b.startedAt
  );
  _cachedMapRef = map;
  _cachedOrdered = next;
  return next;
}
