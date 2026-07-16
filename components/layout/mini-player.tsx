"use client";

import * as React from "react";
import { Play, Pause, SkipForward, ChevronUp, Music2, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlayerStore, formatTime as fmt } from "@/lib/store/player-store";

/**
 * 进度条（点击/拖拽定位）
 * - 填充使用 primary-600 → primary-800 渐变（progress-fill 工具类）
 */
function ProgressBar({
  value,
  max,
  onSeek,
}: {
  value: number;
  max: number;
  onSeek: (t: number) => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  const seekToClientX = (clientX: number) => {
    const el = ref.current;
    if (!el || max <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    onSeek(ratio * max);
  };

  return (
    // 外层触摸层：py-4 扩大可点击区域至 ~38px（满足移动端拖动需求），
    // -my-4 负边距抵消视觉高度变化，使布局高度仍为细轨道高度
    <div
      onClick={(e) => seekToClientX(e.clientX)}
      className="group relative w-full cursor-pointer py-4 -my-4"
    >
      <div
        ref={ref}
        className="relative h-1.5 w-full rounded-full bg-primary/20"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 底部常驻迷你播放栏
 * - 封面 + 歌名 + 歌手 + 播放/暂停 + 进度条 + 下一首 + 展开
 * - 移动端位于底部 Tab 栏之上（bottom-16），桌面端 bottom-0
 */
export function MiniPlayer() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const seek = usePlayerStore((s) => s.seek);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const openLyricPage = usePlayerStore((s) => s.openLyricPage);

  return (
    <div className="fixed inset-x-0 bottom-[calc(3.5rem+var(--safe-area-bottom,0px))] max-md:landscape:bottom-[calc(3rem+var(--safe-area-bottom,0px))] z-40 md:bottom-0 md:left-64 md:z-40">
      <div className="mx-auto border-t border-primary/10 bg-white/80 backdrop-blur-xl dark:bg-gray-900/60">
        <div className="flex items-center gap-3 px-3 py-2 md:gap-4 md:px-6 md:py-3 max-md:landscape:py-1.5">
          {/* 封面 */}
          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary/10 md:h-14 md:w-14 max-md:landscape:h-10 max-md:landscape:w-10">
            {currentSong?.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={currentSong.cover}
                alt={currentSong.title}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                style={{ contain: "strict" }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary/60">
                <Music2 className="h-5 w-5" />
              </div>
            )}
          </div>

          {/* 歌名 / 歌手 + 进度条 */}
          <div className="flex min-w-0 flex-1 flex-col gap-1 max-md:landscape:gap-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium max-md:landscape:text-[13px]">
                  {currentSong?.title ?? "未在播放"}
                </p>
                <p className="truncate text-xs text-foreground/50 max-md:landscape:text-[11px]">
                  {currentSong?.artist ?? "—"}
                </p>
              </div>
              {/* 时间（桌面端） */}
              <span className="hidden shrink-0 font-mono text-xs text-foreground/50 md:inline">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            </div>
            <ProgressBar
              value={currentTime}
              max={duration}
              onSeek={seek}
            />
          </div>

          {/* 控制按钮 */}
          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            <Button
              onClick={toggle}
              size="icon"
              aria-label={isPlaying ? "暂停" : "播放"}
              className="h-9 w-9 rounded-full bg-primary text-white shadow-card hover:bg-primary/90 active:bg-primary/95 md:h-10 md:w-10 max-md:landscape:h-8 max-md:landscape:w-8"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 md:h-5 md:w-5 max-md:landscape:h-3.5 max-md:landscape:w-3.5" />
              ) : (
                <Play className="h-4 w-4 translate-x-[1px] md:h-5 md:w-5 max-md:landscape:h-3.5 max-md:landscape:w-3.5" />
              )}
            </Button>
            <Button
              onClick={next}
              variant="ghost"
              size="icon"
              aria-label="下一首"
              className="hidden text-foreground/70 hover:text-foreground sm:inline-flex"
            >
              <SkipForward className="h-5 w-5" />
            </Button>
            {/* PC端音量控制 */}
            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
                aria-label={volume === 0 ? "取消静音" : "静音"}
                className="text-foreground/70 hover:text-foreground"
              >
                {volume === 0 ? (
                  <VolumeX className="h-4 w-4" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </button>
              <div className="relative w-20 h-1.5">
                <div className="absolute inset-0 rounded-full bg-foreground/20" />
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: `${volume * 100}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full appearance-none cursor-pointer bg-transparent [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:relative [&::-webkit-slider-thumb]:z-10"
                  aria-label="音量"
                />
              </div>
            </div>
            <Button
              onClick={openLyricPage}
              variant="ghost"
              size="icon"
              aria-label="展开播放页"
              className="text-foreground/70 hover:text-foreground"
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
