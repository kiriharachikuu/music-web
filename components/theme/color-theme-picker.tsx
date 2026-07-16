"use client";

import * as React from "react";
import { Palette, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useColorThemeStore, type ColorTheme } from "@/lib/store/color-theme-store";

const themes: {
  id: ColorTheme;
  name: string;
  color: string;
  description: string;
}[] = [
  { id: "purple", name: "星瞳紫", color: "#8B00FF", description: "默认品牌色" },
  { id: "sky", name: "天蓝色", color: "#007AFF", description: "清爽明亮" },
  { id: "pink", name: "淡粉色", color: "#FF375F", description: "柔和温暖" },
];

/**
 * 颜色主题选择器
 * - 三套颜色主题：星瞳紫（默认）、天蓝色、淡粉色
 * - 切换时立即应用 data-theme 属性，由 globals.css 的 CSS 变量驱动
 * - 通过 localStorage 持久化，首屏脚本提前注入避免闪烁
 */
export function ColorThemePicker() {
  const currentTheme = useColorThemeStore((s) => s.theme);
  const setTheme = useColorThemeStore((s) => s.setTheme);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="选择主题"
          className="h-11 w-11 text-foreground/70 hover:text-foreground md:h-9 md:w-9"
        >
          {mounted ? (
            <Palette className="h-5 w-5" />
          ) : (
            <span className="h-5 w-5" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-2">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          颜色主题
        </div>
        <div className="mt-1 space-y-1">
          {themes.map((t) => {
            const isActive = currentTheme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/20"
                  style={{ backgroundColor: t.color }}
                >
                  {isActive && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
                <span className="flex flex-col items-start">
                  <span className="font-medium text-foreground">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
