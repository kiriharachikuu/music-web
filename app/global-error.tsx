"use client";

import * as React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * 根级错误边界
 * - 当 root layout 自身抛错时 Next.js 会用此文件替换整个文档
 * - 必须包含 <html>、<body>，并自行处理主题（无法依赖 ThemeProvider）
 * - 仍可读取 localStorage 中的主题偏好，避免根错误页闪烁
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[global-error]", error);
  }, [error]);

  // 复用 next-themes 的持久化键，避免暗色模式下根错误页出现白底
  const themeClass = React.useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = window.localStorage.getItem("theme");
      const theme = stored ? JSON.parse(stored) : null;
      const resolved =
        theme?.state?.theme === "dark" ||
        (!theme?.state?.theme &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
          ? "dark"
          : "";
      return resolved;
    } catch {
      return "";
    }
  }, []);

  return (
    <html lang="zh-CN" className={themeClass}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "1.5rem",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          background: "var(--background, #ffffff)",
          color: "var(--foreground, #0a0a0a)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
          }}
        >
          <AlertTriangle size={32} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            应用出现异常
          </h1>
          <p
            style={{
              maxWidth: "28rem",
              margin: "0.5rem auto 0",
              fontSize: "0.875rem",
              opacity: 0.6,
            }}
          >
            发生未知错误，请尝试重新加载。若问题持续，可清除浏览器缓存后重试。
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "0.5rem 1.25rem",
            borderRadius: 8,
            border: "none",
            background: "#8B00FF",
            color: "#ffffff",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          <RotateCcw size={16} />
          重试
        </button>
      </body>
    </html>
  );
}
