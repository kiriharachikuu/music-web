"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { ChevronDown, Heart, ListMusic, Music2, ChevronUp } from "lucide-react";
import { LiveClipBadge } from "@/components/common/live-clip-badge";

import {
  usePlayerStore,
  type PlayMode,
} from "@/lib/store/player-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { getCachedLyric, fetchAndCacheLyric } from "@/lib/db/lyric-cache";
import { LyricsView } from "./lyrics-view";
import { QueueSheet } from "./queue-sheet";
import { FullScreenControls } from "./full-screen-controls";
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

// ===== 全屏播放页主体 =====

interface FullScreenPlayerInnerProps {
  onClose: () => void;
}

function FullScreenPlayerInner({ onClose }: FullScreenPlayerInnerProps) {
  const router = useRouter();
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

    (async () => {
      const cached = await getCachedLyric(currentSong.id);
      if (cancelled) return;
      if (cached) {
        setLrc(cached);
        setLrcLoading(false);
        return;
      }
      const fresh = await fetchAndCacheLyric(currentSong.id);
      if (cancelled) return;
      setLrc(fresh);
      setLrcLoading(false);
    })();

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

  // ----- 移动端封面/歌词视图切换 -----
  const [showLyrics, setShowLyrics] = React.useState(false);
  // 防连点：300ms 内不允许再次切换
  const toggleCooldownRef = React.useRef(false);
  const toggleView = React.useCallback(() => {
    if (toggleCooldownRef.current) return;
    toggleCooldownRef.current = true;
    setShowLyrics((v) => !v);
    setTimeout(() => {
      toggleCooldownRef.current = false;
    }, 300);
  }, []);
  // 切歌时重置到封面视图
  React.useEffect(() => {
    setShowLyrics(false);
  }, [currentSong?.id]);

  // ----- 喜欢状态（全局 store） -----
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const isFavorite = currentSong ? likedIds.has(currentSong.id) : false;

  const toggleFavorite = async () => {
    if (!currentSong) return;
    await toggleLike(currentSong.id);
  };

  // ----- 拖拽关闭判断 -----
  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
  };

  // ----- 循环模式切换：list → single → sequential → shuffle → list -----
  const cyclePlayMode = () => {
    const order: PlayMode[] = ["list", "single", "sequential", "shuffle"];
    const idx = order.indexOf(playMode);
    const nextMode = order[(idx + 1) % order.length];
    setPlayMode(nextMode);
  };

  // 无歌曲不渲染
  if (!currentSong) return null;

  const cover = currentSong.cover;

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
        <div
          className="h-full w-full"
          style={{
            background: `radial-gradient(ellipse at center, rgba(139,0,255,${
              isDark ? 0.45 : 0.3
            }) 0%, rgba(0,0,0,0.85) 100%)`,
          }}
        />
      </div>

      {/* ===== 内容层 z-10 ===== */}
      <div className="relative z-10 flex h-full flex-col safe-area-inset">
        {/* 顶部下拉手柄条（仅此区域可启动拖拽关闭） */}
        <div
          onPointerDown={(e) => dragControls.start(e.nativeEvent)}
          className="flex shrink-0 cursor-grab justify-center py-4 active:cursor-grabbing"
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
          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center md:hidden">
            <div className="flex items-center gap-1.5">
              {currentSong.trackType === "live_clip" && currentSong.sessionId && (
                <LiveClipBadge
                  onClick={() => router.push(`/live-session/${currentSong.sessionId}`)}
                />
              )}
              <p className="truncate text-sm font-semibold">
                {currentSong.title}
              </p>
            </div>
            <p className="truncate text-xs text-white/60">
              {currentSong.artist}
            </p>
          </div>
          {/* PC 端占位让两侧按钮对称 */}
          <div className="hidden flex-1 md:block" />
          <button
            type="button"
            onClick={() => setQueueOpen(true)}
            className="rounded-full p-2 text-white/70 transition-colors hover:text-white"
            aria-label="播放队列"
          >
            <ListMusic className="h-5 w-5" />
          </button>
        </header>

        {/* ===== 主区：PC 左右分栏，移动端封面/歌词交叉淡入淡出 ===== */}
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden md:grid md:grid-cols-[0.9fr_1.1fr] md:items-stretch md:gap-10">
          {/* 左：大封面 + 歌名歌手（仅 PC 显示） */}
          <div className="hidden flex-col items-center gap-6 overflow-y-auto px-4 py-4 md:flex">
            {/* mt-auto/mb-auto：内容少时垂直居中，溢出时正常滚动（避免 justify-center 导致顶部裁切） */}
            <div className="mt-auto mb-auto flex shrink-0 flex-col items-center gap-6">
              <div className="aspect-square w-[min(420px,80%,60vh)] overflow-hidden rounded-2xl bg-white/5 shadow-2xl ring-1 ring-white/10">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={currentSong.title}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/20">
                    <Music2 className="h-16 w-16 text-white/40" />
                  </div>
                )}
              </div>
              <div className="w-full max-w-md shrink-0 px-2 text-center">
                <div className="flex items-center justify-center gap-2">
                  {currentSong.trackType === "live_clip" && currentSong.sessionId && (
                    <LiveClipBadge
                      onClick={() => router.push(`/live-session/${currentSong.sessionId}`)}
                    />
                  )}
                  <h1 className="min-w-0 truncate text-2xl font-bold drop-shadow-sm">
                    {currentSong.title}
                  </h1>
                </div>
                <p className="mt-1 truncate text-sm text-white/60">
                  {currentSong.artist}
                </p>
              </div>
            </div>
          </div>

          {/* 右：歌词（PC 端始终可见） */}
          <div className="hidden min-h-0 h-full md:block">
            <LyricsView
              lrc={lrc}
              currentTime={currentTime}
              onSeek={seek}
              loading={lrcLoading}
            />
          </div>

          {/* ===== 移动端：封面 ⇄ 歌词交叉淡入淡出 ===== */}
          <div className="relative min-h-0 flex-1 md:hidden">
            {/* 封面视图 */}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center overflow-y-auto px-4 transition-all duration-300 ease-out ${
                showLyrics
                  ? "opacity-0 pointer-events-none scale-95"
                  : "opacity-100 delay-100"
              }`}
              onClick={toggleView}
              role="button"
              tabIndex={0}
              aria-label="点击查看歌词"
            >
              {/* 封面图：vh 约束适配横屏/矮视口 */}
              <div className="aspect-square w-[min(280px,62vw,55vh)] shrink-0 overflow-hidden rounded-2xl bg-white/5 shadow-2xl ring-1 ring-white/10">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cover}
                    alt={currentSong.title}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-primary/20">
                    <Music2 className="h-14 w-14 text-white/40" />
                  </div>
                )}
              </div>

              {/* 歌名 + 歌手：shrink-0 防止被压缩 */}
              <div className="mt-6 w-full max-w-xs shrink-0 px-2 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  {currentSong.trackType === "live_clip" && currentSong.sessionId && (
                    <span
                      onClick={(e) => e.stopPropagation()}
                      role="presentation"
                    >
                      <LiveClipBadge
                        onClick={() =>
                          router.push(`/live-session/${currentSong.sessionId}`)
                        }
                      />
                    </span>
                  )}
                  <h1 className="min-w-0 truncate text-lg font-bold drop-shadow-sm">
                    {currentSong.title}
                  </h1>
                </div>
                <p className="mt-1 truncate text-sm text-white/60">
                  {currentSong.artist}
                </p>
              </div>

              {/* 底部上滑提示 */}
              <motion.div
                className="mt-8 flex shrink-0 flex-col items-center gap-1 text-white/30"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronUp className="h-5 w-5" />
                <span className="text-[11px]">点击查看歌词</span>
              </motion.div>
            </div>

            {/* 歌词视图 */}
            <div
              className={`absolute inset-0 transition-all duration-300 ease-out ${
                showLyrics
                  ? "opacity-100 delay-100"
                  : "opacity-0 pointer-events-none scale-105"
              }`}
            >
              <LyricsView
                lrc={lrc}
                currentTime={currentTime}
                onSeek={seek}
                loading={lrcLoading}
                onToggleView={toggleView}
              />
            </div>
          </div>
        </main>

        {/* ===== 底部控制区 ===== */}
        <div className="shrink-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-10 pb-2">
          <FullScreenControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            playMode={playMode}
            onToggle={toggle}
            onPrev={prev}
            onNext={next}
            onSeek={seek}
            onCyclePlayMode={cyclePlayMode}
            isFavorite={isFavorite}
            onToggleFavorite={toggleFavorite}
          />
        </div>
      </div>

      {/* ===== 播放队列抽屉 ===== */}
      <QueueSheet open={queueOpen} onOpenChange={setQueueOpen} />
    </motion.div>
  );
}
