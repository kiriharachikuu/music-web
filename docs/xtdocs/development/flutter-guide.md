# Flutter 开发指南

本文档提供 Flutter 客户端对接 XingTone 后端 API 的开发参考。虽然当前项目使用原生 Android（Kotlin）实现，但本文档可作为未来 Flutter 跨端方案的开发参考。

## 项目概述

XingTone 是一个现代化的音乐播放平台，采用前后端分离架构。Flutter 客户端可通过 REST API 对接后端服务，实现 iOS/Android 双端统一的用户体验。

## 技术栈建议

| 技术 | 用途 |
|------|------|
| Flutter 3.x | 跨端 UI 框架 |
| Dart 3.x | 开发语言 |
| Riverpod | 状态管理 |
| Dio | 网络请求 |
| Go Router | 路由管理 |
| Hive / Isar | 本地存储 |
| just_audio | 音频播放 |
| audio_service | 后台播放 / 锁屏控制 |

## API 响应格式

所有接口统一返回格式：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

- `code` — 状态码，200 表示成功
- `message` — 描述信息
- `data` — 响应数据

统一封装建议：

```dart
class ApiResponse<T> {
  final int code;
  final String message;
  final T? data;

  ApiResponse({
    required this.code,
    required this.message,
    this.data,
  });

  bool get isSuccess => code == 200;
}
```

## 认证机制

项目采用 JWT 无状态认证。

### 登录

登录使用 `account` 字段（用户名或邮箱均可）：

```http
POST /api/auth/login
Content-Type: application/json

{
  "account": "admin",
  "password": "admin123"
}
```

响应：
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOi...",
    "user": { "id": "clxxx", "username": "admin", "email": "admin@example.com", "role": "ADMIN" }
  }
}
```

### 注册

需要 `username`、`email`、`password` 三个字段，密码规则为 6-72 位且须同时包含字母和数字：

```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "user123"
}
```

### 鉴权请求

后续请求在 Header 中携带 Token：
```
Authorization: Bearer <token>
```

### Token 过期处理

- 返回 `401` 时自动刷新（如有 refresh token）
- 刷新失败则跳转登录页

## 核心接口分类

### 认证模块

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册（需 username + email + password） |
| POST | `/api/auth/login` | 用户登录（account 字段，支持用户名或邮箱） |

### 发现与内容

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/discover` | 发现页数据（Banner + 推荐 + 新专辑 + 热门歌手） |
| GET | `/api/discover/daily-songs` | 随机推荐单曲（limit 默认 20） |
| GET | `/api/discover/daily-clips` | 随机推荐歌切（limit 默认 20） |
| GET | `/api/banners` | Banner 列表（仅返回 status=VISIBLE，按 sort 升序） |
| GET | `/api/rankings?by=play` | 排行榜（by=play 按播放量，by=favorite 按收藏量） |

### 歌曲

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/songs` | 歌曲列表（分页 + 排序） |
| GET | `/api/songs/:id` | 歌曲详情 |
| GET | `/api/songs/:id/lyric` | 获取歌词（返回 LRC 文本） |
| GET | `/api/songs/:id/qualities` | 获取可用音质列表（HIGH/MEDIUM/LOW） |
| GET | `/api/songs/:id/download-url` | 获取预签名下载直链（需鉴权，1 小时有效） |

### 专辑

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/albums` | 专辑列表（支持分页、筛选） |
| GET | `/api/albums/:id` | 专辑详情（含歌曲列表） |

### 歌手

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/artists` | 歌手列表（sort: latest/oldest/name） |
| GET | `/api/artists/:id` | 歌手详情 |
| GET | `/api/artists/:id/songs` | 歌手歌曲 |
| GET | `/api/artists/:id/clips` | 歌手歌切 |

### 歌单

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/playlists` | 公开歌单（分页） |
| GET | `/api/playlists/:id` | 歌单详情 |
| GET | `/api/playlists/:id/songs` | 歌单歌曲列表 |

### 直播场次

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/live-sessions` | 直播场次列表（分页 + 排序） |
| GET | `/api/live-sessions/:id` | 场次详情（含歌切列表） |
| GET | `/api/live-sessions/clips` | 歌切单曲列表（跨场次聚合） |

### 搜索

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/search` | 综合搜索（核心参数 `q`） |
| GET | `/api/search/hot` | 热门搜索词 |

> 搜索参数：`q`（关键词）、`sort`（time 按时间 / plays 按播放量）、`category`（live_clips 仅歌切 / live_sessions 仅场次）

### 用户模块（需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user/profile` | 当前用户信息 |
| PATCH | `/api/user/profile` | 更新用户资料（username / avatar） |
| POST | `/api/user/password` | 修改密码 |
| GET | `/api/user/favorites` | 我的收藏 |
| POST | `/api/user/favorites` | 切换收藏（body: { songId }） |
| DELETE | `/api/user/favorites/:songId` | 取消收藏歌曲 |
| GET | `/api/user/songs/:songId/favorite` | 检查是否已收藏 |
| GET | `/api/user/playlists` | 我的歌单 |
| POST | `/api/user/playlists` | 创建歌单 |
| PUT | `/api/user/playlists/:id` | 更新歌单 |
| DELETE | `/api/user/playlists/:id` | 删除歌单 |
| POST | `/api/user/playlists/:id/songs` | 添加歌曲到歌单（支持 songIds + clipIds） |
| DELETE | `/api/user/playlists/:id/songs/:songId` | 从歌单移除歌曲 |
| GET | `/api/user/history` | 播放历史 |
| POST | `/api/user/history` | 上报播放记录 |
| GET | `/api/user/downloads` | 下载记录 |
| GET | `/api/user/preferences/quality` | 获取音质偏好 |
| PUT | `/api/user/preferences/quality` | 设置音质偏好（HIGH/MEDIUM/LOW） |

