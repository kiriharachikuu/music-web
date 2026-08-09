# 后端开发指南

XingTone Server 是基于 NestJS 11 + Prisma + SQLite 构建的后端 API 服务，为整个音乐平台提供数据与认证支撑。

## 技术栈

| 技术 | 用途 |
|------|------|
| NestJS 11 | Web 框架 |
| Prisma ORM | 数据库访问层 |
| SQLite | 轻量级文件数据库（零配置，易于上手） |
| JWT + Passport | 身份认证与鉴权 |
| class-validator | DTO 参数校验 |
| Docker + nginx | 容器化部署 |

## 数据模型

- **User** — 用户（USER / ADMIN 角色）
- **Song** — 歌曲（关联 Album、Tag、Artist）
- **Album** — 专辑
- **Artist** — 歌手
- **Tag** — 标签
- **Playlist** — 歌单（关联 User、Songs）
- **Favorite** — 收藏（用户 ↔ 歌曲）
- **PlayHistory** — 播放历史
- **Banner** — 首页横幅
- **SystemSetting** — 系统配置（KV 存储）
- **DownloadRecord** — 下载记录
- **AppVersion** — 应用版本管理
- **SearchLog** — 搜索日志
- **OperationLog** — 操作日志

完整的数据模型定义请参考 `music-server/prisma/schema.prisma`。

