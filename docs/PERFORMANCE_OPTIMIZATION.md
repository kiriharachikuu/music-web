# XingTone 前端性能优化路线图

> 文档版本：v1.0
> 适用项目：music-web（Next.js 15 + React 19）
> 验证工具：Lighthouse CI / Chrome DevTools Lighthouse

---

## 一、优化总览

### 优化目标

| 指标 | 基线 | P0 目标 | P1 目标 | P2 目标 |
|------|------|---------|---------|---------|
| Performance 分数 | 待测量 | ≥ 70 | ≥ 85 | ≥ 90 |
| LCP | 待测量 | < 2.5s | < 2.0s | < 1.5s |
| FID / INP | 待测量 | < 100ms | < 50ms | < 20ms |
| CLS | 待测量 | < 0.1 | < 0.05 | < 0.02 |
| 首屏 JS 体积 | ~177KB | - | < 150KB | < 120KB |

### 优先级定义

- **P0（紧急）**：直接影响核心体验，必须立即优化
- **P1（重要）**：显著提升性能和体验，近期落地
- **P2（长期）**：锦上添花，架构层面的持续优化

---

## 二、P0 阶段：核心体验优化 ✅ 已完成

### P0-1：图片优化（next/image）

**问题**：原生 `<img>` 标签加载全尺寸图片，无懒加载，无尺寸适配，导致 LCP 差、CLS 高、流量浪费。

**实施方案**：
1. 配置 `next.config.mjs` 的 `images` 选项，支持远程图片
2. 创建通用 `AppImage` 组件（封装 next/image + 错误兜底 + 懒加载）
3. 逐组件替换原生 `<img>`

**覆盖范围**：
- BannerCarousel 轮播图 ✅
- SongList 歌曲封面 ✅
- PlaylistCard / AlbumCard / SongCard 封面 ✅
- MiniPlayer / FullScreenPlayer 封面 ✅
- 搜索结果、艺术家卡片等（待补充）⏳

**预期收益**：
- 图片体积减少 40-60%（WebP/AVIF 格式 + 自动尺寸）
- 消除图片导致的 CLS（width/height 显式声明）
- LCP 元素提前加载（priority 属性）

**验证方法**：
- Lighthouse：LCP 指标、"Properly size images"、"Serve images in next-gen formats"
- Network 面板：图片请求大小对比

---

### P0-2：长列表虚拟滚动

**问题**：歌单/专辑歌曲列表可能超过 100 首，一次性渲染全部 DOM 节点，导致：
- 初次渲染慢（FID/INP 高）
- 滚动卡顿
- 内存占用高

**实施方案**：
1. 安装 `@tanstack/react-virtual`
2. 创建 `VirtualSongList` 组件，仅渲染可视区域 + 缓冲区
3. 保留与原 `SongList` 一致的交互（播放、收藏、更多菜单等）
4. 在歌曲数 > 50 的页面启用虚拟滚动

**预期收益**：
- DOM 节点减少 90%+（100 首歌 → 约 10 个节点）
- 列表页 TTI 提升 50%+
- 滚动帧率稳定在 60fps

**验证方法**：
- Lighthouse：INP 指标、"Avoid excessive DOM size"
- Performance 面板：滚动期间帧率
- Elements 面板：实际渲染的 DOM 节点数

---

### P0-3：歌词渲染性能优化

**问题**：FullScreenPlayer 歌词视图使用 Framer Motion 动画每一行，即使非活动行也有动画开销。

**实施方案**：
1. 减少 Framer Motion 使用范围，仅对当前活动行使用
2. 非活动行改用 CSS 动画（flash 效果、pulse 效果）
3. 歌词行使用 `will-change: transform` 提示浏览器优化
4. 优化歌词滚动逻辑，减少重排重绘

**预期收益**：
- 歌词页面主线程占用减少 40%
- 全屏歌词切换更流畅
- 低端设备体验改善

**验证方法**：
- Performance 面板：主线程占用
- Lighthouse：INP 指标
- 实际体验：低端设备上的流畅度

---

## 三、P1 阶段：性能与体验提升

### P1-1：Bundle 分析与瘦身

**问题**：首屏 JS 体积 ~177KB，可能存在可优化空间。

**实施方案**：
1. 集成 `@next/bundle-analyzer` ✅
2. 运行 `ANALYZE=true npm run build` 生成分析报告
3. 识别大型依赖，制定瘦身策略：
   - 替换轻量替代库
   - 按需加载（动态 import）
   - Tree Shaking 优化

**预期收益**：
- 首屏 JS 减少 15-30%
- TTI 提升 20-30%

**验证方法**：
- Bundle Analyzer 报告对比
- Lighthouse："Reduce JavaScript execution time"
- 构建产物大小对比

---

### P1-2：API 请求内存缓存层 ✅ 已完成

**问题**：用户在页面间快速导航时，相同 API 被重复请求，浪费网络资源，体验卡顿。

**实施方案**：
1. 在 `api.ts` 中添加内存缓存（Map 存储）
2. GET 请求默认缓存 30 秒，可配置 TTL
3. POST/PUT/PATCH/DELETE 自动清除相关缓存
4. 提供 `invalidateCache` 手动清除方法
5. SSR 场景不使用缓存（Next.js 自有 revalidate 机制）

