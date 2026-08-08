"use client";

import { ThemeProvider } from "@/components/theme/theme-provider";

/**
 * 客户端 Provider 包装：
 * - 把所有依赖 window / localStorage / matchMedia 的 Provider 集中到这一层
 * - 由 app/layout.tsx 在 server component 中渲染此 client wrapper
 * - 避免 server 端与 client 端 provider 输出不一致导致 React #418 hydration mismatch
 */
export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
