import type { Metadata } from "next";
import {
  ArrowLeft,
  Music2,
  Smartphone,
  Palette,
  Zap,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  Settings2,
  Globe2,
  ShieldCheck,
} from "lucide-react";

import {
  CHANGELOG,
  APP_VERSION,
  CHANGE_TYPE_LABEL,
  formatReleaseDate,
  type ChangeItem,
} from "@/lib/constants/changelog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "关于 XingTone",
  description: "XingTone 星瞳音乐播放器 — 项目介绍、版本更新与开发团队",
};

/**
 * 核心特性
 */
const features = [
  {
    icon: Music2,
    title: "沉浸式播放体验",
    description:
      "全屏歌词播放页，逐行高亮、双语对照，配合细腻的过渡动画与手势交互，带来原生级听歌感受。",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Smartphone,
    title: "多端一致体验",
    description:
      "一套代码覆盖 Web、iOS、Android 三端，PWA 离线可用，TWA 原生增强，随时随地享受音乐。",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: Palette,
    title: "星瞳紫视觉体系",
    description:
      "以星瞳专属紫（#8B00FF）为品牌核心，Apple Music 级别的排版与动效，亮暗双模式无缝切换。",
    color: "from-fuchsia-500 to-pink-600",
  },
  {
    icon: Zap,
    title: "极速流畅性能",
    description:
      "Next.js App Router + RSC 流式渲染，音频 IndexedDB 本地缓存，首屏秒开、离线也能听。",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: ShieldCheck,
    title: "安全可靠架构",
    description:
      "JWT 身份认证、Prisma 类型安全数据库访问、完整的输入校验与权限控制，保障数据安全。",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: Globe2,
    title: "开放可扩展",
    description:
      "RESTful API 设计、模块化架构，支持自定义歌单、歌词同步、音频转码等扩展能力。",
    color: "from-rose-500 to-red-600",
  },
];

/**
 * 技术架构分类
 */
const techStack = [
  {
    title: "前端",
    items: ["Next.js 15", "TypeScript", "TailwindCSS", "Zustand", "Howler.js", "Framer Motion"],
  },
  {
    title: "后端",
    items: ["NestJS", "Prisma ORM", "PostgreSQL", "JWT 认证", "FFmpeg 转码", "S3 存储"],
  },
  {
    title: "跨端",
    items: ["PWA + Service Worker", "Android TWA + Media3", "iOS safe-area 适配", "JSBridge"],
  },
  {
    title: "部署",
    items: ["Docker 容器化", "Nginx 反向代理", "PM2 进程管理", "GitHub Actions CI/CD"],
  },
];

/**
 * 团队成员
 */
const teamMembers = [
  {
    name: "不啦不啦小星瞳",
    role: "项目负责人 · Flutter客户端开发",
    avatarColor: "from-primary-500 to-primary-700",
  },
  {
    name: "知空",
    role: "视觉设计 · 前端开发",
    avatarColor: "from-pink-500 to-rose-600",
  },
  {
    name: "SingleDog233",
    role: "资源整理专员",
    avatarColor: "from-amber-500 to-orange-600",
  },
  {
    name: "大m星",
    role: "资源整理专员",
    avatarColor: "from-cyan-500 to-sky-600",
  },
  {
    name: "玄半甲",
    role: "资源整理专员",
    avatarColor: "from-emerald-500 to-teal-600",
  },
];

