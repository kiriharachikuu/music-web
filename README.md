# XingTone Web

XingTone 音乐播放器前端用户端，Apple Music 风格的跨端 Web 应用，支持 PWA 安装到桌面/主屏幕。

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

- **发现页** — 轮播 Banner、推荐歌曲、新专辑
- **排行榜** — 播放量 TOP 歌曲
- **搜索** — 歌曲/专辑/歌手实时搜索
- **音乐库** — 我的歌单、收藏歌曲
- **个人中心** — 用户信息、收藏/歌单/历史管理、偏好设置
- **全屏歌词页** — 拖拽关闭、双语歌词、逐行高亮、锁屏控制（Media Session API）
- **全屏播放** — 迷你播放栏 → 向上滑展开
- **PWA** — 可添加到主屏幕，standalone 模式全屏运行，离线缓存

## 快速开始

### 环境要求

- Node.js 20+

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
# 运行于 http://localhost:3000
```

### 3. 构建生产版本

```bash
npm run build
npm run start
```

## 环境变量

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_API_BASE` | 是 | 后端 API 基址，如 `http://localhost:3000/api` |
| `NEXT_PUBLIC_ADMIN_URL` | 是 | 管理后台地址（个人中心跳转用） |

> 在 Vercel 部署时需在「Settings → Environment Variables」中配置，`NEXT_PUBLIC_` 前缀变量会在构建时内联到客户端代码，修改后需重新部署。

## 部署

推荐部署到 [Vercel](https://vercel.com)：

1. 登录 Vercel → Import Git Repository → 选择 `music-web` 目录
2. **Root Directory** 设置为 `.`（本目录）
3. 添加环境变量 `NEXT_PUBLIC_API_BASE` 和 `NEXT_PUBLIC_ADMIN_URL`
4. 点击 Deploy

部署完成后可绑定自定义域名，并配置 CDN 加速。

或参考 `DEPLOY.md`（位于项目根目录）了解更多部署方式。

## 页面路由

| 路径 | 说明 |
|------|------|
| `/` | 发现页 |
| `/search` | 搜索页 |
| `/rankings` | 排行榜 |
| `/library` | 音乐库 |
| `/profile` | 个人中心（含未登录引导） |
| `/about` | 项目介绍 |
| `/login` | 登录 / 注册 |

## PWA 配置

- `manifest.json` — 定义 `display: standalone`，支持 Android/iOS 主屏幕安装
- Service Worker (`next-pwa`) — 静态资源离线缓存
- iOS 兼容 — `apple-mobile-web-app-capable`、`apple-touch-icon` 等 meta 标签
- safe-area — iOS 刘海屏 / Home Indicator 适配

## 项目结构

```
app/
├── (dashboard)/         # 各页面路由（发现/搜索/音乐库等）
│   ├── page.tsx        # 发现页
│   ├── search/
│   ├── rankings/
│   ├── library/
│   └── profile/
├── login/              # 登录/注册（独立页面，不含外壳）
├── about/              # 项目介绍
└── globals.css        # TailwindCSS + 自定义工具类

components/
├── layout/             # AppShell、Sidebar、TopNav、MiniPlayer、MobileTabBar
├── player/             # FullScreenPlayer、LyricsView
├── common/             # SongList、PlaylistCard、EmptyState 等通用组件
└── ui/                 # shadcn/ui 基础组件

lib/
├── api.ts              # API 请求层（含 Authorization 注入）
├── auth.ts             # JWT token 存储（cookie + localStorage）
├── store/              # Zustand store（播放状态持久化）
├── types.ts            # TypeScript 类型定义
├── nav.ts              # 导航配置
└── utils.ts            # 工具函数
```

## License

MIT
