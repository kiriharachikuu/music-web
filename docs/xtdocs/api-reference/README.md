# API 参考文档

本文档提供 XingTone 后端 API 的完整参考，包括接口说明、请求参数、响应格式及使用案例，方便开发者快速接入。

> 所有接口均基于 NestJS 实现，全局路由前缀为 `/api`，响应统一由 `TransformInterceptor` 包装。

## 概述

### BaseURL

```
# 生产环境
https://your-api-domain.com/api

# 本地开发
http://localhost:3000/api
```

### 统一响应格式

所有成功响应统一返回：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | number | HTTP 状态码，成功为 200 |
| `message` | string | 描述信息，成功固定为 `success` |
| `data` | any | 响应数据（对象 / 数组 / 分页结构） |

> `code` 取自实际 HTTP 状态码（由响应拦截器从 `response.statusCode` 读取），而非业务自定义码。

### 鉴权方式

使用 JWT Bearer Token，登录后通过请求头携带：

```http
Authorization: Bearer <your-token>
```

登录接口返回 Token 与用户信息：

```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": { "id": "clxxx", "username": "admin", "role": "ADMIN" }
  },
  "message": "success"
}
```

### 角色权限

| 角色 | 说明 |
|------|------|
| `USER` | 普通用户 |
| `EDITOR` | 编辑（可管理歌曲/专辑等内容） |
| `ADMIN` | 管理员（全部权限） |

使用 `@Roles('ADMIN')` / `@Roles('ADMIN', 'EDITOR')` 装饰器限制接口访问，由 `RolesGuard` 校验。

### 分页结构

列表接口统一使用以下分页参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | number | 1 | 页码 |
| `pageSize` | number | 20 | 每页数量（部分接口也接受 `limit`） |

> 接口同时兼容 `limit` 与 `pageSize` 两种参数名，`pageSize` 优先级更高。

**响应示例：**

```json
{
  "code": 200,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "message": "success"
}
```

### 错误处理

错误响应由全局异常过滤器输出，格式为 `{ code, message, data: null }`：

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误（校验失败等） |
| 401 | 未认证 / Token 无效或已过期 |
| 403 | 无权限（角色不足） |
| 404 | 资源不存在 |
| 429 | 请求过于频繁（触发限流） |
| 500 | 服务器内部错误 |

前端处理建议：
- `401`：清除 Token，跳转登录页
- `403`：提示无权限
- `404`：提示资源不存在
- `429`：提示操作过于频繁，稍后再试

## 数据模型

> 以下模型字段基于 Prisma Schema 定义，接口返回可能包含部分冗余字段。

### 枚举

```typescript
enum Role { USER, ADMIN, EDITOR }
enum SongStatus { PUBLISHED, DRAFT }
enum BannerStatus { VISIBLE, HIDDEN }
enum QualityLevel { HIGH, MEDIUM, LOW }
```

### User

```json
{
  "id": "string (cuid)",
  "username": "string",
  "email": "string",
  "avatar": "string | null",
  "role": "USER | ADMIN | EDITOR",
  "createdAt": "ISO 8601",
  "updatedAt": "ISO 8601",
  "lastLoginAt": "ISO 8601 | null",
  "loginCount": "number"
}
```

### Song

```json
{
  "id": "string (cuid)",
  "title": "string",
  "artist": "string",
  "albumId": "string | null",
  "duration": "number (秒)",
  "fileUrl": "string",
  "coverUrl": "string | null",
  "lyricUrl": "string | null",
  "lyricContent": "string | null (LRC 文本)",
  "releaseDate": "ISO 8601",
  "plays": "number",
  "favoriteCount": "number",
  "status": "PUBLISHED | DRAFT",
  "createdAt": "ISO 8601"
}
```

### Album

```json
{
  "id": "string",
  "name": "string",
  "artist": "string",
  "cover": "string | null",
  "description": "string | null",
  "releaseDate": "ISO 8601",
  "songCount": "number",
  "createdAt": "ISO 8601"
}
```

### Artist

```json
{
  "id": "string",
  "name": "string",
  "avatar": "string | null",
  "bio": "string | null",
  "representativeWorks": "string | null",
  "createdAt": "ISO 8601"
}
```

### Playlist

