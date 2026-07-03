"use client";

import * as React from "react";
import {
  User,
  Heart,
  ListMusic,
  History,
  Download,
  Settings,
  Pencil,
  Shield,
} from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { API_BASE, ADMIN_URL } from "@/lib/api";
import { clearAuth, getToken } from "@/lib/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FavoritesTab } from "./tabs/favorites-tab";
import { PlaylistsTab } from "./tabs/playlists-tab";
import { HistoryTab } from "./tabs/history-tab";
import { DownloadsTab } from "./tabs/downloads-tab";
import { SettingsTab } from "./tabs/settings-tab";
import { EditProfileDialog } from "./tabs/edit-profile-dialog";

/** Tab 类型 */
type Tab =
  | "favorites"
  | "playlists"
  | "history"
  | "downloads"
  | "settings";

const TABS: { key: Tab; label: string; icon: typeof Heart }[] = [
  { key: "favorites", label: "我喜欢的音乐", icon: Heart },
  { key: "playlists", label: "我的歌单", icon: ListMusic },
  { key: "history", label: "历史播放", icon: History },
  { key: "downloads", label: "下载管理", icon: Download },
  { key: "settings", label: "设置", icon: Settings },
];

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
  const [editOpen, setEditOpen] = React.useState(false);
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
          <p className="mt-0.5 font-mono text-xs text-foreground/30">
            UID: {profile.id.slice(-8).toUpperCase()}
          </p>
        </div>
        {/* 编辑资料按钮 */}
        <Button
          variant="outline"
          onClick={() => setEditOpen(true)}
          className="rounded-full px-4"
        >
          <Pencil className="h-4 w-4" />
          编辑资料
        </Button>
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

      {/* 编辑资料弹窗 */}
      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        profile={profile}
        onUpdated={(updated) => {
          setProfile(updated);
          setEditOpen(false);
        }}
      />
    </section>
  );
}
