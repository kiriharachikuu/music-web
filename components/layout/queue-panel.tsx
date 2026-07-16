"use client";

import * as React from "react";
import { Music2, Play, Pause, ChevronUp, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePlayerStore } from "@/lib/store/player-store";
import { cn } from "@/lib/utils";

/**
 * PC 端右侧播放队列面板（lg 及以上显示）
 * - 抽屉模式：默认收起，由 top-nav 的 ListMusic 按钮或快捷键展开
 * - 平滑收起：transform translate-x + transition-transform duration-300
 * - 关闭方式：点击收起按钮 / 点击外部遮罩 / 按 ESC
 * - 顶部：当前播放歌曲（封面 / 歌名 / 歌手 + 播放暂停 + 展开全屏）
 * - 下方：播放队列列表，点击切换播放，当前曲目高亮
 */
export function QueuePanel() {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const queue = usePlayerStore((s) => s.queue);
  const currentIndex = usePlayerStore((s) => s.currentIndex);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const play = usePlayerStore((s) => s.play);
  const toggle = usePlayerStore((s) => s.toggle);
  const openLyricPage = usePlayerStore((s) => s.openLyricPage);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);

  // ESC 键关闭队列面板
  React.useEffect(() => {
    if (!isQueueOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setQueueOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isQueueOpen, setQueueOpen]);

  return (
    <>
      {/* 透明遮罩：点击外部区域关闭队列（仅 lg+ 显示） */}
      {isQueueOpen && (
        <div
          className="fixed inset-0 z-30 hidden bg-black/20 backdrop-blur-[2px] lg:block"
          onClick={() => setQueueOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 hidden w-80 flex-col border-l border-primary/10 bg-white/80 backdrop-blur-xl transition-transform duration-300 ease-out dark:bg-gray-900/60 lg:flex",
          "pt-safe pb-safe",
          isQueueOpen ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!isQueueOpen}
        role="complementary"
        aria-label="播放队列"
      >
        {/* 顶部：当前播放歌曲 + 收起按钮 */}
        <div className="border-b border-primary/10 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
              正在播放
            </p>
            <Button
              onClick={() => setQueueOpen(false)}
              variant="ghost"
              size="icon"
              aria-label="收起队列"
              className="h-8 w-8 text-foreground/60 hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          {currentSong ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openLyricPage}
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-primary/10"
                aria-label="展开播放页"
              >
                {currentSong.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentSong.cover}
                    alt={currentSong.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-primary/60">
                    <Music2 className="h-5 w-5" />
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {currentSong.title}
                </p>
                <p className="truncate text-xs text-foreground/50">
                  {currentSong.artist}
                </p>
              </div>
              <Button
                onClick={toggle}
                size="icon"
                aria-label={isPlaying ? "暂停" : "播放"}
                className="h-9 w-9 shrink-0 rounded-full bg-primary text-white shadow-card hover:bg-primary/90"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 translate-x-[1px]" />
                )}
              </Button>
              <Button
                onClick={openLyricPage}
                variant="ghost"
                size="icon"
                aria-label="展开播放页"
                className="hidden h-9 w-9 shrink-0 text-foreground/70 hover:text-foreground xl:inline-flex"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-foreground/40">
              <Music2 className="h-8 w-8" />
              <p className="text-xs">暂无播放</p>
            </div>
          )}
        </div>

        {/* 队列列表 */}
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-foreground/40">
            播放队列（{queue.length}）
          </span>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {queue.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-foreground/40">
              队列为空，去发现页播放一首歌吧
            </p>
          ) : (
            <ul className="space-y-0.5">
              {queue.map((song, index) => {
                const active = index === currentIndex;
                return (
                  <li key={`${song.id}-${index}`}>
                    <button
                      type="button"
                      onClick={() => play(song, queue)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors",
                        active
                          ? "bg-primary/5"
                          : "hover:bg-foreground/5"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-medium",
                          active
                            ? "bg-primary text-white"
                            : "bg-foreground/5 text-foreground/50"
                        )}
                      >
                        {active && isPlaying ? (
                          <Pause className="h-3 w-3" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded bg-foreground/5">
                        {song.cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={song.cover}
                            alt={song.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate text-xs font-medium",
                            active && "text-primary dark:text-primary/70"
                          )}
                        >
                          {song.title}
                        </p>
                        <p className="truncate text-[11px] text-foreground/50">
                          {song.artist}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}