```json
{
  "id": "string",
  "name": "string",
  "cover": "string | null",
  "description": "string | null",
  "userId": "string",
  "isPublic": "boolean",
  "isSystem": "boolean (官方运营歌单)",
  "playCount": "number",
  "createdAt": "ISO 8601"
}
```

### Banner

```json
{
  "id": "string",
  "title": "string",
  "imageUrl": "string",
  "linkUrl": "string | null (内部跳转路径)",
  "songId": "string | null (点击播放该歌曲，优先级最高)",
  "adUrl": "string | null (广告外链)",
  "sort": "number",
  "status": "VISIBLE | HIDDEN"
}
```

### LiveSession（直播场次合集）

```json
{
  "id": "string",
  "title": "string",
  "artist": "string",
  "cover": "string | null",
  "description": "string | null",
  "liveTime": "ISO 8601",
  "sessionNumber": "number | null",
  "songCount": "number",
  "status": "PUBLISHED | DRAFT",
  "createdAt": "ISO 8601"
}
```

### LiveClip（直播歌切）

```json
{
  "id": "string",
  "title": "string",
  "artist": "string",
  "sessionId": "string",
  "trackIndex": "number",
  "duration": "number (秒)",
  "fileUrl": "string",
  "coverUrl": "string | null",
  "lyricContent": "string | null",
  "status": "PUBLISHED | DRAFT",
  "createdAt": "ISO 8601"
}
```

### AppVersion

```json
{
  "id": "string",
  "versionCode": "number",
  "versionName": "string",
  "title": "string | null",
  "content": "string | null (更新内容 JSON 数组字符串)",
  "downloadUrl": "string",
  "fileSize": "number (字节)",
  "md5": "string | null",
  "forceUpdate": "boolean",
  "minVersionCode": "number",
  "channel": "stable | beta",
  "platform": "android | ios | desktop",
  "status": "draft | published | deprecated",
  "downloadCount": "number",
  "createdAt": "ISO 8601"
}
```

---

## 接口分组

### 认证模块

#### POST /auth/register

用户注册（限流：60 秒最多 5 次）。

**请求体：**

```json
{
  "username": "string (非空)",
  "email": "string (合法邮箱)",
  "password": "string (6-72 位，须同时包含字母和数字)"
}
```

**响应 data：** 新创建的 User 信息。

#### POST /auth/login

用户登录（限流：60 秒最多 5 次）。

**请求体：**

```json
{
  "account": "string (用户名或邮箱)",
  "password": "string"
}
```

**响应 data：**

```json
{
  "token": "string",
  "user": "User"
}
```

**使用案例：**

```bash
# 注册
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"tony","email":"tony@example.com","password":"tony123"}'

# 登录
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"account":"tony","password":"tony123"}'
```

```javascript
// JavaScript：登录并缓存 Token
async function login(account, password) {
  const res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account, password }),
  });
  const json = await res.json();
  if (json.code === 200) {
    localStorage.setItem('token', json.data.token);
    return json.data.user;
  }
  throw new Error(json.message);
}
```

---

### 用户模块（全部需 JWT 鉴权）

#### 个人资料

##### GET /user/profile

获取当前登录用户信息。

##### PATCH /user/profile

更新用户资料（昵称 / 头像 URL）。

```json
{
  "username": "string (可选)",
  "avatar": "string (可选)"
}
```

##### POST /user/password

修改密码（限流：60 秒最多 3 次）。校验当前密码后写入新密码，更新 `passwordUpdatedAt` 使旧 Token 失效并签发新 Token。

```json
{
  "currentPassword": "string",
  "newPassword": "string (至少 6 位)",
  "confirmPassword": "string"
}
```

##### POST /user/upload/avatar

上传用户头像。`Content-Type: multipart/form-data`，字段名 `file`，支持 jpg/png/gif/webp，大小受 `UPLOAD_MAX_SIZE_IMAGE_MB` 限制（默认 10MB）。

#### 歌曲收藏

##### GET /user/favorites

获取我的收藏列表。参数：`page`, `limit`, `pageSize`。

##### POST /user/favorites

切换收藏（存在则取消，不存在则添加）。

```json
{ "songId": "string" }
```

##### DELETE /user/favorites/:songId

取消收藏指定歌曲。

##### GET /user/songs/:songId/favorite

检查当前用户是否已收藏某首歌，返回 `{ "favorited": boolean }`。

#### 歌单管理

