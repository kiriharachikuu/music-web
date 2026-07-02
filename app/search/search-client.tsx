"use client";

import * as React from "react";
import {
  Search,
  X,
  Clock,
  Flame,
  User2,
  Loader2,
} from "lucide-react";

import type {
  SearchResult,
  SearchCategory,
  SearchSort,
  ArtistBrief,
  ApiSong,
} from "@/lib/types";
import { api } from "@/lib/api";
import { SongList } from "@/components/common/song-list";
import { AlbumCard } from "@/components/common/album-card";
import { PlaylistCard } from "@/components/common/playlist-card";
import { EmptyState } from "@/components/common/empty-state";
import {
  SongListSkeleton,
  CardGridSkeleton,
} from "@/components/common/loading-skeleton";
import { cn } from "@/lib/utils";

/** localStorage 历史 key */
const HISTORY_KEY = "xt-music-search-history";
/** 兜底热门词（后端 /search/hot 不可用时） */
const DEFAULT_HOT = [
  "周杰伦",
  "林俊杰",
  "流行",
  "摇滚",
  "电子",
  "OST",
  "轻音乐",
  "说唱",
];
/** 预设标签 */
const TAGS = ["流行", "摇滚", "电子", "民谣", "说唱", "古典", "爵士", "R&B"];

/** 分类 Tab */
const CATEGORIES: { key: SearchCategory; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "songs", label: "歌曲" },
  { key: "albums", label: "专辑" },
  { key: "playlists", label: "歌单" },
  { key: "artists", label: "歌手" },
];

/** 排序选项（仅歌曲维度生效） */
const SORTS: { key: SearchSort; label: string; param: string }[] = [
  { key: "latest", label: "最新", param: "time" },
  { key: "oldest", label: "最早", param: "time_asc" },
];

/**
 * 搜索客户端组件
 * - 防抖 300ms 实时搜索
 * - 分类 Tab / 排序 / Tag 筛选
 * - 搜索历史（localStorage）+ 热门关键词
 * - 空状态 + 加载骨架
 */
