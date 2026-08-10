"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Music2,
  Repeat,
  Repeat1,
  Shuffle,
  ListOrdered,
  Trash2,
} from "lucide-react";

import { usePlayerStore, type PlayMode, type Song } from "@/lib/store/player-store";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AppImage } from "@/components/ui/app-image";

/**
 * 播放队列抽屉：
 * - 桌面端（>= md）：右侧 Sheet（保留旧行为）
 * - 移动端（< md）：底部 Sheet
 *   - 顶部把手 + 当前播放歌曲（封面 + 歌名 + 歌手 + 播放模式）
 *   - 中部队列列表
 *   - 底部「清空队列」按钮
 *   - Sheet 自带 drag 行为，拖把下滑自动关闭
 */
export interface QueueSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// ===== 简易 useMediaQuery（避免引入新依赖）=====
function useMediaQuery(query: string): boolean {
  const get = React.useCallback(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);
  const [matches, setMatches] = React.useState<boolean>(get);
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

const PLAY_MODE_META: Record<
  PlayMode,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  list: { label: "列表循环", icon: Repeat },
  single: { label: "单曲循环", icon: Repeat1 },
  sequential: { label: "顺序播放", icon: ListOrdered },
  shuffle: { label: "随机播放", icon: Shuffle },
};

const PLAY_MODE_ORDER: PlayMode[] = ["list", "single", "sequential", "shuffle"];

function PlayModeButton({
  playMode,
  setPlayMode,
}: {
  playMode: PlayMode;
  setPlayMode: (m: PlayMode) => void;
}) {
  const meta = PLAY_MODE_META[playMode];
  const Icon = meta.icon;
  const cycle = () => {
    const idx = PLAY_MODE_ORDER.indexOf(playMode);
    const next = PLAY_MODE_ORDER[(idx + 1) % PLAY_MODE_ORDER.length];
    setPlayMode(next);
  };
  return (
    <button
      type="button"
      onClick={cycle}
      className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/80 transition-all hover:bg-white/15 hover:text-white active:scale-95"
      aria-label={meta.label}
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{meta.label}</span>
    </button>
  );
}

interface QueueListProps {
  queue: Song[];
  currentIndex: number;
  onPlay: (song: Song) => void;
  listRef: React.RefObject<HTMLUListElement | null>;
  itemRefs: React.MutableRefObject<Array<HTMLLIElement | null>>;
  /** "compact" = 移动端更紧凑（h-9 封面），"default" = 桌面端当前 h-10 */
  variant?: "default" | "compact";
}

