"use client";

import * as React from "react";
import { Search, X, Clock, Flame, Calendar } from "lucide-react";

import type {
  SearchResult,
  SearchCategory,
  SearchSort,
  ApiSong,
  DateRange,
} from "@/lib/types";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { useAuthStore } from "@/lib/store/auth-store";

import { SearchResults, SearchResultsSkeleton } from "./search-results";

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
  const [dateRange, setDateRange] = React.useState<DateRange>({});
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [results, setResults] = React.useState<SearchResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [history, setHistory] = React.useState<string[]>([]);
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const loadLikedFromServer = useFavoritesStore((s) => s.loadFromServer);
  const openLogin = useAuthStore((s) => s.openLogin);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const searchInputMobileRef = React.useRef<HTMLInputElement>(null);
  const searchInputDesktopRef = React.useRef<HTMLInputElement>(null);
  /** 当前分页（ref，不触发重渲染，避免与搜索 effect 形成循环） */
  const pageRef = React.useRef(1);

  // 通过 "/" 快捷键跳转过来时自动聚焦搜索框（由 AppShell 设置标记）
  React.useEffect(() => {
    if (sessionStorage.getItem("xt-focus-search") === "1") {
      sessionStorage.removeItem("xt-focus-search");
      if (window.innerWidth < 768) {
        searchInputMobileRef.current?.focus();
      } else {
        searchInputDesktopRef.current?.focus();
      }
    }
  }, []);

  // 加载喜欢的歌曲列表（仅加载一次）
  React.useEffect(() => {
    if (!getToken()) return;
    const loaded = useFavoritesStore.getState().loaded;
    if (!loaded) {
      void loadLikedFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 喜欢 / 取消喜欢歌曲（未登录时触发登录弹窗） */
  const handleLike = React.useCallback(
    (song: ApiSong) => {
      if (!getToken()) {
        openLogin();
        return;
      }
      void toggleLike(song.id);
    },
    [toggleLike, openLogin]
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

  // 执行搜索（debounced / sort / tag / dateRange 变化触发，每次重置到第 1 页）
  React.useEffect(() => {
    // 搜索条件变化时重置分页
    pageRef.current = 1;
    if (!debounced) {
      setResults(null);
      setLoading(false);
      setHasMore(false);
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
        if (dateRange.startDate) params.set("startDate", dateRange.startDate);
        if (dateRange.endDate) params.set("endDate", dateRange.endDate);
        const res = await api.get<SearchResult>(`/search?${params}`);
        if (!cancelled) {
          setResults(res);
          addHistory(debounced);
          // 返回满 30 条认为可能还有更多
          setHasMore((res.songs?.list?.length ?? 0) >= 30);
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
  }, [debounced, sort, tag, dateRange]);

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

  /** 加载更多歌曲（下一页，仅追加 songs 列表） */
  const handleLoadMore = async () => {
    if (loadingMore || !debounced) return;
    const nextPage = pageRef.current + 1;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        q: debounced,
        sort: SORTS.find((s) => s.key === sort)?.param ?? "time",
        page: String(nextPage),
        limit: "30",
      });
      if (tag) params.set("tag", tag);
      if (dateRange.startDate) params.set("startDate", dateRange.startDate);
      if (dateRange.endDate) params.set("endDate", dateRange.endDate);
      const res = await api.get<SearchResult>(`/search?${params}`);
      setResults((prev) =>
        prev
          ? {
              ...res,
              songs: {
                ...res.songs,
                list: [...prev.songs.list, ...(res.songs?.list ?? [])],
              },
            }
          : res
      );
      setHasMore((res.songs?.list?.length ?? 0) >= 30);
      pageRef.current = nextPage;
    } catch {
      // 加载更多失败静默处理
    } finally {
      setLoadingMore(false);
    }
  };

  /** 清空日期筛选 */
  const clearDateRange = () => {
    setDateRange({});
    setShowDatePicker(false);
  };

  const hasQuery = debounced.length > 0;
  const hot = hotKeywords.length > 0 ? hotKeywords : DEFAULT_HOT;

  return (
    <div className="min-h-dvh">
      {/* 移动端：固定顶部搜索栏 */}
      <div className="fixed inset-x-0 top-0 z-30 border-b border-primary/10 bg-white/80 backdrop-blur-xl dark:bg-gray-900/60 md:hidden pt-safe">
        <div className="flex h-12 items-center gap-3 px-4">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
            <input
              id="search-input-mobile"
              ref={searchInputMobileRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索歌曲、歌手、专辑、歌单"
              className="h-10 w-full rounded-full border border-input bg-card/60 pl-12 pr-12 text-sm shadow-sm outline-none transition-all placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-card/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDebounced("");
                }}
                aria-label="清空"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground active:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <section className="animate-fade-in space-y-6 pt-[calc(var(--safe-area-top,0px)+5rem)] md:pt-0">
        {/* 桌面端搜索框 */}
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground/40" />
          <input
            id="search-input-desktop"
            ref={searchInputDesktopRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索歌曲、歌手、专辑、歌单"
            className="h-12 w-full rounded-full border border-input bg-card/60 pl-12 pr-12 text-sm shadow-sm outline-none transition-all placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:bg-card/40"
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
                  className="text-xs text-foreground/40 hover:text-foreground active:text-foreground"
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
                    className="rounded-full bg-foreground/5 px-3 py-1.5 text-xs text-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary active:bg-primary/15 dark:hover:text-primary/60"
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
                  className="flex items-center gap-1.5 rounded-full bg-foreground/5 px-3 py-1.5 text-xs text-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary active:bg-primary/15 dark:hover:text-primary/60"
                >
                  {i < 3 && (
                    <span className="font-mono text-primary dark:text-primary/60">
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
            <div className="flex items-center gap-5 overflow-x-auto border-b border-border px-1 no-scrollbar">
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
                        ? "text-primary dark:text-primary/60"
                        : "text-foreground/50 hover:text-foreground active:text-foreground"
                    )}
                  >
                    {c.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* 排序 + Tag + 日期筛选（仅歌曲相关时展示） */}
            {(category === "all" || category === "songs") && (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
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
                              ? "bg-primary text-white"
                              : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15"
                          )}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* 日期筛选按钮 */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                      className={cn(
                        "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        dateRange.startDate || dateRange.endDate
                          ? "bg-primary text-white"
                          : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15"
                      )}
                    >
                      <Calendar className="h-3 w-3" />
                      {dateRange.startDate || dateRange.endDate ? (
                        <span>
                          {dateRange.startDate}
                          {dateRange.endDate && ` - ${dateRange.endDate}`}
                        </span>
                      ) : (
                        <span>日期</span>
                      )}
                    </button>
                    {/* 日期选择器弹窗 */}
                    {showDatePicker && (
                      <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-border bg-white p-4 shadow-lg dark:bg-gray-900">
                        <div className="space-y-3">
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-foreground/70">
                              开始日期
                            </label>
                            <input
                              type="date"
                              value={dateRange.startDate || ""}
                              onChange={(e) =>
                                setDateRange((prev) => ({
                                  ...prev,
                                  startDate: e.target.value || undefined,
                                }))
                              }
                              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-foreground/70">
                              结束日期
                            </label>
                            <input
                              type="date"
                              value={dateRange.endDate || ""}
                              onChange={(e) =>
                                setDateRange((prev) => ({
                                  ...prev,
                                  endDate: e.target.value || undefined,
                                }))
                              }
                              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-xs outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                            />
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={clearDateRange}
                              className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5 active:bg-foreground/10"
                            >
                              清空
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDatePicker(false)}
                              className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary/90 active:bg-primary/95"
                            >
                              确定
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
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
                        ? "bg-primary text-white"
                        : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15"
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
                            ? "bg-primary text-white"
                            : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground active:bg-foreground/15"
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
            <>
              <SearchResults
                results={results}
                category={category}
                query={debounced}
                likedIds={likedIds}
                onLike={handleLike}
              />
              {/* 加载更多：仅歌曲相关分类且有更多时显示 */}
              {hasMore &&
                (category === "all" || category === "songs") && (
                  <div className="flex justify-center pt-2">
                    <Button
                      variant="outline"
                      onClick={() => void handleLoadMore()}
                      disabled={loadingMore}
                      className="rounded-full px-6"
                    >
                      {loadingMore ? "加载中..." : "加载更多"}
                    </Button>
                  </div>
                )}
            </>
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
    </div>
  );
}
