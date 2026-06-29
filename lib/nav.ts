import type { LucideIcon } from "lucide-react";
import { Compass, TrendingUp, Library, Search, User } from "lucide-react";

/**
 * 导航项配置（侧边栏 / 移动端底部 Tab / 移动端抽屉共用）
 * 路由对应 spec：发现 / 排行榜 / 音乐库 / 搜索 / 我的
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
  { label: "搜索", href: "/search", icon: Search },
  { label: "我的", href: "/profile", icon: User },
];
