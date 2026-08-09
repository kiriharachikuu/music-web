# XingTone 共享文档

> 本目录为 XingTone 平台（music-server / music-web / music-admin / music-twa）共享的项目级文档，  
> 已从仓库根 `docs/` 整体迁入 `music-web` 仓库的 `docs/xtdocs/` 统一维护。

## 目录结构

| 子目录 | 内容 | 维护方 |
|---|---|---|
| [api-reference/](api-reference/README.md) | API 接口参考 | music-server |
| [deployment/](deployment/README.md) | 部署指南（后端 / 前端 / TWA / 宝塔） | 全平台 |
| [development/](development/README.md) | 开发指南（后端 / 前端 / 管理后台 / Flutter / Android） | 全平台 |
| [getting-started/](getting-started/README.md) | 快速开始 | 全平台 |
| [operations/](operations/README.md) | 运维手册（备份 / 监控 / 安全 / 更新） | 全平台 |
| [packaging/](packaging/README.md) | 打包指南（Android / Desktop） | 全平台 |
| [prd/](prd/XingTone-Desktop-Player-PRD.md) | 产品需求文档 | 全平台 |
| [release-notes/](release-notes/) | 历史版本发布说明 | 全平台 |
| [roadmap/](roadmap/next-version-roadmap.md) | 下个版本规划 / 功能差异 / 主题系统 | 全平台 |

## 维护说明

- 文档原位于仓库根 `docs/`，不归属于任何 Git 仓库。
- 后续将统一在此目录维护，**所有变更跟随 music-web 仓库的 Git 版本控制**。
- 二进制资源（APK、主题预览图）请勿提交到 Git；如需归档，请使用外部对象存储并在文档中给出下载链接。
- 跨平台文档修改后，请同步通知 music-server / music-admin / music-twa 维护人员评审。

## 修订记录

- **2026-08-10**：首次将根级 `docs/` 整体迁入 `music-web/docs/xtdocs/`，纳入版本控制；APK 与主题演示资源（`theme-demo-assets/`）不入库。
- **2026-08-10**：[roadmap/next-version-roadmap.md](roadmap/next-version-roadmap.md) 归档 v1.4.3 已完成项。
