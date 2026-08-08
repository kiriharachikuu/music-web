"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";

import { ChangelogList } from "../changelog-list";

/**
 * 完整更新日志页
 * - 关于页只显示最新 3 条，点击"查看更多"跳到此页查看完整历史
 * - 第一条（最新版本）默认展开，其余折叠，点击行头展开/收起
 * - 顶部提供返回按钮（router.back），移动端走全局边缘返回手势
 */
export default function ChangelogPage() {
  const router = useRouter();

  return (
    <section className="mx-auto max-w-3xl animate-fade-in space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary via-primary/95 to-gray-950 p-6 text-white shadow-card md:p-8">
        <div className="pointer-events-none absolute -top-16 right-8 h-40 w-40 rounded-full bg-white/15 blur-3xl" />
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) {
              router.back();
            } else {
              router.push("/about");
            }
          }}
          className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white/90 backdrop-blur-sm transition-colors hover:bg-white/20"
          aria-label="返回上一页"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <Clock className="h-6 w-6 text-white/90" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">完整更新日志</h1>
            <p className="text-sm text-white/70">Full Changelog · 记录每一个版本的演进</p>
          </div>
        </div>
      </header>

      <ChangelogList />
    </section>
  );
}
