"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  User,
  Heart,
  ListMusic,
  History,
  Download,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Pencil,
  Play,
  CheckSquare,
  Square,
  Shield,
  Sun,
  Moon,
  Monitor,
  Music2,
} from "lucide-react";

import type {
  UserProfile,
  ApiSong,
  Playlist,
  PlayHistoryItem,
} from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { api, API_BASE, ADMIN_URL } from "@/lib/api";
import { clearAuth, getToken } from "@/lib/auth";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { SongList } from "@/components/common/song-list";
import { PlaylistCard } from "@/components/common/playlist-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Tab 类型 */
type Tab =
  | "favorites"
  | "playlists"
  | "history"
  | "downloads"
  | "settings";

const TABS: { key: Tab; label: string; icon: typeof Heart; mobileOnly?: boolean }[] = [
  { key: "favorites", label: "我喜欢的音乐", icon: Heart },
  { key: "playlists", label: "我的歌单", icon: ListMusic },
  { key: "history", label: "历史播放", icon: History },
  { key: "downloads", label: "下载管理", icon: Download, mobileOnly: true },
  { key: "settings", label: "设置", icon: Settings },
];

/** localStorage key */
const DOWNLOADS_KEY = "xt-music-downloads";
const SETTINGS_KEY = "xt-music-settings";

/** 用户偏好设置（音质 / 自动播放） */
interface UserSettings {
  quality: "standard" | "high" | "lossless";
  autoplay: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  quality: "standard",
  autoplay: false,
};

/**
 * 个人中心客户端组件
 * - 5 个子模块 Tab：我喜欢的音乐 / 我的歌单 / 历史播放 / 下载管理(移动端) / 设置
 * - 未登录显示登录引导
 * - 用户头像外圈 2px primary-700 描边
 * - 管理员显示管理后台入口
 */
