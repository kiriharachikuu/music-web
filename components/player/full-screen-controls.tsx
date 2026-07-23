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
      <div className="mb-3 hidden justify-center md:flex">
        <QualitySelector />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <span className="w-12 shrink-0 text-right font-mono text-xs text-white/60">
          {formatTime(currentTime)}
        </span>
        <ProgressBar value={currentTime} max={duration} onSeek={onSeek} />
        <span className="w-12 shrink-0 font-mono text-xs text-white/60">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center justify-center gap-6 md:gap-8">
        <button
          type="button"
          onClick={onCyclePlayMode}
          className={cn(
            "group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
            playMode === "list"
              ? "text-white/60 hover:text-white hover:bg-white/10"
              : playMode === "sequential"
                ? "text-amber-400 hover:bg-amber-400/20"
                : "text-primary hover:bg-primary/20"
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
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">
            {playModeLabel}
          </span>
        </button>

        <button
          type="button"
          onClick={onPrev}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-all duration-200 hover:text-white hover:bg-white/10"
          aria-label="上一首"
        >
          <SkipBack className="h-6 w-6" fill="currentColor" />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">
            上一首
          </span>
        </button>

        <button
          type="button"
          onClick={onToggle}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0_8px_30px_rgba(0,0,0,0.3)] transition-all duration-200 hover:scale-105 hover:shadow-[0_10px_40px_rgba(0,0,0,0.4)] active:scale-95"
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

        <button
          type="button"
          onClick={onNext}
          className="group relative flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-all duration-200 hover:text-white hover:bg-white/10"
          aria-label="下一首"
        >
          <SkipForward className="h-6 w-6" fill="currentColor" />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">
            下一首
          </span>
        </button>

        <button
          type="button"
          onClick={onToggleFavorite}
          className={cn(
            "group relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200",
            isFavorite
              ? "text-primary hover:bg-primary/20"
              : "text-white/60 hover:text-white hover:bg-white/10"
          )}
          aria-label={isFavorite ? "取消喜欢" : "喜欢"}
        >
          <Heart className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-white/40 opacity-0 transition-opacity group-hover:opacity-100">
            {isFavorite ? "取消喜欢" : "喜欢"}
          </span>
        </button>
      </div>
    </footer>
  );
}
