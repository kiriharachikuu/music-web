"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Play,
  Shuffle,
  TrendingUp,
  Music2,
  Plus,
  Heart,
  ChevronRight,
} from "lucide-react";

import type {
  RankingTrack,
  RankingsResponse,
  ApiSong,
} from "@/lib/types";
import { toPlayerSong } from "@/lib/types";
import type { Song as PlayerSong } from "@/lib/store/player-store";
import { usePlayerStore, formatTime } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { getToken } from "@/lib/auth";
import { getRankings, invalidateCache } from "@/lib/api";
import { AppImage } from "@/components/ui/app-image";
import { LiveClipBadge } from "@/components/common/live-clip-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatPlays, resolveClipCover } from "@/lib/utils";

/** 9 组合：type（综合 / 单曲 / 歌切） */
type RankingType = "combined" | "single" | "clip";
/** 9 组合：ranking（飙升 / 热歌 / 新歌） */
type RankingSubType = "soar" | "hot" | "new";

/** 曲目类型 Tab：综合 / 单曲 / 歌切，URL ?type= 同步 */
const TYPE_TABS: { key: RankingType; label: string }[] = [
  { key: "combined", label: "综合" },
  { key: "single", label: "单曲" },
  { key: "clip", label: "歌切" },
];

/** 子榜 Tab：飙升 / 热歌 / 新歌，URL ?ranking= 同步 */
const RANKING_TABS: {
  key: RankingSubType;
  label: string;
  desc: string;
}[] = [
  { key: "soar", label: "飙升榜", desc: "上升最快的好歌" },
  { key: "hot", label: "热歌榜", desc: "本周播放冠军" },
  { key: "new", label: "新歌榜", desc: "最新上架单曲" },
];

/** 解析 URL 中的 ?type= 参数，未知值回退到 combined */
function parseTypeParam(raw: string | null | undefined): RankingType {
  if (raw === "single" || raw === "clip") return raw;
  return "combined";
}

/** 解析 URL 中的 ?ranking= 参数，未知值回退到 soar */
function parseRankingParam(raw: string | null | undefined): RankingSubType {
  if (raw === "hot" || raw === "new") return raw;
  return "soar";
}

/**
 * RankingTrack → PlayerSong 适配
 * - 单曲 (trackType !== "live_clip"): url ← fileUrl, cover ← coverUrl/album.cover
 * - 歌切 (trackType === "live_clip"): url ← fileUrl, cover ← session.cover 兜底
 */
function rankingTrackToPlayerSong(t: RankingTrack): PlayerSong {
  if (t.trackType === "live_clip") {
    return toPlayerSong({
      id: t.id,
      title: t.title,
      artist: t.artist,
      artistId: t.artistId ?? null,
      duration: t.duration,
      cover: t.cover ?? null,
      sessionCover: t.sessionCover ?? null,
      url: t.fileUrl ?? "",
      trackType: "live_clip",
      sessionId: t.sessionId ?? "",
      sessionName: t.sessionName ?? "",
      liveTime: t.liveTime ?? "",
      trackIndex: t.trackIndex ?? 0,
    });
  }
  // 单曲：构造 ApiSong 后复用 toPlayerSong，保持与播放器一致行为
  const asApiSong: ApiSong = {
    id: t.id,
    title: t.title,
    artist: t.artist,
    artistId: t.artistId ?? null,
    albumId: t.albumId ?? null,
    albumName: t.albumName,
    duration: t.duration,
    fileUrl: t.fileUrl ?? "",
    coverUrl: t.coverUrl ?? null,
    sessionCover: t.sessionCover ?? null,
    lyricUrl: t.lyricUrl ?? null,
    releaseDate: t.releaseDate ?? "",
    plays: t.plays ?? 0,
    status: t.status ?? "PUBLISHED",
    tags: t.tags,
    album: t.album ?? null,
    trackType: "official",
  };
  return toPlayerSong(asApiSong);
}

/** 批量适配 */
function rankingTracksToPlayerSongs(list: RankingTrack[]): PlayerSong[] {
  return list.map(rankingTrackToPlayerSong);
}

