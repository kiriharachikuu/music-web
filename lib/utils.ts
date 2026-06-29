import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn —— 合并 className，解决 Tailwind 类冲突
 * shadcn/ui 组件统一使用此工具
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * formatDate —— 格式化日期为 YYYY-MM-DD
 * 接受 ISO 字符串 / Date / 空值，异常或空值返回空串
 */
export function formatDate(input?: string | Date | null): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * formatTotalDuration —— 格式化总时长（秒）为人类可读文本
 * - < 1 分钟：不到 1 分钟
 * - < 1 小时：X 分钟
 * - >= 1 小时：X 小时 [Y 分钟]
 */
export function formatTotalDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0 分钟";
  const totalMin = Math.floor(seconds / 60);
  if (totalMin < 1) return "不到 1 分钟";
  if (totalMin < 60) return `${totalMin} 分钟`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

/**
 * formatPlays —— 格式化播放次数（万为单位，保留 1 位小数）
 */
export function formatPlays(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return String(n);
}
