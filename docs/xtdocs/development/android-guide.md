# Android 客户端开发指南

XingTone TWA 是基于 Kotlin 构建的 Android 原生客户端，采用「自制增强 TWA」架构：通过原生 WebView 加载前端 PWA，并通过 JSBridge 与原生 Media3 播放引擎双向通信，实现息屏常驻播放、系统通知、锁屏控件等原生能力。

## 技术栈

| 技术 | 用途 |
|------|------|
| Kotlin | 开发语言 |
| Gradle 8.5 | 构建系统 |
| WebView | 加载前端 PWA |
| Media3 ExoPlayer | 原生音频播放引擎 |
| OkHttp | 网络请求 |
| JSBridge | 前后端双向通信 |

## 项目架构

```
music-twa/
├── app/                    # 主应用模块
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/xingtone/app/
│       │   ├── MainActivity.kt           # 主 Activity（WebView 容器）
│       │   ├── MainApplication.kt        # Application 类
│       │   ├── bridge/                    # JSBridge 模块
│       │   │   ├── JSBridge.kt            # 桥接核心
│       │   │   ├── PlayerBridge.kt        # 播放器接口
│       │   │   ├── DownloadBridge.kt      # 下载接口
│       │   │   └── NativeBridge.kt        # 原生能力接口
│       │   ├── player/                    # 播放器模块
│       │   │   ├── MusicPlayerService.kt  # 播放服务（前台服务）
│       │   │   ├── PlayerNotification.kt  # 播放通知
│       │   │   ├── MediaSessionManager.kt # MediaSession 管理
│       │   │   └── AudioFocusManager.kt   # 音频焦点管理
│       │   ├── download/                  # 下载模块
│       │   │   ├── DownloadManager.kt     # 下载管理
│       │   │   └── DownloadService.kt     # 下载服务
│       │   ├── data/                      # 数据层
│       │   │   ├── model/                  # 数据模型
│       │   │   └── repository/             # 数据仓库
│       │   ├── util/                      # 工具类
│       │   └── ui/                        # 原生 UI 组件（启动页等）
│       └── res/                           # 资源文件
│           ├── layout/
│           ├── drawable/
│           ├── mipmap-*/                  # 应用图标
│           ├── values/
│           └── xml/
├── gradle/
├── build.gradle.kts
├── gradle.properties
├── settings.gradle.kts
└── gradlew / gradlew.bat
```

## 构建环境要求

- **JDK**: 17+
- **Android SDK**: API 26+（Android 8.0）
- **Gradle**: 8.5+
- **最低系统版本**: Android 8.0 (API 26)

## 快速开始

### 1. 安装 Android Studio