**预期收益**：
- 重复导航时数据秒级呈现
- 减少 30-50% 的冗余 API 请求
- 减轻后端压力

**验证方法**：
- Network 面板：重复导航时请求数量
- 实际体验：页面切换速度
- Lighthouse："Reduce unused JavaScript"（间接）

---

### P1-3：代码分割与动态导入 ✅ 已完成

**问题**：部分重型组件（如 FullScreenPlayer、QueuePanel）在首屏即加载，增加首屏 JS 体积。

**实施方案**：
1. **FullScreenPlayer**：已动态导入（framer-motion + 歌词视图 + 音频缓存）
2. **QueuePanel**：已动态导入（PC 端队列面板）
3. **LoginSheet**：已动态导入（401 或主动触发时加载）
4. **UpdateDialog**：已动态导入（延迟检查更新）
5. **InstallPrompt**：已动态导入（PWA 安装提示）
6. **AudioEngine（howler）**：已动态导入（用户首次播放时加载）

**验证结果**：
- 首屏 JS 共享体积 ~102KB
- 重型组件（FullScreenPlayer、howler、dnd-kit 等）均按需加载

**预期收益**：
- 首屏 JS 减少 30-40KB（对比全量导入）
- TTI 提升 15-20%

---

### P1-4：可访问性提升 ✅ 部分完成

**问题**：缺少无障碍支持，影响屏幕阅读器用户和键盘操作体验。

**实施方案**：
1. **Skip to Content 链接** ✅
   - 页面顶部添加跳转主内容链接
   - 仅 Tab 聚焦时可见
   - 对应 `main` 元素添加 `id="main-content"`

2. **ARIA 标签** ✅
   - 播放控件添加 `aria-label`（播放/暂停/上一首/下一首/音量）
   - 图标按钮添加可读标签（搜索/个人中心/队列/展开播放页）
   - 面板添加 `aria-label`（播放队列）
   - 动态内容区域添加 `aria-live`（待完善）

3. **键盘快捷键** ✅
   - `/`：聚焦搜索框
   - 空格：播放/暂停
   - 左右箭头：上一首/下一首
   - 上下箭头：音量 +/-
   - M：静音切换
   - F：全屏歌词切换

4. **颜色对比度**
   - 检查所有文本与背景的对比度
   - 确保 WCAG AA 级标准（4.5:1）

**预期收益**：
- Lighthouse Accessibility 分数 ≥ 95
- 键盘用户可完整操作
- 屏幕阅读器可用性提升

**验证方法**：
- Lighthouse：Accessibility 分数
- axe DevTools 扫描
- 键盘导航测试（Tab / Enter / Space）

---

## 四、P2 阶段：架构与长期优化

### P2-1：PWA 增强与离线体验

**问题**：已集成 next-pwa，但离线体验和缓存策略可优化。

**实施方案**：
1. 优化 Service Worker 缓存策略
   - 静态资源：CacheFirst
   - API 数据：StaleWhileRevalidate
   - HTML：NetworkFirst
2. 离线降级页面
3. 后台同步（收藏、播放记录）

**预期收益**：
- 二次访问速度极快
- 弱网/离线环境可用
- PWA 安装体验更好

**验证方法**：
- Lighthouse：PWA 分数
- 离线模式测试
- 重复访问加载速度

---

### P2-2：流式 SSR 与 Suspense 边界

**问题**：部分页面数据获取串行，首字节时间（TTFB）长。

**实施方案**：
1. 使用 React 19 Streaming SSR
2. 页面拆分为多个 Suspense 边界
3. 非关键数据延迟加载，先展示骨架屏
4. 利用 Next.js App Router 的 Loading UI

**预期收益**：
- TTFB 减少 30-50%
- 首屏可交互时间提前
- 用户感知速度提升

**验证方法**：
- Lighthouse：LCP、TTFB
- WebPageTest：瀑布图
- 实际体验：首屏内容出现速度

---

### P2-3：字体优化

**问题**：已使用 next/font，但可进一步优化。

**实施方案**：
1. 确认 `display: swap` 已启用 ✅
2. 预加载关键字重
3. 考虑子集化（中文字体）
4. 使用系统字体降级策略

**预期收益**：
- FOIT/FOUT 减少
- 文字更早可见
- LCP 提升

**验证方法**：
- Lighthouse："Ensure text remains visible during webfont load"
- Performance 面板：字体加载时间

---

### P2-4：尊重 prefers-reduced-motion ✅ 已完成

**问题**：动画可能给前庭功能障碍用户带来不适。

**实施方案**：
1. 在 `globals.css` 中添加 `@media (prefers-reduced-motion: reduce)` 规则
2. 禁用/简化非必要动画
3. Framer Motion 动画检查 `useReducedMotion`
4. 过渡动画简化为淡入淡出

**预期收益**：
- 符合无障碍最佳实践
- 尊重用户系统设置
- 低端设备性能提升（副作用）

**验证方法**：
- 系统设置开启"减少动态效果"后测试
- Lighthouse：Accessibility 相关检查项

