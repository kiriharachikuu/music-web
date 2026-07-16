"use client";

import * as React from "react";
import { Music2 } from "lucide-react";

import { usePlayerStore } from "@/lib/store/player-store";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/**
 * 播放队列抽屉：右侧滑出，毛玻璃背景
 * - 列表显示 queue 中所有歌曲（封面 + 歌名 + 歌手）
 * - 当前播放行：text-primary/60 + 左侧 primary-700 圆点标记
 * - 点击切换播放
 */
export interface QueueSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function QueueSheet({ open, onOpenChange }: QueueSheetProps) {
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const play = usePlayerStore((s) => s.play);
  const listRef = React.useRef<HTMLUListElement>(null);
  const itemRefs = React.useRef<Array<HTMLLIElement | null>>([]);

  // 打开时滚动到当前播放歌曲
  React.useEffect(() => {
    if (open && currentIndex >= 0 && itemRefs.current[currentIndex]) {
      const el = itemRefs.current[currentIndex];
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [open, currentIndex]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "flex w-full flex-col gap-0 border-white/10 bg-black/40 p-0 text-white backdrop-blur-xl sm:max-w-md",
          // 让 Sheet 自带的关闭按钮（直接子 button）变白，并下移避开状态栏
          "[&>button]:text-white/70 [&>button:hover]:text-white [&>button]:top-[calc(var(--safe-area-top,0px)+1rem)]",
          "pt-safe pb-safe"
        )}
      >
        <SheetHeader className="border-b border-white/10 px-5 py-4">
          <SheetTitle className="text-white">播放队列</SheetTitle>
          <p className="text-xs text-white/50">共 {queue.length} 首</p>
        </SheetHeader>

        {/* 列表：原生 overflow + no-scrollbar，与歌词区视觉一致 */}
        <div className="no-scrollbar flex-1 overflow-y-auto py-2">
          <ul ref={listRef} className="flex flex-col">
            {queue.map((song, i) => {
              const isCurrent = i === currentIndex;
              return (
                <li key={`${song.id}-${i}`} ref={(el) => { itemRefs.current[i] = el; }}>
                  <button
                    type="button"
                    onClick={() => play(song, queue)}
                    className={cn(
                      "flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-white/5 active:bg-white/10",
                      isCurrent && "bg-white/5"
                    )}
                  >
                    {/* 当前播放左侧标记条 */}
                    <span className="w-1 shrink-0 self-stretch">
                      {isCurrent && (
                        <span className="block h-full w-1 rounded-full bg-primary" />
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
                          isCurrent ? "text-primary/60" : "text-white"
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
