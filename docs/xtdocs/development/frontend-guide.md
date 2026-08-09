# 前端用户端开发指南

XingTone Web 是基于 Next.js 15 + TypeScript + TailwindCSS 构建的音乐播放器前端用户端，采用 Apple Music 风格设计，支持 PWA 安装到桌面/主屏幕。

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 15 (App Router) | React 框架 + SSR/ISR |
| TypeScript | 类型安全 |
| TailwindCSS v3 + shadcn/ui | 样式与组件库 |
| Howler.js | 跨浏览器音频播放 |
| Zustand | 轻量状态管理（含持久化） |
| Framer Motion | 手势动画与页面转场 |
| next-pwa | PWA 支持（Service Worker） |
| next-themes | 亮/暗色模式 |

## 核心功能

- **发现页** — 轮播 Banner、推荐歌曲、新专辑、热门歌手
- **排行榜** — 播放量/收藏量 TOP 歌曲（飙升榜、新歌榜、热歌榜、原创榜）
- **搜索** — 歌曲/专辑/歌手/歌单实时搜索，带搜索历史和热门搜索
- **音乐库** — 我的歌单、收藏歌曲
- **个人中心** — 用户信息、收藏/歌单/历史/下载管理、偏好设置
- **全屏歌词页** — 拖拽关闭、双语歌词、逐行高亮、锁屏控制（Media Session API）
- **全屏播放** — 迷你播放栏 → 向上滑展开
- **PWA** — 可添加到主屏幕，standalone 模式全屏运行，离线缓存
- **Android TWA 适配** — 通过 JSBridge 与原生 Media3 播放引擎通信

## 快速开始

### 环境要求

- Node.js 20+

### 1. 安装依赖

```bash
cd music-web
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
NEXT_PUBLIC_ADMIN_URL=http://localhost:3002
```

