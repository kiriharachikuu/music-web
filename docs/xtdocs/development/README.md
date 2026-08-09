# 开发指南总览

本文档汇总了 XT-Music 项目各模块的开发指南，帮助开发者快速上手各子系统的开发工作。

## 项目架构

XT-Music 采用前后端分离的微服务架构，包含以下模块：

```
XT-Music/
├── music-server/    # 后端 API 服务（NestJS + Prisma + SQLite）
├── music-web/       # 前端用户端（Next.js 15 + TypeScript + TailwindCSS）
├── music-admin/     # 管理后台（Next.js 14 + TypeScript + shadcn/ui）
└── music-twa/       # Android 客户端（Kotlin + WebView + Media3）
```

## 模块文档

| 模块 | 文档 | 技术栈 | 端口 |
|------|------|--------|------|
| 后端服务 | [后端开发指南](backend-guide.md) | NestJS 11, Prisma, SQLite | 3000 |
| 前端用户端 | [前端开发指南](frontend-guide.md) | Next.js 15, TypeScript, Howler.js | 3001 |
| 管理后台 | [管理后台开发指南](admin-guide.md) | Next.js 14, Recharts, zod | 3002 |
| Android 客户端 | [Android 开发指南](android-guide.md) | Kotlin, Media3, JSBridge | - |
| Flutter 参考 | [Flutter 开发指南](flutter-guide.md) | Flutter, Riverpod, Dio | - |

## 技术栈总览

### 公共技术
- **语言**: TypeScript / Kotlin
- **包管理**: npm / Gradle
- **版本控制**: Git

### 后端
- **框架**: NestJS 11
- **ORM**: Prisma
- **数据库**: SQLite（文件式，零配置）
- **认证**: JWT + Passport
- **容器化**: Docker

### 前端
- **框架**: Next.js 15（App Router）
- **样式**: TailwindCSS v3 + shadcn/ui
- **状态管理**: Zustand
- **音频播放**: Howler.js
- **动画**: Framer Motion
- **PWA**: next-pwa

### 管理后台
- **框架**: Next.js 14
- **表单**: react-hook-form + zod
- **图表**: Recharts
- **HTTP**: axios

### Android
- **语言**: Kotlin
- **构建**: Gradle 8.5
- **媒体播放**: Media3 ExoPlayer
- **网络**: OkHttp
- **UI**: WebView（加载 music-web PWA）

## 开发环境准备

### 必要工具
- Node.js 20+
- npm / pnpm / yarn
- Git
- JDK 17（Android 开发需要）
- Android Studio（Android 开发需要）

### 首次启动流程

1. **启动后端服务**
   ```bash
   cd music-server
   npm install
   cp .env.example .env
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   npm run start:dev
   ```

2. **启动前端用户端**
   ```bash
   cd music-web
   npm install
   npm run dev
   ```

3. **启动管理后台**
   ```bash
   cd music-admin
   npm install
   npm run dev
   ```

4. **Android 开发**
   ```bash
   cd music-twa
   ./gradlew assembleDebug
   ```

## 常见问题

### 端口冲突
- 默认端口：后端 3000、music-web 3001、music-admin 3002
- 实际 `package.json` 中三个子项目均未显式指定端口，按以下方式启动即可：
  - `cd music-server && npm run start:dev` → 3000
  - `cd music-web && npm run dev -- -p 3001` → 3001
  - `cd music-admin && npm run dev -- -p 3002` → 3002
- 修改后端 `CORS_ORIGINS` 以适配本地开发

### 数据库问题
- SQLite 为文件式数据库，位于 `music-server/prisma/dev.db`
  - 数据库路径相对 `prisma/schema.prisma` 解析，`DATABASE_URL=file:./dev.db` 实际指向 `prisma/dev.db`
- 如需重置：删除 `prisma/dev.db` 后执行 `npx prisma db push`
- 数据备份：使用 `sqlite3 prisma/dev.db ".backup prisma/dev.db.backup"`

### 更多信息
各模块的详细开发指南请点击上方链接查看。
