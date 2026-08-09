# 安全加固指南

本文档提供 XT-Music 项目的安全加固建议，保护系统免受常见安全威胁。

## 1. 账号与密码安全

### 修改默认密码

**必须在首次部署后立即修改！**

- 管理员默认账号：`admin` / `admin123`
- JWT 密钥必须修改为高强度随机字符串

生成高强度随机密钥：

```bash
# Linux
openssl rand -hex 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 密码策略

- 管理员密码长度至少 12 位
- 包含大小写字母、数字、特殊字符
- 定期更换密码（建议每 90 天）
- 不要在多个系统使用相同密码

### 用户权限控制

- 遵循最小权限原则
- 只授予必要的管理权限
- 定期审查管理员账号列表
- 及时删除不再使用的账号

## 2. 网络与传输安全

### 强制 HTTPS

生产环境必须启用 HTTPS：

**Nginx 配置：**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    # SSL 配置...
}
```

**宝塔面板：**
- 站点设置 → SSL → 申请 Let's Encrypt 证书
- 勾选「强制 HTTPS」

### SSL/TLS 配置优化

```nginx
# 使用现代 TLS 协议
ssl_protocols TLSv1.2 TLSv1.3;

# 使用安全的加密套件
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;

# SSL 会话缓存
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# HSTS（启用后用户浏览器将强制使用 HTTPS）
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

使用 [SSL Labs Server Test](https://www.ssllabs.com/ssltest/) 检测 SSL 配置。

### 安全响应头

在 Nginx 或后端服务中添加：

```nginx
# 点击劫持防护
add_header X-Frame-Options "SAMEORIGIN" always;

# MIME 类型嗅探防护
add_header X-Content-Type-Options "nosniff" always;

# XSS 防护
add_header X-XSS-Protection "1; mode=block" always;

# 内容安全策略（根据实际情况调整）
add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'" always;

# 引用策略
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

## 3. 防火墙与端口安全

### 只开放必要端口

| 端口 | 用途 | 是否必须对外开放 |
|------|------|----------------|
| 22 | SSH | 建议限制 IP |
| 80 | HTTP | 是 |
| 443 | HTTPS | 是 |
| 3000 | 后端 API | 否（使用 Nginx 反向代理） |

### Linux 防火墙配置

**使用 ufw（Ubuntu）：**
```bash
# 启用防火墙
ufw enable

# 允许 SSH（建议限制 IP）
ufw allow from 192.168.1.0/24 to any port 22

# 允许 HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 查看状态
ufw status
```

**使用 iptables：**
```bash
# 允许已建立的连接
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 允许 SSH（限制 IP）
iptables -A INPUT -p tcp -s 192.168.1.0/24 --dport 22 -j ACCEPT

# 允许 HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# 默认拒绝
iptables -P INPUT DROP
```

### SSH 安全加固

编辑 `/etc/ssh/sshd_config`：

```ssh
# 修改默认端口（可选，避免暴力扫描）
Port 2222

# 禁止 root 直接登录
PermitRootLogin no

# 禁用密码登录（使用密钥登录）
PasswordAuthentication no

# 允许的用户
AllowUsers deploy

# 登录重试次数
MaxAuthTries 3

# 空闲超时
ClientAliveInterval 300
ClientAliveCountMax 2
```

重启 SSH 服务：
```bash
sudo systemctl restart sshd
```

## 4. 数据库安全

### SQLite 安全

虽然 SQLite 没有用户权限系统，但仍需注意：

1. **文件权限**
   ```bash
   chmod 600 data/dev.db
   chown www:www data/dev.db
   ```

2. **防止下载**
   确保 Nginx 不会将 .db 文件当作静态文件返回：
   ```nginx
   location ~ \.db$ {
       deny all;
   }
   ```

3. **定期备份**
   参考 [备份与恢复](backup-recovery.md)

4. **敏感数据加密**
   用户密码已使用 bcrypt 加密存储。如有其他敏感数据，建议额外加密。

### 数据库访问控制

