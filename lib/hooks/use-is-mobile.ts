"use client";

import * as React from "react";

/**
 * 检测当前视口是否为移动端宽度
 * - 默认断点 768px（与 Tailwind md: 断点一致）
 * - SSR 安全：初始返回 false，客户端挂载后更新
 */
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}
