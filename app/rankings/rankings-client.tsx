"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Play, Shuffle, TrendingUp } from "lucide-react";

import type {
  RankingsData,
  RankingType,
  LeaderboardType,
  ApiSong,
} from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { getToken } from "@/lib/auth";
import { getRankings } from "@/lib/api";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 榜单 Tab 配置（现有：飙升 / 新歌 / 热歌） */
const TABS: { key: RankingType; label: string; desc: string }[] = [
  { key: "soar", label: "飙升榜", desc: "上升最快的好歌" },
  { key: "new", label: "新歌榜", desc: "最新上架单曲" },
  { key: "hot", label: "热歌榜", desc: "本周播放冠军" },
];

/** 曲目类型 Tab（综合 / 单曲 / 歌切），URL ?type= 同步 */
const TYPE_TABS: { key: LeaderboardType; label: string }[] = [
  { key: "all", label: "综合" },
  { key: "song", label: "单曲" },
  { key: "live_clip", label: "歌切" },
];

/** 解析 URL 中的 ?type= 参数，未知值回退到 all */
function parseTypeParam(raw: string | null): LeaderboardType {
  if (raw === "song" || raw === "live_clip") return raw;
  return "all";
}

/**
 * 排行榜客户端组件
 * - 曲目类型 Tab（综合 / 单曲 / 歌切）：URL 同步 + 客户端按 type 拉取
 * - 子榜 Tab（飙升 / 新歌 / 热歌）：沿用原有下划线切换
 * - 整榜播放 / 随机播放
 * - Top3 序号金银铜徽章（SongList 内部已处理）
 * - 歌切行右侧追加 LiveClipBadge
 */
export function RankingsClient({
  data,
}: {
  data: RankingsData;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL ?type= 同步到 state（默认 all）
  const [type, setType] = React.useState<LeaderboardType>(() =>
    parseTypeParam(searchParams.get("type"))
  );
  const [rankings, setRankings] = React.useState<RankingsData>(data);
  const [active, setActive] = React.useState<RankingType>("soar");
  const [loading, setLoading] = React.useState(false);
  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const openLogin = useAuthStore((s) => s.openLogin);
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const loadLikedFromServer = useFavoritesStore((s) => s.loadFromServer);

  // 监听 URL 中 type 变化（如浏览器前进 / 后退）
  React.useEffect(() => {
    setType(parseTypeParam(searchParams.get("type")));
  }, [searchParams]);

  // type 变化时，按 type 重新拉取；后端可能尚未支持 type 参数，
  // 此时按 trackType 在前端做兜底过滤。
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const next = await getRankings(type);
        if (cancelled) return;
        setRankings(next);
      } catch {
        if (cancelled) return;
        // 拉取失败时保留旧数据
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type]);

  // 加载喜欢的歌曲列表（仅加载一次）
  React.useEffect(() => {
    if (!getToken()) return;
    const loaded = useFavoritesStore.getState().loaded;
    if (!loaded) {
      void loadLikedFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 喜欢/取消喜欢（未登录时触发登录弹窗）
  const handleLike = (song: ApiSong) => {
    if (!getToken()) {
      openLogin();
      return;
    }
    void toggleLike(song.id);
  };

  /**
   * 客户端按 type 过滤（后端兜底）
   * - 后端需补充 `?type=`，前端已做临时回退过滤
   * - 如果某条记录没有 trackType，视为 official（兼容历史数据）
   */
  const filterByType = React.useCallback(
    (list: ApiSong[]): ApiSong[] => {
      if (type === "all") return list;
      if (type === "song") {
        return list.filter((s) => s.trackType !== "live_clip");
      }
      // live_clip
      return list.filter((s) => s.trackType === "live_clip");
    },
    [type]
  );

  const rawSongs = rankings[active] ?? [];
  const songs = filterByType(rawSongs);
  const currentTab = TABS.find((t) => t.key === active)!;

  /** 切换 type Tab：更新 URL（?type=） */
  const handleTypeChange = (next: LeaderboardType) => {
    if (next === type) return;
    setType(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.delete("type");
    } else {
      params.set("type", next);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

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
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:text-primary/60">
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

      {/* 曲目类型 Tab：综合 / 单曲 / 歌切，URL 同步 ?type= */}
      <div
        className="flex items-center gap-2"
        role="tablist"
        aria-label="排行榜曲目类型"
      >
        {TYPE_TABS.map((t) => {
          const isActive = type === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTypeChange(t.key)}
              className={cn(
                "text-sm font-semibold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground rounded-full px-3.5 py-1.5"
                  : "bg-foreground/5 text-foreground/60 rounded-full px-3.5 py-1.5 hover:text-foreground"
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* 子榜 Tab 切换：下划线式 */}
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
                  ? "text-primary dark:text-primary/60"
                  : "text-foreground/50 hover:text-foreground"
              )}
            >
              {t.label}
              {/* 选中下划线 */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
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
            disabled={loading}
            className="rounded-full bg-primary px-5 text-white shadow-card hover:bg-primary/90 active:bg-primary/95"
          >
            <Play className="h-4 w-4 translate-x-[1px]" />
            播放全部
          </Button>
          <Button
            onClick={shufflePlay}
            disabled={loading}
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
        <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
          <SongList
            songs={songs}
            showRank
            startRank={1}
            likedIds={likedIds}
            onLike={handleLike}
            // 行内歌名旁展示 LIVE 角标（仅歌切）
            showTrackType
          />
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
