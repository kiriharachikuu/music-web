/**
 * 版本更新日志
 *
 * 数据结构设计：
 * - 按版本倒序排列（最新版本在前）
 * - 每个版本包含：版本号、发布日期、更新类型、更新内容列表
 * - 更新内容支持分类：新增 / 优化 / 修复 / 移除
 * - 可维护性：只需在数组头部追加新版本即可
 *
 * 注意：这里是前端展示用的静态 changelog，
 * 后端 /api/app/version/latest 返回的是最新版本检查信息。
 */

export type ChangeType = "feature" | "improvement" | "fix" | "removed";

export interface ChangeItem {
  type: ChangeType;
  content: string;
}

export interface VersionEntry {
  version: string;
  versionCode: number;
  releaseDate: string;
  title?: string;
  changes: ChangeItem[];
}

/**
 * 版本更新记录（倒序：最新在前）
 *
 * 添加新版本时，在数组头部插入即可，例如：
 * {
 *   version: "0.2.0",
 *   versionCode: 2,
 *   releaseDate: "2025-08-01",
 *   title: "重大更新：新增歌单分享功能",
 *   changes: [
 *     { type: "feature", content: "新增歌单分享功能" },
 *     ...
 *   ]
 * }
 */
export const CHANGELOG: VersionEntry[] = [
  {
    version: "0.2.0",
    versionCode: 2,
    releaseDate: "2026-07-11",
    title: "界面优化与问题修复",
    changes: [
      { type: "feature", content: "侧边栏新增星瞳立绘装饰，品牌视觉更丰富" },
      { type: "feature", content: "管理后台支持 APK 文件上传，版本更新可直接上传安装包" },
      { type: "improvement", content: "全屏歌词页面布局重构，歌词、歌曲信息与进度条不再重叠" },
      { type: "improvement", content: "高亮歌词显示优化，避免内容被容器裁剪" },
      { type: "improvement", content: "后端 /uploads 静态资源添加 CORS 支持，跨域访问更稳定" },
      { type: "fix", content: "修复 PC 端全屏歌词页面进度条遮挡歌曲信息的问题" },
      { type: "fix", content: "修复自动播放开关滑块滑出容器边界的视觉异常" },
      { type: "fix", content: "修复飙升榜在数据不足时无法显示的问题，添加数据回退逻辑" },
      { type: "fix", content: "修复 TWA 歌曲下载因 CORS 缺失导致失败的问题" },
      { type: "fix", content: "修复 TWA 应用更新下载链接 404 的问题" },
    ],
  },
  {
    version: "0.1.0",
    versionCode: 1,
    releaseDate: "2025-07-01",
    title: "XingTone 音乐播放器首次发布",
    changes: [
      { type: "feature", content: "Apple Music 风格的音乐播放器界面" },
      { type: "feature", content: "沉浸式全屏歌词播放页，支持逐行高亮与拖拽关闭" },
      { type: "feature", content: "每日推荐、新歌推送、精选歌单三大发现板块" },
      { type: "feature", content: "音乐库：专辑、歌单分类浏览" },
      { type: "feature", content: "搜索功能：歌曲 / 歌手 / 专辑 / 歌单全域搜索" },
      { type: "feature", content: "播放队列管理，支持播放模式切换（顺序/单曲/随机）" },
      { type: "feature", content: "我喜欢的音乐、播放历史、下载管理" },
      { type: "feature", content: "PWA 支持：添加到主屏幕，沉浸式 standalone 模式" },
      { type: "feature", content: "Android TWA 客户端：原生 Media3 前台服务 + 锁屏控制" },
      { type: "feature", content: "亮/暗双主题切换，跟随系统" },
      { type: "feature", content: "音频缓存：IndexedDB 本地存储，离线可播放" },
      { type: "improvement", content: "响应式布局，适配手机 / 平板 / 桌面全设备" },
      { type: "improvement", content: "iOS safe-area 适配，刘海屏 / 灵动岛完美兼容" },
      { type: "improvement", content: "下拉刷新、左滑删除等原生级手势交互" },
    ],
  },
];

/** 当前版本号（与 package.json 保持一致） */
export const APP_VERSION = "0.2.0";
export const APP_VERSION_CODE = 2;

/**
 * 获取更新类型对应的显示标签
 */
export const CHANGE_TYPE_LABEL: Record<ChangeType, { text: string; color: string }> = {
  feature: { text: "新增", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" },
  improvement: { text: "优化", color: "text-primary-700 bg-primary-50 dark:text-primary-300 dark:bg-primary-500/10" },
  fix: { text: "修复", color: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" },
  removed: { text: "移除", color: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10" },
};

/**
 * 格式化日期为中文易读格式
 */
export function formatReleaseDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${year} 年 ${month} 月 ${day} 日`;
}
