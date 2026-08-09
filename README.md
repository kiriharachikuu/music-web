# XingTone Web

XingTone 用户端 Web/PWA 应用，提供音乐发现、播放、搜索、歌单、收藏、下载与个人中心能力。可作为普通网页、PWA、Android TWA 与桌面端内置 Web 前端运行。

完整项目文档见 [docs](../docs/README.md)。

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 15 App Router | React 应用框架 |
| React 19 + TypeScript | UI 与类型安全 |
| TailwindCSS v3 + shadcn/ui | 样式与基础组件 |
| Zustand | 播放器、登录态、主题等状态管理 |
| Howler.js | 浏览器音频播放降级实现 |
| Framer Motion | 手势与动效 |
| next-pwa | PWA 与离线缓存 |
| idb | 本地缓存与离线数据 |

## 核心功能

- 发现页：Banner、推荐歌曲、新专辑、精选歌单、推荐演出片段。
- 搜索：歌曲、专辑、歌手、歌单全局搜索。
- 排行榜：飙升榜、热歌榜等榜单页。
- 播放器：迷你播放栏、全屏播放、歌词、播放队列、音质切换。
- 音乐库：收藏、历史、我的歌单、下载管理。
- 个人中心：资料编辑、密码修改、偏好设置。
- 现场内容：演出场次、片段列表、歌手现场内容页。
- PWA：桌面/主屏幕安装、离线缓存、移动端安全区适配。
- 原生桥接：支持 Android JSBridge 与桌面端 Electron Bridge。

## 快速开始

### 环境要求

- Node.js 20+
- npm

### 安装依赖

```bash
npm install
```

### 配置环境变量

本项目通常使用 `.env.local`：

```bash
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
```

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_API_BASE` | 是 | 后端 API 基址，例如 `http://localhost:3000/api` |
| `NEXT_PUBLIC_ADMIN_URL` | 否 | 管理后台地址，用于前端跳转入口 |

### 启动开发服务

```bash
npm run dev
```

默认运行于 `http://localhost:3000`。

### 生产构建

```bash
npm run build
npm run start
```

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务 |

## 主要路由

| 路径 | 说明 |
|------|------|
| `/` | 发现页 |
| `/search` | 搜索页 |
| `/rankings` | 排行榜 |
| `/library` | 音乐库 |
| `/profile` | 个人中心 |
| `/daily-recommend/songs` | 每日推荐歌曲 |
| `/daily-recommend/clips` | 每日推荐片段 |
| `/live-sessions` | 现场场次 |
| `/download` | 下载页 |
| `/about` | 关于页 |
| `/login` | 登录/注册 |

## 项目结构

```text
app/                  Next.js App Router 页面
components/           通用组件、布局组件、播放器组件、UI 组件
lib/api/              API 子模块
lib/audio-engine/     浏览器/原生音频引擎适配
lib/db/               IndexedDB 缓存
lib/jsbridge/         Android 原生桥接定义
lib/platform/         平台检测
lib/store/            Zustand 状态
public/               图标、PWA manifest、静态资源
```

## 相关子项目

- [music-server](../music-server/README.md)：后端 API 服务。
- [music-admin](../music-admin/README.md)：管理后台。
- [music-twa](../music-twa/README.md)：Android 客户端。
- [music-desktop](../music-desktop/README.md)：桌面客户端。

## 许可

MIT
