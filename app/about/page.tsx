import type { Metadata } from "next";
import {
  Clock,
  ExternalLink,
  Heart,
  MessageSquare,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

import { ChangelogSection } from "./changelog-section";
import {
  ABOUT_FEATURES,
  ABOUT_SUPPORT_MEMBERS,
  ABOUT_TEAM_MEMBERS,
  ABOUT_TECH_STACK,
  type AboutMember,
} from "@/lib/constants/about";
import { APP_VERSION, CHANGELOG, formatReleaseDate } from "@/lib/constants/changelog";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "关于 XingTone",
  description: "XingTone 星瞳音乐播放器 — 项目介绍、版本更新与开发团队",
};

export default function AboutPage() {
  const latestVersion = CHANGELOG[0];

  return (
    <section className="animate-fade-in space-y-8 md:space-y-10">
      <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary via-primary/95 to-gray-950 text-white shadow-card">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 right-8 h-44 w-44 rounded-full bg-primary/30 blur-3xl" />

        <div className="relative flex flex-col gap-5 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between md:px-10 md:py-10">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/logo.png"
              alt="XingTone"
              className="h-16 w-16 rounded-2xl shadow-2xl sm:h-20 sm:w-20"
            />
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                XingTone 瞳瞳音乐
              </h1>
              <p className="text-sm leading-relaxed text-white/70 sm:text-base">
                为星瞳而作的非商用开源音乐工具
              </p>
            </div>
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-white/80" />
            <span className="text-sm font-medium text-white/90">v{APP_VERSION}</span>
            <span className="text-white/30">·</span>
            <span className="text-xs text-white/60">{formatReleaseDate(latestVersion.releaseDate)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ABOUT_FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="group rounded-2xl border border-border/60 bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-105",
                    feature.color
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/60">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-4">
          <SectionHeader icon={Clock} title="版本更新" subtitle="Version Update" />
          <ChangelogSection />
        </section>

        <div className="space-y-6">
          <section className="space-y-4">
            <SectionHeader icon={Settings2} title="技术架构" subtitle="Tech Stack" />
            <div className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
              {ABOUT_TECH_STACK.map((cat) => (
                <div key={cat.title} className="space-y-2">
                  <h3 className="text-sm font-semibold text-primary">{cat.title}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((item) => (
                      <span key={item} className="rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/70">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <SectionHeader icon={Users} title="开发团队" subtitle="Our Team" />
            <MemberList members={ABOUT_TEAM_MEMBERS} />
          </section>

          <section className="space-y-4">
            <SectionHeader icon={Heart} title="友情支持" subtitle="Special Thanks" />
            <MemberList members={ABOUT_SUPPORT_MEMBERS} compact />
          </section>
        </div>
      </div>

      <footer className="border-t border-border/60 pt-6 text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/logo.png" alt="XingTone" className="h-6 w-6 rounded-md" />
          <span className="font-semibold">XingTone 瞳瞳音乐</span>
        </div>
        <a
          href="https://txc.qq.com/products/801342"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 inline-flex items-center gap-1.5 text-xs text-foreground/50 transition-colors hover:text-primary sm:text-sm"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          意见反馈
          <ExternalLink className="h-3 w-3" />
        </a>
        <p className="text-xs text-foreground/40 sm:text-sm">
          © {new Date().getFullYear()} XingTone · 用音乐传递爱与希望
        </p>
      </footer>
    </section>
  );
}

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
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        <p className="text-xs text-foreground/50 sm:text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

function MemberList({ members, compact = false }: { members: AboutMember[]; compact?: boolean }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-border/60 bg-card p-3 shadow-sm">
      {members.map((member) => (
        <div key={member.name} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted/60">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.avatarUrl}
              alt={member.name}
              className={cn(
                "shrink-0 rounded-full object-cover shadow-md ring-1 ring-border/40",
                compact ? "h-9 w-9" : "h-11 w-11"
              )}
            />
          ) : (
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-bold text-white shadow-md",
                compact ? "h-9 w-9 text-sm" : "h-11 w-11",
                member.avatarColor
              )}
            >
              {member.name.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{member.name}</p>
            <p className="truncate text-xs text-foreground/50">{member.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
