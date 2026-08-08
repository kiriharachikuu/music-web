"use client";

import * as React from "react";
import { usePlayerStore } from "@/lib/store/player-store";

/**
 * 桌面客户端控制桥接
 *
 * 监听主进程通过 IPC 发来的播放控制命令（托盘 / 全局快捷键 / 任务栏缩略图 / 菜单），
 * 调用 player-store 执行对应操作。组件不渲染任何 UI，仅作为副作用挂载点。
 */
export function DesktopControlBridge() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const api = window.electronAPI;
    if (!api?.onControlCommand) return;

    const unsubscribe = api.onControlCommand((cmd) => {
      const state = usePlayerStore.getState();
      switch (cmd) {
        case "play":
          if (state.currentSong) void state.play(state.currentSong);
          break;
        case "pause":
          state.pause();
          break;
        case "toggle-play":
          state.toggle();
          break;
        case "prev":
          state.prev();
          break;
        case "next":
          state.next();
          break;
        case "volume-up":
          state.setVolume(Math.min(1, state.volume + 0.1));
          break;
        case "volume-down":
          state.setVolume(Math.max(0, state.volume - 0.1));
          break;
      }
    });

    return unsubscribe;
  }, []);

  return null;
}
