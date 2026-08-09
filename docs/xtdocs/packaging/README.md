# 打包文档总览

本文档汇总了 XingTone 多平台应用的打包教程，包括 Android APK/AAB 和桌面端安装包的打包流程。

## 打包文档

| 文档 | 说明 |
|------|------|
| [Android 打包教程](android-packaging.md) | Android APK/AAB 的环境配置、签名、构建、验证 |
| [桌面端打包教程](desktop-packaging.md) | 使用 Electron 打包 Windows/macOS/Linux 桌面应用 |

## 打包前检查清单

- [ ] 代码已提交到版本控制
- [ ] 所有功能已测试通过
- [ ] 版本号已更新
- [ ] 更新日志已编写
- [ ] 图标资源已准备
- [ ] 签名密钥已准备（生产版本）
- [ ] 后端 API 地址已配置为生产环境

## 版本号规范

使用语义化版本（Semantic Versioning）：

```
MAJOR.MINOR.PATCH
```

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的功能新增
- **PATCH**：向后兼容的问题修复

各平台版本配置位置：

| 平台 | 配置文件 | 版本号字段 |
|------|---------|-----------|
| Android | `app/build.gradle.kts` | `versionCode` / `versionName` |
| Electron | `package.json` | `version` |

详细打包步骤请参考上方链接的各平台打包教程。
