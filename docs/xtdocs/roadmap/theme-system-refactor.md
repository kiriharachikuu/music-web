# 主题系统 CSS 变量重构方案

> 本文为「百变星瞳」主题系统的**最小影响**重构方案。  
> 目标：让主题切换从「只改色」升级为「色彩 + 装饰 + 资源」一体化切换。

---

## 1. 现状分析

### 当前结构

`app/globals.css` 中主题由三部分组成：

1. `:root` —— 亮色基色
2. `.dark` —— 暗色基色
3. `[data-theme="sky"]` / `[data-theme="pink"]` 等 —— 主题覆盖（亮 + 暗）

调用方式：

- Tailwind：`hsl(var(--primary))` 等
- 自定义类：直接 `style={{ color: 'hsl(var(--primary))' }}`

### 已有优点

- 颜色用 HSL 通道变量，可以单独调整色相 / 饱和度 / 亮度
- 已用 `next-themes` 管理 `.dark`
- 主题通过属性选择器叠加，互不冲突

### 现有不足

1. **只有色变量**，没有「主题背景 / 立绘 / 装饰元素」变量
2. **主题数量硬编码**在 CSS 里，新增主题要改源码
3. **主题元信息**（名称 / 作者 / 预览图）没有持久化
4. **运行时切换主题**只能换色，装饰不能换
5. **主题选择 UI** 还没有

---

## 2. 重构目标

- 保持现有 `next-themes` + CSS 变量机制
- 扩展变量：颜色 + 装饰资源 + 阴影 / 圆角 / 字体
- 主题元信息（名称 / 作者 / 预览）做成 TypeScript 模块
- 主题切换实时生效
- 首版内置 2-3 套主题

---

## 3. 变量扩展方案

## 3.1 颜色变量（已有 + 微调）

保持现有命名，不破坏 Tailwind 配置：

```css
/* === 已有的颜色变量，保持不变 === */
--background
--foreground
--card
--card-foreground
--popover
--popover-foreground
--primary
--primary-foreground
--secondary
--secondary-foreground
--muted
--muted-foreground
--accent
--accent-foreground
--destructive
--destructive-foreground
--border
--input
--ring
--radius
```

## 3.2 新增：装饰资源变量

把背景、立绘、装饰元素提取为 CSS 变量，支持主题切换：

```css
/* === 新增：主题装饰资源 === */

/* 主题背景图（用于启动页 / 登录页 / 特殊页面） */
--theme-bg-image: url("/themes/xingtone-default/bg.jpg");

/* 主题装饰立绘（用于全屏播放页 / 启动页） */
--theme-illust: url("/themes/xingtone-default/illust.webp");

/* 主题色版光晕（用于背景 radial-gradient） */
--theme-glow-1: hsl(273 100% 50% / 0.35);
--theme-glow-2: hsl(0 0% 0% / 0.75);

/* 主题字体（可选） */
--theme-font: "PingFang SC", system-ui, sans-serif;

/* 主题封面卡片阴影（基于主色计算） */
--theme-shadow-soft: 0 8px 32px hsl(var(--primary) / 0.15);
--theme-shadow-strong: 0 12px 48px hsl(var(--primary) / 0.35);
```

## 3.3 新增：进度条 / 渐变变量

把之前写死的 hex 颜色提取出来：

```css
/* === 已有的渐变变量，主题化 === */
--progress-from: hsl(var(--primary) / 0.95);
--progress-to: hsl(var(--primary) / 0.75);
--sidebar-active-bg: hsl(var(--primary) / 0.1);
```

主题切换时，这些变量会跟着 `--primary` 自动变化。

---

## 4. CSS 主题结构

## 4.1 主题分层