export function SearchClient({
  hotKeywords,
}: {
  hotKeywords: string[];
}) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [category, setCategory] = React.useState<SearchCategory>("all");
  const [sort, setSort] = React.useState<SearchSort>("latest");
  const [tag, setTag] = React.useState<string | null>(null);
  const [results, setResults] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const [likedIds, setLikedIds] = React.useState<Set<string>>(new Set());

  /** 收藏 / 取消收藏歌曲（401 由 api.ts 自动触发登录弹窗） */
  const handleLike = React.useCallback(
    async (song: ApiSong) => {
      const isLiked = likedIds.has(song.id);
      // 乐观 UI
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (isLiked) next.delete(song.id);
        else next.add(song.id);
        return next;
      });
      try {
        if (isLiked) {
          await api.del(`/user/favorites/${song.id}`);
        } else {
          await api.post("/user/favorites", { songId: song.id });
        }
      } catch {
        // 失败回滚（401 已由 api.ts 触发登录弹窗）
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (isLiked) next.add(song.id);
          else next.delete(song.id);
          return next;
        });
      }
    },
    [likedIds]
  );

  // 读取本地历史（仅客户端）
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // 防抖 300ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // 执行搜索（debounced / sort / tag 变化触发）
  React.useEffect(() => {
    if (!debounced) {
      setResults(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const doSearch = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          q: debounced,
          sort: SORTS.find((s) => s.key === sort)?.param ?? "time",
          page: "1",
          limit: "30",
        });
        if (tag) params.set("tag", tag);
        const res = await api.get<SearchResult>(`/search?${params}`);
        if (!cancelled) {
          setResults(res);
          addHistory(debounced);
        }
      } catch {
        if (!cancelled) setResults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void doSearch();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, sort, tag]);

  /** 记录搜索历史 */
  const addHistory = (q: string) => {
    setHistory((prev) => {
      const next = [q, ...prev.filter((x) => x !== q)].slice(0, 10);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  /** 清空历史 */
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  };

  /** 点击历史/热门词填充搜索 */
  const pickKeyword = (kw: string) => {
    setQuery(kw);
    setDebounced(kw);
  };

  const hasQuery = debounced.length > 0;
  const hot = hotKeywords.length > 0 ? hotKeywords : DEFAULT_HOT;

  return (
    <section className="animate-fade-in space-y-6">
      {/* 搜索框：焦点态边框 + 光环 primary-700 */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索歌曲、歌手、专辑、歌单"
          className="h-12 w-full rounded-full border border-input bg-card/60 pl-12 pr-12 text-sm shadow-sm outline-none transition-all placeholder:text-foreground/40 focus:border-primary-700 focus:ring-2 focus:ring-primary-700/20 dark:bg-card/40"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebounced("");
            }}
            aria-label="清空"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* 未搜索：历史 + 热门 */}
      {!hasQuery && (
        <div className="space-y-6">
          {/* 搜索历史 */}
          {history.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                  <Clock className="h-4 w-4" />
                  搜索历史
                </h2>
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs text-foreground/40 hover:text-foreground"
                >
                  清空
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    onClick={() => pickKeyword(kw)}
                    className="rounded-full bg-foreground/5 px-3 py-1.5 text-xs text-foreground/60 transition-colors hover:bg-primary-700/10 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 热门搜索 */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/70">
              <Flame className="h-4 w-4" />
              热门搜索
            </h2>
            <div className="flex flex-wrap gap-2">
              {hot.map((kw, i) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => pickKeyword(kw)}
                  className="flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1.5 text-xs text-foreground/60 transition-colors hover:bg-primary-700/10 hover:text-primary-700 dark:hover:text-primary-300"
                >
                  {i < 3 && (
                    <span className="font-mono text-primary-700 dark:text-primary-300">
                      {i + 1}
                    </span>
                  )}
                  {kw}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 搜索结果区 */}
      {hasQuery && (
        <>
          {/* 分类 Tab + 排序 + Tag 筛选 */}
          <div className="space-y-3">
            {/* 分类 Tab：下划线式 */}
            <div className="flex items-center gap-5 overflow-x-auto border-b border-border no-scrollbar">
              {CATEGORIES.map((c) => {
                const isActive = category === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      "relative shrink-0 pb-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "text-primary-700 dark:text-primary-300"
                        : "text-foreground/50 hover:text-foreground"
                    )}
                  >
                    {c.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-700" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 排序 + Tag（仅歌曲相关时展示） */}
            {(category === "all" || category === "songs") && (
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                {/* 排序 */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-foreground/40">排序</span>
                  {SORTS.map((s) => {
                    const isActive = sort === s.key;
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setSort(s.key)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                          isActive
                            ? "bg-primary-700 text-white"
                            : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
                {/* Tag 筛选 */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-foreground/40">标签</span>
                  <button
                    type="button"
                    onClick={() => setTag(null)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs transition-colors",
                      !tag
                        ? "bg-primary-700 text-white"
                        : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
                    )}
                  >
                    全部
                  </button>
                  {TAGS.map((t) => {
                    const isActive = tag === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTag(isActive ? null : t)}
                        className={cn(
                          "rounded-full px-2.5 py-1 text-xs transition-colors",
                          isActive
                            ? "bg-primary-700 text-white"
                            : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 结果内容 */}
          {loading ? (
            <SearchResultsSkeleton category={category} />
          ) : results ? (
            <SearchResults
              results={results}
              category={category}
              query={debounced}
              likedIds={likedIds}
              onLike={handleLike}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="搜索失败"
              description="请检查网络或后端服务后重试。"
            />
          )}
        </>
      )}
    </section>
  );
}

/** 搜索结果渲染（按分类） */
function SearchResults({
  results,
  category,
  query,
  likedIds,
  onLike,
}: {
  results: SearchResult;
  category: SearchCategory;
  query: string;
  likedIds: Set<string>;
  onLike: (song: ApiSong) => void;
}) {
  const songList = results.songs?.list ?? [];
  const albums = results.albums ?? [];
  const playlists = results.playlists ?? [];
  const artists: ArtistBrief[] = [];
  const isEmpty =
    songList.length === 0 &&
    albums.length === 0 &&
    playlists.length === 0 &&
    artists.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={Search}
        title={`未找到「${query}」的相关结果`}
        description="换个关键词试试吧～"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* 歌曲 */}
      {(category === "all" || category === "songs") && songList.length > 0 && (
        <div>
          {category === "all" && (
            <h3 className="mb-2 text-sm font-semibold text-foreground/70">
              歌曲
            </h3>
          )}
          <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
            <SongList
              songs={songList}
              onLike={onLike}
              likedIds={likedIds}
            />
          </div>
        </div>
      )}

      {/* 专辑 */}
      {(category === "all" || category === "albums") && albums.length > 0 && (
        <div>
          {category === "all" && (
            <h3 className="mb-2 text-sm font-semibold text-foreground/70">
              专辑
            </h3>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {albums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        </div>
      )}

      {/* 歌单 */}
      {(category === "all" || category === "playlists") &&
        playlists.length > 0 && (
          <div>
            {category === "all" && (
              <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                歌单
              </h3>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {playlists.map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </div>
          </div>
        )}

      {/* 歌手 */}
      {(category === "all" || category === "artists") &&
        artists.length > 0 && (
          <div>
            {category === "all" && (
              <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                歌手
              </h3>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {artists.map((a) => (
                <ArtistCard key={a.name} artist={a} />
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

/** 歌手卡片：圆形头像 + 名字 + 歌曲数 */
function ArtistCard({ artist }: { artist: ArtistBrief }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="h-24 w-24 overflow-hidden rounded-full bg-primary-700/5 shadow-card md:h-28 md:w-28">
        {artist.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.cover}
            alt={artist.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary-700/30">
            <User2 className="h-10 w-10" />
          </div>
        )}
      </div>
      <p className="text-sm font-medium">{artist.name}</p>
      <p className="text-xs text-foreground/40">{artist.songCount} 首</p>
    </div>
  );
}

/** 搜索结果骨架 */
function SearchResultsSkeleton({ category }: { category: SearchCategory }) {
  return (
    <div className="space-y-3">
      {category === "all" || category === "songs" ? (
        <SongListSkeleton count={6} />
      ) : (
        <CardGridSkeleton count={6} />
      )}
      <div className="flex items-center justify-center gap-2 py-2 text-sm text-foreground/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        搜索中...
      </div>
    </div>
  );
}