function QueueList({
  queue,
  currentIndex,
  onPlay,
  listRef,
  itemRefs,
  variant = "default",
}: QueueListProps) {
  const compact = variant === "compact";
  return (
    <ul ref={listRef} className="flex flex-col">
      {queue.map((song, i) => {
        const isCurrent = i === currentIndex;
        return (
          <motion.li
            key={`${song.id}-${i}`}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <motion.button
              type="button"
              onClick={() => onPlay(song)}
              className={cn(
                "flex w-full items-center gap-3 text-left",
                compact ? "px-4 py-2" : "px-5 py-2.5",
                isCurrent && "bg-white/5"
              )}
              whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.05)" }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 当前播放左侧标记条 */}
              <motion.span className="w-1 shrink-0 self-stretch">
                {isCurrent && (
                  <motion.span
                    className="block h-full w-1 rounded-full bg-primary"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  />
                )}
              </motion.span>
              {/* 封面缩略图 */}
              <motion.div
                className={cn(
                  "shrink-0 overflow-hidden rounded-lg bg-white/10",
                  compact ? "h-9 w-9" : "h-10 w-10"
                )}
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                {song.cover ? (
                  <AppImage
                    src={song.cover}
                    alt=""
                    width={compact ? 36 : 40}
                    height={compact ? 36 : 40}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music2 className="h-4 w-4 text-white/40" />
                  </div>
                )}
              </motion.div>
              {/* 歌名 + 歌手 */}
              <div className="min-w-0 flex-1">
                <motion.p
                  className={cn(
                    "truncate text-sm",
                    isCurrent ? "text-primary" : "text-white"
                  )}
                  animate={{ opacity: isCurrent ? 1 : 0.8 }}
                >
                  {song.title}
                </motion.p>
                <p className="truncate text-xs text-white/50">{song.artist}</p>
              </div>
              {/* 当前播放指示图标 */}
              {isCurrent && (
                <motion.div
                  className="flex h-10 items-center justify-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="flex gap-0.5">
                    <motion.div
                      className="h-4 w-1 rounded-full bg-primary"
                      animate={{ height: [8, 16, 8] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0 }}
                    />
                    <motion.div
                      className="h-4 w-1 rounded-full bg-primary"
                      animate={{ height: [8, 16, 8] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }}
                    />
                    <motion.div
                      className="h-4 w-1 rounded-full bg-primary"
                      animate={{ height: [8, 16, 8] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                    />
                  </div>
                </motion.div>
              )}
            </motion.button>
          </motion.li>
        );
      })}
      {queue.length === 0 && (
        <li
          className={cn(
            "py-8 text-center text-sm text-white/50",
            compact ? "px-4" : "px-5"
          )}
        >
          队列为空
        </li>
      )}
    </ul>
  );
}

export function QueueSheet({ open, onOpenChange }: QueueSheetProps) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const playMode = usePlayerStore((s) => s.playMode);
  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const listRef = React.useRef<HTMLUListElement>(null);
  const itemRefs = React.useRef<Array<HTMLLIElement | null>>([]);

  // true = 桌面（>= md）
  const isDesktop = useMediaQuery("(min-width: 768px)");

  // 打开时滚动到当前播放歌曲（桌面/移动端共用逻辑）
  React.useEffect(() => {
    if (open && currentIndex >= 0 && itemRefs.current[currentIndex]) {
      const el = itemRefs.current[currentIndex];
      // requestAnimationFrame 保证 layout 完成后滚动
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, [open, currentIndex, isDesktop]);

  const handlePlay = React.useCallback(
    (song: Song) => {
      void play(song, queue);
    },
    [play, queue]
  );

  const handleClearQueue = React.useCallback(() => {
    usePlayerStore.setState({ queue: [], currentIndex: 0 });
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {isDesktop ? (
        // ===== 桌面端：右侧 Sheet（保留旧样式）=====
        <SheetContent
          side="right"
          className={cn(
            "flex w-full flex-col gap-0 border-white/10 bg-black/40 p-0 text-white backdrop-blur-xl sm:max-w-md",
            "[&>button]:text-white/70 [&>button:hover]:text-white [&>button]:top-[calc(var(--safe-area-top,0px)+1rem)]",
            "pt-safe pb-safe"
          )}
        >
          <SheetHeader className="border-b border-white/10 px-5 py-4">
            <SheetTitle className="text-white">播放队列</SheetTitle>
            <p className="text-xs text-white/50">共 {queue.length} 首</p>
          </SheetHeader>
          <div className="no-scrollbar flex-1 overflow-y-auto py-2">
            <QueueList
              queue={queue}
              currentIndex={currentIndex}
              onPlay={handlePlay}
              listRef={listRef}
              itemRefs={itemRefs}
            />
          </div>
        </SheetContent>
      ) : (
        // ===== 移动端：底部 Sheet =====
        <SheetContent
          side="bottom"
          className={cn(
            "flex max-h-[85dvh] flex-col gap-0 border-t-0 rounded-t-[28px] bg-black/40 p-0 text-white backdrop-blur-xl",
            "[&>button]:text-white/70 [&>button:hover]:text-white [&>button]:top-3 [&>button]:right-3",
            "pb-safe"
          )}
        >
          {/* 顶部把手：拖把下滑关闭（Sheet 自带 drag 行为） */}
          <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/30" />

          {/* 顶部当前播放歌曲信息 */}
          <div className="flex items-center gap-3 px-5 pb-3 pt-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-white/10">
              {currentSong?.cover ? (
                <AppImage
                  src={currentSong.cover}
                  alt=""
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Music2 className="h-5 w-5 text-white/40" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="min-w-0 truncate text-sm font-semibold text-white">
                {currentSong?.title ?? "未在播放"}
              </p>
              <p className="truncate text-xs text-white/60">
                {currentSong?.artist ?? "—"}
              </p>
            </div>
          </div>

          {/* 播放模式切换条 */}
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-2.5">
            <span className="text-xs text-white/50">播放模式</span>
            <PlayModeButton playMode={playMode} setPlayMode={setPlayMode} />
          </div>

          {/* 中间队列列表 */}
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto py-2">
            <QueueList
              queue={queue}
              currentIndex={currentIndex}
              onPlay={handlePlay}
              listRef={listRef}
              itemRefs={itemRefs}
              variant="compact"
            />
          </div>

          {/* 底部「清空队列」 */}
          <div className="shrink-0 border-t border-white/10 px-5 py-3 pb-safe">
            <button
              type="button"
              onClick={handleClearQueue}
              disabled={queue.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-white/5 py-2.5 text-sm font-medium text-white/80 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="清空队列"
            >
              <Trash2 className="h-4 w-4" />
              <span>清空队列</span>
            </button>
          </div>
        </SheetContent>
      )}
    </Sheet>
  );
}