##### GET /user/playlists

获取我的歌单列表。

##### POST /user/playlists

创建歌单。

```json
{
  "name": "string (必填，最多 50 字)",
  "cover": "string (可选)",
  "description": "string (可选，最多 500 字)",
  "isPublic": "boolean (可选，默认 true)"
}
```

##### PUT /user/playlists/:id

更新歌单信息（字段同上，均可选）。

##### DELETE /user/playlists/:id

删除歌单。

##### POST /user/playlists/:id/cover

上传歌单封面。`multipart/form-data`，字段名 `file`。

##### POST /user/playlists/:id/songs

批量添加歌曲 / 歌切到歌单（单次最多 100 条）。

```json
{
  "songIds": ["string (可选)"],
  "clipIds": ["string (可选)"]
}
```

##### DELETE /user/playlists/:id/songs/:songId

从歌单移除指定歌曲。

##### PUT /user/playlists/:id/songs/reorder

调整歌单内歌曲顺序。

```json
{ "songIds": ["string"] }
```

#### 专辑收藏

##### POST /user/albums/:id/favorite

切换专辑收藏，返回 `{ "favorited": boolean }`。

##### GET /user/albums/:id/favorite

检查是否已收藏该专辑。

#### 歌单收藏

##### POST /user/playlists/:id/favorite

切换歌单收藏。

##### GET /user/playlists/:id/favorite

检查是否已收藏该歌单。

#### 直播场次收藏

##### POST /user/live-sessions/:id/favorite

切换场次收藏。

##### GET /user/live-sessions/:id/favorite

检查是否已收藏该场次。

##### GET /user/live-sessions/favorites

已收藏的场次列表。

##### DELETE /user/live-sessions/:id/favorite

取消收藏场次。

#### 歌切收藏

##### POST /user/live-clips/:id/favorite

切换歌切收藏。

##### GET /user/live-clips/:id/favorite

检查是否已收藏该歌切。

##### GET /user/live-clips/favorites

已收藏的歌切 ID 列表。

##### GET /user/live-clips/favorites/list

已收藏的歌切完整数据列表。

##### DELETE /user/live-clips/:id/favorite

取消收藏歌切。

#### 播放历史

##### GET /user/history

获取播放历史。参数：`page`, `limit`, `pageSize`。

##### POST /user/history

上报播放记录。

```json
{ "songId": "string" }
```

##### DELETE /user/history/:songId

删除单条播放历史。

##### DELETE /user/history

清空全部播放历史。

#### 下载记录

##### GET /user/downloads

获取下载记录。参数：`page`, `limit`, `pageSize`。

#### 音质偏好

##### GET /user/preferences/quality

获取当前用户音质偏好，返回 `{ "quality": "HIGH | MEDIUM | LOW" }`。

##### PUT /user/preferences/quality

设置音质偏好。

```json
{ "quality": "HIGH | MEDIUM | LOW" }
```

**使用案例：**

```javascript
// 带鉴权的请求封装
async function api(path, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:3000/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  return res.json();
}

// 切换收藏（乐观 UI 示例）
async function toggleFavorite(songId) {
  const json = await api('/user/favorites', {
    method: 'POST',
    body: JSON.stringify({ songId }),
  });
  if (json.code === 200) return json.data.favorited;
  throw new Error(json.message);
}

// 创建歌单
async function createPlaylist(name, description) {
  const json = await api('/user/playlists', {
    method: 'POST',
    body: JSON.stringify({ name, description, isPublic: true }),
  });
  return json.data; // 新建的 Playlist
}
```

```bash
# 上传头像
curl -X POST http://localhost:3000/api/user/upload/avatar \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/avatar.png"
```

---

### 歌曲模块

#### GET /songs

公开单曲列表（分页 + 排序）。参数：`page`, `limit`, `pageSize`, `sort`。

#### GET /songs/:id

获取歌曲详情。

#### GET /songs/:id/lyric

获取歌词（LRC 文本）。返回 `{ "content": "string" }`。

#### GET /songs/:id/qualities

获取歌曲可用音质列表。

#### GET /songs/:id/download-url（需鉴权）

获取预签名下载直链（默认有效期 3600 秒）。返回 `{ "url": "string", "expiresIn": 3600 }`。同一用户同一首歌 1 小时内仅刷新记录不重复新增，每用户最多保留 200 条下载记录。

