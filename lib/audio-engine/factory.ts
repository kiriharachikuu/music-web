"use client";

import type { AudioEngine } from "./engine";
import { createHowlerEngine } from "./howler-engine";
import { createNativeEngine } from "./native-engine";
import { getPlatform } from "@/lib/platform";

/**
 * 引擎工厂 —— 根据运行时平台选择音频引擎
 *
 * - TWA 模式（window.AndroidJSBridge 存在）：返回 NativeEngine
 *   所有控制转发到原生 Media3，事件由原生 evaluateJavascript 推送
 * - 浏览器模式（含 PWA / 移动浏览器）：返回 HowlerEngine
 *   html5 流式播放 + 预加载下一首 + Media Session 集成
 *
 * @param preloadCheckFn 仅 HowlerEngine 使用：返回下一首 [url, headers] 用于预加载
 *                       NativeEngine 忽略此参数（原生 Media3 自带预取 API）
 */
export function createAudioEngine(
  preloadCheckFn?: () =>
    | [string, Record<string, string> | undefined]
    | null
): AudioEngine {
  const platform = getPlatform();

  if (platform.isTWA) {
    return createNativeEngine();
  }

  // 浏览器模式：必须传入 preloadCheckFn，否则预加载失效
  // 兜底：未传入时返回 null（关闭预加载）
  return createHowlerEngine(
    preloadCheckFn ?? (() => null)
  );
}