## API 概览

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/songs/:id` | 歌曲详情 |
| GET | `/api/albums` | 专辑列表 |
| GET | `/api/albums/:id` | 专辑详情（含歌曲） |
| GET | `/api/artists/:id` | 歌手详情 |
| GET | `/api/playlists` | 公开歌单列表 |
| GET | `/api/playlists/:id` | 歌单详情 |
| GET | `/api/banners` | Banner 列表 |
| GET | `/api/discover` | 发现页数据 |
| GET | `/api/rankings` | 排行榜 |
| GET | `/api/search` | 综合搜索 |
| GET | `/api/search/hot` | 热门搜索词 |
| GET | `/api/settings/site` | 站点公开设置 |
| GET | `/api/app/version/latest` | 检查最新版本 |
| GET | `/api/health` | 健康检查 |

### 需认证接口（Authorization: Bearer <token>）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 当前用户信息 |
| PATCH | `/api/user/profile` | 更新用户资料 |
| GET | `/api/user/favorites` | 我的收藏 |
| POST | `/api/user/favorites` | 切换收藏 |
| DELETE | `/api/user/favorites/:songId` | 取消收藏 |
| GET | `/api/user/playlists` | 我的歌单 |
| POST | `/api/user/playlists` | 创建歌单 |
| PUT | `/api/user/playlists/:id` | 更新歌单 |
| DELETE | `/api/user/playlists/:id` | 删除歌单 |
| POST | `/api/user/playlists/:id/songs` | 添加歌曲到歌单 |
| DELETE | `/api/user/playlists/:id/songs/:songId` | 从歌单移除歌曲 |
| GET | `/api/user/history` | 播放历史 |
| POST | `/api/user/history` | 上报播放记录 |
| DELETE | `/api/user/history/:songId` | 删除单条历史 |
| DELETE | `/api/user/history` | 清空历史 |
| GET | `/api/user/downloads` | 下载记录 |
| GET | `/api/songs/:id/download-url` | 获取下载链接 |

### 管理后台接口（需 ADMIN 角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 后台总览统计 |
| CRUD | `/api/admin/songs` | 歌曲管理 |
| CRUD | `/api/admin/albums` | 专辑管理 |
| CRUD | `/api/admin/artists` | 歌手管理 |
| CRUD | `/api/admin/playlists` | 歌单管理 |
| CRUD | `/api/admin/banners` | Banner 管理 |
| CRUD | `/api/admin/users` | 用户管理 |
| CRUD | `/api/admin/app-versions` | 应用版本管理 |
| GET/PUT | `/api/admin/settings` | 系统设置 |
| POST | `/api/admin/upload` | 文件上传 |
| GET | `/api/admin/logs` | 操作日志 |
| POST | `/api/admin/migration/*` | 数据迁移 |

完整的 API 文档请参考 [API 参考](../api-reference/README.md)。

## 快速开始

### 环境要求

- Node.js 20+
- npm / pnpm / yarn
- （数据库无需安装，SQLite 为文件式数据库）

### 1. 安装依赖

```bash
cd music-server
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL 和 JWT_SECRET
```

环境变量说明：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DATABASE_URL` | 是 | SQLite 数据库文件路径，默认 `file:./dev.db`（相对 `prisma/schema.prisma`，实际指向 `prisma/dev.db`） |
| `PORT` | 否 | 服务端口，默认 3000 |
| `JWT_SECRET` | 是 | JWT 签名密钥（生产必须替换） |
| `JWT_EXPIRES` | 否 | JWT 过期时间，默认 `7d` |
| `CORS_ORIGINS` | 是 | 跨域白名单，逗号分隔 |
| `TRUST_PROXY` | 否 | 是否信任代理，生产建议 `true` |
| `STORAGE_DRIVER` | 否 | `local` / `s3` / `cos`，默认 `local` |
| `LOCAL_STORAGE_PATH` | 否 | 本地存储路径，默认 `./uploads` |
| `S3_*` | s3 时 | S3 相关配置（见 `.env.example`） |
| `COS_*` | cos 时 | 腾讯云 COS 相关配置 |

### 3. 初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 推送 schema 到 SQLite 数据库（自动创建 dev.db 文件）
npx prisma db push

# 填充种子数据（可选，包含管理员账号和示例数据）
npx prisma db seed
```

> 种子数据包含：管理员账号 `admin / admin123`、普通用户、标签、专辑、歌曲、Banner、歌单和系统设置。

### 4. 启动服务

```bash
# 开发模式（热重载）
npm run start:dev

# 生产模式
npm run build
npm run start:prod
```

服务启动后运行于 `http://localhost:3000`，API 基础路径为 `/api`。

## 项目结构

```
src/
├── common/            # 公共组件：拦截器、过滤器、装饰器、工具函数
│   ├── decorators/   # 装饰器（CurrentUser、Roles）
│   ├── filters/      # 异常过滤器
│   ├── interceptors/ # 响应拦截器
│   └── utils/        # 工具（分页等）
├── config/            # 配置文件（.env 映射、JWT、日志）
├── modules/
│   ├── admin/        # 管理后台 API
│   │   └── dto/
│   ├── album/        # 专辑
│   ├── app-version/  # 应用版本
│   ├── artist/       # 歌手
│   ├── auth/         # 认证（登录/注册/JWT）
│   │   └── dto/
│   ├── banner/       # Banner
│   ├── operation-log/# 操作日志
│   ├── playlist/     # 歌单
│   ├── search/       # 搜索
│   ├── song/         # 歌曲
│   ├── stats/        # 统计、发现、排行榜
│   ├── upload/       # 文件上传（存储抽象层）
│   └── user/         # 用户个人中心
│       └── dto/
└── prisma/           # Prisma 模块封装
```

## 开发规范

### 新增 API 模块

1. 在 `src/modules/` 下创建模块目录
2. 创建 `*.module.ts`、`*.controller.ts`、`*.service.ts`
3. 如需 DTO，创建 `dto/` 目录
4. 在 `app.module.ts` 中导入模块

### 数据库变更

1. 修改 `prisma/schema.prisma`
2. 执行 `npx prisma db push` 同步到数据库
3. 执行 `npx prisma generate` 更新 Prisma Client

> SQLite 不支持 `prisma migrate deploy`，统一用 `prisma db push`。

### 存储抽象层

项目支持三种存储驱动：本地存储、S3 兼容存储、腾讯云 COS。

配置方式：
```env
STORAGE_DRIVER=local          # 本地存储
# STORAGE_DRIVER=s3          # S3 兼容
# STORAGE_DRIVER=cos         # 腾讯云 COS
```

新增的 `DynamicStorageService` 支持动态检测配置变更，无需重启服务即可切换存储驱动。

## 部署

支持 Docker 一键部署：

```bash
docker-compose up -d
```

或参考 [部署文档](../deployment/README.md) 了解手动部署、Nginx 反向代理配置等。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run start:dev` | 开发模式（热重载） |
| `npm run build` | 构建生产版本 |
| `npm run start:prod` | 启动生产版本 |
| `npx prisma generate` | 生成 Prisma Client |
| `npx prisma db push` | 推送 schema 到数据库 |
| `npx prisma db seed` | 填充种子数据 |
| `npx prisma studio` | 打开数据库可视化工具 |
| `npm run lint` | 代码检查 |