### 收藏（扩展）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/user/albums/:id/favorite` | 切换专辑收藏 |
| POST | `/api/user/playlists/:id/favorite` | 切换歌单收藏 |
| POST | `/api/user/live-sessions/:id/favorite` | 切换场次收藏 |
| POST | `/api/user/live-clips/:id/favorite` | 切换歌切收藏 |
| GET | `/api/user/live-clips/favorites/list` | 已收藏歌切完整列表 |

### 应用版本

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/app/version/latest` | 检查最新版本（channel + platform + versionCode） |

### 系统设置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/settings/site` | 站点公开设置（siteName, logo, icp, enableRegistration 等） |

完整的 API 文档请参考 [API 参考](../api-reference/README.md)。

## 数据模型定义

```dart
// 用户模型
class User {
  final String id;
  final String username;
  final String email;
  final String? avatar;
  final String role;       // USER | ADMIN | EDITOR
  final DateTime? createdAt;
}

enum UserRole { USER, ADMIN, EDITOR }

// 歌曲模型
class Song {
  final String id;
  final String title;
  final String artist;
  final String? albumId;
  final int? duration;           // 秒
  final String fileUrl;
  final String? coverUrl;
  final String? lyricUrl;
  final String? lyricContent;    // LRC 文本
  final int plays;
  final int favoriteCount;
  final String? status;          // PUBLISHED | DRAFT
}

// 专辑模型
class Album {
  final String id;
  final String name;
  final String artist;
  final String? cover;
  final String? description;
  final DateTime? releaseDate;
  final int songCount;
  final DateTime? createdAt;
}

// 歌手模型
class Artist {
  final String id;
  final String name;
  final String? avatar;
  final String? bio;
  final String? representativeWorks;
  final DateTime? createdAt;
}

// 歌单模型
class Playlist {
  final String id;
  final String name;
  final String? cover;
  final String? description;
  final String userId;
  final bool isPublic;
  final bool isSystem;          // 官方运营歌单
  final int playCount;
  final DateTime? createdAt;
}

// Banner 模型
class Banner {
  final String id;
  final String title;
  final String imageUrl;
  final String? linkUrl;        // 内部跳转路径
  final String? songId;         // 点击播放歌曲（优先级最高）
  final String? adUrl;          // 广告外链
  final int sort;
  final String status;          // VISIBLE | HIDDEN
}

// 播放记录模型
class PlayHistory {
  final String songId;
  final Song song;
  final DateTime playedAt;
  final int? playDuration;
}
```

## 开发规范

### 目录结构建议

```
lib/
├── app/
│   ├── router.dart          # Go Router 路由
│   ├── theme.dart           # 主题配置
│   └── constants.dart       # 常量
├── core/
│   ├── api/                 # Dio 封装 + 拦截器
│   ├── exceptions/          # 异常定义
│   └── utils/               # 工具函数
├── data/
│   ├── models/              # 数据模型
│   ├── repositories/        # 数据仓库
│   └── providers/           # Riverpod providers
├── features/
│   ├── auth/                # 登录注册
│   ├── discover/            # 发现页
│   ├── player/              # 播放器
│   ├── search/              # 搜索
│   ├── library/             # 音乐库
│   └── profile/             # 个人中心
├── shared/
│   ├── widgets/             # 通用组件
│   └── providers/           # 全局状态
└── main.dart
```

### 状态管理

使用 Riverpod 管理状态：

- **全局状态**：用户登录状态、播放器状态
- **页面状态**：各页面数据加载状态
- **Repository 层**：API 调用封装

### 音频播放

使用 `just_audio` + `audio_service`：

- 支持后台播放
- 支持锁屏控制（MediaSession）
- 支持播放列表管理
- 支持播放模式切换

### 网络层

使用 Dio 封装：

- 自动注入 Authorization Header
- 统一错误处理
- 请求/响应拦截器
- Token 自动刷新

## 测试方法

### 单元测试

```bash
flutter test
```

### Widget 测试

```bash
flutter test test/widget_test.dart
```

### 集成测试

```bash
flutter test integration_test
```

## 注意事项

1. **Token 安全**：使用 flutter_secure_storage 存储 Token，避免明文存储
2. **图片缓存**：使用 cached_network_image 缓存图片
3. **音频缓存**：实现音频缓存策略，避免重复下载
4. **离线模式**：实现本地缓存，支持离线查看歌单和收藏
5. **内存优化**：大列表使用 ListView.builder，避免一次性加载大量数据
6. **错误处理**：所有 API 调用都要有错误处理和用户提示
7. **平台适配**：注意 iOS 和 Android 的差异（权限、通知等）

## 扩展阅读

- [后端开发指南](backend-guide.md) — 了解后端 API 实现
- [前端开发指南](frontend-guide.md) — 参考 Web 端交互设计
- [API 参考](../api-reference/README.md) — 完整的接口文档
- [部署文档](../deployment/README.md) — 了解服务端部署
