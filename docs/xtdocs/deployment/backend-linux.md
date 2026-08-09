# 后端部署 - Linux/宝塔原生

本文档介绍在 Linux 服务器（含宝塔面板）上原生部署 XingTone Server 的详细步骤。

## 环境要求

- Linux 服务器（推荐 Ubuntu 22.04 / CentOS 7+）
- Node.js 20+
- npm / pnpm
- （可选）Nginx 作为反向代理
- （可选）宝塔面板进行图形化管理

## 标准部署流程

### 1. 安装 Node.js

**Ubuntu / Debian:**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # 验证版本
```

**CentOS / RHEL:**
```bash
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
node --version
```

### 2. 拉取代码

```bash
cd /www/wwwroot  # 或其他部署目录
git clone https://github.com/your-org/XT-Music.git
cd XT-Music/music-server
```

> 如果只部署后端，也可以只下载 music-server 目录。

### 3. 安装依赖

```bash
npm install
# 或使用国内镜像加速
npm install --registry=https://registry.npmmirror.com
```

### 4. 配置环境变量

```bash
cp .env.example .env
nano .env
```

关键配置项：

```env
# 数据库（SQLite 为文件路径，无需端口）
DATABASE_URL="file:./data/dev.db"

# 服务端口
PORT=3000

# JWT 密钥（生产必须替换为随机字符串）
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES="7d"

# 跨域白名单（你的前端域名，逗号分隔）
CORS_ORIGINS="https://your-web-domain.com,https://your-admin-domain.com"

# 生产环境信任代理
TRUST_PROXY=true

# 存储驱动: local / s3 / cos
STORAGE_DRIVER=local
LOCAL_STORAGE_PATH=./uploads

# S3 配置（如使用 S3）
# S3_ENDPOINT=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
# S3_BUCKET=
# S3_REGION=

# 腾讯云 COS 配置（如使用 COS）
# COS_SECRET_ID=
# COS_SECRET_KEY=
# COS_REGION=
# COS_BUCKET=
```

### 5. 初始化数据库

```bash
# 创建数据目录
mkdir -p data uploads

# 生成 Prisma Client
npx prisma generate

# 初始化数据库表结构
npx prisma db push

# 填充种子数据（包含管理员账号 admin/admin123）
npx prisma db seed
```

### 6. 构建并启动服务

**使用 PM2 守护进程（推荐）：**

```bash
# 安装 PM2
npm install -g pm2

# 构建
npm run build

# 启动服务
pm2 start dist/main.js --name xingtone-server

# 设置开机自启
pm2 startup
pm2 save
```

**使用 systemd（备选）：**

创建 `/etc/systemd/system/xingtone-server.service`：

```ini
[Unit]
Description=XingTone Server
After=network.target

[Service]
Type=simple
User=www
WorkingDirectory=/www/wwwroot/XT-Music/music-server
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
sudo systemctl daemon-reload
sudo systemctl enable xingtone-server
sudo systemctl start xingtone-server
sudo systemctl status xingtone-server
```

### 7. 验证服务

```bash
curl http://localhost:3000/api/health
# 应返回 {"code":200,"message":"ok","data":{"status":"ok"}}
```

## 宝塔面板专属优化

### 1. 使用宝塔 Node.js 管理器

1. 登录宝塔面板 → 软件商店 → 安装「Node.js 版本管理器」
2. 打开 Node.js 管理器 → 安装 Node.js 20+
3. 在「项目」中添加项目：
   - 项目目录：`/www/wwwroot/XT-Music/music-server`
   - 启动命令：`node dist/main.js`
   - 项目名称：XingTone Server
   - 端口：3000

### 2. 配置反向代理

宝塔面板 → 网站 → 添加站点 → 配置反向代理：

```
目标URL: http://127.0.0.1:3000
发送域名: $host
```

### 3. 一键申请 SSL 证书

宝塔面板 → 网站 → SSL → Let's Encrypt → 申请。

## Nginx 反向代理配置

如果你手动配置 Nginx：

```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    # SSL 证书
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1024;

    # 请求体大小限制（文件上传）
    client_max_body_size 100M;

    # 反向代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }
}
```

## 部署后验证清单

- [ ] 健康检查接口正常：`curl /api/health`
- [ ] 登录接口正常：`POST /api/auth/login`
- [ ] 前端可正常调用 API（无跨域错误）
- [ ] 文件上传功能正常
- [ ] 数据库数据正确（种子数据已填充）
- [ ] PM2/systemd 守护进程正常
- [ ] Nginx 反向代理正常
- [ ] HTTPS 证书有效
- [ ] 管理员密码已修改

## 常见问题排查

### 服务启动失败
```bash
# 查看 PM2 日志
pm2 logs xingtone-server

# 或查看 systemd 日志
journalctl -u xingtone-server -f
```

### 端口被占用
```bash
# 查找占用端口的进程
lsof -i :3000
netstat -tlnp | grep 3000

# 停止占用进程
kill <PID>
```

### 数据库错误
```bash
# 检查数据库文件是否存在
ls -la data/

# 检查文件权限
chmod -R 755 data/ uploads/

# 重新初始化数据库（会清空数据！）
rm data/dev.db
npx prisma db push
npx prisma db seed
```

### 跨域问题
- 检查 `.env` 中 `CORS_ORIGINS` 是否包含前端域名
- 多个域名用英文逗号分隔
- 修改后需要重启服务

### 上传文件失败
- 检查 `uploads/` 目录权限
- 检查 Nginx `client_max_body_size` 配置
- 检查磁盘空间是否充足
