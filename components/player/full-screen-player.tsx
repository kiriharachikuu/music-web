"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import {
  ChevronDown,
  ListMusic,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";

import {
  usePlayerStore,
  formatTime,
  type PlayMode,
} from "@/lib/store/player-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { LyricsView } from "./lyrics-view";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
  setupMediaSessionHandlers,
} from "@/lib/media-session";

/**
 * XingTone —— 全屏歌词播放页（Apple Music 级视觉体验）
 *
 * 设计要点：
 * 1. 触发：mini-player 展开按钮 → playerStore.openLyricPage()
 *    本组件由 isLyricPageOpen 控制 AnimatePresence，从底部上滑展开 / 下滑收起
 * 2. 背景：currentSong.cover 大图 blur-3xl + scale-125 铺满，叠加径向渐变蒙层
 *    - 暗色：rgba(139,0,255,0.35) 中心 → rgba(0,0,0,0.75) 边缘
 *    - 亮色：紫色透明度降至 0.2
 * 3. 歌词：<LyricsView />，逐行高亮 + 紫色辉光 + 自动滚动 + 点击跳转
 * 4. 控制：自定义进度条（点击/拖拽） + 上一首/播放/下一首 + 循环模式 + 队列
 * 5. 队列：右侧 Sheet 抽屉，毛玻璃 bg-black/40 + backdrop-blur-xl
 * 6. 拖拽关闭：仅顶部手柄区域可启动拖拽（dragControls），避免与歌词滚动冲突
 *    向下拖拽 > 120px 或速度 > 500 → closeLyricPage()
 * 7. Media Session：currentSong 变化时设置元数据 + 锁屏控件
 * 8. 响应式：移动端单列（歌词 + 底部控制），PC 左右分栏（左封面 + 右歌词）
 */

/** 全屏播放页入口：由 isLyricPageOpen 控制 AnimatePresence */
export function FullScreenPlayer() {
  const isOpen = usePlayerStore((s) => s.isLyricPageOpen);
  const close = usePlayerStore((s) => s.closeLyricPage);

  return (
    <AnimatePresence>
      {isOpen && <FullScreenPlayerInner key="fsp" onClose={close} />}
    </AnimatePresence>
  );
}

// ===== 自定义进度条 =====

interface ProgressBarProps {
  value: number;
  max: number;
  onSeek: (t: number) => void;
}

/**
 * 横向进度条：支持点击跳转 + 拖拽跳转
 * - 已播放部分：from-primary-600 to-primary-700 线性渐变
 * - 拖拽圆点：白边 + primary-700 实心
 * - 使用 Pointer Events + setPointerCapture 保证拖拽中不丢失指针
 */
function ProgressBar({ value, max, onSeek }: ProgressBarProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [dragValue, setDragValue] = React.useState<number | null>(null);

  // 拖拽中显示 dragValue，松开后提交 onSeek
  const currentValue = dragValue ?? value;
  const pct =
    max > 0 ? Math.min(100, Math.max(0, (currentValue / max) * 100)) : 0;

  // 根据 clientX 计算对应时间
  const calcTime = React.useCallback(
    (clientX: number): number | null => {
      const el = ref.current;
      if (!el || max <= 0) return null;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width)
      );
      return ratio * max;
    },
    [max]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    if (max <= 0) return;
    e.preventDefault();
    const t = calcTime(e.clientX);
    if (t == null) return;
    setDragging(true);
    setDragValue(t);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* 忽略 capture 失败 */
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const t = calcTime(e.clientX);
    if (t == null) return;
    setDragValue(t);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    const t = calcTime(e.clientX);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* 忽略 release 失败 */
    }
    setDragging(false);
    setDragValue(null);
    if (t != null) onSeek(t);
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className="group relative flex h-6 w-full cursor-pointer touch-none items-center"
    >
      {/* 轨道 */}
      <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/20" />
      {/* 已播放填充：primary-600 → primary-700 渐变 */}
      <div
        className="absolute left-0 h-1.5 rounded-full bg-gradient-to-r from-primary-600 to-primary-700"
        style={{ width: `${pct}%` }}
      />
      {/* 拖拽圆点：白边 + primary-700 实心 */}
      <div
        className={cn(
          "absolute h-4 w-4 rounded-full border-2 border-white bg-primary-700 shadow-md transition-transform",
          "group-hover:scale-110",
          dragging && "scale-125"
        )}
        style={{ left: `calc(${pct}% - 8px)` }}
      />
    </div>
  );
}

// ===== 播放队列抽屉 =====

interface QueueSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

/**
 * 播放队列抽屉：右侧滑出，毛玻璃背景
 * - 列表显示 queue 中所有歌曲（封面 + 歌名 + 歌手）
 * - 当前播放行：text-primary-300 + 左侧 primary-700 圆点标记
 * - 点击切换播放
 */
