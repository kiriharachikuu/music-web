# 快速入门

欢迎使用 XT-Music！本文档将帮助你快速搭建和使用 XT-Music 音乐平台。

## 项目简介

XT-Music 是一个现代化的开源音乐播放平台，包含：

- 🎵 **前端用户端**（music-web）— Apple Music 风格的播放器，支持 PWA
- 🎛️ **管理后台**（music-admin）— 歌曲、专辑、用户、设置等全方位管理
- ⚙️ **后端服务**（music-server）— NestJS + Prisma + SQLite 构建的 API 服务
- 📱 **Android 客户端**（music-twa）— 原生 Media3 播放引擎，支持息屏播放

## 一分钟快速体验

### 方式一：Docker 一键启动（推荐）

```bash
# 1. 克隆项目
git clone https://github.com/your-org/XT-Music.git
cd XT-Music

# 2. 配置环境变量
cp music-server/.env.example music-server/.env
# 编辑 music-server/.env，至少修改 JWT_SECRET

# 3. 一键启动
docker-compose up -d

# 4. 初始化数据库
docker-compose exec server npx prisma db push
docker-compose exec server npx prisma db seed
```

访问地址：
- 前端用户端：http://localhost:8080
- 管理后台：http://localhost:8081
- 后端 API：http://localhost:3000

默认账号：
- 管理员：`admin` / `admin123`

### 方式二：本地开发启动

需要 Node.js 20+。

#### 1. 启动后端

```bash
cd music-server
npm install
cp .env.example .env
npx prisma generate
npx prisma db push
npx prisma db seed
npm run start:dev
```

后端运行于 http://localhost:3000

#### 2. 启动前端用户端

```bash
cd music-web
npm install
# 创建 .env.local，填入：
# NEXT_PUBLIC_API_BASE=http://localhost:3000/api
# NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
npm run dev
```

前端运行于 http://localhost:3000（与后端同端口，需调整）

修改前端端口：
```bash
npm run dev -- -p 3001
```

#### 3. 启动管理后台

```bash
cd music-admin
npm install
# 创建 .env.local，填入：
# NEXT_PUBLIC_API_BASE=http://localhost:3000/api
npm run dev
```

管理后台运行于 http://localhost:3001

## 功能速览

### 前端用户端

| 功能 | 说明 |
|------|------|
| 发现页 | Banner、推荐歌曲、新专辑、热门歌手 |
| 排行榜 | 热歌榜、新歌榜、飙升榜、原创榜 |
| 搜索 | 歌曲/专辑/歌手/歌单实时搜索 |
| 音乐库 | 我的歌单、收藏歌曲 |
| 播放器 | 全屏歌词、迷你播放栏、锁屏控制 |
| 个人中心 | 资料编辑、历史记录、下载管理、设置 |

### 管理后台

| 功能 | 说明 |
|------|------|
| 数据看板 | 总览统计、用户增长、TOP 歌曲 |
| 歌曲管理 | 上传、编辑、批量操作 |
| 专辑/歌手/歌单管理 | 完整的 CRUD 操作 |
| Banner 管理 | 首页轮播图配置 |
| 用户管理 | 角色切换、封禁 |
| 系统设置 | 站点配置、存储配置 |
| 应用版本 | 版本发布、更新管理 |
| 操作日志 | 管理员操作记录 |

## 常见问题

### Q: 如何修改管理员密码？

A: 登录管理后台 → 用户管理 → 找到 admin 用户 → 编辑 → 修改密码。

或直接在数据库中修改：
```bash
cd music-server
npx prisma studio
```

### Q: 如何上传歌曲？

A: 登录管理后台 → 歌曲管理 → 上传歌曲 → 填写信息并提交。

支持的音频格式：MP3、WAV、FLAC、OGG、M4A、AAC

### Q: 如何更换 Logo 和站点名称？

A: 管理后台 → 系统设置 → 站点设置。

### Q: 数据会丢失吗？

A: 请务必定期备份！参考 [备份与恢复](../operations/backup-recovery.md)。

### Q: 如何部署到服务器？

A: 参考 [部署文档总览](../deployment/README.md)，支持 Docker、Linux 原生、宝塔面板等多种方式。

## 下一步

- 📚 阅读 [开发指南总览](../development/README.md) 了解各模块技术细节
- 🚀 查看 [部署文档总览](../deployment/README.md) 部署到生产环境
- 🛠️ 参考 [运维手册总览](../operations/README.md) 进行日常运维
- 📋 了解 [开发计划](../roadmap/feature-gap.md) 和未来功能
- 🔍 查阅 [API 参考](../api-reference/README.md) 对接接口

## 获取帮助

- 提交 Issue：GitHub Issues
- 查看文档：docs/ 目录
- 联系开发者：项目 README 中的联系方式