---

## 五、Lighthouse 验证流程

### 5.1 环境准备

```bash
# 构建生产版本
cd music-web
npm run build

# 启动生产服务器
npm start
```

### 5.2 测量命令

```bash
# 方法一：Chrome DevTools
# 打开 DevTools → Lighthouse 面板 → 勾选 Performance/Accessibility/Best Practices/PWA → Generate report

# 方法二：Lighthouse CI（推荐，可自动化）
npx lighthouse http://localhost:3000 --view --output html --output-path ./reports/lighthouse-home.html

# 方法三：PageSpeed Insights（在线）
# 访问 https://pagespeed.web.dev/
```

### 5.3 关键测量页面

| 页面 | URL | 说明 |
|------|-----|------|
| 首页 | `/` | 核心指标基准 |
| 歌单详情 | `/playlist/[id]` | 长列表+图片 |
| 搜索页 | `/search` | 交互密集 |
| 播放页 | `/`（打开全屏歌词） | 动画性能 |
| 排行榜 | `/rankings` | 多列表 |

### 5.4 基线测量（优化前）

> ⚠️ 请在开始优化前先运行一次 Lighthouse，记录基线数据。

```
Performance:    ___ / 100
Accessibility:  ___ / 100
Best Practices: ___ / 100
SEO:           ___ / 100

LCP: ___ s
INP: ___ ms
CLS: ___
FCP: ___ s
TTI: ___ s
```

### 5.5 阶段验收标准

**P0 验收**：
- [ ] Performance ≥ 70
- [ ] LCP < 2.5s
- [ ] CLS < 0.1
- [ ] 图片优化审计项全部通过

**P1 验收**：
- [ ] Performance ≥ 85
- [ ] LCP < 2.0s
- [ ] INP < 50ms
- [ ] Accessibility ≥ 90
- [ ] 首屏 JS 减少 20%+

**P2 验收**：
- [ ] Performance ≥ 90
- [ ] LCP < 1.5s
- [ ] INP < 20ms
- [ ] CLS < 0.02
- [ ] PWA 可安装
- [ ] Accessibility ≥ 95

---

## 六、监控与持续优化

### 6.1 Web Vitals 上报

集成 Next.js Web Vitals 上报：

```tsx
// app/web-vitals.ts（Next.js 内置支持）
export function reportWebVitals(metric: any) {
  console.log(metric);
  // 发送到监控平台
}
```

### 6.2 定期审计

- 每周一次 Lighthouse 全量扫描
- 每次发版前后对比核心指标
- 建立性能预算，超出告警

### 6.3 性能预算建议

| 指标 | 预算值 |
|------|--------|
| 首屏 JS | < 150KB (gzip) |
| 首屏图片 | < 200KB |
| 首屏 CSS | < 30KB |
| 第三方脚本 | < 50KB |
| DOM 节点数 | < 1500 |

---

## 七、已完成优化清单

### ✅ P0 已完成
- [x] P0-1.1: next.config.mjs images 配置
- [x] P0-1.2: AppImage 通用组件创建
- [x] P0-1.3: BannerCarousel 图片替换
- [x] P0-1.4: SongList 封面图片替换
- [x] P0-1.5: PlaylistCard/AlbumCard/SongCard 封面替换
- [x] P0-1.6: MiniPlayer/FullScreenPlayer 封面替换
- [x] P0-1.7: 其他组件图片替换（LiveSessionCard、QueueSheet、QueuePanel、Sidebar、登录组件、搜索结果等）
- [x] P0-2: 长列表虚拟滚动组件
- [x] P0-3: 歌词渲染性能优化

### ✅ P1 已完成
- [x] P1-1: Bundle Analyzer 集成
- [x] P1-2: API 请求内存缓存层
- [x] P1-3: 代码分割与动态导入（FullScreenPlayer、QueuePanel、LoginSheet、AudioEngine 等）
- [x] P1-4.1: Skip to Content 链接
- [x] P1-4.2: ARIA 标签完善
- [x] P1-4.3: 键盘快捷键

### ✅ P2 已完成
- [x] P2-4: prefers-reduced-motion 支持

---

## 八、待优化项

### ⏳ P1 待开始
- [ ] P1-4.4: 颜色对比度检查

### ⏳ P2 待开始
- [ ] P2-1: PWA 增强与离线体验
- [ ] P2-2: 流式 SSR 与 Suspense 边界
- [ ] P2-3: 字体优化（中文子集化）

---

## 九、快速开始

### 运行 Bundle 分析

```bash
cd music-web
ANALYZE=true npm run build
# 自动打开浏览器查看分析报告
```

### 运行 Lighthouse

```bash
# 1. 启动生产服务器
cd music-web
npm run build && npm start

# 2. 新开终端，运行 Lighthouse
npx lighthouse http://localhost:3000 --view
```

### 查看优化效果

1. 优化前运行一次 Lighthouse，保存报告
2. 优化后再次运行，对比分数变化
3. 关注核心指标（LCP、INP、CLS）的改善

---

*文档生成时间：2026 年*
*维护者：前端性能小组*
