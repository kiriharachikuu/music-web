/**
 * XingTone —— Media Session API 集成
 *
 * 用于在系统锁屏 / 控制中心 / 车载 / 耳机按键 等场景下：
 * 1. 显示当前歌曲的元数据（标题、歌手、专辑、封面）
 * 2. 响应外部控制：play / pause / previoustrack / nexttrack / seekto
 *
 * 兼容性：Chrome / Edge / Safari / Firefox（部分支持），iOS Safari 16.4+
 * 安全调用：所有 API 均做 typeof navigator 检查，SSR 安全
 */

import type { Song } from "@/lib/store/player-store";
import { getPlatform } from "@/lib/platform";

/** Media Session 操作处理器集合 */
export interface MediaSessionHandlers {
  play: () => void;
  pause: () => void;
  previoustrack: () => void;
  nexttrack: () => void;
  /** 跳转到指定时间（秒） */
  seekto: (time: number) => void;
  seekbackward?: () => void;
  seekforward?: () => void;
  stop?: () => void;
}

/**
 * 是否支持 Media Session API
 * - TWA 模式下完全跳过：原生 Media3 自带系统通知 + 锁屏控件 + 媒体按钮，
 *   前端重复设置会与原生冲突
 */
export function isMediaSessionSupported(): boolean {
  // TWA 模式短路：所有 navigator.mediaSession 调用均不应执行
  if (getPlatform().isTWA) return false;
  return (
    typeof navigator !== "undefined" &&
    "mediaSession" in navigator &&
    typeof MediaMetadata !== "undefined"
  );
}

/**
 * 设置 Media Session 元数据
 * - song 为 null 时清空元数据
 * - 封面提供多种尺寸以适配不同设备（锁屏大图 / 通知小图）
 */
export function setMediaSessionMetadata(song: Song | null): void {
  if (!isMediaSessionSupported()) return;
  if (!song) {
    navigator.mediaSession.metadata = null;
    return;
  }

  // 封面尺寸清单：覆盖锁屏、控制中心、通知等场景
  const sizes = [96, 128, 192, 256, 384, 512];
  const artwork = song.cover
    ? sizes.map((s) => ({
        src: song.cover as string,
        sizes: `${s}x${s}`,
        type: "image/jpeg",
      }))
    : [];

  navigator.mediaSession.metadata = new MediaMetadata({
    title: song.title,
    artist: song.artist,
    album: song.album ?? "",
    artwork,
  });
}

/**
 * 设置播放状态（playing / paused / none）
 * - 影响锁屏控件图标与系统媒体指示器
 */
export function setMediaSessionPlaybackState(
  isPlaying: boolean
): void {
  if (!isMediaSessionSupported()) return;
  navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";
}

/**
 * 设置进度位置信息（用于锁屏进度条显示）
 * - duration 已知时调用
 */
export function setMediaSessionPositionState(params: {
  duration: number;
  currentTime: number;
  playbackRate?: number;
}): void {
  if (!isMediaSessionSupported()) return;
  const { duration, currentTime, playbackRate = 1 } = params;
  if (!Number.isFinite(duration) || duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration,
      position: Math.min(Math.max(0, currentTime), duration),
      playbackRate,
    });
  } catch {
    // 部分浏览器在 position > duration 时抛错，忽略
  }
}

/**
 * 注册 Media Session 操作处理器
 * - 应在客户端 useEffect 中调用一次
 * - 返回 cleanup 函数：卸载时清空所有 handler
 *
 * 注意：setActionHandler 不支持的 action 会抛 NotSupportedError，try/catch 容错
 */
export function setupMediaSessionHandlers(
  handlers: MediaSessionHandlers
): () => void {
  if (!isMediaSessionSupported()) return () => {};

  const ms = navigator.mediaSession;

  const trySet = (
    action: MediaSessionAction,
    handler: ((details: MediaSessionActionDetails) => void) | null
  ) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      // 不支持的 action：忽略
    }
  };

  trySet("play", () => handlers.play());
  trySet("pause", () => handlers.pause());
  trySet("previoustrack", () => handlers.previoustrack());
  trySet("nexttrack", () => handlers.nexttrack());
  trySet("seekto", (details) => {
    // seekTime 由系统控件（如锁屏进度条拖拽）提供
    if (details.seekTime != null) {
      handlers.seekto(details.seekTime);
    }
  });
  if (handlers.seekbackward) {
    trySet("seekbackward", () => handlers.seekbackward?.());
  }
  if (handlers.seekforward) {
    trySet("seekforward", () => handlers.seekforward?.());
  }
  if (handlers.stop) {
    trySet("stop", () => handlers.stop?.());
  }

  return () => {
    // 卸载：清空所有 handler，避免泄漏
    trySet("play", null);
    trySet("pause", null);
    trySet("previoustrack", null);
    trySet("nexttrack", null);
    trySet("seekto", null);
    trySet("seekbackward", null);
    trySet("seekforward", null);
    trySet("stop", null);
  };
}
