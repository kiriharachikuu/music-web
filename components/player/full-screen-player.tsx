"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useDragControls,
  type PanInfo,
} from "framer-motion";
import { ChevronDown, Heart, ListMusic, Music2, ChevronUp, Info, Share2 } from "lucide-react";
import { LiveClipBadge } from "@/components/common/live-clip-badge";
import { AppImage } from "@/components/ui/app-image";
import { cn } from "@/lib/utils";

import {
  usePlayerStore,
  type PlayMode,
} from "@/lib/store/player-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { getCachedLyric, fetchAndCacheLyric } from "@/lib/db/lyric-cache";
import { LyricsView } from "./lyrics-view";
import { QueueSheet } from "./queue-sheet";
import { FullScreenControls } from "./full-screen-controls";
import { QualitySelector } from "./quality-selector";
import {
  setMediaSessionMetadata,
  setMediaSessionPlaybackState,
  setMediaSessionPositionState,
  setupMediaSessionHandlers,
} from "@/lib/media-session";
import { getSongQualities } from "@/lib/api";

export function FullScreenPlayer() {
  const isOpen = usePlayerStore((s) => s.isLyricPageOpen);
  const close = usePlayerStore((s) => s.closeLyricPage);

  return (
    <AnimatePresence>
      {isOpen && <FullScreenPlayerInner key="fsp" onClose={close} />}
    </AnimatePresence>
  );
}

interface FullScreenPlayerInnerProps {
  onClose: () => void;
}

