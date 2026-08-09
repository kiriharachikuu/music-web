# XingTone 平台 v1.4.2 更新日志

**版本号：** 1.4.2  
**发布日期：** 2026 年 8 月 9 日  
**更新类型：** Web 平台稳定性更新 / TWA 兼容性修复

---

## 重点修复

- **修复 TWA / PWA 按钮点击无响应**
  - 修复旧 Service Worker 缓存导致 TWA 持续加载旧 JS bundle 的问题
  - TWA 环境下主动注销 Service Worker 并清理 Cache Storage
  - 避免旧代码长期驻留导致底部导航、按钮、卡片点击无响应

- **修复 React hydration mismatch**
  - AppShell 改为 client-only 加载
  - 避免服务端渲染与客户端首屏 DOM 不一致触发 React #418
  - 修复 Android WebView 中 hydration fallback 后事件委托异常的问题

- **修复下载管理页渲染崩溃**
  - 修复下载中任务 selector 每次返回新数组造成的 React #185 最大更新深度错误
  - 下载状态订阅增加浅比较与缓存，避免重复渲染死循环

- **修复下载列表封面显示异常**
  - 下载管理列表封面统一使用服务器文件 URL
  - 支持在线模式下直接访问后端 / 对象存储中的封面资源
  - 移除对 TWA 本地 `appassets.androidplatform.net` 封面映射的依赖

## 个人中心稳定性

- **下载管理数据容错增强**
  - 对缺失 `song` 的下载记录进行跳过处理
  - `formatBytes` 增加 undefined / NaN / Infinity 防护
  - 避免单条异常 IndexedDB / 原生桥数据导致整个页面崩溃

- **Tab 级错误隔离**
  - 桌面端个人中心 Tab 使用组件级 ErrorBoundary 包裹
  - 单个 Tab 崩溃不影响其他 Tab 与整体个人中心页面

- **移动端路由级错误兜底**
  - 为个人中心各子路由补充错误页面
  - 提供重试、返回与错误信息展示能力

- **全局错误兜底**
  - 新增全局 `app/error.tsx`
  - 未单独声明错误边界的路由也能显示统一错误页，避免白屏

## TWA / Android WebView 兼容

- **TWA 识别增强**
  - Android WebView User-Agent 追加 `XingToneTWA/{version}`
  - Web 平台可基于 UA 区分浏览器、PWA 与 TWA 客户端

- **缓存策略优化**
  - TWA 内 WebView 使用 `LOAD_NO_CACHE`
  - 降低 Android WebView 命中旧 HTML / JS / Service Worker 缓存的概率

## 用户体验调整

- **启动体验优化**
  - 平台端与 Android 端协同修复首屏加载后点击失效问题
  - 保留品牌识别，同时减少不必要的开屏加载元素

- **错误信息更可读**
  - 错误页面展示真实错误 message 与 digest
  - 便于根据用户反馈快速定位线上问题

## 技术细节

| 模块 | 改动 |
|------|------|
| `app/layout.tsx` | TWA 环境清理 Service Worker / Cache Storage；AppShell client-only |
| `components/app-shell-client.tsx` | 新增 client-only AppShell 包装组件 |
| `download-progress-store.ts` | 缓存 selector 返回数组，避免 #185 循环渲染 |
| `downloads-tab.tsx` | 下载封面改为服务器 URL；增强异常数据保护 |
| `profile/*/error.tsx` | 增加个人中心路由级错误边界 |
| `components/error-boundary.tsx` | 个人中心 Tab 区块级错误隔离 |
| `app/error.tsx` | 全局错误兜底 |
| Android TWA | UA 标识 + WebView 无缓存策略，与平台端缓存清理配合 |

---

## 升级建议

- Web 平台部署到 Vercel 后，建议手动 Redeploy 并关闭 Build Cache，确保最新 bundle 生效
- TWA 用户建议升级到 App v1.3.3，以获得 UA 标识、WebView 无缓存策略和更新下载修复
- 若用户仍遇到旧页面，可清除应用数据或重启 App 后重新进入
