"use client";

import dynamic from "next/dynamic";

/**
 * AppShell 客户端包装：
 * - AppShell 依赖 usePathname / useSafeArea / 多个 zustand store
 * - 用 dynamic ssr:false 完全避免 hydration mismatch（React #418）
 * - 在 server component layout 中渲染此 client wrapper
 */
const AppShell = dynamic(
  () => import("@/components/layout/app-shell").then((m) => m.AppShell),
  { ssr: false }
);

export { AppShell };

export function AppShellClient({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
