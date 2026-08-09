# Android 打包教程

本文档详细介绍 XingTone Android App（music-twa）的打包流程，包括环境配置、签名生成、APK/AAB 构建、验证和升级流程。

## 环境配置

### 必需工具

| 工具 | 版本要求 | 下载地址 |
|------|---------|---------|
| JDK | 17+ | [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) 或 [OpenJDK](https://adoptium.net/) |
| Android Studio | 最新稳定版 | [developer.android.com](https://developer.android.com/studio) |
| Android SDK | API 34+ | 通过 Android Studio SDK Manager 安装 |
| Gradle | 8.5+ | 项目已包含 Wrapper |

### 环境变量配置

**Windows:**
```bash
# 系统环境变量
JAVA_HOME=C:\Program Files\Java\jdk-17
ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
PATH=%PATH%;%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\34.0.0
```

**macOS/Linux:**
```bash
# ~/.bashrc 或 ~/.zshrc
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/build-tools/34.0.0
```

### 验证环境

```bash
# 验证 Java
java -version
# 应输出 openjdk version "17.x.x"

# 验证 Android SDK
adb version
# 应输出 Android Debug Bridge version 1.0.41

# 验证 Gradle
cd music-twa
./gradlew --version
```

## 工程说明

```
music-twa/
├── app/
│   ├── build.gradle.kts    # 应用构建配置
│   ├── proguard-rules.pro   # 代码混淆规则
│   └── src/
│       └── main/
│           ├── AndroidManifest.xml  # 清单文件
│           ├── java/                  # Kotlin/Java 源码
│           └── res/                   # 资源文件
├── build.gradle.kts        # 项目构建配置
├── gradle.properties       # Gradle 属性
├── settings.gradle.kts     # 项目设置
├── gradlew                 # Linux/macOS Gradle Wrapper
└── gradlew.bat             # Windows Gradle Wrapper
```

## 图标同步

### 启动图标

使用 Android Studio 的 Image Asset Studio 生成自适应图标：

1. Android Studio → 右键 `res` 目录 → New → Image Asset
2. Icon Type: Launcher Icons (Adaptive and Legacy)
3. Foreground Layer: 选择 Logo 图片
4. Background Layer: 设置背景色（`#8B00FF`，品牌紫色）
5. 点击 Next → Finish

或使用命令行工具（Image Asset Studio 的 CLI 版本）。

### 通知图标

通知图标需要单独设计（白色图标，透明背景）：

1. 准备一个 24x24dp 的白色图标
2. Android Studio → 右键 `res` → New → Image Asset
3. Icon Type: Notification Icons
4. 选择图标文件
5. 点击 Next → Finish

### 图标规格

| 类型 | 密度 | 尺寸 (px) |
|------|------|----------|
| 启动图标 | mdpi | 48x48 |
| 启动图标 | hdpi | 72x72 |
| 启动图标 | xhdpi | 96x96 |
| 启动图标 | xxhdpi | 144x144 |
| 启动图标 | xxxhdpi | 192x192 |
| 通知图标 | mdpi | 24x24 |
| 通知图标 | hdpi | 36x36 |
| 通知图标 | xhdpi | 48x48 |
| 通知图标 | xxhdpi | 72x72 |
| 通知图标 | xxxhdpi | 96x96 |

## 签名生成

### 生成签名密钥

```bash
# 使用 keytool 生成 JKS 密钥库
keytool -genkeypair -v \
  -keystore xingtone.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias xingtone \
  -dname "CN=XingTone, OU=Development, O=XingTone, L=Beijing, ST=Beijing, C=CN"
```

按提示输入：
- 密钥库密码（storepass）
- 密钥密码（keypass，建议与密钥库密码相同）

### 密钥安全管理

**⚠️ 重要：**
- 密钥库文件（.jks）不要提交到 Git
- 将密钥密码记录在安全的密码管理器中
- 定期备份密钥库文件到安全位置
- 丢失密钥库意味着无法更新 App，用户必须卸载重装

### 配置签名信息

**方法一：使用 local.properties（推荐）**

在 `music-twa/` 目录下创建 `local.properties`：
```properties
storeFile=../xingtone.jks
storePassword=your_store_password
keyAlias=xingtone
keyPassword=your_key_password
```

> `local.properties` 已在 `.gitignore` 中，不会被提交。

**方法二：使用环境变量**

```bash
export ANDROID_STORE_FILE=/path/to/xingtone.jks
export ANDROID_STORE_PASSWORD=your_store_password
export ANDROID_KEY_ALIAS=xingtone
export ANDROID_KEY_PASSWORD=your_key_password
```

## 配置构建类型

编辑 `music-twa/app/build.gradle.kts`：

```kotlin
android {
    signingConfigs {
        create("release") {
            // 从 local.properties 读取
            val properties = java.util.Properties()
            val localPropertiesFile = rootProject.file("local.properties")
            if (localPropertiesFile.exists()) {
                properties.load(localPropertiesFile.inputStream())
            }
            
            storeFile = file(properties.getProperty("storeFile", ""))
            storePassword = properties.getProperty("storePassword", "")
            keyAlias = properties.getProperty("keyAlias", "")
            keyPassword = properties.getProperty("keyPassword", "")
        }
    }
    
    buildTypes {
        getByName("debug") {
            isMinifyEnabled = false
            isDebuggable = true
            applicationIdSuffix = ".debug"
        }
        
        getByName("release") {
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true        // 代码混淆
            isShrinkResources = true      // 资源压缩
            isDebuggable = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
}
```

## 构建 APK

### Debug APK（测试用）

```bash
cd music-twa

# Windows
gradlew.bat assembleDebug

# macOS/Linux
./gradlew assembleDebug
```

输出路径：
```
app/build/outputs/apk/debug/app-debug.apk
```

### Release APK（正式发布）

```bash
cd music-twa

# Windows
gradlew.bat assembleRelease

# macOS/Linux
./gradlew assembleRelease
```

输出路径：
```
app/build/outputs/apk/release/app-release.apk
```

### 多渠道打包（可选）

如需为不同应用商店打不同渠道包：

```kotlin
android {
    flavorDimensions += "channel"
    productFlavors {
        create("official") {
            dimension = "channel"
            applicationId = "com.xingtone.app"
            resValue("string", "app_name", "XingTone")
        }
        create("huawei") {
            dimension = "channel"
            applicationId = "com.xingtone.app.huawei"
            resValue("string", "app_name", "XingTone (华为)")
        }
        create("xiaomi") {
            dimension = "channel"
            applicationId = "com.xingtone.app.xiaomi"
            resValue("string", "app_name", "XingTone (小米)")
        }
    }
}
```

构建指定渠道：
```bash
./gradlew assembleOfficialRelease
./gradlew assembleHuaweiRelease
```

## 构建 AAB（Google Play）

AAB（Android App Bundle）是 Google Play 推荐的发布格式。

```bash
cd music-twa

# Windows
gradlew.bat bundleRelease

# macOS/Linux
./gradlew bundleRelease
```

输出路径：
```
app/build/outputs/bundle/release/app-release.aab
```

## 验证方法

### 验证签名

```bash
# 验证 APK 签名
jarsigner -verify -verbose -certs app/build/outputs/apk/release/app-release.apk

# 使用 apksigner（推荐）
$ANDROID_HOME/build-tools/34.0.0/apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
```

应输出：
```
Verifies
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
Verified using v4 scheme (APK Signature Scheme v4): true
Number of signers: 1
```

### 验证版本信息

```bash
# 查看版本号
aapt dump badging app/build/outputs/apk/release/app-release.apk | grep version
# 或使用 Android SDK 的 apkanalyzer
apkanalyzer manifest print app/build/outputs/apk/release/app-release.apk
```

### 安装测试

```bash
# 连接设备（启用 USB 调试）
adb devices

# 卸载旧版本（如有）
adb uninstall com.xingtone.app

# 安装新版本
adb install app/build/outputs/apk/release/app-release.apk

# 启动应用
adb shell am start -n com.xingtone.app/.MainActivity
```

安装后验证清单：
- [ ] App 正常启动，无崩溃
- [ ] 前端页面加载正常
- [ ] 音乐播放正常
- [ ] 后台播放正常
- [ ] 通知栏显示正常
- [ ] 锁屏控制正常
- [ ] 下载功能正常
- [ ] 版本更新检测正常

### 检查 APK 大小

```bash
# 查看 APK 大小
ls -lh app/build/outputs/apk/release/

# 分析 APK 内容
apkanalyzer apk summary app/build/outputs/apk/release/app-release.apk
```

## 混淆规则

编辑 `music-twa/app/proguard-rules.pro`：

```proguard
# 保留 JSBridge 接口
-keep class com.xingtone.app.bridge.** { *; }
-keepclassmembers class com.xingtone.app.bridge.** { *; }

# 保留数据模型
-keep class com.xingtone.app.data.model.** { *; }

# 保留 WebView JavaScript 接口
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Media3
-keep class androidx.media3.** { *; }
-keep interface androidx.media3.** { *; }

# OkHttp
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }
-dontwarn okhttp3.**
```

## 常见问题解决方案

### 1. Gradle 构建太慢

**解决方案：**

编辑 `gradle.properties`：
```properties
org.gradle.jvmargs=-Xmx4g -XX:MaxMetaspaceSize=512m
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.daemon=true
kotlin.caching.enabled=true
```

### 2. 签名失败

**常见原因：**
- 密钥库路径错误
- 密码错误
- 别名错误
- 密钥库文件损坏

**检查步骤：**
```bash
# 查看密钥库内容
keytool -list -v -keystore xingtone.jks
```

### 3. APK 安装失败

**常见原因：**
- 签名不一致（卸载旧版本再安装）
- 设备空间不足
- Android 版本过低（最低 API 26）
- 未知来源未开启

### 4. 代码混淆后崩溃

**解决方案：**
- 检查 Logcat 中的混淆堆栈
- 在 `proguard-rules.pro` 中添加对应的 keep 规则
- 使用 `-keepattributes SourceFile,LineNumberTable` 保留行号便于调试

### 5. aapt2 编译错误

**常见原因：**
- 资源文件名包含非法字符（中文、空格）
- 图片格式错误
- XML 语法错误

### 6. Dex 方法数超限

**解决方案：**
```kotlin
android {
    defaultConfig {
        multiDexEnabled = true
    }
}

dependencies {
    implementation("androidx.multidex:multidex:2.0.1")
}
```

## 构建优化配置

### 减少 APK 大小

```kotlin
android {
    buildTypes {
        getByName("release") {
            isMinifyEnabled = true        // 代码混淆
            isShrinkResources = true      // 资源压缩
        }
    }
    
    // 仅保留必要的语言
    defaultConfig {
        resourceConfigurations += listOf("zh-rCN", "en")
    }
    
    // 按 ABI 拆分（可选）
    splits {
        abi {
            isEnable = true
            reset()
            include("armeabi-v7a", "arm64-v8a", "x86_64")
            isUniversalApk = true
        }
    }
}
```

### 加速构建

```kotlin
android {
    // 使用增量编译
    compileOptions {
        incremental = true
    }
    
    // 启用 R8 增量模式
    buildFeatures {
        buildConfig = true
    }
}
```

## App 升级流程

### 1. 修改版本号

编辑 `music-twa/app/build.gradle.kts`：

```kotlin
android {
    defaultConfig {
        versionCode = 2        // 每次发布 +1，整数
        versionName = "1.1.0"  // 语义化版本
    }
}
```

### 2. 编写更新日志

```markdown
## v1.1.0 (2024-01-15)

### 新增
- 支持歌单管理功能
- 新增下载管理页面

### 优化
- 优化播放器性能，降低功耗

### 修复
- 修复部分设备后台播放中断问题
```

### 3. 后端发布新版本

登录管理后台 → 应用版本 → 发布新版本：
- 版本号：`1.1.0`
- 版本 Code：`2`
- 更新内容：上述更新日志
- 下载链接：APK 下载地址
- 是否强制更新：否 / 是

### 4. App 内更新

App 启动时自动调用 `/api/app/version/latest`：
- 比较版本号，如有更新则弹窗提示
- 强制更新：必须下载安装
- 非强制更新：可选择稍后

## 验证清单

打包发布前请确认：

- [ ] JDK 版本正确（17+）
- [ ] Android SDK 已安装
- [ ] 签名密钥已准备
- [ ] 版本号已更新（versionCode + versionName）
- [ ] 图标资源已更新
- [ ] 混淆规则已配置
- [ ] 后端 API 地址为生产环境
- [ ] Debug 代码已移除
- [ ] 已在测试设备上安装验证
- [ ] APK 签名验证通过
- [ ] 更新日志已编写
- [ ] 管理后台已发布新版本
