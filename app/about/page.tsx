import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Database,
  Globe,
  Layers,
  Music,
  Palette,
  Server,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "关于项目",
  description: "XingTone —— 项目概述、技术架构与开发团队介绍",
};

/**
 * 技术栈条目
 */
interface TechItem {
  name: string;
  desc: string;
}

interface TechCategory {
  icon: typeof Server;
  title: string;
  color: string;
  items: TechItem[];
}

const techCategories: TechCategory[] = [
  {
    icon: Globe,
    title: "前端用户端",
    color: "from-violet-500 to-purple-600",
    items: [
      { name: "Next.js 15", desc: "App Router + RSC + 流式渲染" },
      { name: "TypeScript", desc: "全量类型安全" },
      { name: "TailwindCSS v3", desc: "原子化 CSS + 暗色模式" },
      { name: "Howler.js", desc: "跨浏览器音频播放引擎" },
      { name: "Zustand", desc: "轻量状态管理 + 持久化" },
      { name: "Framer Motion", desc: "手势动画与转场" },
    ],
  },
  {
    icon: Server,
    title: "后端服务",
    color: "from-blue-500 to-cyan-600",
    items: [
      { name: "NestJS", desc: "模块化企业级 Node 框架" },
      { name: "Prisma ORM", desc: "类型安全的数据库访问层" },
      { name: "PostgreSQL", desc: "关系型数据库" },
      { name: "JWT + Passport", desc: "身份认证与鉴权" },
      { name: "class-validator", desc: "DTO 参数校验" },
      { name: "存储抽象层", desc: "本地 / S3 双存储切换" },
    ],
  },
  {
    icon: Layers,
    title: "管理后台",
    color: "from-amber-500 to-orange-600",
    items: [
      { name: "Next.js 14", desc: "App Router 管理面板" },
      { name: "shadcn/ui", desc: "可定制组件库" },
      { name: "Recharts", desc: "数据可视化图表" },
      { name: "react-hook-form", desc: "表单管理 + zod 校验" },
      { name: "jsmediatags", desc: "音频 ID3 元信息解析" },
    ],
  },
  {
    icon: Smartphone,
    title: "跨端与部署",
    color: "from-emerald-500 to-teal-600",
    items: [
      { name: "PWA", desc: "display:standalone 沉浸式" },
      { name: "next-pwa", desc: "Service Worker 离线缓存" },
      { name: "iOS 适配", desc: "safe-area + meta 标签" },
      { name: "Docker", desc: "容器化部署" },
      { name: "FFmpeg", desc: "音频转码处理" },
    ],
  },
];

/**
 * 团队成员
 */
interface TeamMember {
  name: string;
  role: string;
  contributions: string[];
  avatarColor: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "不啦不啦小星瞳",
    role: "项目负责人 & 全栈开发",
    avatarColor: "from-primary-600 to-primary-800",
    contributions: [
      "项目发起、需求统筹与版本管理",
      "前端页面、后端接口整体开发",
      "TWA安卓打包、部署运维全流程",
      "歌切资源库、曲库架构设计",
    ],
  },
  {
    name: "知空",
    role: "视觉UI设计师",
    avatarColor: "from-pink-500 to-rose-600",
    contributions: [
      "品牌主色调（星瞳专属紫 #8B00FF）规范搭建",
      "仿Apple Music流畅播放器视觉体系",
      "全站图标、界面设计",
      "移动端/桌面端响应式视觉适配方案",
    ],
  },
  {
    name: "SingleDog233",
    role: "资源整理专员",
    avatarColor: "from-amber-500 to-orange-600",
    contributions: [
      "星瞳直播录播歌切素材筛选截取",
      "歌曲歌词、字幕文本校对整理",
      "曲库标签、分类元数据标准化录入",
    ],
  },
  {
    name: "大m星",
    role: "资源整理专员",
    avatarColor: "from-cyan-500 to-sky-700",
    contributions: [
      "原创单曲、合作曲音频源收集归档",
      "歌曲封面、舞台配图素材收集修图",
      "音频文件统一格式转码与存储管理",
    ],
  },
  {
    name: "玄半甲",
    role: "资源整理专员",
    avatarColor: "from-emerald-500 to-teal-600",
    contributions: [
      "曲库数据校验、重复资源清理去重",
      "缺失歌曲信息查漏补充完善",
      "资源库定期维护更新与备份",
    ],
  },
];

