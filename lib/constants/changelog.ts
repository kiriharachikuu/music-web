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
    version: "1.2.0",
    versionCode: 7,
    releaseDate: "2026-07-17",
    title: "离线模式全面升级与性能优化",
    changes: [
      { type: "feature", content: "离线模式支持完整播放器，包含封面、歌词、进度拖拽、播放控制" },
      { type: "feature", content: "离线模式支持 LRC 歌词实时高亮滚动与点击跳转" },
      { type: "feature", content: "歌曲下载时自动缓存封面图片与歌词到本地存储" },
      { type: "feature", content: "音频焦点管理：来电/通知打断后自动恢复播放" },
      { type: "feature", content: "播放打断自动恢复：短暂打断暂停后自动续播，可降低音量共存" },
      { type: "improvement", content: "应用启动速度优化，ExoPlayer 等组件延迟初始化，冷启动缩短约 40%" },
      { type: "improvement", content: "点击响应延迟优化，消除偶发 2 秒卡顿" },
      { type: "improvement", content: "通知栏播放器去重更新，减少不必要的重建开销" },
      { type: "improvement", content: "PendingIntent 缓存，降低通知栏内存分配" },
      { type: "improvement", content: "WebView 配置优化，URI 解析结果缓存" },
      { type: "improvement", content: "安装未知应用权限改为按需请求，不再启动时弹窗" },
      { type: "fix", content: "修复离线页面封面图片因文件访问权限无法显示的问题" },
      { type: "fix", content: "修复离线页面歌词区域溢出导致布局错乱的问题" },
      { type: "fix", content: "修复离线播放器默认展开而非收起的问题" },
      { type: "fix", content: "修复检测到联网后离线页面自动退出的问题（JS 线程调用 WebView 未切主线程）" },
      { type: "fix", content: "修复全屏歌词页底部大片空白的布局问题" },
      { type: "fix", content: "修复 ExoPlayer 内置音频焦点与自定义焦点管理冲突" },
    ],
  },
  {
    version: "1.1.0",
    versionCode: 6,
    releaseDate: "2026-07-17",
    title: "锁屏播放器与性能全面升级",
    changes: [
      { type: "improvement", content: "修复上一首按钮有时仅重播当前歌曲的问题" },
      { type: "improvement", content: "大幅优化 API 数据解析性能，页面加载速度提升 60%+" },
      { type: "improvement", content: "优化歌曲列表渲染效率，减少卡顿与掉帧" },
      { type: "improvement", content: "优化播放器进度条渲染性能" },
      { type: "improvement", content: "优化应用启动速度，首屏渲染更快" },
      { type: "fix", content: "修复封面图下载连接池未复用导致加载缓慢的问题" },
    ],
  },
  {
    version: "1.0.0",
    versionCode: 5,
    releaseDate: "2026-07-15",
    title: "正式版发布：全面优化与稳定性提升",
    changes: [
      { type: "feature", content: "发现页新增「热门歌手」板块，展示平台热门歌手" },
      { type: "feature", content: "歌手详情页支持批量选择作品进行操作" },
      { type: "feature", content: "登录与资料编辑改为非弹窗式页面，体验更流畅" },
      { type: "feature", content: "新增腾讯云 COS 原生存储支持，存储配置可服务端热更新，无需重启" },
      { type: "improvement", content: "编辑资料移除头像 URL 输入框，仅保留上传方式，避免图片链接被滥用" },
      { type: "improvement", content: "PC 端编辑资料改用 Dialog 弹窗，移动端继续使用底部抽屉，体验更统一" },
      { type: "improvement", content: "全面优化性能，提升页面加载和响应速度" },
      { type: "fix", content: "修复七日播放趋势在无数据时无法正常展示的问题" },
      { type: "fix", content: "修复排行榜在无数据时无法正常显示的问题，添加数据回退逻辑" },
      { type: "fix", content: "修复专辑信息中歌手重复显示的问题" },
      { type: "fix", content: "修复自动播放开关关闭时小球位置偏右的问题，关闭状态小球默认在左侧" },
    ],
  },
  {
    version: "0.3.0",
    versionCode: 3,
    releaseDate: "2026-07-12",
    title: "歌手管理功能上线",
    changes: [
      { type: "feature", content: "新增歌手详情页，展示歌手信息、歌曲列表与专辑" },
      { type: "feature", content: "搜索结果歌手卡片支持点击跳转至歌手详情页" },
      { type: "feature", content: "管理后台新增歌手管理模块，支持歌手信息增删改查" },
      { type: "feature", content: "歌曲/专辑创建编辑支持多歌手选择，可搜索、多选、移除" },
      { type: "improvement", content: "歌手详情页支持播放全部、随机播放与收藏操作" },
      { type: "improvement", content: "操作日志支持歌手管理操作记录" },
      { type: "fix", content: "修复管理后台表单中按钮缺少 type 属性导致误触发表单提交的问题" },
    ],
  },
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
export const APP_VERSION = "1.2.0";
export const APP_VERSION_CODE = 7;

/**
 * 获取更新类型对应的显示标签
 */
export const CHANGE_TYPE_LABEL: Record<ChangeType, { text: string; color: string }> = {
  feature: { text: "新增", color: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" },
  improvement: { text: "优化", color: "text-primary bg-primary/10 dark:text-primary/60 dark:bg-primary/10" },
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
