# 前端部署

本文档介绍 XingTone Web 和 XingTone Admin 前端项目的部署方案。

## 推荐方案：Vercel 部署

Vercel 是 Next.js 官方推荐的部署平台，提供零配置部署、自动 HTTPS、全球 CDN 等特性。

### 部署步骤

1. **登录 Vercel**
   访问 [vercel.com](https://vercel.com)，使用 GitHub 账号登录。

2. **导入项目**
   - 点击「New Project」
   - 选择你的 Git 仓库
   - 在「Framework Preset」中会自动识别为 Next.js

3. **配置项目**
   - **Root Directory**: 设置为 `music-web`（或 `music-admin`）
   - **Build Command**: 自动填充为 `next build`
   - **Output Directory**: 自动填充为 `.next`

4. **配置环境变量**
   在「Settings → Environment Variables」中添加：

   **music-web 需要：**
   ```
   NEXT_PUBLIC_API_BASE=https://your-api-domain.com/api
   NEXT_PUBLIC_ADMIN_URL=https://your-admin-domain.com
   ```

   **music-admin 需要：**
   ```
   NEXT_PUBLIC_API_BASE=https://your-api-domain.com/api
   ```

5. **点击 Deploy**
   等待部署完成，Vercel 会分配一个 `*.vercel.app` 子域名。

6. **绑定自定义域名（可选）**
   - 在「Settings → Domains」中添加你的域名
   - 按照提示配置 DNS 解析
   - Vercel 会自动申请 HTTPS 证书

### 自动部署

每次 push 到 main/master 分支会自动触发部署。Pull Request 会自动创建预览部署。

## 方案二：Docker 部署

### 构建镜像

```bash
cd music-web
docker build -t xingtone-web .
```

### 运行容器

```bash
docker run -d \
  --name xingtone-web \
  -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE=https://your-api-domain.com/api \
  -e NEXT_PUBLIC_ADMIN_URL=https://your-admin-domain.com \
  xingtone-web
```

### 使用 Docker Compose

```yaml
version: '3.8'
services:
  web:
    build: ./music-web
    ports:
      - "3001:3000"
    environment:
      - NEXT_PUBLIC_API_BASE=https://your-api-domain.com/api
      - NEXT_PUBLIC_ADMIN_URL=https://your-admin-domain.com
    restart: unless-stopped
```

## 方案三：Nginx 静态托管（不推荐）

Next.js 推荐使用 Node.js 运行时以获得最佳性能（SSR/ISR）。本项目使用 next-pwa 实现了 PWA 能力，需要在 Node 运行时中处理 Service Worker 注册，**不建议静态导出**。如确需纯静态部署，请改用 Next.js 静态导出（`next.config.mjs` 中添加 `output: 'export'`），但部分依赖 SSR 的页面（如 `/about/changelog` 拉取平台 changelog）将无法工作。

### 1. 改用 Node 运行时（推荐）

```bash
cd music-web
npm install
npm run build
npm run start
# 默认监听 0.0.0.0:3000
```

### 2. Nginx 反向代理（推荐）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1024;

    # 反向代理到 Node 运行时
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 环境变量说明

### music-web

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_API_BASE` | 是 | 后端 API 基址，如 `https://api.example.com/api` |
| `NEXT_PUBLIC_ADMIN_URL` | 是 | 管理后台地址，如 `https://admin.example.com` |

### music-admin

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `NEXT_PUBLIC_API_BASE` | 是 | 后端 API 基址 |

> **重要**：`NEXT_PUBLIC_` 前缀的变量会在构建时内联到客户端代码。修改后需要重新构建才能生效。

## 部署后验证

1. **检查页面可访问**
   ```bash
   curl -I https://your-domain.com
   # 应返回 200 OK
   ```

2. **检查 API 调用**
   打开浏览器开发者工具 → Network，确认 API 请求返回正常。

3. **检查登录功能**
   尝试登录，确认 JWT Token 正常存储。

4. **检查 PWA 功能**
   - 在 Chrome 中打开，地址栏应出现安装图标
   - 安装后应以 standalone 模式打开

## 常见问题

### 构建时环境变量未生效
- `NEXT_PUBLIC_` 变量必须在构建时设置
- Vercel 上修改环境变量后需要重新部署
- 本地开发时 `.env.local` 文件即可

### API 请求 404
- 检查 `NEXT_PUBLIC_API_BASE` 是否正确
- 确保后端服务正常运行
- 检查跨域配置

### 页面刷新 404
- 如果使用静态托管，需要配置 Nginx 的 try_files
- 如果使用 Node.js 运行时，Next.js 会自动处理
