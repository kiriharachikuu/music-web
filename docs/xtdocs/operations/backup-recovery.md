# 备份与恢复

本文档详细描述 XT-Music 项目的数据备份与恢复方案。

## 需要备份的数据

| 数据类型 | 位置 | 备份频率 | 保留时间 |
|----------|------|---------|---------|
| SQLite 数据库 | `music-server/prisma/dev.db` | 每日 | 30 天 |
| 上传文件 | `music-server/uploads/` | 每日 | 30 天 |
| 配置文件 | `music-server/.env` | 变更时 | 永久 |
| Nginx 配置 | `/etc/nginx/` | 变更时 | 永久 |
| 项目代码 | Git 仓库 | - | - |

## 手动备份

### 备份数据库

```bash
cd music-server

# 方法一：直接复制（简单快速）
cp prisma/dev.db prisma/dev.db.backup-$(date +%Y%m%d_%H%M%S)

# 方法二：使用 SQLite 备份命令（更安全）
sqlite3 prisma/dev.db ".backup prisma/dev.db.backup-$(date +%Y%m%d_%H%M%S)"

# 方法三：导出为 SQL（跨版本兼容）
sqlite3 prisma/dev.db ".dump" > prisma/dev.db.backup-$(date +%Y%m%d_%H%M%S).sql
```

### 备份上传文件

```bash
cd music-server

# 打包压缩
tar -czf uploads-backup-$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# 查看备份内容
tar -tzf uploads-backup-*.tar.gz
```

### 备份配置文件

```bash
# 备份环境变量
cp music-server/.env backups/env.backup-$(date +%Y%m%d)

# 备份 Nginx 配置
tar -czf nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx/
```

## 自动备份脚本

### Linux Shell 脚本

创建 `/opt/scripts/backup-xingtone.sh`：

```bash
#!/bin/bash

# 配置
BACKUP_DIR="/www/backup/xingtone"
DATE=$(date +%Y%m%d_%H%M%S)
DAY=$(date +%Y%m%d)
PROJECT_DIR="/www/wwwroot/XT-Music"
SERVER_DIR="$PROJECT_DIR/music-server"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR/$DAY

echo "[$(date)] 开始备份..."

# 1. 备份数据库
if [ -f "$SERVER_DIR/prisma/dev.db" ]; then
    sqlite3 $SERVER_DIR/prisma/dev.db ".backup $BACKUP_DIR/$DAY/dev_$DATE.db"
    echo "[$(date)] 数据库备份完成: dev_$DATE.db"
else
    echo "[$(date)] 警告: 数据库文件不存在"
fi

# 2. 备份上传文件
if [ -d "$SERVER_DIR/uploads" ]; then
    tar -czf $BACKUP_DIR/$DAY/uploads_$DATE.tar.gz -C $SERVER_DIR uploads
    echo "[$(date)] 上传文件备份完成: uploads_$DATE.tar.gz"
fi

# 3. 备份配置文件
if [ -f "$SERVER_DIR/.env" ]; then
    cp $SERVER_DIR/.env $BACKUP_DIR/$DAY/env_$DATE
    echo "[$(date)] 配置文件备份完成: env_$DATE"
fi

# 4. 清理过期备份
find $BACKUP_DIR -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
echo "[$(date)] 已清理 $RETENTION_DAYS 天前的备份"

# 5. 计算备份大小
BACKUP_SIZE=$(du -sh $BACKUP_DIR/$DAY | cut -f1)
echo "[$(date)] 本次备份大小: $BACKUP_SIZE"
echo "[$(date)] 备份完成"
```

### 设置执行权限

```bash
chmod +x /opt/scripts/backup-xingtone.sh
```

### 添加定时任务

```bash
crontab -e
```

添加以下行（每天凌晨 3 点执行）：

```
0 3 * * * /opt/scripts/backup-xingtone.sh >> /var/log/xingtone-backup.log 2>&1
```

## 恢复流程

### 1. 停止服务

恢复数据前必须先停止服务：

