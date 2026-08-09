# 更新升级指南

本文档详细描述 XT-Music 服务端（music-server）的更新流程，确保每次更新安全、可控、可回滚。

## 更新前准备

### 1. 环境检查

更新前请确认：

- [ ] 当前服务运行正常（`/api/health` 返回正常）
- [ ] Node.js 版本满足要求（20+）
- [ ] 有服务器登录权限和文件读写权限
- [ ] 磁盘剩余空间 > 2GB（用于备份）
- [ ] 已通知用户系统维护时间

### 2. 完整备份

**无论更新大小，必须先备份！**

```bash
# 1. 备份数据库
cd music-server
cp data/dev.db data/dev.db.backup-$(date +%Y%m%d_%H%M%S)

# 2. 备份上传文件
tar -czf uploads-backup-$(date +%Y%m%d_%H%M%S).tar.gz uploads/

# 3. 备份当前代码
cd ..
tar -czf code-backup-$(date +%Y%m%d_%H%M%S).tar.gz XT-Music/
```

> 将备份文件移动到安全位置，不要放在项目目录内。

### 3. 查看更新内容

```bash
# 查看代码变更
git log --oneline -20

# 查看与当前版本的差异
git diff HEAD..origin/main
```

特别关注：
- 是否有数据库结构变更（`prisma/schema.prisma`）
- 是否有环境变量变更（`.env.example`）
- 是否有依赖变更（`package.json`）

## 标准更新流程

### 1. 拉取最新代码

```bash
cd XT-Music
git pull origin main
```

### 2. 更新后端依赖

```bash
cd music-server
npm install
```

> 如果依赖更新较大，建议先删除 `node_modules` 再安装：
> ```bash
> rm -rf node_modules package-lock.json
> npm install
> ```

### 3. 更新环境变量（如有变更）

```bash
# 对比 .env 和 .env.example 的差异
diff .env .env.example

# 如有新增配置，补充到 .env 中
nano .env
```

### 4. 同步数据库结构

```bash
# 生成最新的 Prisma Client
npx prisma generate

# 推送 schema 变更到数据库
npx prisma db push
```

> SQLite 使用 `db push` 而非 `migrate deploy`。

### 5. 数据库迁移详解

#### 新增表或字段

`prisma db push` 会自动：
- 创建新表
- 新增列（带默认值或允许 NULL）

> **注意**：不允许 NULL 且无默认值的字段，`db push` 会失败。需要先设置默认值或允许 NULL，数据填充后再修改。

#### 删除字段

`prisma db push` 会自动删除表和列。

> **警告**：删除字段会导致数据丢失！请确认已备份。

#### 字段重命名

Prisma 无法自动检测字段重命名。步骤：
1. 在 schema 中添加新字段
2. 执行 `db push`
3. 运行数据迁移脚本，将旧字段数据复制到新字段
4. 在 schema 中删除旧字段
5. 再次执行 `db push`

### 6. 构建并重启服务

**PM2 方式：**

```bash
# 构建
npm run build

# 重启服务
pm2 restart xingtone-server

# 查看状态
pm2 status
pm2 logs xingtone-server --lines 50
```

**systemd 方式：**

```bash
npm run build
sudo systemctl restart xingtone-server
sudo systemctl status xingtone-server
journalctl -u xingtone-server -n 50 -f
```

**Docker 方式：**

```bash
cd ..
docker-compose build --no-cache server
docker-compose up -d
docker-compose logs -f server
```

### 7. 更新后验证

更新完成后，请逐项检查：

#### 服务状态
- [ ] 健康检查通过：`curl http://localhost:3000/api/health`
- [ ] 服务日志无报错
- [ ] 进程正常运行

#### 功能验证
- [ ] 用户可正常登录
- [ ] 歌曲列表加载正常
- [ ] 歌曲播放正常
- [ ] 搜索功能正常
- [ ] 个人中心数据正常
- [ ] 管理后台登录正常
- [ ] 文件上传功能正常（如有使用）

#### 数据验证
- [ ] 数据库表结构正确
- [ ] 数据未丢失
- [ ] 新字段数据填充正确（如有）