export default function AboutPage() {
  return (
    <section className="animate-fade-in space-y-12 sm:space-y-16 md:space-y-24">
      {/* 返回按钮 */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-foreground/60 transition-colors hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" />
        返回发现
      </Link>

      {/* ==================== Hero ==================== */}
      <div className="relative overflow-hidden rounded-2xl border border-primary-500/10 bg-gradient-to-br from-primary-700 via-primary-800 to-gray-950 px-5 py-10 text-center shadow-card sm:rounded-3xl sm:px-8 sm:py-14 md:px-12 md:py-20">
        {/* 装饰光晕（移动端缩小避免溢出） */}
        <div className="pointer-events-none absolute -top-16 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-primary-400/30 blur-3xl sm:-top-20 sm:h-64 sm:w-64" />
        <div className="pointer-events-none absolute -bottom-16 right-6 h-32 w-32 rounded-full bg-primary-300/20 blur-3xl sm:-bottom-20 sm:right-10 sm:h-48 sm:w-48" />

        <div className="relative flex flex-col items-center gap-4 sm:gap-6">
          {/* Logo */}
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-2xl bg-white/20 blur-xl sm:rounded-3xl" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo.png"
              alt="XingTone"
              className="relative h-16 w-16 rounded-2xl shadow-2xl sm:h-24 sm:w-24 sm:rounded-3xl md:h-32 md:w-32"
            />
          </div>

          <div className="space-y-2 sm:space-y-3">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-5xl">
              XingTone
            </h1>
            <p className="mx-auto max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base md:text-lg">
              基于 Next.js + TypeScript + TailwindCSS 的全栈音乐流媒体项目，
              Apple Music 风格的跨端音乐播放器 —— 沉浸式全屏歌词、
              跨平台兼容（Android / iOS / Web 三端）、PWA 覆盖
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 sm:gap-2 sm:pt-2">
            {["Next.js 15", "NestJS", "PostgreSQL", "PWA"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-sm sm:px-3 sm:py-1 sm:text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== 项目概述 ==================== */}
      <div className="space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 sm:h-10 sm:w-10 sm:rounded-xl">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              项目概述
            </h2>
            <p className="text-xs text-foreground/50 sm:text-sm">Project Overview</p>
          </div>
        </div>

        {/* 移动端单列，sm 双列，md 三列（避免 sm 即 3 列导致挤压） */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card sm:rounded-2xl sm:p-6">
            <Music className="mb-2 h-5 w-5 text-primary-700 sm:mb-3 sm:h-6 sm:w-6" />
            <h3 className="mb-1.5 text-sm font-semibold sm:mb-2 sm:text-base">
              沉浸式播放体验
            </h3>
            <p className="text-xs leading-relaxed text-foreground/60 sm:text-sm">
              全屏歌词播放页支持拖拽关闭、逐行高亮、双语歌词与锁屏控制，
              媒体会话 API 深度集成，带来原生 App 级别的听歌感受。
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card sm:rounded-2xl sm:p-6">
            <Smartphone className="mb-2 h-5 w-5 text-primary-700 sm:mb-3 sm:h-6 sm:w-6" />
            <h3 className="mb-1.5 text-sm font-semibold sm:mb-2 sm:text-base">
              PWA 跨端覆盖
            </h3>
            <p className="text-xs leading-relaxed text-foreground/60 sm:text-sm">
              一套代码同时运行于 Web、Android、iOS 三端。添加到主屏幕后以
              standalone 模式全屏启动，隐藏浏览器 UI，体验等同原生应用。
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-card sm:rounded-2xl sm:p-6">
            <Palette className="mb-2 h-5 w-5 text-primary-700 sm:mb-3 sm:h-6 sm:w-6" />
            <h3 className="mb-1.5 text-sm font-semibold sm:mb-2 sm:text-base">
              星瞳紫视觉体系
            </h3>
            <p className="text-xs leading-relaxed text-foreground/60 sm:text-sm">
              以星瞳紫（#8B00FF）为核心品牌色，参照 Apple Music
              的排版、色彩与间距规范，亮暗双模式无缝切换，打造高级感界面。
            </p>
          </div>
        </div>
      </div>

      {/* ==================== 技术架构 ==================== */}
      <div className="space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 sm:h-10 sm:w-10 sm:rounded-xl">
            <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              技术架构
            </h2>
            <p className="text-xs text-foreground/50 sm:text-sm">Tech Stack</p>
          </div>
        </div>

        {/* 移动端单列，md+ 双列（保持卡片完整可读） */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
          {techCategories.map((cat) => {
            const Icon = cat.icon;
            return (
              <div
                key={cat.title}
                className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-card sm:rounded-2xl"
              >
                {/* 分类标题栏 */}
                <div
                  className={`flex items-center gap-2 bg-gradient-to-r ${cat.color} px-4 py-3 sm:px-6 sm:py-4`}
                >
                  <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                  <h3 className="text-sm font-semibold text-white sm:text-base">
                    {cat.title}
                  </h3>
                </div>
                {/* 技术条目：移动端更紧凑 */}
                <div className="divide-y divide-border/40">
                  {cat.items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3"
                    >
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-right text-xs text-foreground/50 sm:text-sm">
                        {item.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* 基础设施：移动端 2 列紧凑，sm+ 4 列 */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {[
            { icon: Database, label: "PostgreSQL", desc: "主数据库" },
            { icon: Server, label: "NestJS REST", desc: "40+ API 接口" },
            { icon: Layers, label: "Prisma", desc: "12 个数据模型" },
            { icon: Globe, label: "Next.js", desc: "SSR + ISR" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card p-3 sm:gap-3 sm:rounded-xl sm:p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700 dark:bg-primary-900/30 sm:h-10 sm:w-10 sm:rounded-lg">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium sm:text-sm">
                    {item.label}
                  </p>
                  <p className="truncate text-[11px] text-foreground/50 sm:text-xs">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ==================== 开发团队 ==================== */}
      <div className="space-y-5 sm:space-y-6">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 sm:h-10 sm:w-10 sm:rounded-xl">
            <Users className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl md:text-3xl">
              开发团队
            </h2>
            <p className="text-xs text-foreground/50 sm:text-sm">Development Team</p>
          </div>
        </div>

        {/* 移动端单列，sm 双列（避免 5 个卡片单列过长） */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          {teamMembers.map((member) => (
            <div
              key={member.name}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-card sm:rounded-2xl sm:p-6"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* 头像：移动端 12x12，sm+ 16x16 */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${member.avatarColor} text-lg font-bold text-white shadow-lg sm:h-16 sm:w-16 sm:text-2xl`}
                >
                  {member.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold sm:text-lg">
                    {member.name}
                  </h3>
                  <p className="text-xs text-primary-700 dark:text-primary-300 sm:text-sm">
                    {member.role}
                  </p>
                </div>
              </div>

              {/* 主要贡献 */}
              <div className="mt-4 space-y-1.5 sm:mt-5 sm:space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/40 sm:text-xs">
                  主要贡献
                </p>
                <ul className="space-y-1.5 sm:space-y-2">
                  {member.contributions.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-foreground/70 sm:text-sm"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-700" />
                      <span className="leading-relaxed">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ==================== 页脚 ==================== */}
      <div className="border-t border-border/60 pt-6 text-center sm:pt-8">
        <div className="mb-3 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.png"
            alt="XingTone"
            className="h-6 w-6 rounded-md"
          />
          <span className="font-semibold">XingTone</span>
        </div>
        <p className="text-xs text-foreground/40 sm:text-sm">
          © {new Date().getFullYear()} XingTone · 基于 Next.js + NestJS 构建
        </p>
      </div>
    </section>
  );
}