```css
/* 默认主题：星瞳紫（亮色） */
:root {
  /* 颜色 */
  --primary: 273 100% 50%;
  /* 装饰资源 */
  --theme-bg-image: url("/themes/xingtone-purple/bg.jpg");
  --theme-illust: url("/themes/xingtone-purple/illust.webp");
  --theme-glow-1: hsl(273 100% 50% / 0.35);
  --theme-glow-2: hsl(0 0% 0% / 0.75);
}

/* 默认主题：星瞳紫（暗色） */
:root.dark,
[data-mode="dark"] {
  --primary: 273 100% 56%;
  --theme-bg-image: url("/themes/xingtone-purple/bg-dark.jpg");
  --theme-illust: url("/themes/xingtone-purple/illust-dark.webp");
  --theme-glow-1: hsl(273 100% 50% / 0.25);
  --theme-glow-2: hsl(0 0% 0% / 0.85);
}

/* 主题：天空蓝（亮色） */
[data-theme="sky"] {
  --primary: 214 100% 50%;
  --theme-bg-image: url("/themes/sky/bg.jpg");
  --theme-illust: url("/themes/sky/illust.webp");
  --theme-glow-1: hsl(214 100% 50% / 0.35);
}

/* 主题：天空蓝（暗色） */
[data-theme="sky"][data-mode="dark"] {
  --primary: 214 100% 58%;
  --theme-bg-image: url("/themes/sky/bg-dark.jpg");
}

/* 主题：樱粉（亮色） */
[data-theme="pink"] {
  --primary: 350 100% 61%;
  --theme-bg-image: url("/themes/pink/bg.jpg");
}
```

## 4.2 主题加载顺序

页面 `<html>` 上会有两个属性：

- `data-mode="light" | "dark"`（由 `next-themes` 控制）
- `data-theme="xingtone-purple" | "sky" | "pink"`（由主题系统控制）

CSS 优先级：

```
[data-theme] > [data-mode="dark"] > :root
```

例如「暗色 + 樱粉主题」会同时匹配：

- `[data-theme="pink"]`
- `[data-mode="dark"]`

覆盖规则：先按主题，再按模式。

---

## 5. 主题元信息

把主题元信息抽到 TypeScript 文件，方便运行时切换：

```ts
// lib/theme/themes.ts
export type ThemeId = "xingtone-purple" | "sky" | "pink";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  author: string;
  source?: string;       // 例如 "Bilibili / 百变星瞳"
  preview: string;       // 预览图 URL
  // 可选：是否仅亮色 / 仅暗色
  supportsDark: boolean;
  supportsLight: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: "xingtone-purple",
    name: "星瞳紫",
    description: "默认主题，星瞳官方配色",
    author: "XingTone 官方",
    preview: "/themes/xingtone-purple/preview.png",
    supportsDark: true,
    supportsLight: true,
  },
  {
    id: "sky",
    name: "天空蓝",
    description: "iOS 系统蓝风格",
    author: "XingTone 官方",
    preview: "/themes/sky/preview.png",
    supportsDark: true,
    supportsLight: true,
  },
  {
    id: "pink",
    name: "樱粉",
    description: "温柔粉色主题",
    author: "XingTone 官方",
    preview: "/themes/pink/preview.png",
    supportsDark: true,
    supportsLight: true,
  },
];

export const DEFAULT_THEME: ThemeId = "xingtone-purple";
```

---

## 6. 主题 Store

复用 Zustand 模式，和其他全局状态一致：

```ts
// lib/store/theme-store.ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_THEME,
  type ThemeId,
} from "@/lib/theme/themes";

interface ThemeState {
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: DEFAULT_THEME,
      setTheme: (id) => {
        // 1. 更新 data-theme 属性
        document.documentElement.setAttribute("data-theme", id);
        // 2. 更新 store
        set({ themeId: id });
      },
    }),
    {
      name: "xingtone-theme",
      onRehydrateStorage: () => (state) => {
        if (state?.themeId) {
          document.documentElement.setAttribute("data-theme", state.themeId);
        }
      },
    }
  )
);
```

---

## 7. 主题注入脚本

由于主题是客户端切换的，要在 hydration 之前就应用，避免主题闪烁：

