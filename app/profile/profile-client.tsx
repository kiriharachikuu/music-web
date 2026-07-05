"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  User,
  Heart,
  ListMusic,
  History,
  Download,
  Settings,
  Pencil,
  Shield,
  ChevronDown,
  Info,
  Smartphone,
  LogOut,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
 * - 桌面端：Tab 切换形式
 * - 移动端：独立页面跳转形式
 * - 未登录显示登录引导
 * - 用户头像外圈 2px primary-700 描边
 * - 管理员显示管理后台入口
 */
export function ProfileClient() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = React.useState(false);
  const [loggedOut, setLoggedOut] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<Tab>("favorites");
  const [editOpen, setEditOpen] = React.useState(false);
  const openLogin = useAuthStore((s) => s.openLogin);

  // 首次挂载拉取用户信息
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

  const handleLogout = () => {
    clearAuth();
    setProfile(null);
    setLoggedOut(true);
  };

  // 首次加载骨架
  if (!profileLoaded) return <PageSkeleton variant="list" />;

  // 未登录：登录引导
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

  // ========== 移动端：独立页面跳转模式 ==========
  const MobileView = (
    <div className="animate-fade-in space-y-4 md:hidden">
      {/* 用户信息卡片 */}
      <div className="rounded-2xl border border-primary-500/10 bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full ring-2 ring-primary-700 ring-offset-2 ring-offset-background">
            <div className="h-14 w-14 overflow-hidden rounded-full bg-primary-700/10">
              {profile.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar}
                  alt={profile.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary-700/60">
                  <User className="h-6 w-6" />
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold">{profile.username}</h2>
            <p className="truncate text-xs text-foreground/50">
              {profile.email}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="shrink-0 rounded-full px-3"
          >
            <Pencil className="h-3.5 w-3.5" />
            编辑
          </Button>
        </div>
      </div>

      {/* 音乐相关 */}
      <MenuSection title="我的音乐">
        <MenuLink icon={Heart} label="我喜欢的音乐" href="/profile/favorites" />
        <MenuLink icon={ListMusic} label="我的歌单" href="/profile/playlists" />
        <MenuLink icon={History} label="历史播放" href="/profile/history" />
      </MenuSection>

      {/* 下载管理 */}
      <MenuSection title="下载与设置">
        <MenuLink icon={Download} label="下载管理" href="/profile/downloads" />
        <MenuLink icon={Settings} label="设置" href="/profile/settings" />
      </MenuSection>

      {/* 其他 */}
      <MenuSection title="其他">
        <MenuLink icon={Info} label="关于项目" href="/about" />
        <MenuLink icon={Smartphone} label="下载 App" href="/download" />
        {profile.role === "ADMIN" && (
          <MenuItem
            icon={Shield}
            label="管理后台"
            onClick={() => window.open(ADMIN_URL, "_blank")}
          />
        )}
      </MenuSection>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 py-3 text-sm font-medium text-red-500 no-select active:bg-red-500/10"
      >
        <LogOut className="h-4 w-4" />
        退出登录
      </button>
    </div>
  );

  // ========== 桌面端：Tab 切换模式 ==========
  const DesktopView = (
    <section className="hidden animate-fade-in space-y-6 md:block">
      {/* 用户信息头部 */}
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
      {activeTab === "settings" && <SettingsTab onLogout={handleLogout} />}
    </section>
  );

  return (
    <>
      {MobileView}
      {DesktopView}

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
    </>
  );
}

/** 菜单分组 */
function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-primary-500/10 bg-card">
      <div className="flex w-full items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="divide-y divide-border/50">{children}</div>
    </div>
  );
}

/** 菜单链接项（移动端） */
function MenuLink({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Heart;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 no-select transition-colors active:bg-foreground/5 hover:text-primary-700 hover:dark:text-primary-300"
    >
      <Icon className="h-5 w-5 shrink-0 text-foreground/50" />
      <span className="flex-1">{label}</span>
    </Link>
  );
}

/** 菜单项（非链接，用于管理后台等） */
function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Heart;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-foreground/80 no-select transition-colors active:bg-foreground/5"
    >
      <Icon className="h-5 w-5 shrink-0 text-foreground/50" />
      <span className="flex-1">{label}</span>
    </button>
  );
}