**使用案例：**

```javascript
// 获取歌曲并播放
async function playSong(songId) {
  const detail = await api(`/songs/${songId}`);
  const audio = new Audio(detail.data.fileUrl);
  await audio.play();

  // 同时上报播放历史
  api('/user/history', {
    method: 'POST',
    body: JSON.stringify({ songId }),
  });
}

// 获取下载直链
async function getDownloadLink(songId) {
  const json = await api(`/songs/${songId}/download-url`);
  return json.data.url; // 预签名 URL，1 小时有效
}
```

---

### 专辑模块

#### GET /albums

专辑分页列表。参数：`page`, `limit`, `pageSize`, `sort`。

#### GET /albums/:id

获取专辑详情（含歌曲列表）。

---

### 歌手模块

#### GET /artists

获取歌手列表。参数：`page`, `limit`, `sort`（`latest` | `oldest` | `name`）。

#### GET /artists/:id

获取歌手详情。

#### GET /artists/:id/songs

获取歌手的歌曲。参数：`page`, `limit`, `pageSize`, `sort`。

#### GET /artists/:id/clips

获取歌手的歌切。参数：`page`, `limit`, `pageSize`。

---

### 歌单模块（公开接口）

#### GET /playlists

公开歌单分页列表。参数：`page`, `limit`, `pageSize`, `sort`。

#### GET /playlists/:id

获取歌单详情。

#### GET /playlists/:id/songs

获取歌单下的歌曲列表。

---

### 直播场次模块（公开接口）

#### GET /live-sessions

直播场次列表。参数：`page`, `limit`, `pageSize`, `sort`（`latest` | `oldest`）。

#### GET /live-sessions/clips

歌切单曲列表（跨场次聚合）。参数：`page`, `limit`, `pageSize`, `sort`。

#### GET /live-sessions/:id

获取场次详情（含歌切列表）。

---

### Banner 模块

#### GET /banners

获取首页轮播图列表（仅返回 `status=VISIBLE` 的 Banner，按 `sort` 升序）。

---

### 发现与统计模块

#### GET /discover

获取发现页聚合数据，包含 banners、推荐歌曲、新专辑、热门歌手、热门歌单等。

#### GET /discover/daily-songs

获取随机推荐单曲。参数：`limit`（默认 20，范围 1-100）。

#### GET /discover/daily-clips

获取随机推荐歌切。参数：`limit`（默认 20，范围 1-100）。

#### GET /rankings

获取排行榜。参数：`by`（`play` 按播放量 | `favorite` 按收藏量，默认 `play`）。

#### GET /settings/site

获取站点公开设置。

```json
{
  "siteName": "XingTone",
  "siteLogo": "string | null",
  "siteDescription": "string | null",
  "icp": "string | null",
  "enableRegistration": true
}
```

---

### 搜索模块

#### GET /search

综合搜索（限流：60 秒最多 30 次）。

**参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词（核心参数） |
| `sort` | string | 排序：`time`（时间） \| `plays`（播放量） |
| `tag` | string | 按标签筛选 |
| `startDate` | string | 起始日期（ISO 8601） |
| `endDate` | string | 结束日期（ISO 8601） |
| `category` | string | 分类搜索：`live_clips` \| `live_sessions` |
| `page` | number | 页码 |
| `limit` / `pageSize` | number | 每页数量 |

> 当 `category=live_clips` 或 `live_sessions` 时走分类搜索，其余参数（`sort`/`tag`/日期）忽略。

#### GET /search/hot

获取热门搜索词。

**使用案例：**

```javascript
// 综合搜索歌曲
async function searchSongs(keyword) {
  const json = await api(
    `/search?q=${encodeURIComponent(keyword)}&sort=plays&pageSize=20`
  );
  return json.data; // 分页结构
}

// 仅搜索歌切
async function searchClips(keyword) {
  const json = await api(
    `/search?q=${encodeURIComponent(keyword)}&category=live_clips`
  );
  return json.data;
}
```

```bash
curl "http://localhost:3000/api/search?q=周杰伦&sort=plays&page=1&pageSize=20"
```

---

### 应用版本模块

#### GET /app/version/latest

检查最新应用版本（公开，可在登录前调用）。

**参数：** `channel`（stable/beta）、`platform`（android/ios/desktop）、`versionCode`（当前版本号）。