function FullScreenPlayerInner({ onClose }: FullScreenPlayerInnerProps) {
  const router = useRouter();
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const playMode = usePlayerStore((s) => s.playMode);

  const toggle = usePlayerStore((s) => s.toggle);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const seek = usePlayerStore((s) => s.seek);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);

  const dragControls = useDragControls();

  const [isDark, setIsDark] = React.useState(true);
  React.useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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

  const setAvailableQualities = usePlayerStore((s) => s.setAvailableQualities);
  const loadPreferredQuality = usePlayerStore((s) => s.loadPreferredQuality);
  React.useEffect(() => {
    if (!currentSong) return;
    let cancelled = false;
    (async () => {
      try {
        const qualities = await getSongQualities(currentSong.id);
        if (cancelled) return;
        setAvailableQualities(qualities as { level: "high" | "medium" | "low" | "default"; quality: string; bitrate: number; fileUrl: string; fileSize: number }[]);
      } catch {
        setAvailableQualities([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentSong?.id, setAvailableQualities]);

  React.useEffect(() => {
    void loadPreferredQuality();
  }, []);

  const [queueOpen, setQueueOpen] = React.useState(false);
  const [entered, setEntered] = React.useState(false);

  const [showLyrics, setShowLyrics] = React.useState(false);
  const toggleCooldownRef = React.useRef(false);
  const toggleView = React.useCallback(() => {
    if (toggleCooldownRef.current) return;
    toggleCooldownRef.current = true;
    setShowLyrics((v) => !v);
    setTimeout(() => {
      toggleCooldownRef.current = false;
    }, 300);
  }, []);

  const likedIds = useFavoritesStore((s) => s.likedIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const likedClipIds = useFavoritesStore((s) => s.likedClipIds);
  const toggleFavoriteClip = useFavoritesStore((s) => s.toggleFavoriteClip);
  const loadFavoriteClipsFromServer = useFavoritesStore(
    (s) => s.loadFavoriteClipsFromServer
  );

  const isClip = currentSong?.trackType === "live_clip";
  const isFavorite = currentSong
    ? isClip
      ? likedClipIds.has(currentSong.id)
      : likedIds.has(currentSong.id)
    : false;

  React.useEffect(() => {
    if (isClip && likedClipIds.size === 0) {
      void loadFavoriteClipsFromServer();
    }
  }, [isClip, likedClipIds.size, loadFavoriteClipsFromServer]);

  const toggleFavorite = async () => {
    if (!currentSong) return;
    if (isClip) {
      await toggleFavoriteClip(currentSong.id);
    } else {
      await toggleLike(currentSong.id);
    }
  };

  const handleDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (info.offset.y > 120 || info.velocity.y > 500) {
      onClose();
    }
  };

  const cyclePlayMode = () => {
    const order: PlayMode[] = ["list", "single", "sequential", "shuffle"];
    const idx = order.indexOf(playMode);
    const nextMode = order[(idx + 1) % order.length];
    setPlayMode(nextMode);
  };

  if (!currentSong) return null;

  const cover = currentSong.cover;

  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-hidden bg-black text-white"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "tween", duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      onAnimationComplete={() => setEntered(true)}
      style={{ willChange: "transform" }}
      drag="y"
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.5 }}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      >
        <div
          className="h-full w-full"
          style={{
            background: `radial-gradient(ellipse at center, rgba(139,0,255,${
              isDark ? 0.35 : 0.25
            }) 0%, rgba(0,0,0,0.9) 100%)`,
          }}
        />
      </div>

      <div
        className="relative z-10 flex h-full flex-col pt-safe pl-safe pr-safe"
        style={{
          willChange: "transform",
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
        }}
      >
        <div
          onPointerDown={(e) => dragControls.start(e.nativeEvent)}
          className="flex shrink-0 cursor-grab justify-center py-3 active:cursor-grabbing"
          aria-label="下拉关闭"
        >
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <header className="flex shrink-0 items-center justify-between px-4 py-2 md:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/60 transition-colors hover:text-white hover:bg-white/10"
            aria-label="收起播放页"
          >
            <ChevronDown className="h-5 w-5" />
          </button>

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
            <p className="truncate text-xs text-white/50">
              {currentSong.artist}
            </p>
          </div>

          <div className="hidden flex-1 md:block" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-full p-2 text-white/60 transition-colors hover:text-white hover:bg-white/10"
              aria-label="分享"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setQueueOpen(true)}
              className="rounded-full p-2 text-white/60 transition-colors hover:text-white hover:bg-white/10"
              aria-label="播放队列"
            >
              <ListMusic className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[1fr_1fr] md:items-center md:gap-4 md:px-8 md:overflow-y-auto">
          <div className="hidden flex-col items-center justify-center overflow-y-auto py-4 md:flex md:px-8">
            <div className="relative">
              <motion.div
                className="relative aspect-square w-[min(450px,90%,38vh)] rounded-2xl overflow-hidden"
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{
                  duration: 20,
                  repeat: isPlaying ? Infinity : 0,
                  ease: "linear",
                }}
              >
                <div className="absolute inset-0 rounded-2xl border-8 border-gray-900 shadow-2xl">
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    {cover ? (
                      <AppImage
                        src={cover}
                        alt={currentSong.title}
                        fill
                        className="rounded-xl"
                        sizes="(min-width: 768px) 450px, 90vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/50 to-purple-700/30">
                        <Music2 className="h-16 w-16 text-white/40" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gray-800 border-4 border-gray-900 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white/30" />
                </div>
              </motion.div>

              <div className="absolute -bottom-2 -right-2 w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-white">{isPlaying ? 'ON' : 'OFF'}</span>
                  <span className="text-[8px] text-white/70">AIR</span>
                </div>
              </div>
            </div>

            <div className="mt-8 w-full max-w-md text-center">
              <div className="flex items-center justify-center gap-2">
                {currentSong.trackType === "live_clip" && currentSong.sessionId && (
                  <LiveClipBadge
                    onClick={() => router.push(`/live-session/${currentSong.sessionId}`)}
                  />
                )}
                <h1 className="min-w-0 truncate text-2xl font-bold text-white">
                  {currentSong.title}
                </h1>
              </div>
              <p className="mt-1.5 truncate text-lg text-white/70">
                {currentSong.artist}
              </p>
              {currentSong.album && (
                <p className="mt-1 truncate text-sm text-white/40">
                  {currentSong.album}
                </p>
              )}

              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={toggleFavorite}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-full transition-all duration-200",
                    isFavorite
                      ? "bg-primary/20 text-primary"
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                  aria-label={isFavorite ? "取消喜欢" : "喜欢"}
                >
                  <Heart className="h-4 w-4" fill={isFavorite ? "currentColor" : "none"} />
                  <span className="text-sm font-medium">
                    {isFavorite ? "已喜欢" : "喜欢"}
                  </span>
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all duration-200"
                  aria-label="更多"
                >
                  <Info className="h-4 w-4" />
                  <span className="text-sm font-medium">更多</span>
                </button>
              </div>
            </div>
          </div>

          <div className="hidden min-h-0 h-full md:block">
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {}}
                    className="text-sm font-medium text-primary px-3 py-1.5 rounded-lg bg-primary/10"
                  >
                    歌词
                  </button>
                  <button
                    onClick={() => {}}
                    className="text-sm font-medium text-white/50 hover:text-white/80 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    百科
                  </button>
                  <button
                    onClick={() => {}}
                    className="text-sm font-medium text-white/50 hover:text-white/80 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    相似推荐
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <LyricsView
                  lrc={lrc}
                  currentTime={currentTime}
                  onSeek={seek}
                  loading={lrcLoading}
                  animate={entered}
                />
              </div>
            </div>
          </div>

          <div className="relative min-h-0 flex-1 md:hidden">
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
              <motion.div
                className="relative aspect-square w-[min(340px,70vw,60vh)] rounded-2xl overflow-hidden shrink-0"
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{
                  duration: 20,
                  repeat: isPlaying ? Infinity : 0,
                  ease: "linear",
                }}
              >
                <div className="absolute inset-0 rounded-2xl border-6 border-gray-900">
                  <div className="absolute inset-0 rounded-xl overflow-hidden">
                    {cover ? (
                      <AppImage
                        src={cover}
                        alt={currentSong.title}
                        fill
                        className="rounded-xl"
                        sizes="(max-width: 768px) 70vw, 340px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-900/50 to-purple-700/30">
                        <Music2 className="h-14 w-14 text-white/40" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gray-800 border-3 border-gray-900 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                </div>
              </motion.div>

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
                  <h1 className="min-w-0 truncate text-xl font-bold text-white">
                    {currentSong.title}
                  </h1>
                </div>
                <p className="mt-1.5 truncate text-base text-white/70">
                  {currentSong.artist}
                </p>
              </div>

              <motion.div
                className="mt-6 flex shrink-0 flex-col items-center gap-1 text-white/30"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <ChevronUp className="h-5 w-5" />
                <span className="text-[11px]">点击查看歌词</span>
              </motion.div>
            </div>

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
                animate={entered}
              />
            </div>
          </div>
        </main>

        <div className="shrink-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-8 pb-safe">
          <div className="md:hidden px-4 pb-3 flex justify-center">
            <QualitySelector />
          </div>
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

      <QueueSheet open={queueOpen} onOpenChange={setQueueOpen} />
    </motion.div>
  );
}
