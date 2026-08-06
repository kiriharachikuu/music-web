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

  // 元数据 + 播放状态：仅在切歌或播放状态变化时更新
  // 避免依赖 currentTime（每 250ms 变化）导致封面频繁重复设置、iOS 锁屏闪烁
  React.useEffect(() => {
    setMediaSessionMetadata(currentSong);
    setMediaSessionPlaybackState(isPlaying);
  }, [currentSong, isPlaying]);

  // 位置状态（锁屏进度条）：依赖 duration / currentTime
  React.useEffect(() => {
    if (currentSong && duration > 0) {
      setMediaSessionPositionState({
        duration,
        currentTime: Math.min(currentTime, duration),
      });
    }
  }, [currentSong, duration, currentTime]);

  // 操作处理器：play / pause / prev / next / seekto
  // 关键：依赖 isPlaying，在音频开始播放时重新注册 handler。
  // iOS Safari 的 MediaSession 要求音频实际播放后才激活 handler，
  // 应用启动时（尚未播放）注册的 handler 不会被 iOS 激活，锁屏 prev/next 不响应。
  // 不返回 cleanup：暂停状态下也应保留 handler 让用户切歌，清空会导致锁屏按钮失效。
  React.useEffect(() => {
    setupMediaSessionHandlers({
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
    // 不返回 cleanup：常驻组件，handler 覆盖式注册，不清空
  }, [isPlaying, toggle, prev, next, seek]);

  return null;
}