```bash
# PM2
pm2 stop xingtone-server

# systemd
sudo systemctl stop xingtone-server

# Docker
docker-compose stop server
```

### 2. 恢复数据库

```bash
cd music-server

# 方法一：从 db 文件恢复
cp prisma/dev.db.backup-YYYYMMDD_HHMMSS prisma/dev.db

# 方法二：从 SQL 文件恢复
sqlite3 prisma/dev.db < prisma/dev.db.backup-YYYYMMDD_HHMMSS.sql
```

### 3. 恢复上传文件

```bash
cd music-server
tar -xzf uploads-backup-YYYYMMDD_HHMMSS.tar.gz
```

### 4. 恢复配置文件

```bash
cp env.backup-YYYYMMDD .env
```

### 5. 修复文件权限

```bash
chmod -R 755 prisma/ uploads/
chmod 644 .env
```

### 6. 重启服务

```bash
# PM2
pm2 start xingtone-server

# systemd
sudo systemctl start xingtone-server

# Docker
docker-compose start server
```

### 7. 验证恢复

```bash
# 检查服务状态
curl http://localhost:3000/api/health

# 检查数据
# 登录系统，验证歌曲、用户、歌单等数据是否正常
```

## 备份存储建议

### 本地 + 异地双备份

- **本地备份**：保存在服务器本地磁盘（快速恢复）
- **异地备份**：同步到云存储或其他服务器（防止服务器故障）

### 云存储同步

使用 rclone 同步到云存储：

```bash
# 安装 rclone
curl https://rclone.org/install.sh | sudo bash

# 配置云存储（阿里云 OSS / 腾讯云 COS / S3 等）
rclone config

# 同步备份
rclone sync /www/backup/xingtone oss:your-bucket/xingtone-backup
```

添加到定时任务：

```
0 4 * * * rclone sync /www/backup/xingtone oss:your-bucket/xingtone-backup >> /var/log/xingtone-backup-sync.log 2>&1
```

## 备份验证

定期验证备份的有效性（建议每月一次）：

1. 选择一个最近的备份
2. 在测试环境中恢复
3. 验证以下内容：
   - [ ] 服务能正常启动
   - [ ] 数据库连接正常
   - [ ] 用户数据完整
   - [ ] 歌曲数据完整
   - [ ] 上传的文件可访问
   - [ ] 登录功能正常
   - [ ] 播放功能正常

## 灾难恢复预案

### 场景一：服务器完全损坏

1. 购买新服务器
2. 安装必要软件（Node.js、Nginx 等）
3. 从异地备份下载最新备份
4. 按恢复流程恢复数据
5. 配置 DNS 解析到新服务器
6. 验证所有功能正常

### 场景二：数据误删除

1. 立即停止写入（停止服务）
2. 从最近的备份恢复
3. 验证数据完整性
4. 重启服务

### 场景三：数据库损坏

1. 停止服务
2. 尝试使用 SQLite 修复：
   ```bash
sqlite3 prisma/dev.db ".recover" | sqlite3 prisma/dev.db.recovered
mv prisma/dev.db.recovered prisma/dev.db
```
3. 如修复失败，从备份恢复

## 常见问题

### 备份文件太大怎么办？

- 启用增量备份（只备份变更的文件）
- 清理不必要的上传文件
- 使用更高压缩率：`tar -czf` → `tar -cJf`（xz 压缩，更慢但更小）

### SQLite 备份时数据库被锁定？

- 建议在低峰期备份
- 使用 `sqlite3 .backup` 命令，支持热备份
- 如仍有问题，可先复制 db 文件再备份

### 如何验证备份文件完整性？

```bash
# 计算 MD5
md5sum prisma/dev.db

# 备份后对比 MD5
md5sum prisma/dev.db.backup
```

### 备份文件需要加密吗？

如果数据敏感，建议加密：

```bash
# 加密备份
openssl enc -aes-256-cbc -salt -in backup.tar.gz -out backup.tar.gz.enc

# 解密恢复
openssl enc -d -aes-256-cbc -in backup.tar.gz.enc -out backup.tar.gz
```
