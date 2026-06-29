"use client";

import * as React from "react";
import { Play, Shuffle, TrendingUp } from "lucide-react";

import type { RankingsData, RankingType } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 榜单 Tab 配置 */
const TABS: { key: RankingType; label: string; desc: string }[] = [
  { key: "soar", label: "飙升榜", desc: "上升最快的好歌" },
  { key: "new", label: "新歌榜", desc: "最新上架单曲" },
  { key: "hot", label: "热歌榜", desc: "本周播放冠军" },
  { key: "original", label: "原创榜", desc: "独立音乐人之选" },
];

/**
 * 排行榜客户端组件
 * - Tab 切换（下划线 + 文字同步变 primary-700）
 * - 整榜播放 / 随机播放
 * - Top3 序号渐变填充（SongList 内部已处理）
 */
export function RankingsClient({ data }: { data: RankingsData }) {
  const [active, setActive] = React.useState<RankingType>("soar");
  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);

  const songs = data[active] ?? [];
  const currentTab = TABS.find((t) => t.key === active)!;

  /** 整榜播放：从第一首开始，列表循环 */
  const playAll = () => {
    if (songs.length === 0) return;
    play(toPlayerSong(songs[0]), toPlayerSongs(songs));
  };

  /** 随机播放：切随机模式并从随机一首开始 */
  const shufflePlay = () => {
    if (songs.length === 0) return;
    setPlayMode("shuffle");
    const random = songs[Math.floor(Math.random() * songs.length)];
    play(toPlayerSong(random), toPlayerSongs(songs));
  };

  return (
    <section className="animate-fade-in space-y-6">
      {/* 页面标题 */}
      <header className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-700/10 text-primary-700 dark:text-primary-300">
          <TrendingUp className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            排行榜
          </h1>
          <p className="mt-0.5 text-sm text-foreground/50">
            {currentTab.desc}
          </p>
        </div>
      </header>

      {/* Tab 切换：下划线式 */}
      <div className="flex items-center gap-6 overflow-x-auto border-b border-border no-scrollbar">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                "relative shrink-0 pb-3 pt-1 text-sm font-medium transition-colors md:text-base",
                isActive
                  ? "text-primary-700 dark:text-primary-300"
                  : "text-foreground/50 hover:text-foreground"
              )}
            >
              {t.label}
              {/* 选中下划线 */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-700" />
              )}
            </button>
          );
        })}
      </div>

      {/* 操作按钮 */}
      {songs.length > 0 && (
        <div className="flex items-center gap-2.5">
          <Button
            onClick={playAll}
            className="rounded-full bg-primary-700 px-5 text-white shadow-card hover:bg-primary-600 active:bg-primary-800"
          >
            <Play className="h-4 w-4 translate-x-[1px]" />
            播放全部
          </Button>
          <Button
            onClick={shufflePlay}
            variant="outline"
            className="rounded-full px-5"
          >
            <Shuffle className="h-4 w-4" />
            随机播放
          </Button>
          <span className="ml-auto text-xs text-foreground/40">
            共 {songs.length} 首
          </span>
        </div>
      )}

      {/* 榜单列表 */}
      {songs.length > 0 ? (
        <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
          <SongList songs={songs} showRank startRank={1} />
        </div>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="该榜单暂无数据"
          description="稍后再来看看吧～"
        />
      )}
    </section>
  );
}
