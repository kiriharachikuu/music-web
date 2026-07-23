"use client";

import {
  Heart,
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
import { QualitySelector } from "./quality-selector";

/**
 * 全屏播放页底部控制区：进度条 + 控制按钮
 * - 进度条 + 当前时间 / 总时长
 * - 循环模式 / 上一首 / 播放-暂停 / 下一首 / 喜欢音乐 / 音质选择
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
  isFavorite: boolean;
  onToggleFavorite: () => void;
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
  isFavorite,
  onToggleFavorite,
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
    <footer className="shrink-0 px-4 pb-4 pt-2 md:px-8 md:pb-6">
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
      <div className="flex items-center justify-between gap-5 md:gap-10">
        {/* 左侧控制：循环模式 / 上一首 / 播放-暂停 / 下一首 / 喜欢音乐 */}
        <div className="flex items-center gap-5 md:gap-10">
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
                : "text-primary"
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
            <Pause className="h-7 w-7 text-primary" fill="currentColor" />
          ) : (
            <Play
              className="h-7 w-7 translate-x-[2px] text-primary"
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

        {/* 喜欢音乐 */}
          <button
            type="button"
            onClick={onToggleFavorite}
            className={cn(
              "rounded-full p-2 transition-colors",
              isFavorite
                ? "text-primary"
                : "text-white/70 hover:text-white"
            )}
            aria-label={isFavorite ? "取消喜欢" : "喜欢"}
          >
            <Heart className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
          </button>
        </div>

        {/* 右侧：音质选择 */}
        <div className="hidden md:block">
          <QualitySelector />
        </div>
      </div>
    </footer>
  );
}
