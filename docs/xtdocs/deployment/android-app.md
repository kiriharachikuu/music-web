# Android App 部署

本文档介绍 XingTone Android App 的部署、分发和升级方案。

## 构建环境要求

- JDK 17+
- Android SDK API 34
- Gradle 8.5+

## 构建生产版本

### 1. 配置签名密钥

生成签名密钥（如尚未生成）：

```bash
keytool -genkeypair -v \
  -keystore xingtone.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias xingtone
```

### 2. 配置 Gradle 签名

编辑 `music-twa/app/build.gradle.kts`：

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

> **安全提示**：不要将密钥密码硬编码在代码中。建议使用 `local.properties` 或环境变量。

### 3. 构建 APK

```bash
cd music-twa
./gradlew assembleRelease
```

APK 输出路径：
```
app/build/outputs/apk/release/app-release.apk
```

### 4. 构建 AAB（Google Play）

```bash
./gradlew bundleRelease
```

AAB 输出路径：
```
app/build/outputs/bundle/release/app-release.aab
```

## 验证 APK

### 1. 验证签名

```bash
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk
```

### 2. 检查版本信息

```bash
aapt dump badging app/build/outputs/apk/release/app-release.apk | grep version
```

### 3. 安装测试

连接设备后安装：

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

安装后验证：
- [ ] App 正常启动
- [ ] 前端页面加载正常
- [ ] 音乐播放正常
- [ ] 后台播放正常
- [ ] 通知栏显示正常
- [ ] 锁屏控制正常
- [ ] 下载功能正常
- [ ] 版本更新检测正常

## 分发方案

### 方案一：自建下载页（推荐）

1. **上传 APK 到服务器**

```bash
scp app/build/outputs/apk/release/app-release.apk \
  user@server:/www/wwwroot/downloads/xingtone-v1.0.0.apk
```

2. **在管理后台发布版本**

登录管理后台 → 应用版本 → 发布新版本：
- 版本号：`1.0.0`
- 版本名称：`v1.0.0`
- 更新内容：更新日志
- 下载链接：`https://your-domain.com/downloads/xingtone-v1.0.0.apk`
- 是否强制更新：否（一般更新）/ 是（重要修复）
- 文件大小：自动计算
- MD5 校验：自动计算

3. **App 内检测更新**

App 启动时自动调用 `/api/app/version/latest`：
- 如有新版本 → 弹窗提示
- 强制更新 → 必须下载安装
- 非强制更新 → 可选择稍后更新

### 方案二：国内应用商店

**华为应用市场：**
- 注册开发者账号
- 上传 APK
- 填写应用信息
- 提交审核

**小米应用商店：**
- 注册开发者账号
- 上传 APK
- 填写应用信息
- 提交审核

**OPPO / vivo 应用商店：**
- 类似流程

**腾讯应用宝：**
- 类似流程

> 注意：国内应用商店通常需要：
> - 软件著作权
> - ICP 备案
> - 隐私政策
> - 各类资质证明

### 方案三：Google Play

1. **注册 Google Play 开发者账号**
   - 支付 $25 注册费
   - 填写开发者信息

2. **准备 AAB 文件**
   ```bash
   ./gradlew bundleRelease
   ```

3. **上传到 Google Play Console**
   - 创建应用
   - 填写应用信息
   - 上传 AAB 到内部测试
   - 测试通过后发布到正式版

4. **必填信息**
   - 应用标题、描述
   - 图标、截图
   - 隐私政策链接
   - 内容分级问卷
   - 目标受众和内容

## 版本管理

### 版本号规范

使用语义化版本（Semantic Versioning）：

```
MAJOR.MINOR.PATCH
```

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的功能新增
- **PATCH**：向后兼容的问题修复

示例：
- `1.0.0` → `1.0.1`（修复 Bug）
- `1.0.1` → `1.1.0`（新增功能）
- `1.1.0` → `2.0.0`（重大变更）

### 更新日志格式

```markdown
## v1.1.0 (2024-01-15)

### 新增
- 支持歌单管理功能
- 新增下载管理页面
- 支持应用内更新检测

### 优化
- 优化播放器性能，降低功耗
- 改进搜索体验，支持联想词

### 修复
- 修复部分设备后台播放中断问题
- 修复 Android 13 通知权限问题
```

## 灰度发布

### 1. 使用管理后台

管理后台的应用版本功能支持：
- 设置灰度比例（如 10%、30%、50%）
- 指定灰度用户
- 分阶段发布

### 2. Google Play 分阶段发布

Google Play Console → 发布管理 → 分阶段发布：
- 选择发布比例
- 监控崩溃率和评分
- 逐步扩大发布范围
- 出现问题可暂停发布

## 常见问题

### 安装失败
- 检查设备是否允许安装未知来源
- 检查 Android 版本是否满足最低要求（API 26+）
- 检查签名是否正确

### 无法播放音乐
- 检查网络连接
- 检查后端 API 是否正常
- 检查音频 URL 是否可访问
- 查看 Logcat 日志：`adb logcat | grep MusicPlayer`

### 后台播放被杀死
- 检查电池优化设置
- 将 App 加入电池优化白名单
- 检查是否被安全软件杀死
- 查看厂商特定的保活设置

### 通知不显示
- 检查通知权限是否授予
- 检查 Android 13+ 的 POST_NOTIFICATIONS 权限
- 检查通知渠道是否被关闭

### 版本更新检测不到
- 检查后端 API 是否正常
- 检查管理后台是否已发布新版本
- 检查版本号是否大于当前版本