/**
 * 排行榜客户端组件
 * - 9 组合 Tab：type(综合/单曲/歌切) × ranking(飙升/热歌/新歌)
 * - URL 同步：?type=combined|single|clip&ranking=soar|hot|new
 * - 整榜播放 / 随机播放（兼容单曲和歌切）
 * - Top3 序号金银铜徽章
 * - 歌切行右侧展示 LiveClipBadge
 */
export function RankingsClient({
  initialData,
}: {
  initialData: RankingsResponse;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL 同步到 state（默认 combined / soar，与 SSR 默认拉取一致）
  const [type, setType] = React.useState<RankingType>(() =>
    parseTypeParam(searchParams.get("type"))
  );
  const [ranking, setRanking] = React.useState<RankingSubType>(() =>
    parseRankingParam(searchParams.get("ranking"))
  );

  // 当前榜单响应（默认展示 SSR 数据，切 Tab 时按 type+ranking 重新拉取）
  const [data, setData] = React.useState<RankingsResponse>(initialData);
  const [loading, setLoading] = React.useState(false);

  const play = usePlayerStore((s) => s.play);
  const setPlayMode = usePlayerStore((s) => s.setPlayMode);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const toggle = usePlayerStore((s) => s.toggle);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const openLogin = useAuthStore((s) => s.openLogin);
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const likedClipIds = useFavoritesStore((s) => s.likedClipIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const toggleFavoriteClip = useFavoritesStore((s) => s.toggleFavoriteClip);

  // 监听 URL 中 type / ranking 变化（如浏览器前进 / 后退、用户直接修改 URL）
  React.useEffect(() => {
    const t = parseTypeParam(searchParams.get("type"));
    const r = parseRankingParam(searchParams.get("ranking"));
    setType((prev) => (prev !== t ? t : prev));
    setRanking((prev) => (prev !== r ? r : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // state 变化时把 URL 同步回去（确保刷新后能保持选中 Tab）
  // - 仅在 state 与 URL 不一致时调用 replace，避免无谓导航
  // - 首次渲染若 state 默认值等于 URL 现有值，effect 不触发
  React.useEffect(() => {
    const urlType = searchParams.get("type");
    const urlRanking = searchParams.get("ranking");
    if (urlType === type && urlRanking === ranking) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("type", type);
    params.set("ranking", ranking);
    const target = `${pathname}?${params.toString()}`;
    router.replace(target, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ranking]);

  // type / ranking 变化时拉取新榜单
  // - 切换时清内存缓存中的 /rankings 旧组合，避免 cachedGet 命中过期数据
  // - 用 cancelled 守卫避免慢请求覆盖新切换
  // - SSR 初始数据刚好匹配时跳过首次拉取
  React.useEffect(() => {
    if (
      data.type === type &&
      data.ranking === ranking &&
      data.tracks.length > 0
    ) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    invalidateCache("/rankings");
    void (async () => {
      try {
        const next = await getRankings(type, ranking);
        if (cancelled) return;
        setData(next);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ranking]);

  // 加载喜欢的单曲 + 歌切列表（仅加载一次）
  React.useEffect(() => {
    if (!getToken()) return;
    const state = useFavoritesStore.getState();
    if (!state.loaded) {
      void state.loadFromServer();
    }
    // 歌切 id 集合（无独立 loaded 标志，每次挂载会重新拉；幂等，set 会覆盖）
    void state.loadFavoriteClipsFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 喜欢/取消喜欢（未登录时触发登录弹窗）
  const handleLike = (track: RankingTrack) => {
    if (!getToken()) {
      openLogin();
      return;
    }
    if (track.trackType === "live_clip") {
      void toggleFavoriteClip(track.id);
    } else {
      void toggleLike(track.id);
    }
  };

  const tracks: RankingTrack[] = data.tracks;
  const playerSongs = React.useMemo(
    () => rankingTracksToPlayerSongs(tracks),
    [tracks]
  );
  const currentRanking = RANKING_TABS.find((t) => t.key === ranking)!;
  const currentType = TYPE_TABS.find((t) => t.key === type)!;

  /** 整榜播放：从第一首开始，列表循环 */
  const playAll = () => {
    if (playerSongs.length === 0) return;
    play(playerSongs[0], playerSongs);
  };

  /** 随机播放：切随机模式并从随机一首开始 */
  const shufflePlay = () => {
    if (playerSongs.length === 0) return;
    setPlayMode("shuffle");
    const random = playerSongs[Math.floor(Math.random() * playerSongs.length)];
    play(random, playerSongs);
  };

  /** 切换 type Tab */
  const handleTypeChange = (next: RankingType) => {
    if (next !== type) setType(next);
  };

  /** 切换 ranking Tab */
  const handleRankingChange = (next: RankingSubType) => {
    if (next !== ranking) setRanking(next);
  };

  return (
    <section className="animate-fade-in space-y-6">
      {/* 页面标题（按当前榜单更新标题/副标题） */}
      <header className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:text-primary/60">
          <TrendingUp className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {data.title || "排行榜"}
          </h1>
          <p className="mt-0.5 text-sm text-foreground/50">
            {data.description || currentRanking.desc}
          </p>
        </div>
      </header>

      {/* 曲目类型 Tab：综合 / 单曲 / 歌切（URL ?type= 同步） */}
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

      {/* 子榜 Tab 切换：飙升 / 热歌 / 新歌（URL ?ranking= 同步） */}
      <div
        className="flex items-center gap-6 overflow-x-auto border-b border-border no-scrollbar"
        role="tablist"
        aria-label="排行榜子榜"
      >
        {RANKING_TABS.map((t) => {
          const isActive = ranking === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleRankingChange(t.key)}
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
      {tracks.length > 0 && (
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
            共 {tracks.length} 首
          </span>
        </div>
      )}

      {/* 榜单列表 */}
      {tracks.length > 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
          <TrackList
            tracks={tracks}
            playerSongs={playerSongs}
            likedSongIds={likedIds}
            likedClipIds={likedClipIds}
            onLike={handleLike}
            currentSongId={currentSong?.id ?? null}
            onPlay={(idx) => {
              if (currentSong?.id === tracks[idx].id) {
                toggle();
                return;
              }
              play(playerSongs[idx], playerSongs);
            }}
            onAddToQueue={(idx) => {
              const song = playerSongs[idx];
              const added = addToQueue(song);
              return { added, title: song.title };
            }}
            onPlayNext={(idx) => {
              const song = playerSongs[idx];
              const added = playNext(song);
              return { added, title: song.title };
            }}
          />
        </div>
      ) : (
        <EmptyState
          icon={TrendingUp}
          title="该榜单暂无数据"
          description={`稍后再来看看${currentType?.label ?? ""}榜吧～`}
        />
      )}
    </section>
  );
}

// ===== 内部组件 =====

/**
 * 排行榜曲目列表（行式 + 排名序号 + 封面 + 标题/歌手 + 操作）
 * - 单曲与歌切统一渲染：通过 trackType 区分展示
 * - Top3 序号金银铜徽章
 * - 歌切行右侧追加 LiveClipBadge
 */
function TrackList({
  tracks,
  playerSongs,
  likedSongIds,
  likedClipIds,
  onLike,
  currentSongId,
  onPlay,
  onAddToQueue,
  onPlayNext,
}: {
  tracks: RankingTrack[];
  playerSongs: PlayerSong[];
  likedSongIds: Set<string>;
  likedClipIds: Set<string>;
  onLike: (track: RankingTrack) => void;
  currentSongId: string | null;
  onPlay: (index: number) => void;
  onAddToQueue: (index: number) => { added: boolean; title: string };
  onPlayNext: (index: number) => { added: boolean; title: string };
}) {
  return (
    <div className="overflow-hidden rounded-xl">
      {tracks.map((track, idx) => {
        const rank = idx + 1;
        const isActive = currentSongId === track.id;
        const isLiked =
          track.trackType === "live_clip"
            ? likedClipIds.has(track.id)
            : likedSongIds.has(track.id);
        const isTop3 = rank <= 3;
        const top3BadgeClass =
          rank === 1
            ? "bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/50"
            : rank === 2
              ? "bg-gradient-to-b from-gray-300 to-gray-500 shadow-lg shadow-gray-400/50"
              : "bg-gradient-to-b from-orange-400 to-orange-600 shadow-lg shadow-orange-500/50";

        const isClip = track.trackType === "live_clip";
        const coverSrc = resolveClipCover({
          cover: track.cover,
          coverUrl: track.coverUrl,
          sessionCover: track.sessionCover,
          session: null,
        });
        const playerSong = playerSongs[idx];

        return (
          <div
            key={track.id}
            className={cn(
              "group flex items-center gap-3 px-2 py-2 transition-colors md:gap-4 md:px-4 md:py-2.5 [content-visibility:auto] [contain-intrinsic-size:56px]",
              isActive ? "bg-primary/5" : "hover:bg-foreground/[0.03]"
            )}
          >
            {/* 排名序号 */}
            <div className="flex w-8 shrink-0 justify-center md:w-10">
              {isTop3 ? (
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white",
                    top3BadgeClass
                  )}
                >
                  {rank}
                </span>
              ) : (
                <span className="font-mono text-sm font-medium text-foreground/40">
                  {rank.toString().padStart(2, "0")}
                </span>
              )}
            </div>

            {/* 封面 */}
            <button
              type="button"
              onClick={() => onPlay(idx)}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary/5 md:h-12 md:w-12"
              aria-label={`播放 ${track.title}`}
            >
              {coverSrc ? (
                <AppImage
                  src={coverSrc}
                  alt={track.title}
                  fill
                  className="rounded-lg"
                  sizes="48px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-primary/40">
                  <Music2 className="h-5 w-5" />
                </span>
              )}
            </button>

            {/* 歌名 + 歌手 */}
            <button
              type="button"
              onClick={() => onPlay(idx)}
              className="min-w-0 flex-1 text-left"
              aria-label={`播放 ${track.title}`}
            >
              <p
                className={cn(
                  "flex items-center gap-1.5 truncate text-sm font-medium",
                  isActive && "text-primary dark:text-primary/60"
                )}
              >
                {isClip && <LiveClipBadge />}
                <span className="truncate">{track.title}</span>
              </p>
              <p className="truncate text-xs text-foreground/50">
                <span>{track.artist}</span>
                {isClip
                  ? track.sessionName
                    ? ` · ${track.sessionName}`
                    : ""
                  : track.albumName
                    ? ` · ${track.albumName}`
                    : ""}
              </p>
            </button>

            {/* 歌切徽章（行尾统一追加） */}
            {isClip && (
              <span className="hidden shrink-0 sm:inline">
                <LiveClipBadge />
              </span>
            )}

            {/* 播放数（单曲展示，歌切不展示） */}
            {!isClip && (track.plays ?? 0) > 0 && (
              <span className="hidden shrink-0 text-xs text-foreground/40 sm:inline">
                {formatPlays(track.plays ?? 0)}
              </span>
            )}

            {/* 时长 */}
            <span className="shrink-0 font-mono text-xs text-foreground/40">
              {formatTime(playerSong?.duration ?? track.duration)}
            </span>

            {/* 操作按钮：喜欢 / 加入队列 / 下一首播放 */}
            <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
              <button
                type="button"
                onClick={() => onLike(track)}
                aria-label={isLiked ? "取消喜欢" : "喜欢"}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  isLiked
                    ? "text-primary dark:text-primary/60"
                    : "text-foreground/40 opacity-0 hover:bg-primary/10 hover:text-primary group-hover:opacity-100 dark:hover:text-primary/60"
                )}
              >
                <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
              </button>
              <button
                type="button"
                onClick={() => onAddToQueue(idx)}
                aria-label="添加到队列"
                title="添加到队列"
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100 dark:hover:text-primary/60"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onPlayNext(idx)}
                aria-label="下一首播放"
                title="下一首播放"
                className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100 dark:hover:text-primary/60"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
