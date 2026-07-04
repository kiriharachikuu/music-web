/**
 * XingTone —— 平台检测入口
 *
 * 统一导出运行时平台检测能力，避免上层重复实现。
 * - 所有播放/版本/分发逻辑都从此查询当前平台
 */

export {
  detectPlatform,
  getPlatform,
  isAndroidJSBridgeAvailable,
  isStandaloneMode,
  _resetPlatformCache,
} from "./detect";
export type { Platform, PlatformInfo } from "./detect";
