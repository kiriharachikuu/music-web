"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

/**
 * 主题切换按钮
 * - 放置于顶部导航栏
 * - 使用 mounted 守卫，避免 SSR/客户端 hydration mismatch
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="切换主题"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      // 移动端触控目标 ≥ 44px，桌面端保持 36px
      className="h-11 w-11 text-foreground/70 hover:text-foreground md:h-9 md:w-9"
    >
      {/* 占位防止 SSR 与首帧尺寸抖动；挂载后再渲染实际图标 */}
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )
      ) : (
        <span className="h-5 w-5" />
      )}
    </Button>
  );
}