**响应 data：**

```json
{
  "version": "1.1.0",
  "versionCode": 2,
  "changelog": "更新日志",
  "downloadUrl": "string",
  "fileSize": 12345678,
  "md5": "string",
  "forceUpdate": false
}
```

#### HEAD /app/version/download/:id（需鉴权）

记录下载次数（HEAD 请求，防止匿名刷量）。

---

### 健康检查

#### GET /health

服务健康检查。

```json
{
  "code": 200,
  "message": "success",
  "data": { "status": "ok", "timestamp": "ISO 8601" }
}
```

---

### 管理后台接口（需 ADMIN 或 EDITOR 角色）

#### GET /admin/stats

后台总览统计（仅 ADMIN）。返回总用户数、总歌曲数、总专辑数、总歌手数、总歌单数、今日播放、今日新增用户、用户增长趋势、热门歌曲等。

#### 歌曲管理 `/admin/songs`（ADMIN / EDITOR）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/songs | 列表（参数：`keyword`, `page`, `limit`, `pageSize`, `status`, `albumId`） |
| POST | /admin/songs | 创建歌曲 |
| PUT | /admin/songs/:id | 更新歌曲 |
| DELETE | /admin/songs/:id | 删除歌曲 |
| GET | /admin/songs/:id/lyric | 获取歌词正文 |
| POST | /admin/songs/:id/lyric | 设置歌词正文 `{ "content": "string" }` |
| DELETE | /admin/songs/:id/lyric | 删除歌词正文 |
| POST | /admin/songs/batch/delete | 批量删除 `{ "ids": ["string"] }` |
| POST | /admin/songs/batch/status | 批量改状态 `{ "ids": [], "status": "PUBLISHED|DRAFT" }` |
| POST | /admin/songs/:id/transcode | 单曲转码 |
| GET | /admin/songs/:id/quality-status | 查询音质转码状态 |

#### 其它资源管理（CRUD）

| 资源 | 路径前缀 | 角色 |
|------|----------|------|
| 专辑 | /admin/albums | ADMIN / EDITOR |
| 歌手 | /admin/artists | ADMIN / EDITOR |
| 歌单 | /admin/playlists | ADMIN / EDITOR |
| Banner | /admin/banners | ADMIN / EDITOR |
| 用户 | /admin/users | ADMIN |
| 标签 | /admin/tags | ADMIN / EDITOR |
| 直播场次 | /admin/live-sessions | ADMIN / EDITOR |
| 歌切 | /admin/live-clips | ADMIN / EDITOR |
| 转码任务 | /admin/transcoding | ADMIN / EDITOR |

#### 应用版本管理 `/admin/app-versions`（仅 ADMIN）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/app-versions | 版本列表（`page`, `limit`, `channel`, `platform`） |
| GET | /admin/app-versions/:id | 版本详情 |
| POST | /admin/app-versions | 创建版本（`multipart/form-data`，含 APK 文件） |
| PUT | /admin/app-versions/:id | 更新版本 |
| DELETE | /admin/app-versions/:id | 删除版本 |

#### 系统设置

##### GET /admin/settings

获取系统设置（含敏感配置，仅 ADMIN）。

##### PUT /admin/settings

更新系统设置。请求体为键值对象。

#### POST /admin/upload

文件上传（ADMIN / EDITOR）。`multipart/form-data`，字段名 `file`。

**查询参数：**

| 参数 | 说明 |
|------|------|
| `type` | 文件分类：`image` \| `audio` \| `lyric` \| `apk`（必填） |
| `transcode` | 仅 `type=audio` 时生效，`true` 触发转码 |
| `quality` | 仅 `type=audio` 且 `transcode=true` 时生效，`multi` 生成多音质版本 |

**各分类限制：**

| 分类 | 允许扩展名 | 最大大小 |
|------|-----------|----------|
| image | .jpg .jpeg .png .gif .webp | 10MB |
| audio | .mp3 .flac .wav .ogg .m4a .aac | 200MB |
| lyric | .lrc .txt | 5MB |
| apk | .apk | 200MB |

> 大小上限可通过环境变量 `UPLOAD_MAX_SIZE_*_MB` 调整。

#### GET /admin/logs

获取操作日志（仅 ADMIN）。参数：`page`, `pageSize`, `limit`, `action`, `userId`, `startDate`, `endDate`。

