"use client";

import {
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

import { formatTime, type PlayMode } from "@/lib/store/player-store";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./progress-bar";

/**
 * 全屏播放页底部控制区：进度条 + 控制按钮
 * - 进度条 + 当前时间 / 总时长
 * - 循环模式 / 上一首 / 播放-暂停 / 下一首 / 队列
 */
export interface FullScreenControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playMode: PlayMode;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (t: number) => void;
  onCyclePlayMode: () => void;
  onOpenQueue: () => void;
}

export function FullScreenControls({
  isPlaying,
  currentTime,
  duration,
  playMode,
  onToggle,
  onPrev,
  onNext,
  onSeek,
  onCyclePlayMode,
  onOpenQueue,
}: FullScreenControlsProps) {
  const playModeLabel =
    playMode === "single"
      ? "单曲循环"
      : playMode === "shuffle"
        ? "随机播放"
        : playMode === "sequential"
          ? "顺序播放"
          : "列表循环";

  return (
    <footer className="shrink-0 px-4 pb-6 pt-2 md:px-8 md:pb-8">
      {/* 进度条 + 时间 */}
      <div className="mb-3 flex items-center gap-3">
        <span className="w-12 shrink-0 text-right font-mono text-xs text-white/60">
          {formatTime(currentTime)}
        </span>
        <ProgressBar value={currentTime} max={duration} onSeek={onSeek} />
        <span className="w-12 shrink-0 font-mono text-xs text-white/60">
          {formatTime(duration)}
        </span>
      </div>

      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-5 md:gap-10">
        {/* 循环模式：激活态变 primary-500 */}
        <button
          type="button"
          onClick={onCyclePlayMode}
          className={cn(
            "rounded-full p-2 transition-colors",
            playMode === "list"
              ? "text-white/70 hover:text-white"
              : playMode === "sequential"
                ? "text-amber-400"
                : "text-primary-500"
          )}
          aria-label={playModeLabel}
        >
          {playMode === "single" ? (
            <Repeat1 className="h-5 w-5" />
          ) : playMode === "shuffle" ? (
            <Shuffle className="h-5 w-5" />
          ) : (
            <Repeat className="h-5 w-5" />
          )}
        </button>

        {/* 上一首 */}
        <button
          type="button"
          onClick={onPrev}
          className="rounded-full p-2 text-white/80 transition-colors hover:text-white"
          aria-label="上一首"
        >
          <SkipBack className="h-7 w-7" fill="currentColor" />
        </button>

        {/* 主播放按钮：白色圆形实心，图标 primary-700 */}
        <button
          type="button"
          onClick={onToggle}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-105 active:scale-95"
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? (
            <Pause className="h-7 w-7 text-primary-700" fill="currentColor" />
          ) : (
            <Play
              className="h-7 w-7 translate-x-[2px] text-primary-700"
              fill="currentColor"
            />
          )}
        </button>

        {/* 下一首 */}
        <button
          type="button"
          onClick={onNext}
          className="rounded-full p-2 text-white/80 transition-colors hover:text-white"
          aria-label="下一首"
        >
          <SkipForward className="h-7 w-7" fill="currentColor" />
        </button>

        {/* 队列 */}
        <button
          type="button"
          onClick={onOpenQueue}
          className="rounded-full p-2 text-white/70 transition-colors hover:text-white"
          aria-label="播放队列"
        >
          <ListMusic className="h-5 w-5" />
        </button>
      </div>
    </footer>
  );
}
