"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * next-themes 主题 Provider 包装
 * - attribute="class"：通过 .dark 类切换暗色
 * - defaultTheme="system"：跟随系统
 * - enableSystem：允许系统偏好
 * - disableTransitionOnChange：切换主题时禁用过渡，避免闪烁
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
