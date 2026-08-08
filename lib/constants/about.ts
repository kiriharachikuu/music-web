import { Globe2, Music2, Palette, ShieldCheck, Smartphone, Zap } from "lucide-react";

export const ABOUT_FEATURES = [
  {
    icon: Music2,
    title: "沉浸播放",
    description: "全屏歌词、双语对照与细腻动效，保留听歌时的沉浸感。",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Smartphone,
    title: "多端一致",
    description: "Web、iOS PWA、Android TWA 保持统一体验。",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Palette,
    title: "星瞳紫视觉",
    description: "以品牌紫为核心，适配亮暗模式与移动端手势。",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    icon: Zap,
    title: "流畅性能",
    description: "本地缓存、流式渲染与原生播放增强，降低等待感。",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: ShieldCheck,
    title: "安全可靠",
    description: "认证、权限、输入校验与类型安全访问共同保障数据。",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Globe2,
    title: "开放扩展",
    description: "REST API、模块化架构，便于持续迭代音乐管理能力。",
    color: "from-rose-500 to-red-600",
  },
];

export const ABOUT_TECH_STACK = [
  {
    title: "前端",
    items: ["Next.js 15", "TypeScript", "TailwindCSS", "Zustand", "Howler.js", "Framer Motion"],
  },
  {
    title: "后端",
    items: ["NestJS", "Prisma ORM", "SQLite", "JWT", "FFmpeg", "S3 存储"],
  },
  {
    title: "跨端",
    items: ["PWA", "Android TWA", "Media3", "iOS safe-area", "JSBridge"],
  },
  {
    title: "部署",
    items: ["Docker", "Nginx", "PM2", "GitHub Actions"],
  },
];

export type AboutMember = {
  name: string;
  role: string;
  avatarColor: string;
  /** 可选：填了则展示图片头像，未填则用字母 + avatarColor 兜底 */
  avatarUrl?: string;
};

export const ABOUT_TEAM_MEMBERS: AboutMember[] = [
  {
    name: "不啦不啦小星瞳",
    role: "项目负责人",
    avatarColor: "from-primary/80 to-primary",
  },
  {
    name: "知空",
    role: "视觉设计 · 开发",
    avatarColor: "from-pink-500 to-rose-600",
  },
  {
    name: "若叶",
    role: "开发支持",
    avatarColor: "from-sky-500 to-blue-600",
  },
];

export const ABOUT_SUPPORT_MEMBERS: AboutMember[] = [
  {
    name: "信格纸",
    role: "资源整理专员",
    avatarColor: "from-amber-500 to-orange-600",
  },
  {
    name: "玄半甲",
    role: "资源整理专员",
    avatarColor: "from-emerald-500 to-teal-600",
  },
  {
    name: "SingleDog2568",
    role: "资源整理专员",
    avatarColor: "from-cyan-500 to-sky-600",
  },
  {
    name: "人造人间",
    role: "资源整理专员",
    avatarColor: "from-violet-500 to-purple-600",
  },
  {
    name: "辰瞳",
    role: "资源整理专员",
    avatarColor: "from-rose-500 to-pink-600",
  },
];