function QueueSheet({ open, onOpenChange }: QueueSheetProps) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const play = usePlayerStore((s) => s.play);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex flex-col gap-0 border-white/10 bg-black/40 p-0 text-white backdrop-blur-xl sm:max-w-md",
          // 让 Sheet 自带的关闭按钮（直接子 button）变白
          "[&>button]:text-white/70 [&>button:hover]:text-white"
        )}
      >
        <SheetHeader className="border-b border-white/10 px-5 py-4">
          <SheetTitle className="text-white">播放队列</SheetTitle>
          <p className="text-xs text-white/50">共 {queue.length} 首</p>
        </SheetHeader>

        {/* 列表：原生 overflow + no-scrollbar，与歌词区视觉一致 */}
        <div className="no-scrollbar flex-1 overflow-y-auto py-2">
          <ul className="flex flex-col">
            {queue.map((song, i) => {
              const isCurrent = i === currentIndex;
              return (
                <li key={`${song.id}-${i}`}>
                  <button
                    type="button"
                    onClick={() => play(song)}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-white/5",
                      isCurrent && "bg-white/5"
                    )}
                  >
                    {/* 当前播放左侧标记条 */}
                    <span className="w-1 shrink-0 self-stretch">
                      {isCurrent && (
                        <span className="block h-full w-1 rounded-full bg-primary-700" />
                      )}
                    </span>
                    {/* 封面缩略图 */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-white/10">
                      {song.cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={song.cover}
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Music2 className="h-4 w-4 text-white/40" />
                        </div>
                      )}
                    </div>
                    {/* 歌名 + 歌手 */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          isCurrent ? "text-primary-300" : "text-white"
                        )}
                      >
                        {song.title}
                      </p>
                      <p className="truncate text-xs text-white/50">
                        {song.artist}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
            {queue.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-white/50">
                队列为空
              </li>
            )}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== 全屏播放页主体 =====

interface FullScreenPlayerInnerProps {
  onClose: () => void;
}

