# 后端部署 - Docker

本文档介绍使用 Docker 和 Docker Compose 部署 XingTone Server 的方案。

## 环境要求

- Docker 20+
- Docker Compose v2

## 快速开始

### 1. 准备配置文件

在 music-server 目录下创建 `.env` 文件：

```bash
cd music-server
cp .env.example .env
```

编辑 `.env`，至少修改以下配置：

```env
JWT_SECRET="your-strong-secret-key"
CORS_ORIGINS="https://your-web-domain.com,https://your-admin-domain.com"
TRUST_PROXY=true
```

### 2. 使用 Docker Compose 启动

项目根目录已提供 `docker-compose.yml`：

```bash
cd ..  # 回到项目根目录
docker-compose up -d
```

这将启动：
- **xingtone-server** — 后端 API 服务（端口 3000）
- **nginx** — 反向代理（端口 80/443）

### 3. 初始化数据库

首次启动需要初始化数据库：

```bash
docker-compose exec server npx prisma db push
docker-compose exec server npx prisma db seed
```

### 4. 验证服务

```bash
curl http://localhost:3000/api/health
```

## 手动构建镜像

如果你想自己构建镜像：

### 1. 构建后端镜像

```bash
cd music-server
docker build -t xingtone-server:latest .
```

### 2. 运行容器

```bash
docker run -d \
  --name xingtone-server \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  --env-file .env \
  --restart unless-stopped \
  xingtone-server:latest
```

## Docker Compose 配置参考

### 基础配置

```yaml
version: '3.8'

services:
  server:
    build: ./music-server
    container_name: xingtone-server
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./data/dev.db
      - PORT=3000
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGINS=${CORS_ORIGINS}
      - TRUST_PROXY=true
    volumes:
      - ./music-server/data:/app/data
      - ./music-server/uploads:/app/uploads
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    container_name: xingtone-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d
      - ./nginx/ssl:/etc/nginx/ssl
      - ./nginx/logs:/var/log/nginx
    depends_on:
      - server
```

### 使用外部 Nginx

如果你已有 Nginx，可以只启动后端服务：

```yaml
version: '3.8'

services:
  server:
    build: ./music-server
    container_name: xingtone-server
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - CORS_ORIGINS=${CORS_ORIGINS}
    volumes:
      - ./music-server/data:/app/data
      - ./music-server/uploads:/app/uploads
```

## 数据持久化

以下目录需要持久化以避免数据丢失：

| 目录 | 用途 |
|------|------|
| `/app/data` | SQLite 数据库文件 |
| `/app/uploads` | 用户上传的音频和图片文件 |

确保在 Docker Compose 或 docker run 中正确挂载这两个目录。

## 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose stop

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f server

# 进入容器
docker-compose exec server bash

# 更新代码后重新构建
docker-compose build --no-cache server
docker-compose up -d

# 数据库迁移
docker-compose exec server npx prisma db push
docker-compose exec server npx prisma generate

# 查看容器状态
docker-compose ps
```

## 更新流程

```bash
# 1. 拉取最新代码
git pull

# 2. 备份数据
cp -r music-server/data /tmp/backup-$(date +%Y%m%d)

# 3. 重新构建并启动
docker-compose build --no-cache server
docker-compose up -d

# 4. 同步数据库
docker-compose exec server npx prisma db push

# 5. 验证服务
curl http://localhost:3000/api/health
```

## 常见问题

### 容器启动后立即退出
```bash
# 查看日志
docker-compose logs server

# 常见原因：
# 1. .env 文件缺失或配置错误
# 2. 端口被占用
# 3. 数据目录权限问题
```

### 数据库文件权限问题
```bash
# 修改挂载目录权限
chmod -R 755 music-server/data music-server/uploads

# 或在 docker-compose.yml 中指定 user
user: "1000:1000"
```

### 端口被占用
```bash
# 修改 docker-compose.yml 中的端口映射
ports:
  - "127.0.0.1:3001:3000"  # 改为其他端口
```
