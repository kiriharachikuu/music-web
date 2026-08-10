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
    version: "1.5.0",
    versionCode: 13,
    releaseDate: "2026-08-10",
    title: "排行榜 9 档升级、歌手页与多歌手管理、搜索能力增强",
    changes: [
      // 排行榜
      { type: "feature", content: "排行榜重构为 9 档矩阵：综合 / 单曲 / 歌切 × 飙升 / 热歌 / 新歌，支持双 Tab 切换与 URL 同步，便于分享与返回恢复" },
      { type: "feature", content: "新歌榜实时按发布时间倒序（10 分钟缓存），飙升榜与热歌榜自动覆盖到对应系统歌单 Top 50" },
      { type: "feature", content: "9 个系统歌单自动创建与维护：综合-飙升榜 / 单曲-热歌榜 / 歌切-新歌榜等，可直接在歌单中点播" },
      // 歌手页与多歌手
      { type: "feature", content: "管理端支持为单曲 / 专辑 / 歌切 / 直播场次选择多位歌手，表单使用 ArtistSelector 统一交互" },
      { type: "feature", content: "歌手页新增单曲数 + 歌切数双计显示（如「31 首单曲 + 573 首歌切，共 604 首」），悬停查看明细" },
      { type: "feature", content: "歌手页单曲 / 歌切预览精简为各 10 首，提供「查看全部」独立页入口，首屏更清爽" },
      { type: "feature", content: "歌曲列表、全屏播放页 PC 端左侧、移动端全屏歌词页顶部、移动端歌曲操作菜单均支持点击歌手名进入歌手详情页" },
      // 歌切体验
      { type: "feature", content: "管理端歌切支持独立自定义封面，并新增「清空自定义封面」按钮自动回退至所属场次封面" },
      { type: "improvement", content: "歌切播放纳入 PlayHistory：歌切播放同样会计入最近播放与 7 天榜单统计" },
      // 搜索
      { type: "feature", content: "搜索引擎升级：支持同义词扩展（管理端可后台配置）、拼音首字母匹配（如「xjj」→「星镜境」）" },
      { type: "feature", content: "管理端新增「搜索同义词」CRUD 页面，可即时新增 / 编辑 / 删除同义词条目，生效无需重启服务" },
      { type: "improvement", content: "搜索结果默认按相关度排序（标题 / 歌手 / 专辑权重 4 / 3 / 2），同时保留按播放量 / 时间排序选项" },
    ],
  },
  {
    version: "1.4.3",
    versionCode: 12,
    releaseDate: "2026-08-09",
    title: "平台功能扩展、移动端播放体验与更新能力优化",
    changes: [
      { type: "feature", content: "新增离线缓存音质设置，支持标准、较高、无损兜底与跟随在线音质策略" },
      { type: "feature", content: "排行榜新增综合 / 单曲 / 歌切筛选，并与 URL 参数同步，便于分享与返回恢复" },
      { type: "feature", content: "新增找回密码页面，支持短信 / 邮箱验证码入口与重置密码流程兜底提示" },
      { type: "feature", content: "设置页新增手动检查 App 更新入口，发现新版时展示版本摘要、下载按钮与下载进度反馈" },
      { type: "improvement", content: "歌切封面优先同步直播场次封面，歌曲列表、卡片与虚拟列表统一使用歌切封面回退规则" },
      { type: "improvement", content: "下载管理页展示缓存音质、文件大小与缓存时间，并支持跨平台删除单首缓存与清理失效记录" },
      { type: "improvement", content: "平台更新检测改为轮询 Web 版本文件，发现新版本后提示刷新并清理浏览器缓存" },
      { type: "improvement", content: "移动端播放队列改为上拉抽屉，保留桌面端右侧队列面板交互" },
      { type: "improvement", content: "全屏播放器移动端音质入口改为文字徽章，顶部标题居中并优化底部操作区布局" },
      { type: "fix", content: "修复排行榜歌切行重复显示 LIVE 标签的问题" },
      { type: "fix", content: "修复 TWA 平台更新刷新时缺少 reloadWebView 原生桥接的问题" },
    ],
  },
  {
    version: "1.4.2",
    versionCode: 11,
    releaseDate: "2026-08-09",
    title: "TWA 点击修复、下载管理稳定性与错误兜底",
    changes: [
      { type: "fix", content: "修复 TWA / PWA 按钮点击无响应：TWA 环境下主动清理 Service Worker 与 Cache Storage，避免旧 JS bundle 长期驻留" },
      { type: "fix", content: "修复 React #418 hydration mismatch：AppShell 改为 client-only 加载，避免服务端与客户端首屏 DOM 不一致导致事件委托异常" },
      { type: "fix", content: "修复下载管理页 React #185 最大更新深度错误：下载中任务 selector 增加结果缓存并配合浅比较，避免渲染死循环" },
      { type: "fix", content: "修复下载管理列表封面不显示：在线模式下统一使用服务器封面 URL，不再依赖 TWA 本地 appassets 映射" },
      { type: "fix", content: "修复下载管理异常数据导致页面崩溃：缺失 song 的下载记录会被跳过，formatBytes 增加 undefined / NaN / Infinity 防护" },
      { type: "improvement", content: "新增个人中心 Tab 级错误隔离，单个 Tab 崩溃不影响其他 Tab 与整体个人中心" },
      { type: "improvement", content: "新增个人中心移动端子路由错误页与全局 app/error.tsx 兜底，避免运行时错误直接白屏" },
      { type: "improvement", content: "TWA 兼容性增强：Android WebView User-Agent 增加 XingToneTWA 标识，并配合无缓存策略降低旧资源命中概率" },
    ],
  },
  {
    version: "1.4.1",
    versionCode: 10,
    releaseDate: "2026-08-08",
    title: "iOS 后台连播、关于页与多项健壮性修复",
    changes: [
      { type: "fix", content: "iOS 端自动切歌后无法播放：移除 Howler 预激 play() 流程，改为提前把 audio 元素挂入 DOM 并设置 playsinline，避免污染 iOS 音频会话" },
      { type: "fix", content: "iOS 端灵动岛显示暂停但进度条仍在动：onHowlPause 命中非末尾暂停时立即停止进度轮询并冻结 position，避免 UI 与实际状态错位" },
      { type: "fix", content: "iOS 系统中断恢复后进度条卡死：play 事件触发时自动重启进度轮询，覆盖控制中心解除暂停 / AirPods 重新连接场景" },
      { type: "fix", content: "预加载 Howl 实例使用 volume: 0 会被 iOS 视为不活跃导致后续 play() 被拦截：改用 mute: true 并在复用前 mute(false) 解除" },
      { type: "fix", content: "onHowlEnd 同步切歌后 play() 同步抛错 / 异步 playerror 时增加 50ms 自动重试，命中大部分 iOS 临时拦截" },
      { type: "fix", content: "修复 top-nav 路由切换时重复请求 /user/profile 的浪费带宽问题，改为仅挂载时拉取一次" },
      { type: "fix", content: "修复 profile-client 中 profile.id 缺失时 .slice().toUpperCase() 抛 TypeError 的边界问题" },
      { type: "fix", content: "修复 confirm-dialog 在 React StrictMode 下 setState updater 被调用两次导致 await confirm() 提前 resolve 两次的副作用" },
      { type: "fix", content: "修复 login-sheet 在响应 body 为空 / 非 JSON 时 .json() 抛 SyntaxError 直接崩溃的问题" },
      { type: "fix", content: "修复 player-store loadPreferredQuality 对后端空响应 / 缺字段时 .toLowerCase() 抛 TypeError 的兜底" },
      { type: "improvement", content: "关于页开发人员 / 友情支持成员支持可选 avatarUrl，可使用图片头像，未填则继续用字母 + 渐变色兜底" },
      { type: "improvement", content: "关于页更新日志改为只展示最新 3 条（首条默认展开、后两条折叠），点击「查看更多」跳转独立 /about/changelog 页面查看完整历史" },
    ],
  },
  {
    version: "1.4.0",
    versionCode: 9,
    releaseDate: "2026-08-04",
    title: "排行榜自动排名、移动端返回手势与体验优化",
    changes: [
      { type: "feature", content: "热歌榜改为基于过去 7 天真实播放量自动排名 Top 50，每周一凌晨自动更新" },
      { type: "feature", content: "飙升榜改为基于本周与上周播放增长量自动排名 Top 50，每周一凌晨自动更新" },
      { type: "feature", content: "移动端新增 iOS 风格边缘滑动返回手势，从屏幕左边缘向右滑动即可返回上一页" },
      { type: "feature", content: "移动端所有非一级页面顶部新增返回按钮" },
      { type: "feature", content: "移动端音质切换改为上拉抽屉交互，入口移至全屏播放页顶部" },
      { type: "improvement", content: "全屏播放页 PC 端修复封面区域和音质选择器多余滚动条问题" },
      { type: "improvement", content: "歌曲下载功能仅限 Android 客户端使用，PC 端和 iOS 端隐藏下载入口" },
      { type: "fix", content: "修复歌切（Live Clip）歌词无法显示的问题" },
      { type: "fix", content: "修复转码任务完成判定逻辑、重试计数等缺陷" },
      { type: "fix", content: "修复切歌时 blob URL 内存泄漏问题" },
      { type: "fix", content: "修复播放历史无限膨胀问题，限制每用户 500 条并自动清理" },
      { type: "fix", content: "优化搜索性能，为歌曲标题/歌手/专辑名/歌单名添加数据库索引" },
    ],
  },
  {
    version: "1.3.0",
    versionCode: 8,
    releaseDate: "2026-07-22",
    title: "安全加固、EDITOR 角色与多项优化",
    changes: [
      { type: "feature", content: "后台用户管理支持 EDITOR 角色（可管理歌曲/专辑/歌单/歌手/直播，不可管理用户/系统设置）" },
      { type: "feature", content: "PC 端详情页（专辑/歌手/歌单/直播场次等）新增返回按钮" },
      { type: "feature", content: "直播歌切在所有列表中展示所属直播合集名称" },
      { type: "feature", content: "后台新增孤立上传文件自动清理（每天凌晨 3 点，未保存文件 24 小时后自动删除）" },
      { type: "fix", content: "修复生产环境 JWT 密钥为空或默认值时静默启动的安全隐患" },
      { type: "fix", content: "移除 JWT 策略中硬编码的回退密钥" },
      { type: "fix", content: "修复收藏/取消收藏操作的 TOCTOU 竞态条件，改为事务内执行" },
      { type: "fix", content: "生产环境异常过滤器不再泄露堆栈和内部错误信息" },
      { type: "fix", content: "修复并发下载时 Promise 永不 resolve 的问题" },
      { type: "fix", content: "修复播放器 toggle 乐观更新与 onPlay 事件的竞争问题" },
      { type: "fix", content: "修复 Howler 引擎复用 preload 实例时 onLoad 回调重复触发" },
      { type: "fix", content: "修复歌手识别功能无法正确拆分 & 符号分隔的多歌手问题" },
      { type: "fix", content: "修复全屏歌词页滚动定位不准确、高亮行被裁切的问题" },
      { type: "improvement", content: "搜索日志清理改为 1% 概率触发，降低高频搜索的性能开销" },
    ],
  },
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
export const APP_VERSION = "1.5.0";
export const APP_VERSION_CODE = 13;

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