function FullScreenPlayerInner({ onClose }: FullScreenPlayerInnerProps) {
  // ----- 播放器状态 -----
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const playMode = usePlayerStore((s) => s.playMode);

  // ----- 播放器操作 -----
  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);

  // 拖拽控制：仅顶部手柄区域可启动拖拽，避免与歌词滚动冲突
  const dragControls = useDragControls();

  // ----- 主题判断（暗色 vs 亮色，影响背景蒙层透明度）-----
  // 用 MutationObserver 监听 <html> 的 class 变化，避免 hydration mismatch
  const [isDark, setIsDark] = React.useState(true);
  React.useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // ----- 拉取 LRC 歌词 -----
  const [lrc, setLrc] = React.useState<string | null>(null);
  const [lrcLoading, setLrcLoading] = React.useState(false);
  React.useEffect(() => {
    let cancelled = false;
    if (!currentSong) {
      setLrc(null);
      return;
    }
    setLrcLoading(true);
    setLrc(null);
    api
      .get<unknown>(`/songs/${currentSong.id}/lyric`)
      .then((data) => {
        if (cancelled) return;
        // 兼容后端返回 string 或 { lyric: string } 两种结构
        if (typeof data === "string") {
          setLrc(data);
        } else if (
          data &&
          typeof data === "object" &&
          "lyric" in data
        ) {
          setLrc(String((data as { lyric?: unknown }).lyric ?? ""));
        } else {
          setLrc(null);
        }
      })
      .catch(() => {
        if (!cancelled) setLrc(null);
      })
      .finally(() => {
        if (!cancelled) setLrcLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentSong?.id]);

  // ----- Media Session 集成 -----
  // 元数据 + 播放状态 + 位置（锁屏进度条）
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

  // ----- 队列抽屉状态 -----
  const [queueOpen, setQueueOpen] = React.useState(false);

  // ----- 拖拽关闭判断 -----
  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
  };

  // ----- 循环模式切换：single → list → shuffle → single -----
  const cyclePlayMode = () => {
    const order: PlayMode[] = ["single", "list", "shuffle"];
    const idx = order.indexOf(playMode);
    const nextMode = order[(idx + 1) % order.length];
    setPlayMode(nextMode);
  };

  // 无歌曲不渲染
  if (!currentSong) return null;

  const cover = currentSong.cover;
  const playModeLabel =
    playMode === "single"
      ? "单曲循环"
      : playMode === "shuffle"
        ? "随机播放"
        : "列表循环";

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-black text-white"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 320 }}
      // 拖拽关闭：仅 dragControls 启动，禁用默认 dragListener
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      {/* ===== 背景层 z-0 ===== */}
      <div className="absolute inset-0 z-0">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="h-full w-full scale-125 object-cover blur-3xl"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary-700/40 to-black" />
        )}
        {/* 径向渐变蒙层：中心紫色 → 边缘黑色 */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at center, rgba(139,0,255,${
              isDark ? 0.35 : 0.2
            }) 0%, rgba(0,0,0,0.75) 100%)`,
          }}
        />
      </div>

      {/* ===== 内容层 z-10 ===== */}
      <div className="relative z-10 flex h-full flex-col">
        {/* 顶部下拉手柄条（仅此区域可启动拖拽关闭） */}
        <div
          onPointerDown={(e) => dragControls.start(e.nativeEvent)}
          className="flex shrink-0 cursor-grab justify-center pt-3 active:cursor-grabbing"
          aria-label="下拉关闭"
        >
          <div className="h-1.5 w-12 rounded-full bg-white/30" />
        </div>

        {/* 顶部信息栏：关闭按钮 + 移动端歌名歌手 + 队列按钮 */}
        <header className="flex shrink-0 items-center justify-between px-4 py-3 md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/70 transition-colors hover:text-white"
            aria-label="收起播放页"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
          {/* 移动端：歌名 + 歌手 */}
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center lg:hidden">
            <p className="truncate text-sm font-semibold">
              {currentSong.title}
            </p>
            <p className="truncate text-xs text-white/60">
              {currentSong.artist}
            </p>
          </div>
          {/* PC 端占位让两侧按钮对称 */}
          <div className="hidden flex-1 lg:block" />
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className="rounded-full p-2 text-white/70 transition-colors hover:text-white"
            aria-label="播放队列"
          >
            <ListMusic className="h-5 w-5" />
          </button>
        </header>

        {/* ===== 主区：PC 左右分栏，移动端单列 ===== */}
        <main className="flex min-h-0 flex-1 flex-col px-4 md:px-8 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10">
          {/* 左：大封面 + 歌名歌手（仅 PC 显示） */}
          <div className="hidden flex-col items-center justify-center gap-6 lg:flex">
            <div className="aspect-square w-[min(420px,80%)] overflow-hidden rounded-2xl bg-white/5 shadow-2xl ring-1 ring-white/10">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
                  alt={currentSong.title}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary-700/20">
                  <Music2 className="h-16 w-16 text-white/40" />
                </div>
              )}
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold drop-shadow-sm">
                {currentSong.title}
              </h1>
              <p className="mt-1 text-sm text-white/60">
                {currentSong.artist}
              </p>
            </div>
          </div>

          {/* 右：歌词 */}
          <div className="min-h-0 flex-1 lg:h-[60vh] lg:flex-none">
            <LyricsView
              lrc={lrc}
              currentTime={currentTime}
              onSeek={seek}
              loading={lrcLoading}
            />
          </div>
        </main>

        {/* ===== 底部控制区 ===== */}
        <footer className="shrink-0 px-4 pb-6 pt-2 md:px-8 md:pb-8">
          {/* 进度条 + 时间 */}
          <div className="mb-3 flex items-center gap-3">
            <span className="w-12 shrink-0 text-right font-mono text-xs text-white/60">
              {formatTime(currentTime)}
            </span>
            <ProgressBar value={currentTime} max={duration} onSeek={seek} />
            <span className="w-12 shrink-0 font-mono text-xs text-white/60">
              {formatTime(duration)}
            </span>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-5 md:gap-10">
            {/* 循环模式：激活态变 primary-500 */}
            <button
              type="button"
              onClick={cyclePlayMode}
              className={cn(
                "rounded-full p-2 transition-colors",
                playMode !== "list"
                  ? "text-primary-500"
                  : "text-white/70 hover:text-white"
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
              onClick={prev}
              className="rounded-full p-2 text-white/80 transition-colors hover:text-white"
              aria-label="上一首"
            >
              <SkipBack className="h-7 w-7" fill="currentColor" />
            </button>

            {/* 主播放按钮：白色圆形实心，图标 primary-700 */}
            <button
              type="button"
              onClick={toggle}
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
              onClick={next}
              className="rounded-full p-2 text-white/80 transition-colors hover:text-white"
              aria-label="下一首"
            >
              <SkipForward className="h-7 w-7" fill="currentColor" />
            </button>

            {/* 队列 */}
            <button
              type="button"
              onClick={() => setQueueOpen(true)}
              className="rounded-full p-2 text-white/70 transition-colors hover:text-white"
              aria-label="播放队列"
            >
              <ListMusic className="h-5 w-5" />
            </button>
          </div>
        </footer>
      </div>

      {/* ===== 播放队列抽屉 ===== */}
      <QueueSheet open={queueOpen} onOpenChange={setQueueOpen} />
    </motion.div>
  );
}
