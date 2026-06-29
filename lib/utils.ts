import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn —— 合并 className，解决 Tailwind 类冲突
 * shadcn/ui 组件统一使用此工具
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
