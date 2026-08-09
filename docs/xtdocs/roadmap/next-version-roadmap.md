# XingTone 下个版本规划建议

> 面向开发团队评审的版本方向草案。  
> 当前对应版本：平台 v1.4.3 / App v1.3.4（已发布）。
> 下文为下一阶段的扩展方向（v1.4.4 / v1.4.5+）与历史规划参考。

---

## 1. v1.4.3 / v1.3.4 已完成项（对照归档）

> 下述条目在当前代码库中已实现并随 1.4.3 / 1.3.4 发布，文档中对应需求章节按要求精简归档。

| 方向 | 状态 | 实现入口 |
|---|---|---|
| 自定义离线缓存音质 | ✅ 已完成 | [settings-tab.tsx 离线缓存音质](../music-web/app/profile/tabs/settings-tab.tsx) |
| 下载管理显示缓存音质 / 文件大小 / 清理 | ✅ 已完成 | [settings-tab.tsx 下载管理](../music-web/app/profile/tabs/settings-tab.tsx) |
| 排行榜区分综合 / 单曲 / 歌切 | ✅ 已完成 | [rankings-client.tsx TYPE_TABS](../music-web/app/rankings/rankings-client.tsx) |
| 歌切同步直播场次封面 | ✅ 已完成 | [live-session.service.ts coverUrl ?? session.cover](../music-server/src/modules/live-session/live-session.service.ts) |
| 平台更新后缓存刷新提示 | ✅ 已完成 | [version-poller](../music-web/lib/version-poller.ts) |
| 找回密码（前端） | ✅ 已完成 | [forgot-password/page.tsx](../music-web/app/forgot-password/page.tsx) |
| 移动端播放列表上拉抽屉 | ✅ 已完成 | [queue-sheet.tsx](../music-web/components/player/queue-sheet.tsx) |
| 手动检查 App 更新（设置入口） | ✅ 已完成 | [settings-tab.tsx Android App 更新](../music-web/app/profile/tabs/settings-tab.tsx) |

---

## 2. 下一阶段待规划方向（v1.4.4+）

> 已被 1.4.3 覆盖的功能不再重复描述，仅保留未落地、需在后续版本推进的方向。

### 2.1 排行榜细分

- 歌切行内容标签化（片段 / 完整曲 / 高能 / 推荐）
- 歌切专题页 / 歌切推荐流
- 排行榜统计按内容类型（单曲 / 歌切）做后端聚合缓存
- 涉及后端 `soar-ranking.service.ts` / `hot-ranking.service.ts` 的 `type` 过滤逻辑

### 2.2 主题系统：百变星瞳

- 主题资源结构化（背景 / 强调色 / 装饰元素）
- 设置页新增「主题」入口 + 主题列表
- 全局 CSS 变量重构：把硬编码颜色改为 `var(--theme-*)`
- 主题偏好持久化（本地存储 / 用户偏好表）
- 资源路径：`C:\Users\潘焯宇\Downloads\星瞳主题\百变星瞳_package`（注意素材版权合规）
- 后续：主题市场、按场景自动切换、主题与封面联动

### 2.3 找回密码后端补齐

- 短信 / 邮件发送服务 + 验证码存储
- `/auth/forgot-password` 与 `/auth/reset-password` 后端实现（前端已具备 UI / 协议）
- 防刷 / 防爆破策略（IP + 手机号 + 邮箱频控）
- 用户协议中说明验证码用途

### 2.4 App v1.3.5 方向

- Android 下载时读取 Web 端离线音质设置
- 下载记录保存实际缓存音质
- TWA 主题切换实时生效
- 保持 TWA 缓存清理与无缓存策略

---

## 3. 优先级（v1.4.4+ 视角）

| 优先级 | 方向 | 推荐版本 | 说明 |
|--------|------|----------|------|
| P0 | 找回密码后端协议 | v1.4.4 | 前端已就绪，缺后端验证码链路 |
| P0 | 排行榜后端 type 过滤 | v1.4.4 | 与排行榜前端 Tab 形成完整闭环 |
| P1 | 主题系统基础框架 | v1.4.4 | 先做 CSS 变量重构 + 主题切换框架 |
| P1 | 歌切内容标签化 | v1.4.5 | 为后续运营能力做准备 |
| P2 | 主题市场 / 主题与封面联动 | v1.4.5+ | 长期能力 |

---

## 4. 评审建议

1. **后端工作量**
   - 找回密码涉及短信 / 邮件 + 防刷
   - 排行榜 type 过滤需在排行榜统计服务中扩展

2. **资源合规**
   - 「百变星瞳」主题素材版权需确认
   - 避免后续下架风险

3. **范围控制**
   - 若 v1.4.4 范围过大，建议把「主题市场」拆分到 v1.4.5
   - 排行榜 type 过滤可与前端 tab 同步小步快跑

4. **优先级**
   - P0：找回密码后端、排行榜 type 过滤
   - P1：主题系统框架、歌切标签
