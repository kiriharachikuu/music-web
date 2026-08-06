"use client";

import * as React from "react";
import { usePlayerStore } from "@/lib/store/player-store";
import {
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
  setupMediaSessionHandlers,
} from "@/lib/media-session";

/**
 * XingTone —— MediaSession 常驻管理器
 *
 * 关键设计：必须常驻挂载在 AppShell 顶层，不能放在 FullScreenPlayer 内。
 *
 * 历史问题：原本挂在 FullScreenPlayerInner 中，受 isLyricPageOpen 控制，
 * 关闭全屏播放页时 cleanup 会把所有 action handler 清空成 null，
 * 且后续 useEffect 不再运行 —— 导致 iOS 锁屏 / 控制中心在用户关闭
 * 全屏播放页后无法更新封面、歌名、播放状态，切歌也不同步。
 *
 * 现在独立常驻：无论全屏播放页是否打开，元数据 / 播放状态 / 位置 / 操作处理器
 * 都会持续同步到系统锁屏、控制中心、车载、耳机按键。
 *
 * 平台兼容：TWA 模式下 media-session.ts 内部短路跳过（原生 Media3 接管）。
 */
export function MediaSessionManager() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);

  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);

  // 元数据 + 播放状态 + 位置（锁屏进度条）
  // 依赖 currentSong / isPlaying / duration / currentTime，与原 FullScreenPlayer 内逻辑一致
  React.useEffect(() => {
    setMediaSessionMetadata(currentSong);
    setMediaSessionPlaybackState(isPlaying);
    if (currentSong && duration > 0) {
      setMediaSessionPositionState({
        duration,
        currentTime: Math.min(currentTime, duration),
      });
    }
  }, [currentSong, isPlaying, duration, currentTime]);

  // 操作处理器：play / pause / prev / next / seekto
  // 依赖项只放稳定的 store actions（zustand 引用稳定），无需重新注册
  React.useEffect(() => {
    const cleanup = setupMediaSessionHandlers({
      play: () => {
        if (!usePlayerStore.getState().isPlaying) toggle();
      },
      pause: () => {
        if (usePlayerStore.getState().isPlaying) toggle();
      },
      previoustrack: () => prev(),
      nexttrack: () => next(),
      seekto: (t) => seek(t),
    });
    return cleanup;
  }, [toggle, prev, next, seek]);

  return null;
}
