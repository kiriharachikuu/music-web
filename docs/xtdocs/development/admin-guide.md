# 管理后台开发指南

XingTone Admin 是基于 Next.js 14 + TypeScript + shadcn/ui 构建的音乐平台管理后台，提供歌曲、专辑、歌手、歌单、用户、Banner、系统设置等全方位管理功能。

## 技术栈

| 技术 | 用途 |
|------|------|
| Next.js 14 (App Router) | React 框架 + SSR |
| TypeScript | 类型安全 |
| TailwindCSS v3 + shadcn/ui | 样式与组件库 |
| Recharts | 数据可视化图表 |
| axios | HTTP 请求库 |
| react-hook-form | 表单管理 |
| zod | 表单校验 |
| lucide-react | 图标库 |

## 核心功能

- **数据看板** — 总览统计、用户增长趋势、歌曲分布、播放量 TOP10
- **歌曲管理** — 歌曲列表、上传歌曲、编辑歌曲、批量操作
- **专辑管理** — 专辑列表、创建/编辑专辑、专辑内歌曲管理
- **歌手管理** — 歌手列表、创建/编辑歌手、歌手详情
- **歌单管理** — 歌单列表、创建/编辑歌单、歌单内歌曲管理
- **Banner 管理** — Banner 列表、创建/编辑 Banner、排序
- **用户管理** — 用户列表、用户详情、角色切换、封禁/解封
- **应用版本** — 版本管理、发布新版本、版本下载统计
- **系统设置** — 站点名称、Logo、备案信息、存储配置、JWT 配置
- **操作日志** — 管理员操作记录查询
- **数据迁移** — 从各种源导入音乐数据

## 快速开始

### 环境要求

- Node.js 20+

### 1. 安装依赖

```bash
cd music-admin
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```env
NEXT_PUBLIC_API_BASE=http://localhost:3000/api
```

环境变量说明：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_API_BASE` | 是 | 后端 API 基址 |

### 3. 启动开发服务器

```bash
npm run dev
# 运行于 http://localhost:3001
```

### 4. 登录管理后台

默认管理员账号：
- **用户名**: `admin`
- **密码**: `admin123`

> 生产环境请务必修改默认密码！

### 5. 构建生产版本

```bash
npm run build
npm run start
```

## 页面路由

| 路径 | 说明 |
|------|------|
| `/login` | 登录页 |
| `/` | 数据看板 |
| `/songs` | 歌曲管理 |
| `/songs/new` | 上传新歌曲 |
| `/songs/edit/[id]` | 编辑歌曲 |
| `/albums` | 专辑管理 |
| `/albums/new` | 创建专辑 |
| `/albums/edit/[id]` | 编辑专辑 |
| `/artists` | 歌手管理 |
| `/artists/new` | 创建歌手 |
| `/artists/edit/[id]` | 编辑歌手 |
| `/playlists` | 歌单管理 |
| `/playlists/new` | 创建歌单 |
| `/playlists/edit/[id]` | 编辑歌单 |
| `/banners` | Banner 管理 |
| `/users` | 用户管理 |
| `/users/[id]` | 用户详情 |
| `/app-versions` | 应用版本管理 |
| `/settings` | 系统设置 |
| `/logs` | 操作日志 |
| `/migration` | 数据迁移 |

## 歌曲上传功能

管理后台支持单首和批量上传歌曲：

### 单首上传
1. 进入「歌曲管理」→ 点击「上传歌曲」
2. 填写歌曲信息：标题、歌手、专辑、标签
3. 上传歌曲文件（MP3/WAV/FLAC）
4. 上传封面图片
5. 上传歌词文件（可选）
6. 点击「提交」

### 批量上传
1. 进入「歌曲管理」→ 点击「批量上传」
2. 选择多个音频文件
3. 系统自动读取音频元数据（ID3标签）
4. 确认并调整歌曲信息
5. 点击「批量提交」

### 存储配置
歌曲文件和图片支持三种存储方式：
- **本地存储** — 存储在服务器本地 `uploads/` 目录
- **S3 兼容存储** — 支持阿里云 OSS、MinIO 等
- **腾讯云 COS** — 腾讯云对象存储

在「系统设置」→「存储配置」中切换。

## 项目结构

```
app/
├── layout.tsx          # 根布局
├── page.tsx            # 数据看板
├── login/              # 登录页
├── songs/              # 歌曲管理
│   ├── page.tsx
│   ├── new/
│   └── edit/[id]/
├── albums/             # 专辑管理
├── artists/            # 歌手管理
├── playlists/          # 歌单管理
├── banners/            # Banner 管理
├── users/              # 用户管理
├── app-versions/       # 应用版本
├── settings/           # 系统设置
├── logs/               # 操作日志
├── migration/          # 数据迁移
├── globals.css
└── loading.tsx

components/
├── layout/             # 布局组件
│   ├── admin-layout.tsx
│   ├── sidebar.tsx
│   └── header.tsx
├── songs/              # 歌曲相关组件
│   ├── song-form.tsx
│   ├── song-table.tsx
│   └── song-upload.tsx
├── albums/             # 专辑相关组件
├── artists/            # 歌手相关组件
├── common/             # 通用组件
│   ├── confirm-dialog.tsx
│   ├── data-table.tsx
│   ├── empty-state.tsx
│   └── loading.tsx
└── ui/                 # shadcn/ui 基础组件

lib/
├── api/                # API 请求层
│   ├── client.ts       # axios 实例
│   ├── auth.ts         # 认证相关 API
│   ├── songs.ts        # 歌曲相关 API
│   └── ...
├── hooks/              # 自定义 hooks
│   ├── use-auth.ts
│   └── use-toast.ts
├── store/              # 状态管理（Zustand）
│   └── auth-store.ts
├── types.ts            # TypeScript 类型定义
├── utils.ts            # 工具函数
└── validators.ts       # zod 校验 schema
```

## 认证与权限

### 登录流程
1. 用户输入用户名密码
2. 前端调用 `/api/auth/login`
3. 后端验证后返回 JWT Token
4. 前端将 Token 存储在 localStorage
5. 后续请求自动在 Header 中携带 `Authorization: Bearer <token>`

### 路由保护
- 使用中间件 `middleware.ts` 保护所有管理后台路由
- 未登录用户自动跳转 `/login`
- Token 过期或无效自动清除并跳转登录页

### 权限控制
- 所有接口都需要 ADMIN 角色
- 后端通过 `@Roles('ADMIN')` 装饰器控制
- 前端根据用户角色显示/隐藏功能入口

## 状态管理

使用 Zustand 进行轻量级状态管理：

### Auth Store
- 用户信息
- JWT Token
- 登录状态
- 登录/登出操作

## 开发规范

### 组件开发
- 使用函数组件 + TypeScript
- 优先使用 shadcn/ui 基础组件
- 复杂组件拆分为子组件
- 使用 react-hook-form 管理表单

### API 调用
- 统一在 `lib/api/` 中定义 API 方法
- 使用 axios 实例自动注入 Token
- 401 响应自动跳转登录
- 统一错误提示（toast）

### 表单校验
- 使用 zod 定义校验 schema
- 使用 react-hook-form 集成 zod
- 在 `lib/validators.ts` 中集中管理校验规则

## 部署

参考 [部署文档](../deployment/README.md) 了解管理后台的部署方式。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | 代码检查 |
| `npx tsc --noEmit` | TypeScript 类型检查 |