export function ProfileClient() {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [loggedOut, setLoggedOut] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>("favorites");
  const openLogin = useAuthStore((s) => s.openLogin);

  // 首次挂载拉取用户信息（用原生 fetch，401 不跳转，显示登录引导）
  React.useEffect(() => {
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/user/profile`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.status === 401 || !res.ok) {
        setLoggedOut(true);
      } else {
        const json = await res.json();
        setProfile(json.data ?? null);
        setLoggedOut(!json.data);
      }
    } catch {
      setLoggedOut(true);
    } finally {
      setProfileLoaded(true);
    }
  };

  // 首次加载骨架
  if (!profileLoaded) return <PageSkeleton variant="list" />;

  // 未登录：登录引导（点击按钮弹出登录弹窗，登录成功后重新拉取 profile）
  if (loggedOut || !profile) {
    return (
      <section className="animate-fade-in space-y-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">我的</h1>
        <EmptyState
          icon={User}
          title="未登录"
          description="登录后即可收藏歌曲、管理歌单、同步播放历史。"
          action={
            <Button
              onClick={() => openLogin(() => void loadProfile())}
              className="rounded-full bg-primary-700 px-6 text-white hover:bg-primary-600"
            >
              立即登录
            </Button>
          }
        />
      </section>
    );
  }

  return (
    <section className="animate-fade-in space-y-6">
      {/* 用户信息头部：头像外圈 2px primary-700 描边 */}
      <header className="flex items-center gap-4">
        <div className="rounded-full ring-2 ring-primary-700 ring-offset-2 ring-offset-background">
          <div className="h-16 w-16 overflow-hidden rounded-full bg-primary-700/10 md:h-20 md:w-20">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt={profile.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary-700/60">
                <User className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
            {profile.username}
          </h1>
          <p className="mt-0.5 truncate text-sm text-foreground/50">
            {profile.email}
          </p>
        </div>
        {/* 管理员入口 */}
        {profile.role === "ADMIN" && (
          <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer">
            <Button className="rounded-full bg-primary-700 px-4 text-white shadow-card hover:bg-primary-600">
              <Shield className="h-4 w-4" />
              管理后台
            </Button>
          </a>
        )}
      </header>

      {/* Tab 切换 */}
      <div className="flex items-center gap-5 overflow-x-auto border-b border-border no-scrollbar">
        {TABS.map((t) => {
          // 下载管理仅移动端显示
          if (t.mobileOnly) {
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "relative flex shrink-0 items-center gap-1.5 pb-2.5 text-sm font-medium transition-colors md:hidden",
                  activeTab === t.key
                    ? "text-primary-700 dark:text-primary-300"
                    : "text-foreground/50 hover:text-foreground"
                )}
              >
                <t.icon className="h-4 w-4" />
                {t.label}
                {activeTab === t.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-700" />
                )}
              </button>
            );
          }
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "relative flex shrink-0 items-center gap-1.5 pb-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary-700 dark:text-primary-300"
                  : "text-foreground/50 hover:text-foreground"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary-700" />
              )}
            </button>
          );
        })}
      </div>

      {/* 子模块内容 */}
      {activeTab === "favorites" && <FavoritesTab />}
      {activeTab === "playlists" && <PlaylistsTab />}
      {activeTab === "history" && <HistoryTab />}
      {activeTab === "downloads" && <DownloadsTab />}
      {activeTab === "settings" && (
        <SettingsTab
          onLogout={() => {
            clearAuth();
            setProfile(null);
            setLoggedOut(true);
            setActiveTab("favorites");
          }}
        />
      )}
    </section>
  );
}

// ===== 子模块 1：我喜欢的音乐 =====

function FavoritesTab() {
  const [songs, setSongs] = React.useState<ApiSong[] | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [manageMode, setManageMode] = React.useState(false);
  const play = usePlayerStore((s) => s.play);

  React.useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      // 后端返回分页结构 { list: FavoriteItem[], total }
      // FavoriteItem = { id, userId, songId, createdAt, song: ApiSong }
      const data = await api.get<{ list: { song: ApiSong }[]; total: number }>(
        "/user/favorites"
      );
      setSongs(data?.list?.map((f) => f.song) ?? []);
    } catch {
      setSongs([]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = songs != null && songs.length > 0 && selected.size === songs.length;

  const toggleAll = () => {
    if (!songs) return;
    setSelected(allSelected ? new Set() : new Set(songs.map((s) => s.id)));
  };

  /** 播放选中（或全部） */
  const playSelected = () => {
    if (!songs || songs.length === 0) return;
    const list =
      selected.size > 0
        ? songs.filter((s) => selected.has(s.id))
        : songs;
    if (list.length === 0) return;
    play(toPlayerSong(list[0]), toPlayerSongs(list));
  };

  /** 取消喜欢选中 */
  const removeSelected = async () => {
    if (selected.size === 0) return;
    try {
      await Promise.all(
        Array.from(selected).map((id) => api.del(`/user/favorites/${id}`))
      );
      setSelected(new Set());
      void load();
    } catch {
      /* 忽略 */
    }
  };

  if (songs === null) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={playSelected}
          className="rounded-full bg-primary-700 px-5 text-white shadow-card hover:bg-primary-600 active:bg-primary-800"
        >
          <Play className="h-4 w-4 translate-x-[1px]" />
          播放{selected.size > 0 ? `(${selected.size})` : "全部"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setManageMode((m) => !m);
            setSelected(new Set());
          }}
          className="rounded-full px-4"
        >
          {manageMode ? "退出管理" : "批量管理"}
        </Button>
        {manageMode && (
          <>
            <Button
              variant="ghost"
              onClick={toggleAll}
              className="rounded-full px-3 text-sm"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              全选
            </Button>
            {selected.size > 0 && (
              <Button
                variant="ghost"
                onClick={removeSelected}
                className="rounded-full px-3 text-sm text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                删除选中
              </Button>
            )}
          </>
        )}
        <span className="ml-auto text-xs text-foreground/40">
          共 {songs.length} 首
        </span>
      </div>

      {songs.length > 0 ? (
        <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
          <SongList
            songs={songs}
            selectable={manageMode}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
            emptyText="还没有喜欢的歌曲"
          />
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="还没有喜欢的音乐"
          description="去发现页找找喜欢的歌吧～"
        />
      )}
    </div>
  );
}

// ===== 子模块 2：我的歌单 =====

function PlaylistsTab() {
  const [playlists, setPlaylists] = React.useState<Playlist[] | null>(null);
  const [dialog, setDialog] = React.useState<{
    open: boolean;
    mode: "create" | "rename";
    playlist?: Playlist;
    name: string;
    cover: string;
  }>({ open: false, mode: "create", name: "", cover: "" });

  const load = async () => {
    try {
      const data = await api.get<Playlist[]>("/user/playlists");
      setPlaylists(data ?? []);
    } catch {
      setPlaylists([]);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const openCreate = () =>
    setDialog({ open: true, mode: "create", name: "", cover: "" });

  const openRename = (pl: Playlist) =>
    setDialog({
      open: true,
      mode: "rename",
      playlist: pl,
      name: pl.name,
      cover: pl.cover ?? "",
    });

  const submit = async () => {
    const { mode, playlist, name, cover } = dialog;
    if (!name.trim()) return;
    try {
      if (mode === "create") {
        await api.post("/user/playlists", { name: name.trim(), cover: cover.trim() || undefined });
      } else if (playlist) {
        await api.put(`/user/playlists/${playlist.id}`, {
          name: name.trim(),
          cover: cover.trim() || undefined,
        });
      }
      setDialog((d) => ({ ...d, open: false }));
      void load();
    } catch {
      /* 忽略 */
    }
  };

  const remove = async (pl: Playlist) => {
    if (!confirm(`确定删除歌单「${pl.name}」吗？`)) return;
    try {
      await api.del(`/user/playlists/${pl.id}`);
      void load();
    } catch {
      /* 忽略 */
    }
  };

  if (playlists === null) return <PageSkeleton variant="grid" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/40">
          共 {playlists.length} 个歌单
        </span>
        <Button
          onClick={openCreate}
          className="rounded-full bg-primary-700 px-4 text-white hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          新建歌单
        </Button>
      </div>

      {playlists.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {playlists.map((pl) => (
            <div key={pl.id} className="group relative">
              <PlaylistCard playlist={pl} />
              {/* 重命名 / 删除 浮层 */}
              <div className="absolute right-1.5 top-1.5 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    openRename(pl);
                  }}
                  aria-label="重命名"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    remove(pl);
                  }}
                  aria-label="删除"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ListMusic}
          title="还没有歌单"
          description="新建一个歌单，收藏你喜爱的歌曲。"
          action={
            <Button
              onClick={openCreate}
              className="rounded-full bg-primary-700 px-5 text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" />
              新建歌单
            </Button>
          }
        />
      )}

      {/* 新建 / 重命名弹窗 */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "新建歌单" : "重命名歌单"}
            </DialogTitle>
            <DialogDescription>
              设置歌单名称与封面地址（可选）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs text-foreground/50">
                歌单名称
              </label>
              <Input
                value={dialog.name}
                onChange={(e) =>
                  setDialog((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="给歌单起个名字"
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-foreground/50">
                封面地址（自定义封面 URL）
              </label>
              <Input
                value={dialog.cover}
                onChange={(e) =>
                  setDialog((d) => ({ ...d, cover: e.target.value }))
                }
                placeholder="https://..."
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialog((d) => ({ ...d, open: false }))}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={submit}
              className="rounded-full bg-primary-700 text-white hover:bg-primary-600"
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== 子模块 3：历史播放 =====

function HistoryTab() {
  const [items, setItems] = React.useState<PlayHistoryItem[] | null>(null);

  const load = async () => {
    try {
      // 后端返回分页结构 { list, total, page, limit, totalPages }
      const data = await api.get<{ list: PlayHistoryItem[]; total: number }>(
        "/user/history"
      );
      setItems(data?.list ?? []);
    } catch {
      setItems([]);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const clearAll = async () => {
    if (!confirm("确定清空全部播放历史吗？")) return;
    try {
      await api.del("/user/history");
      setItems([]);
    } catch {
      /* 忽略 */
    }
  };

  if (items === null) return <PageSkeleton variant="list" />;

  // 按日期分组
  const groups = groupByDate(items);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/40">
          共 {items.length} 条记录
        </span>
        {items.length > 0 && (
          <Button
            variant="ghost"
            onClick={clearAll}
            className="rounded-full px-3 text-sm text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            清空历史
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={History}
          title="暂无播放历史"
          description="听过的歌会出现在这里。"
        />
      ) : (
        groups.map((g) => (
          <div key={g.label} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground/70">
              {g.label}
            </h3>
            <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
              <SongList songs={g.items.map((it) => it.song)} />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/** 按日期分组：今天 / 昨天 / 更早 */
function groupByDate(items: PlayHistoryItem[]) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const today: PlayHistoryItem[] = [];
  const yesterday: PlayHistoryItem[] = [];
  const earlier: PlayHistoryItem[] = [];
  for (const it of items) {
    const t = new Date(it.playTime).getTime();
    if (t >= startOfToday) today.push(it);
    else if (t >= startOfYesterday) yesterday.push(it);
    else earlier.push(it);
  }
  const groups: { label: string; items: PlayHistoryItem[] }[] = [];
  if (today.length) groups.push({ label: "今天", items: today });
  if (yesterday.length) groups.push({ label: "昨天", items: yesterday });
  if (earlier.length) groups.push({ label: "更早", items: earlier });
  return groups;
}

// ===== 子模块 4：下载管理（仅移动端） =====

interface LocalDownload {
  id: string;
  song: ApiSong;
  size: number;
  createdAt: string;
}

function DownloadsTab() {
  const [downloads, setDownloads] = React.useState<LocalDownload[]>([]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(DOWNLOADS_KEY);
      if (raw) setDownloads(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (list: LocalDownload[]) => {
    setDownloads(list);
    try {
      localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(list));
    } catch {
      /* ignore */
    }
  };

  const totalSize = downloads.reduce((sum, d) => sum + (d.size || 0), 0);
  const remove = (id: string) => {
    persist(downloads.filter((d) => d.id !== id));
  };
  const clearAll = () => {
    if (!confirm("确定清空所有下载缓存吗？")) return;
    persist([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/40">
          已下载 {downloads.length} 首 · 占用 {formatBytes(totalSize)}
        </span>
        {downloads.length > 0 && (
          <Button
            variant="ghost"
            onClick={clearAll}
            className="rounded-full px-3 text-sm text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            清空缓存
          </Button>
        )}
      </div>

      {downloads.length > 0 ? (
        <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
          <SongList
            songs={downloads.map((d) => d.song)}
            emptyText="暂无下载"
          />
        </div>
      ) : (
        <EmptyState
          icon={Download}
          title="暂无下载"
          description="下载的歌曲会缓存在本地，离线也能听。"
        />
      )}
    </div>
  );
}

/** 格式化字节 */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ===== 子模块 5：设置 =====

function SettingsTab({ onLogout }: { onLogout: () => void }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const update = (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  /** 清除缓存：localStorage 关键 key + Cache API */
  const clearCache = async () => {
    if (!confirm("确定清除本地缓存？下载记录与偏好将被重置。")) return;
    try {
      ["xt-music-player", DOWNLOADS_KEY, SETTINGS_KEY, "xt-music-search-history"].forEach(
        (k) => localStorage.removeItem(k)
      );
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      alert("缓存已清除");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      {/* 主题切换 */}
      <SettingsRow icon={Sun} title="主题">
        <div className="flex items-center gap-1.5">
          {(
            [
              { key: "light", label: "亮色", icon: Sun },
              { key: "dark", label: "暗色", icon: Moon },
              { key: "system", label: "跟随系统", icon: Monitor },
            ] as const
          ).map((t) => {
            const isActive = mounted && theme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary-700 text-white"
                    : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
                )}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </SettingsRow>

      {/* 音质选择 */}
      <SettingsRow icon={Music2} title="播放音质">
        <div className="flex items-center gap-1.5">
          {(
            [
              { key: "standard", label: "标准" },
              { key: "high", label: "高清" },
              { key: "lossless", label: "无损" },
            ] as const
          ).map((q) => {
            const isActive = settings.quality === q.key;
            return (
              <button
                key={q.key}
                type="button"
                onClick={() => update({ quality: q.key })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-primary-700 text-white"
                    : "bg-foreground/5 text-foreground/50 hover:bg-foreground/10 hover:text-foreground"
                )}
              >
                {q.label}
              </button>
            );
          })}
        </div>
      </SettingsRow>

      {/* 自动播放开关 */}
      <SettingsRow icon={Play} title="自动播放">
        <Switch
          checked={settings.autoplay}
          onChange={(v) => update({ autoplay: v })}
          ariaLabel="自动播放"
        />
      </SettingsRow>

      {/* 清除缓存 */}
      <SettingsRow icon={Trash2} title="清除缓存">
        <Button
          variant="outline"
          onClick={clearCache}
          className="rounded-full px-4 text-sm"
        >
          清除
        </Button>
      </SettingsRow>

      {/* 退出登录 */}
      <div className="pt-2">
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </div>
    </div>
  );
}

/** 设置行：左侧图标+标题，右侧控件 */
function SettingsRow({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sun;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-primary-500/10 bg-card/40 px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700/10 text-primary-700 dark:text-primary-300">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

/** 自定义开关：开启态 primary-700 填充 */
function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-primary-700" : "bg-foreground/15"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
