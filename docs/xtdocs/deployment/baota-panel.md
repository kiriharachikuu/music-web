# 宝塔面板专属优化

本文档针对使用宝塔面板管理服务器的用户，提供专属的部署优化建议。

## 前期准备

### 1. 安装必要软件

登录宝塔面板 → 软件商店，安装以下软件：

- **Nginx** — Web 服务器 / 反向代理
- **Node.js 版本管理器** — 管理 Node.js 版本
- **PM2 管理器** — Node.js 进程守护（可选，也可用命令行）
- **Redis** — 缓存（可选，未来扩展）

### 2. 安装 Node.js

打开「Node.js 版本管理器」→ 安装 Node.js 20.x 版本。

## 部署后端服务

### 方法一：使用宝塔 Node 项目管理器

1. **上传代码**
   - 宝塔面板 → 文件 → 进入 `/www/wwwroot/`
   - 上传或 Git 克隆 XT-Music 项目

2. **安装依赖**
   ```bash
   cd /www/wwwroot/XT-Music/music-server
   npm install --registry=https://registry.npmmirror.com
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件
   ```

4. **初始化数据库**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

5. **构建项目**
   ```bash
   npm run build
   ```

6. **添加 Node 项目**
   - 宝塔面板 → 软件商店 → Node.js 版本管理器 → 设置 → 项目管理
   - 添加项目：
     - 项目目录：`/www/wwwroot/XT-Music/music-server`
     - 启动命令：`node dist/main.js`
     - 项目名称：XingTone Server
     - 端口：3000
   - 启动项目

### 方法二：使用 PM2 命令行

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
cd /www/wwwroot/XT-Music/music-server
pm2 start dist/main.js --name xingtone-server

# 设置开机自启
pm2 startup
pm2 save
```

## 配置反向代理

### 1. 添加站点

宝塔面板 → 网站 → 添加站点：
- 域名：`api.your-domain.com`
- 根目录：`/www/wwwroot/XT-Music/music-server`（任意即可，不会用到）
- PHP版本：纯静态

### 2. 配置反向代理

站点设置 → 反向代理 → 添加反向代理：
- 代理名称：XingTone API
- 目标URL：`http://127.0.0.1:3000`
- 发送域名：`$host`

### 3. 高级配置（可选）

在站点设置 → 配置文件中添加：

```nginx
# 请求体大小限制（文件上传）
client_max_body_size 100M;

# Gzip 压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
gzip_min_length 1024;

# 超时设置
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
```

## 申请 SSL 证书

### 1. Let's Encrypt 免费证书

站点设置 → SSL → Let's Encrypt：
- 勾选域名
- 勾选「自动续签」
- 点击申请

### 2. 强制 HTTPS

申请成功后，勾选「强制 HTTPS」。

## 前端部署

### 方法一：反向代理到 Node 服务

如果你使用 Next.js 的 Node.js 运行时：

1. **添加 Node 项目**（同后端方式）
2. **配置反向代理**到 3001 端口

### 方法二：静态部署

1. **构建静态文件**
   ```bash
   cd /www/wwwroot/XT-Music/music-web
   npm install
   npm run build
   npm run export
   ```

2. **创建站点**
   - 宝塔面板 → 网站 → 添加站点
   - 根目录：`/www/wwwroot/XT-Music/music-web/out`
   - 申请 SSL 证书

3. **配置伪静态**
   站点设置 → 伪静态：
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

## 性能优化

### 1. 安装 OPcache（如使用 PHP）

软件商店 → 对应 PHP 版本 → 设置 → 安装扩展 → OPcache

### 2. 开启内存缓存

软件商店 → 安装 Redis → 启动

### 3. Nginx 配置优化

站点设置 → 配置文件：

```nginx
# 开启文件缓存
open_file_cache max=1000 inactive=20s;
open_file_cache_valid 30s;
open_file_cache_min_uses 2;
open_file_cache_errors on;

# 静态资源缓存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 4. PHP 禁用函数（安全）

软件商店 → PHP 版本 → 设置 → 禁用函数：
- 建议保留：putenv、proc_open、pcntl_signal、pcntl_alarm（Node 项目可能需要）

## 安全加固

### 1. 修改宝塔默认端口

面板设置 → 安全 → 修改面板端口（如改为 8888 之外的端口）

### 2. 启用 SSL 登录面板

面板设置 → SSL 证书 → 启用 HTTPS

### 3. 配置防火墙

面板设置 → 安全 → 仅开放必要端口：
- 80（HTTP）
- 443（HTTPS）
- 22（SSH，建议修改）
- 宝塔面板端口

### 4. 防暴力破解

面板设置 → 安全 → 登录限制：
- 开启登录失败封禁
- 设置合理的尝试次数

## 备份策略

### 1. 自动备份计划任务

宝塔面板 → 计划任务 → 添加任务：

**任务类型：备份网站**
- 执行周期：每天
- 备份网站：选中所有站点
- 保留份数：30

**任务类型：备份数据库**（如果使用外部数据库）
- 执行周期：每天
- 保留份数：30

### 2. SQLite 数据库备份

由于我们使用 SQLite，需要单独备份：

添加计划任务：
- 任务类型：Shell 脚本
- 执行周期：每天凌晨 3 点
- 脚本内容：
```bash
#!/bin/bash
BACKUP_DIR="/www/backup/sqlite"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# 备份数据库
cp /www/wwwroot/XT-Music/music-server/data/dev.db $BACKUP_DIR/dev_$DATE.db

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /www/wwwroot/XT-Music/music-server/uploads

# 保留最近 30 天
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### 3. 云端备份（推荐）

配置宝塔面板的「云存储」功能，将备份自动同步到：
- 阿里云 OSS
- 腾讯云 COS
- 七牛云
- FTP

## 监控告警

### 1. 宝塔监控

面板设置 → 监控 → 开启系统监控：
- CPU 使用率
- 内存使用率
- 磁盘使用率
- 网络流量

### 2. 站点监控

宝塔面板 → 监控 → 添加监控：
- 监控地址：`https://api.your-domain.com/api/health`
- 监控频率：1 分钟
- 告警方式：邮箱 / 微信 / 钉钉

### 3. 磁盘空间告警

添加计划任务：
- 任务类型：Shell 脚本
- 执行周期：每小时
- 脚本内容：
```bash
#!/bin/bash
THRESHOLD=80
USAGE=$(df / | grep / | awk '{print $5}' | sed 's/%//g')

if [ $USAGE -gt $THRESHOLD ]; then
    echo "磁盘空间告警：已使用 ${USAGE}%"
    # 可集成邮件/短信告警
fi
```

## 常见问题

### 网站无法访问
- 检查 Nginx 是否启动
- 检查防火墙是否开放 80/443 端口
- 检查域名 DNS 解析是否正确

### Node 项目无法启动
- 检查 Node.js 版本是否正确
- 检查端口是否被占用
- 查看项目日志：`pm2 logs xingtone-server`

### 上传文件失败
- 检查 `uploads/` 目录权限
- 检查 Nginx `client_max_body_size` 配置
- 检查 PHP 禁用函数中 `putenv` 是否被禁用

### 数据库损坏
- 使用 SQLite 命令修复：`sqlite3 dev.db ".recover" | sqlite3 recovered.db`
- 从备份中恢复