- 不要将数据库文件放在 Web 可访问目录
- 确保只有后端服务进程能读写数据库
- 数据库操作使用参数化查询（Prisma 已自动处理）

## 5. API 安全

### 认证与授权

- JWT Token 设置合理的过期时间（默认 7 天）
- 敏感操作（修改密码、删除数据）要求重新验证密码
- 管理后台接口必须验证 ADMIN 角色

### 速率限制

建议在 Nginx 层添加速率限制：

```nginx
# 定义限流区域
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;

server {
    location /api/ {
        # 应用限流
        limit_req zone=api burst=200 nodelay;
        
        proxy_pass http://127.0.0.1:3000;
    }
}
```

### 输入验证

- 所有 API 输入已使用 class-validator 验证
- 文件上传验证文件类型和大小
- 搜索输入进行长度限制

### CORS 配置

只允许必要的域名：

```env
# 不要使用 *
CORS_ORIGINS=https://your-web-domain.com,https://your-admin-domain.com
```

## 6. 文件上传安全

### 文件类型限制

后端已限制上传文件类型：
- 音频：mp3, wav, flac, ogg, m4a, aac
- 图片：jpg, jpeg, png, gif, webp
- 歌词：lrc, txt

### 文件大小限制

- Nginx 配置：`client_max_body_size 100M;`
- 后端配置：上传中间件限制

### 文件名处理

- 后端自动重命名上传文件，防止路径遍历攻击
- 文件名使用 UUID + 原始扩展名

### 防止执行权限

```bash
# 上传目录禁止执行脚本
chmod -R 755 uploads/
chmod -R -x+X uploads/
```

Nginx 配置：
```nginx
location /uploads/ {
    # 禁止执行脚本
    location ~ \.(php|jsp|asp|sh|pl)$ {
        deny all;
    }
}
```

## 7. 日志与审计

### 操作日志

系统已记录以下操作日志：
- 管理员登录/登出
- 数据增删改操作
- 系统设置变更
- 用户管理操作

### 访问日志

Nginx 访问日志：
```nginx
access_log /var/log/nginx/xingtone-access.log;
error_log /var/log/nginx/xingtone-error.log;
```

### 日志分析

定期检查：
- 异常登录尝试
- 大量 4xx/5xx 错误
- 异常大流量请求
- 可疑 User-Agent

## 8. 依赖安全

### 定期更新依赖

```bash
# 检查过时的依赖
npm outdated

# 检查安全漏洞
npm audit

# 修复安全漏洞
npm audit fix
```

### 使用 Docker 官方镜像

- 使用官方 Node.js 镜像
- 定期更新基础镜像
- 不要在镜像中包含敏感信息

## 9. 备份与灾难恢复

参考 [备份与恢复](backup-recovery.md)：

- 每日自动备份
- 异地备份
- 定期备份恢复演练

## 10. 安全检查清单

部署前请确认：

- [ ] 已修改管理员默认密码
- [ ] 已更换 JWT_SECRET 为随机字符串
- [ ] 已启用 HTTPS 并强制跳转
- [ ] 已配置防火墙，只开放必要端口
- [ ] SSH 已禁用 root 登录和密码登录
- [ ] 数据库文件权限已设置为 600
- [ ] 上传目录已禁止执行脚本
- [ ] CORS 已配置为指定域名而非 *
- [ ] 已配置自动备份
- [ ] 已配置日志轮转
- [ ] 依赖已更新到最新安全版本

## 安全事件响应

如遇安全事件：

1. **立即响应**
   - 隔离受影响的系统
   - 保留证据（日志、快照）
   - 不要尝试自行修复（可能破坏证据）

2. **评估影响**
   - 确认哪些数据可能泄露
   - 确认哪些服务受影响
   - 评估对用户的影响

3. **修复与恢复**
   - 修复安全漏洞
   - 从备份恢复数据
   - 重置所有可能泄露的凭证

4. **事后总结**
   - 记录事件时间线
   - 分析根本原因
   - 制定预防措施
   - 更新安全策略