下载并安装 [Android Studio](https://developer.android.com/studio)。

### 2. 配置 Android SDK

启动 Android Studio，通过 SDK Manager 安装：
- Android SDK Platform 34
- Android SDK Build-Tools 34
- Android SDK Platform-Tools

### 3. 打开项目

```bash
cd music-twa
# 用 Android Studio 打开本目录，或使用命令行构建
```

### 4. 同步 Gradle

首次打开项目会自动同步 Gradle 依赖，如未自动同步：
```bash
./gradlew build --refresh-dependencies
```

### 5. 构建 Debug APK

```bash
./gradlew assembleDebug
# APK 输出到: app/build/outputs/apk/debug/app-debug.apk
```

### 6. 连接设备并安装

```bash
# 启用 USB 调试后连接设备
adb install app/build/outputs/apk/debug/app-debug.apk
```

## JSBridge 接口契约

前端 PWA 与原生 App 通过 `window.AndroidJSBridge` 进行双向通信。

### 前端调用原生

#### 播放器接口
```typescript
// 播放歌曲
window.AndroidJSBridge.play(JSON.stringify({
  id: "song_id",
  title: "歌曲名",
  artist: "歌手",
  album: "专辑",
  coverUrl: "封面URL",
  audioUrl: "音频URL",
  lyrics: "歌词（可选）"
}))

// 暂停
window.AndroidJSBridge.pause()

// 继续播放
window.AndroidJSBridge.resume()

// 停止
window.AndroidJSBridge.stop()

// 跳转到指定位置（毫秒）
window.AndroidJSBridge.seekTo(60000)

// 设置音量（0-1）
window.AndroidJSBridge.setVolume(0.8)

// 设置播放模式
// 0: 列表循环, 1: 单曲循环, 2: 随机, 3: 顺序
window.AndroidJSBridge.setPlayMode(0)
```

#### 下载接口
```typescript
// 下载歌曲
window.AndroidJSBridge.downloadSong(JSON.stringify({
  id: "song_id",
  title: "歌曲名",
  url: "下载URL",
  filename: "文件名.mp3"
}))

// 取消下载
window.AndroidJSBridge.cancelDownload("download_id")
```

#### 原生能力接口
```typescript
// 获取版本信息
const version = window.AndroidJSBridge.getAppVersion()

// 检查更新
window.AndroidJSBridge.checkUpdate()

// 分享
window.AndroidJSBridge.share(JSON.stringify({
  title: "分享标题",
  text: "分享内容",
  url: "分享链接"
}))

// Toast 提示
window.AndroidJSBridge.toast("提示消息")

// 退出应用
window.AndroidJSBridge.exitApp()
```

### 原生调用前端

原生通过 `window.__nativePlayerEvents` 回调通知前端：

```typescript
// 前端注册回调
window.__nativePlayerEvents = {
  onPlay: () => { /* 播放中 */ },
  onPause: () => { /* 已暂停 */ },
  onStop: () => { /* 已停止 */ },
  onCompletion: () => { /* 播放完成 */ },
  onError: (error: string) => { /* 播放错误 */ },
  onProgress: (position: number, duration: number) => {
    // 播放进度更新（毫秒）
  },
  onBuffering: (percent: number) => { /* 缓冲进度 */ },
  onAudioFocusChange: (focus: boolean) => { /* 音频焦点变化 */ },
  onDownloadProgress: (id: string, percent: number) => {
    // 下载进度
  },
  onDownloadComplete: (id: string, filePath: string) => {
    // 下载完成
  },
  onDownloadError: (id: string, error: string) => {
    // 下载失败
  }
}
```

## 与 music-web 的接口对应

| 前端功能 | 浏览器实现 | TWA 原生实现 |
|----------|-----------|-------------|
| 音频播放 | Howler.js | Media3 ExoPlayer |
| 锁屏控制 | MediaSession API | MediaSession + Notification |
| 息屏播放 | 有限支持 | 前台服务常驻 |
| 下载 | 浏览器下载 | DownloadManager |
| 分享 | Web Share API | 原生分享 |
| 版本更新 | - | 原生检查 + 下载 |

## 调试模式与生产模式

| 特性 | Debug 模式 | Release 模式 |
|------|-----------|-------------|
| WebView 调试 | ✅ 开启（Chrome inspect） | ❌ 关闭 |
| 日志输出 | ✅ 完整 Logcat | ❌ 仅错误日志 |
| 签名 | debug.keystore | 正式签名密钥 |
| 压缩优化 | ❌ | ✅ R8 混淆 + 资源压缩 |
| 崩溃收集 | ❌ | ✅（如集成 Bugly） |

### 开启 WebView 调试

在 Debug 模式下，Chrome 浏览器访问：
```
chrome://inspect
```
即可对 WebView 进行远程调试。

## 图标同步

### 启动图标

启动图标使用自适应图标（Adaptive Icon），包含前景层和背景层：

```
res/
├── mipmap-anydpi-v26/
│   ├── ic_launcher.xml          # 自适应图标
│   └── ic_launcher_round.xml     # 圆形图标
├── mipmap-hdpi/
│   ├── ic_launcher.png           # 72x72
│   └── ic_launcher_round.png
├── mipmap-mdpi/                  # 48x48
├── mipmap-xhdpi/                 # 96x96
├── mipmap-xxhdpi/                # 144x144
└── mipmap-xxxhdpi/               # 192x192
```

### 通知图标

通知图标需要独立设计（白色图标，透明背景）：

```
res/
├── drawable-mdpi/ic_notification.png     # 24x24
├── drawable-hdpi/ic_notification.png     # 36x36
├── drawable-xhdpi/ic_notification.png    # 48x48
├── drawable-xxhdpi/ic_notification.png   # 72x72
└── drawable-xxxhdpi/ic_notification.png  # 96x96
```

## 升级流程

### 1. 修改版本号

在 `app/build.gradle.kts` 中修改：

```kotlin
defaultConfig {
    versionCode = 2        // 递增整数
    versionName = "1.1.0"  // 语义化版本
}
```

### 2. 后端发布新版本

在管理后台「应用版本」中发布新版本：
- 版本号（与 APK 一致）
- 更新内容
- 下载链接
- 是否强制更新

### 3. App 内更新检测

App 启动时会调用 `/api/app/version/latest` 检查更新：
- 如有更新且是强制更新：弹窗提示，必须更新
- 如有更新但非强制：可选择「立即更新」或「稍后再说」
- 下载完成后自动触发安装

## 接口版本兼容性

为保证新旧版本 App 兼容，API 采用以下策略：

1. **不破坏性修改** — 新增字段不影响旧版本
2. **API 版本前缀** — 重大变更使用 `/api/v2/` 前缀
3. **兼容旧字段** — 废弃字段保留至少 3 个版本
4. **版本检测** — 后端可配置最低支持版本

## 构建生产版本

### 1. 生成签名密钥

```bash
keytool -genkeypair -v -keystore xingtone.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias xingtone
```

### 2. 配置签名

在 `app/build.gradle.kts` 中配置：

```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file("../xingtone.jks")
            storePassword = "your_store_password"
            keyAlias = "xingtone"
            keyPassword = "your_key_password"
        }
    }
    buildTypes {
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

### 3. 构建 Release APK

```bash
./gradlew assembleRelease
# APK 输出到: app/build/outputs/apk/release/app-release.apk
```

### 4. 构建 AAB（上架 Google Play）

```bash
./gradlew bundleRelease
# AAB 输出到: app/build/outputs/bundle/release/app-release.aab
```

## 常见问题

### WebView 白屏
- 检查前端 URL 是否可达
- 检查 `AndroidManifest.xml` 中是否配置了网络权限
- 检查是否配置了 `usesCleartextTraffic="true"`（http 域名需要）

### JSBridge 不工作
- 检查前端是否等待 `window.AndroidJSBridge` 可用
- 检查参数是否正确序列化为 JSON 字符串
- 查看 Logcat 中 `JSBridge` 标签的日志

### 播放无声
- 检查音频 URL 是否有效
- 检查是否请求了音频焦点
- 检查设备音量设置

### 下载失败
- 检查存储权限是否授予
- 检查下载 URL 是否有效
- 检查设备存储空间

## 更多信息

完整的打包和发布流程请参考 [Android 打包教程](../packaging/android-packaging.md)。