#### 数据迁移 `/admin/migration`（仅 ADMIN）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /admin/migration/status | 获取迁移进度 |
| POST | /admin/migration/start | 启动迁移 |
| POST | /admin/migration/cancel | 取消迁移 |

**管理后台使用案例：**

```javascript
// 管理员创建歌曲（含音质转码）
async function adminCreateSong(payload) {
  const json = await api('/admin/songs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return json.data;
}

// 上传音频并生成多音质版本
async function uploadAudioWithTranscode(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(
    'http://localhost:3000/api/admin/upload?type=audio&transcode=true&quality=multi',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      body: form, // 注意：multipart 不要手动设置 Content-Type
    }
  );
  return res.json(); // 返回 url、metadata、qualityVersions 等
}
```

```bash
# 上传图片
curl -X POST "http://localhost:3000/api/admin/upload?type=image" \
  -H "Authorization: Bearer <admin-token>" \
  -F "file=@/path/to/cover.png"

# 在线编辑歌词
curl -X POST http://localhost:3000/api/admin/songs/clxxx/lyric \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"[00:00.00] 歌词第一行\n[00:05.00] 歌词第二行"}'
```

---

## 快速上手：端到端流程

### 流程 1：游客浏览 → 登录 → 收藏

```javascript
const BASE = 'http://localhost:3000/api';

// 1. 游客获取发现页数据
const discover = await fetch(`${BASE}/discover`).then((r) => r.json());

// 2. 注册并登录
await fetch(`${BASE}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'alice',
    email: 'alice@example.com',
    password: 'alice123',
  }),
});

const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ account: 'alice', password: 'alice123' }),
}).then((r) => r.json());

const token = loginRes.data.token;

// 3. 收藏一首推荐歌曲
const song = discover.data.recommendSongs[0];
await fetch(`${BASE}/user/favorites`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ songId: song.id }),
});

// 4. 查看我的收藏
const favs = await fetch(`${BASE}/user/favorites`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
console.log('我的收藏:', favs.data.items);
```

### 流程 2：创建歌单并添加歌曲

```javascript
// 1. 创建歌单
const playlist = await api('/user/playlists', {
  method: 'POST',
  body: JSON.stringify({ name: '我的精选', isPublic: true }),
});

// 2. 搜索歌曲
const result = await api(`/search?q=${encodeURIComponent('夜曲')}&pageSize=5`);
const songIds = result.data.items.map((s) => s.id);

// 3. 批量加入歌单
await api(`/user/playlists/${playlist.data.id}/songs`, {
  method: 'POST',
  body: JSON.stringify({ songIds }),
});

// 4. 查看歌单详情
const detail = await api(`/playlists/${playlist.data.id}`);
console.log('歌单歌曲数:', detail.data.songs?.length);
```

### 流程 3：分页遍历全部歌曲

```javascript
async function fetchAllSongs() {
  const all = [];
  let page = 1;
  while (true) {
    const json = await api(`/songs?page=${page}&pageSize=50`);
    all.push(...json.data.items);
    if (page >= json.data.totalPages) break;
    page++;
  }
  return all;
}
```

---

## 开发规范

### 请求约定

- 生产环境使用 HTTPS
- 请求体使用 JSON 格式（文件上传除外）
- 时间统一使用 ISO 8601 格式
- 分页参数统一为 `page` 和 `pageSize`（兼容 `limit`）
- 文件上传使用 `multipart/form-data`，字段名统一为 `file`

### 响应约定

- 统一返回 `{ code, message, data }` 格式
- 成功时 `code = 200`，`message = 'success'`
- 列表接口返回 `{ items, total, page, pageSize, totalPages }` 分页结构

### 限流约定

部分敏感接口已配置限流（基于 `@nestjs/throttler`），触发限流返回 `429`：

| 接口 | 限制 |
|------|------|
| POST /auth/register | 60 秒 5 次 |
| POST /auth/login | 60 秒 5 次 |
| POST /user/password | 60 秒 3 次 |
| GET /search | 60 秒 30 次 |

## 更多信息

- [后端开发指南](../development/backend-guide.md) — 了解后端实现
- [前端开发指南](../development/frontend-guide.md) — 了解前端调用方式
- [部署文档](../deployment/README.md) — 了解 API 服务部署
