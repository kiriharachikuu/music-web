import type { LucideIcon } from "lucide-react";
import { Compass, TrendingUp, Library, User, Radio } from "lucide-react";

/**
 * 导航项配置（侧边栏 / 移动端底部 Tab / 移动端抽屉共用）
 * 5 个主 Tab：发现 / 排行榜 / 音乐库 / 直播 / 我的
 * 搜索入口合并至顶部导航栏（搜索页 /search 仍保留）
 * 注意：移动端底部 Tab 空间有限，直播入口仅在 PC 侧边栏展示
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** 是否在移动端底部 Tab 隐藏（仅 PC 侧边栏显示） */
  mobileHidden?: boolean;
}

export const navItems: NavItem[] = [
  { label: "发现", href: "/", icon: Compass },
  { label: "排行榜", href: "/rankings", icon: TrendingUp },
  { label: "音乐库", href: "/library", icon: Library },
  { label: "直播", href: "/live-sessions", icon: Radio, mobileHidden: true },
  { label: "我的", href: "/profile", icon: User },
];
