/**
 * App 版本相关 API
 *
 * 后端接口：
 * - GET  /api/app/version/latest   获取最新版本
 * - GET  /api/app/version/list     公开历史版本列表
 * - GET  /api/app/version/download/:id  302 计数跳转（匿名下载也计入统计）
 * - HEAD /api/app/version/download/:id  旧版上报下载次数（需登录，保留兼容）
 *
 * 对接页面：
 * - /download 下载页
 * - update-dialog.tsx 版本更新弹窗
 */
import { api, API_BASE } from "@/lib/api";

/** 版本检查结果 */
export interface AppVersionInfo {
  id: string;
  versionCode: number;
  versionName: string;
  title?: string | null;
  /** 更新内容列表（后端 content JSON 解析后的字符串数组） */
  content: string[];
  downloadUrl?: string | null;
  apkUrl?: string | null;
  /** 安装包 MD5 校验值（TWA 模式安装时校验） */
  md5?: string | null;
  /** 文件大小（字节） */
  fileSize: number;
  channel: string;
  platform: string;
  /** 发布形态：full（APK 完整包）/ setup（Win 安装版）/ portable（Win 便携版） */
  variant?: string | null;
  /** 发布时间（后端返回 Date 序列化字符串；可能为空） */
  releaseDate?: string | Date | null;
  forceUpdate: boolean;
  minVersionCode: number;
}

/** 历史版本列表条目（GET /app/version/list） */
export interface AppVersionListItem {
  id: string;
  versionCode: number;
  versionName: string;
  title?: string | null;
  content: string[];
  fileSize: number;
  variant: string;
  channel: string;
  platform: string;
  downloadCount: number;
  releaseDate?: string | Date | null;
}

/** 历史版本列表返回 */
export interface VersionListResult {
  list: AppVersionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/** 版本检查接口返回 */
export interface VersionCheckResult {
  hasUpdate: boolean;
  forceUpdate: boolean;
  latest: AppVersionInfo | null;
}

/**
 * 获取最新版本信息
 * @param platform 平台 android/windows/ios（旧值 desktop 由后端兼容）
 * @param channel 发布渠道 stable/beta
 * @param versionCode 当前版本码（可选，用于判断是否需要更新）
 * @param variant 发布形态 full/setup/portable（可选，Windows 双形态用）
 */
export async function checkLatestVersion(
  platform: string = detectPlatform(),
  channel: string = "stable",
  versionCode?: number,
  variant?: string
): Promise<VersionCheckResult> {
  const params = new URLSearchParams({
    platform,
    channel,
  });
  if (versionCode != null) {
    params.set("versionCode", String(versionCode));
  }
  if (variant) {
    params.set("variant", variant);
  }
  return api.get<VersionCheckResult>(`/app/version/latest?${params.toString()}`, {
    skipCache: true,
  });
}

export const fetchLatestVersion = checkLatestVersion;

/**
 * 获取公开历史版本列表（仅 published）
 */
export async function fetchVersionList(
  platform: string,
  channel: string = "stable",
  variant?: string,
  page: number = 1,
  limit: number = 10
): Promise<VersionListResult> {
  const params = new URLSearchParams({
    platform,
    channel,
    page: String(page),
    limit: String(limit),
  });
  if (variant) {
    params.set("variant", variant);
  }
  return api.get<VersionListResult>(`/app/version/list?${params.toString()}`, {
    skipCache: true,
  });
}

/**
 * 构建 302 下载链接（服务端计数后跳转真实地址，匿名下载也计入统计）
 */
export function buildDownloadUrl(versionId: string): string {
  return `${API_BASE}/app/version/download/${versionId}`;
}

/**
 * 上报下载次数（HEAD 请求，静默上报成功不影响下载）
 * 注意：此接口需要登录鉴权，未登录时调用会失败但不抛错
 */
export async function trackDownload(versionId: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/app/version/download/${versionId}`, {
      method: "HEAD",
      credentials: "include",
    });
  } catch {
    // 上报失败静默处理，不影响下载流程
  }
}

/**
 * 格式化文件大小（字节 → 易读格式）
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "未知大小";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 格式化日期为中文易读格式
 */
export function formatReleaseDate(dateStr: string | Date): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "未知日期";
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year} 年 ${month} 月 ${day} 日`;
}

/**
 * 检测当前运行平台
 * - ios：iPhone / iPad（含 iPadOS 13+ 桌面 UA 特例）
 * - android：Android 设备
 * - desktop：桌面浏览器
 */
export function detectPlatform(): "desktop" | "android" | "ios" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/android|mobile|touch/.test(ua)) return "android";
  return "desktop";
}

/**
 * 下载页平台 Tab 检测：桌面浏览器默认选中 Windows
 * （iOS 无原生客户端，默认展示 Android）
 */
export function detectDownloadTab(): "android" | "windows" {
  return detectPlatform() === "desktop" ? "windows" : "android";
}