环境变量说明：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_API_BASE` | 是 | 后端 API 基址 |
| `NEXT_PUBLIC_ADMIN_URL` | 是 | 管理后台地址（个人中心跳转用） |

> 在 Vercel 部署时需在「Settings → Environment Variables」中配置，`NEXT_PUBLIC_` 前缀变量会在构建时内联到客户端代码，修改后需重新部署。

### 3. 启动开发服务器

```bash
npm run dev
# 运行于 http://localhost:3000
```

### 4. 构建生产版本

```bash
npm run build
npm run start
```

## 页面路由

> 注：以下为 `app/` 下的实际 Next.js App Router 路径，使用了分组文件夹 `[id]` 等动态路由。前缀 `/app` 已省略。

| 路径 | 说明 |
|------|------|
| `/` | 发现页 |
| `/search` | 搜索页 |
| `/rankings` | 排行榜 |
| `/library` | 音乐库 |
| `/album/[id]` | 专辑详情 |
| `/artist/[id]` | 歌手详情（含 `/songs`、`/clips` 子页） |
| `/playlist/[id]` | 歌单详情 |
| `/live-sessions`、`/live-session/[id]` | 直播场次列表与详情 |
| `/daily-recommend/songs`、`/daily-recommend/clips` | 每日推荐 |
| `/profile` | 个人中心（含未登录引导） |
| `/profile/favorites` | 我的收藏 |
| `/profile/playlists` | 我的歌单 |
| `/profile/history` | 播放历史 |
| `/profile/downloads` | 下载管理 |
| `/profile/settings` | 设置 |
| `/download` | 下载页面 |
| `/about`、`/about/changelog` | 项目介绍与更新日志 |
| `/login` | 登录 / 注册 |
| `/forgot-password` | 忘记密码 |
| `/legal/*` | 法律声明、开源许可、用户协议 |

## 项目结构

> 项目已重构为功能模块化结构（不再使用 `(dashboard)` 分组）。以下为 `music-web/` 根下的实际结构（已剔除 `node_modules` / `.next` / `docs`）：

```
music-web/
├── app/                       # Next.js App Router 页面
│   ├── (dashboard)/           # 注：旧版本中曾使用该分组，目前 app/ 下不再有 (dashboard) 目录
│   ├── about/                 # 项目介绍（含 changelog 列表、平台版本徽标）
│   ├── album/[id]/            # 专辑详情
│   ├── artist/[id]/           # 歌手详情（songs/clips 子页）
│   ├── daily-recommend/       # 每日推荐
│   ├── download/              # 下载页
│   ├── forgot-password/       # 忘记密码
│   ├── legal/                 # 法律页面（disclaimer/open-source/user-agreement）
│   ├── library/               # 音乐库
│   ├── live-session/[id]/     # 直播场次详情
│   ├── live-sessions/         # 直播场次列表
│   ├── login/                 # 登录/注册（独立页面，不含外壳）
│   ├── playlist/[id]/         # 歌单详情
│   ├── profile/               # 个人中心（tabs 包含 favorites/playlists/history/downloads/settings）
│   ├── rankings/              # 排行榜
│   ├── search/                # 搜索
│   ├── discover-client.tsx    # 发现页客户端入口
│   ├── error.tsx              # 错误边界
│   ├── global-error.tsx       # 全局错误
│   ├── globals.css            # TailwindCSS + 自定义工具类
│   ├── layout.tsx             # 根布局
│   ├── loading.tsx            # 加载状态
│   └── not-found.tsx          # 404 页面
│
├── components/
│   ├── about/                 # 关于页相关（platform-version-badge）
│   ├── auth/                  # 登录弹窗/抽屉
│   ├── common/                # 通用业务组件
│   │   ├── album-card.tsx
│   │   ├── banner-carousel.tsx
│   │   ├── playlist-card.tsx
│   │   ├── song-list.tsx
│   │   ├── live-clip-badge.tsx
│   │   ├── live-session-card.tsx
│   │   ├── song-card.tsx
│   │   ├── update-dialog.tsx
│   │   └── ...
│   ├── layout/                # 布局组件（app-shell、mini-player、mobile-tab-bar、sidebar、queue-panel 等）
│   ├── player/                # 播放器组件
│   │   ├── full-screen-player.tsx
│   │   ├── full-screen-controls.tsx
│   │   ├── lyrics-view.tsx
│   │   ├── media-session-manager.tsx
│   │   ├── progress-bar.tsx
│   │   ├── quality-selector.tsx
│   │   ├── quality-sheet.tsx
│   │   └── queue-sheet.tsx
│   ├── theme/                 # 主题相关
│   ├── ui/                    # shadcn/ui 基础组件
│   ├── app-shell-client.tsx
│   ├── client-providers.tsx
│   └── error-boundary.tsx
│
├── lib/
│   ├── api.ts                 # API 请求层（含 Authorization 注入）
│   ├── api/                   # 子模块（app-version）
│   ├── audio-engine/          # 播放引擎抽象层（engine/factory/howler-engine/native-engine）
│   ├── auth.ts                # JWT token 存储
│   ├── constants/             # about/changelog 常量
│   ├── db/                    # IndexedDB 缓存（audio-cache/lyric-cache）
│   ├── download.ts            # 下载管理
│   ├── hooks/                 # use-is-mobile / use-safe-area / use-keyboard-offset
│   ├── jsbridge/              # Android JSBridge 封装（android-bridge / native-events）
│   ├── lrc-parser.ts          # LRC 歌词解析
│   ├── media-session.ts       # MediaSession 桥接
│   ├── platform/              # 平台检测（detect/index）
│   ├── runtime/               # 版本检查等
│   ├── store/                 # Zustand store
│   │   ├── auth-store.ts
│   │   ├── player-store.ts
│   │   ├── favorites-store.ts
│   │   ├── color-theme-store.ts
│   │   ├── download-progress-store.ts
│   │   ├── settings-store.ts
│   │   ├── toast-store.ts
│   │   └── update-prompt-store.ts
│   ├── types.ts               # TypeScript 类型定义
│   ├── nav.ts                 # 导航配置
│   ├── utils.ts               # 工具函数
│   ├── daily-snapshot.ts      # 每日推荐快照
│   └── desktop-api.d.ts       # 桌面控制桥接类型
│
├── public/
│   ├── icons/                 # PWA 图标（192/512、apple-touch-icon）
│   ├── character.png
│   ├── favicon.ico
│   ├── manifest.json          # PWA Manifest
│   └── version.json
│
├── docs/xtdocs/               # 文档（与 music-web 同仓库）
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
└── tsconfig.json
```

## 音频播放架构

前端采用 AudioEngine 抽象层支持双引擎：

### 浏览器模式（HowlerEngine）
- 使用 Howler.js 管理音频播放
- 支持跨浏览器兼容性
- 自动处理 MediaSession API（锁屏控件）

### TWA 模式（NativeEngine）
- 通过 `window.AndroidJSBridge` 调用原生 Media3
- 支持息屏常驻播放、系统通知、锁屏控件
- 原生事件通过 `window.__nativePlayerEvents` 回调

### 播放器状态管理
使用 Zustand 的 `player-store` 管理播放状态：
- 当前播放歌曲、播放列表
- 播放状态（播放/暂停/加载中）
- 播放模式（列表循环/单曲循环/随机/顺序）
- 播放进度、音量
- 收藏状态

## PWA 配置

- `manifest.json` — 定义 `display: standalone`，支持 Android/iOS 主屏幕安装
- Service Worker (`next-pwa`) — 静态资源离线缓存，音频缓存策略
- iOS 兼容 — `apple-mobile-web-app-capable`、`apple-touch-icon` 等 meta 标签
- safe-area — iOS 刘海屏 / Home Indicator 适配（通过 useSafeArea hook）

### PWA 音频缓存策略
- 音频文件：CacheFirst 策略，最多缓存 30 条，有效期 14 天
- 图片：StaleWhileRevalidate 策略
- API 请求：NetworkFirst 策略
- 静态资源：CacheFirst 策略

## 主题系统

项目支持亮色/暗色双主题，使用 `next-themes` 管理：
- 默认跟随系统设置
- 用户可在设置中手动切换
- 主题色采用 Apple Music 风格：主色 `#8B00FF`（紫色）

## 状态管理

### Auth Store
管理用户登录状态：
- 用户信息
- JWT Token
- 登录弹窗状态
- 登录/登出/注册操作

### Player Store
管理播放器状态：
- 当前歌曲、播放队列
- 播放/暂停/上一首/下一首
- 进度控制
- 音量控制
- 播放模式切换
- AudioEngine 实例管理

## 开发规范

### 组件开发
- 使用函数组件 + TypeScript
- 组件文件不超过 500 行，超过需拆分
- 使用 shadcn/ui 基础组件进行二次封装
- 使用 TailwindCSS 进行样式开发

### API 调用
- 统一使用 `lib/api.ts` 中封装的请求方法
- 自动注入 Authorization Header
- 401 自动跳转登录
- 统一错误处理

### 工具函数
- 统一在 `lib/utils.ts` 中维护
- 包含 URL 解析、格式化、时间处理等

## 部署

推荐部署到 [Vercel](https://vercel.com)：

1. 登录 Vercel → Import Git Repository → 选择 `music-web` 目录
2. **Root Directory** 设置为 `.`（本目录）
3. 添加环境变量 `NEXT_PUBLIC_API_BASE` 和 `NEXT_PUBLIC_ADMIN_URL`
4. 点击 Deploy

或参考 [部署文档](../deployment/README.md) 了解更多部署方式。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 代码检查 |
| `npx tsc --noEmit` | TypeScript 类型检查 |
