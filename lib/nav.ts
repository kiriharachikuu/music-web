import type { LucideIcon } from "lucide-react";
import { Compass, TrendingUp, Library, User } from "lucide-react";

/**
 * 导航项配置（侧边栏 / 移动端底部 Tab / 移动端抽屉共用）
 * 4 个主 Tab：发现 / 排行榜 / 音乐库 / 我的
 * 搜索入口合并至顶部导航栏（搜索页 /search 仍保留）
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const navItems: NavItem[] = [
  { label: "发现", href: "/", icon: Compass },
  { label: "排行榜", href: "/rankings", icon: TrendingUp },
  { label: "音乐库", href: "/library", icon: Library },
  { label: "我的", href: "/profile", icon: User },
];
