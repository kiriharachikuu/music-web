import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * 404 页面
 * - 当路由未命中或 notFound() 被调用时展示
 * - 提供回首页 / 去发现页两个入口，避免用户困在空白页
 */
export default function NotFound() {
  return (
    <section className="flex min-h-[70vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">页面走丢了</h1>
        <p className="max-w-md text-sm text-foreground/60">
          找不到这个页面，可能链接已失效或内容已下架。
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/search">去搜索</Link>
        </Button>
        <Button asChild className="bg-primary text-white hover:bg-primary/90">
          <Link href="/">回首页</Link>
        </Button>
      </div>
    </section>
  );
}