```ts
// lib/theme/init.ts
const THEME_STORAGE_KEY = "xingtone-theme";

export function initTheme() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const themeId = parsed?.state?.themeId as string | undefined;
    if (themeId) {
      document.documentElement.setAttribute("data-theme", themeId);
    }
  } catch {
    // 静默失败
  }
}
```

在 `app/layout.tsx` 的 `<head>` 中注入：

```tsx
<head>
  <script
    dangerouslySetInnerHTML={{
      __html: `(${initTheme.toString()})()`,
    }}
  />
</head>
```

---

## 8. 主题切换组件

```tsx
// components/settings/theme-selector.tsx
"use client";

import { THEMES } from "@/lib/theme/themes";
import { useThemeStore } from "@/lib/store/theme-store";

export function ThemeSelector() {
  const themeId = useThemeStore((s) => s.themeId);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="grid grid-cols-3 gap-3">
      {THEMES.map((theme) => {
        const active = theme.id === themeId;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setTheme(theme.id)}
            className={`rounded-xl border p-2 transition-all ${
              active
                ? "border-primary ring-2 ring-primary"
                : "border-border hover:border-primary/50"
            }`}
            aria-pressed={active}
          >
            <img
              src={theme.preview}
              alt={theme.name}
              className="aspect-video w-full rounded-lg object-cover"
            />
            <div className="mt-2 text-sm font-semibold">{theme.name}</div>
            <div className="text-xs text-muted-foreground">
              {theme.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

---

## 9. 装饰资源使用示例

启动页背景：

```tsx
<div
  className="absolute inset-0 bg-cover bg-center"
  style={{ backgroundImage: "var(--theme-bg-image)" }}
/>
```

全屏播放页背景光晕：

```tsx
<div
  className="absolute inset-0"
  style={{
    background: `
      radial-gradient(circle at center, var(--theme-glow-1), var(--theme-glow-2))
    `,
  }}
/>
```

卡片阴影：

```tsx
<div
  className="rounded-2xl bg-card"
  style={{ boxShadow: "var(--theme-shadow-soft)" }}
/>
```

---

## 10. 资源存放

主题资源放公共目录：

```
public/
  themes/
    xingtone-purple/
      bg.jpg
      bg-dark.jpg
      illust.webp
      preview.png
    sky/
      bg.jpg
      illust.webp
      preview.png
    pink/
      bg.jpg
      preview.png
```

要求：

- 体积优化：每套主题总资源 < 2MB
- 格式：背景 jpg、立绘 webp、预览 png
- 命名统一：`{mode}.{ext}`

---

## 11. 实施步骤

### 第 1 步：扩展 CSS 变量（不动现有颜色）

- 在 `app/globals.css` 添加装饰变量
- 不改变现有 `:root` 和 `.dark` 块

### 第 2 步：抽出主题元信息

- 新建 `lib/theme/themes.ts`
- 把 `xingtone-purple` 设为默认主题

### 第 3 步：建立主题 Store

- 新建 `lib/store/theme-store.ts`
- 在 layout 中调用 `initTheme()`

### 第 4 步：制作主题资源

- 把「百变星瞳_package」中的资源整理为规范结构
- 抽取 2-3 套主题放入 `public/themes/`

### 第 5 步：实现主题选择 UI

- 新建 `components/settings/theme-selector.tsx`
- 在设置页加入口

### 第 6 步：替换硬编码颜色

- 把启动页、全屏播放页、登录页中的硬编码 `bg-black/40` 等替换为变量

### 第 7 步：测试主题切换

- 验证亮 / 暗 + 多主题组合
- 验证刷新后主题保持
- 验证 TWA 中无闪烁

---

## 12. 兼容性

- 现有 `[data-theme="sky"]` 等规则可保留，作为内置主题的 CSS 兜底
- Tailwind 类 `bg-primary` 等不受影响（仍走 HSL 变量）
- 不需要修改组件代码即可让现有页面适配主题

---

## 13. 后续扩展

- 主题市场：用户上传 / 共享
- 主题自动切换：白天 / 夜晚 / 节假日
- 主题与封面联动：根据当前播放歌曲自动适配
- 主题音效：每套主题带不同提示音