#### 性能验证
- [ ] 响应时间正常
- [ ] 内存占用正常
- [ ] 无异常错误日志

## 回滚操作

如果更新后出现严重问题，按以下步骤回滚：

### 1. 停止服务

```bash
pm2 stop xingtone-server
# 或
sudo systemctl stop xingtone-server
# 或
docker-compose stop server
```

### 2. 恢复数据库

```bash
cd music-server
# 停止服务后再恢复数据库
cp data/dev.db.backup-YYYYMMDD_HHMMSS data/dev.db
```

### 3. 回退代码

```bash
cd ..
# 回退到上一个 commit
git reset --hard HEAD~1

# 或回退到指定 commit
git reset --hard <commit-hash>
```

### 4. 安装对应版本依赖

```bash
cd music-server
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

### 5. 恢复上传文件（如需要）

```bash
tar -xzf uploads-backup-YYYYMMDD_HHMMSS.tar.gz
```

### 6. 重启服务并验证

```bash
npm run build
pm2 start xingtone-server
# 验证服务正常
```

### 7. 问题排查

回滚后，请记录以下信息用于排查：
- 错误日志
- 问题出现的时间点
- 影响范围
- 已尝试的解决方案

## 配置文件更新

有时更新会涉及配置文件变更，以下是常见情况：

### 新增环境变量

1. 查看 `.env.example` 中新增了哪些变量
2. 在 `.env` 中添加这些变量
3. 填写合适的值
4. 重启服务

### 修改已有变量

1. 备份当前 `.env`
2. 修改需要变更的变量
3. 重启服务
4. 验证功能正常

### 切换存储驱动

```env
# 本地存储
STORAGE_DRIVER=local

# S3 兼容存储
STORAGE_DRIVER=s3
S3_ENDPOINT=https://your-s3-endpoint
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_BUCKET=your-bucket
S3_REGION=auto

# 腾讯云 COS
STORAGE_DRIVER=cos
COS_SECRET_ID=your-secret-id
COS_SECRET_KEY=your-secret-key
COS_REGION=ap-guangzhou
COS_BUCKET=your-bucket-1234567890
```

> `DynamicStorageService` 支持动态检测配置变更，无需重启服务即可生效。

## 常见问题与解决方案

### 1. `prisma db push` 失败

**原因**：可能是数据不兼容或字段约束冲突。

**解决方案**：
```bash
# 查看详细错误
npx prisma db push --skip-generate

# 如果是新增必填字段，先允许 NULL
# 填充数据后再改为 NOT NULL
```

### 2. 服务启动后报 500 错误

**排查步骤**：
```bash
# 查看日志
pm2 logs xingtone-server --lines 100
# 或
journalctl -u xingtone-server -n 100
```

**常见原因**：
- 环境变量缺失 → 补充 `.env` 配置
- 数据库连接失败 → 检查数据库文件路径和权限
- 依赖未安装 → 重新执行 `npm install`

### 3. 更新后前端无法调用 API

**原因**：通常是跨域配置问题。

**解决方案**：
- 检查 `CORS_ORIGINS` 是否包含前端域名
- 多个域名用英文逗号分隔
- 修改后重启服务

### 4. 静态资源 404

**原因**：构建产物未更新或路径错误。

**解决方案**：
```bash
# 清理旧的构建产物
rm -rf dist

# 重新构建
npm run build

# 重启服务
pm2 restart xingtone-server
```

### 5. Prisma Client 报错

**原因**：Prisma Client 未根据最新 schema 生成。

**解决方案**：
```bash
npx prisma generate
# 然后重启服务
```

## 大版本升级特别说明

如果是跨越多个版本的升级，建议：

1. 逐个版本升级，不要跳跃
2. 每个版本升级后都进行完整验证
3. 如遇到数据库结构变更较多，建议：
   - 在测试环境先演练一遍
   - 准备好数据库迁移脚本
   - 预留充足的维护时间

## 更新后清理

验证一切正常后，可以清理旧文件：

```bash
# 删除旧备份（确认不再需要后）
# rm data/dev.db.backup-*
# rm uploads-backup-*.tar.gz

# 清理 npm 缓存
npm cache clean --force
```