export default function AboutPage() {
  const latestVersion = CHANGELOG[0];

  return (
    <section className="animate-fade-in space-y-10 md:space-y-16">
      {/* ===== Hero 区域 ===== */}
      <div className="relative overflow-hidden rounded-2xl border border-primary-500/10 bg-gradient-to-br from-primary-700 via-primary-800 to-gray-950 text-white shadow-card md:rounded-3xl">
        {/* 装饰光晕 */}
        <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 right-8 h-40 w-40 rounded-full bg-primary-300/20 blur-3xl" />

        <div className="relative px-5 py-10 sm:px-10 sm:py-14 md:px-16 md:py-20">
          <div className="flex flex-col items-center gap-5 text-center sm:gap-6">
            {/* Logo */}
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-2xl bg-white/20 blur-xl" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/logo.png"
                alt="XingTone"
                className="relative h-16 w-16 rounded-2xl shadow-2xl sm:h-20 sm:w-20 sm:rounded-3xl md:h-24 md:w-24"
              />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                XingTone 星瞳音乐
              </h1>
              <p className="mx-auto max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
                为星瞳而作的专属音乐播放器
                <br className="hidden sm:inline" />
                精选每一首歌，传递每一份感动
              </p>
            </div>

            {/* 当前版本标签 */}
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-white/80" />
              <span className="text-xs font-medium text-white/90">
                当前版本 v{APP_VERSION}
              </span>
              <span className="text-white/30">·</span>
              <span className="text-xs text-white/60">
                {formatReleaseDate(latestVersion.releaseDate)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 核心特性 ===== */}
      <div className="space-y-5 md:space-y-6">
        <SectionHeader
          icon={Sparkles}
          title="核心特性"
          subtitle="Core Features"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-xl border border-border/60 bg-card p-5 transition-all duration-300 hover:shadow-card sm:rounded-2xl sm:p-6"
              >
                <div
                  className={cn(
                    "mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12",
                    f.color
                  )}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <h3 className="mb-2 text-base font-semibold sm:text-lg">
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed text-foreground/60">
                  {f.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ===== 版本更新 ===== */}
      <div className="space-y-5 md:space-y-6">
        <SectionHeader
          icon={Clock}
          title="版本更新"
          subtitle="What's New"
        />

        <div className="space-y-5">
          {CHANGELOG.map((entry, idx) => (
            <VersionBlock
              key={entry.version}
              entry={entry}
              isLatest={idx === 0}
            />
          ))}
        </div>
      </div>

      {/* ===== 技术架构 ===== */}
      <div className="space-y-5 md:space-y-6">
        <SectionHeader
          icon={Settings2}
          title="技术架构"
          subtitle="Tech Stack"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {techStack.map((cat) => (
            <div
              key={cat.title}
              className="rounded-xl border border-border/60 bg-card p-5 shadow-sm sm:rounded-2xl sm:p-6"
            >
              <h3 className="mb-3 text-sm font-semibold text-primary-700 dark:text-primary-300 sm:text-base">
                {cat.title}
              </h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {cat.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-md bg-muted px-2 py-1 text-xs text-foreground/70 sm:text-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 开发团队 ===== */}
      <div className="space-y-5 md:space-y-6">
        <SectionHeader
          icon={Users}
          title="开发团队"
          subtitle="Our Team"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-5">
          {teamMembers.map((m) => (
            <div
              key={m.name}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/60 bg-card p-4 text-center transition-colors hover:border-primary-500/30 sm:p-5"
            >
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-md sm:h-14 sm:w-14 sm:text-xl",
                  m.avatarColor
                )}
              >
                {m.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{m.name}</p>
                <p className="mt-0.5 truncate text-xs text-foreground/50">
                  {m.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 页脚 ===== */}
      <div className="border-t border-border/60 pt-6 text-center sm:pt-8">
        <div className="mb-2 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/logo.png"
            alt="XingTone"
            className="h-6 w-6 rounded-md"
          />
          <span className="font-semibold">XingTone 星瞳音乐</span>
        </div>
        <p className="text-xs text-foreground/40 sm:text-sm">
          © {new Date().getFullYear()} XingTone · 用音乐传递爱与希望
        </p>
      </div>
    </section>
  );
}

/**
 * 区块标题组件
 */
function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Sparkles;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700 dark:bg-primary-900/30 sm:h-10 sm:w-10 sm:rounded-xl">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
          {title}
        </h2>
        <p className="text-xs text-foreground/50 sm:text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

/**
 * 版本更新块组件
 */
function VersionBlock({
  entry,
  isLatest,
}: {
  entry: (typeof CHANGELOG)[number];
  isLatest: boolean;
}) {
  const features = entry.changes.filter((c) => c.type === "feature");
  const improvements = entry.changes.filter((c) => c.type === "improvement");
  const fixes = entry.changes.filter((c) => c.type === "fix");
  const removed = entry.changes.filter((c) => c.type === "removed");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm sm:rounded-2xl",
        isLatest
          ? "border-primary-500/20 ring-1 ring-primary-500/10"
          : "border-border/60"
      )}
    >
      {/* 版本头 */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "rounded-md px-2.5 py-1 text-sm font-bold sm:text-base",
              isLatest
                ? "bg-primary-700 text-white"
                : "bg-muted text-foreground/70"
            )}
          >
            v{entry.version}
          </span>
          {isLatest && (
            <span className="flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
              <CheckCircle2 className="h-3 w-3" />
              当前版本
            </span>
          )}
        </div>
        <span className="text-xs text-foreground/50 sm:text-sm">
          {formatReleaseDate(entry.releaseDate)}
        </span>
      </div>

      {/* 标题 */}
      {entry.title && (
        <div className="border-b border-border/40 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-sm font-semibold sm:text-base">{entry.title}</h3>
        </div>
      )}

      {/* 更新内容：按类型分组 */}
      <div className="divide-y divide-border/40">
        {features.length > 0 && (
          <ChangeGroup
            label="新增功能"
            items={features}
            type="feature"
          />
        )}
        {improvements.length > 0 && (
          <ChangeGroup
            label="体验优化"
            items={improvements}
            type="improvement"
          />
        )}
        {fixes.length > 0 && (
          <ChangeGroup label="问题修复" items={fixes} type="fix" />
        )}
        {removed.length > 0 && (
          <ChangeGroup
            label="移除内容"
            items={removed}
            type="removed"
          />
        )}
      </div>
    </div>
  );
}

/**
 * 变更分组组件
 */
function ChangeGroup({
  label,
  items,
  type,
}: {
  label: string;
  items: ChangeItem[];
  type: ChangeItem["type"];
}) {
  const labelConfig = CHANGE_TYPE_LABEL[type];

  return (
    <div className="px-4 py-3 sm:px-6 sm:py-4">
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[11px] font-medium sm:text-xs",
            labelConfig.color
          )}
        >
          {labelConfig.text}
        </span>
        <span className="text-xs font-medium text-foreground/60 sm:text-sm">
          {label}
        </span>
      </div>
      <ul className="space-y-1.5 pl-1 sm:space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-foreground/70 sm:text-[15px]"
          >
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
            <span className="leading-relaxed whitespace-pre-wrap">{item.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
