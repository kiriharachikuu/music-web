import withPWAInit from "next-pwa";

/**
 * next-pwa 集成
 * - dest: "public" → 生产构建生成 sw.js 到 public 目录
 * - register: true → 自动注册 Service Worker
 * - disable: 开发环境关闭，避免热更新被缓存干扰
 *
 * 离线缓存策略（runtimeCaching）：
 * - 音频：CacheFirst（优先缓存，离线可播）
 * - 封面/图片：StaleWhileRevalidate（即时显示 + 后台更新）
 * - API：NetworkFirst（优先网络，超时回退缓存）
 */
const withPWA = withPWAInit({
  dest: "public",
  register: true,
  disable: process.env.NODE_ENV === "development",
  runtimeCaching: [
    // 音频资源（CacheFirst，离线可播，限制缓存数量以节省空间）
    {
      urlPattern: /\.(?:mp3|flac|wav|ogg|aac|m4a)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "xt-audio-cache",
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 14 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // 封面 / 图片
    {
      urlPattern: /\.(?:png|jpg|jpeg|gif|webp|svg|avif)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "xt-image-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // 接口（NetworkFirst，超时 5s 回退缓存）
    {
      urlPattern: /^\/api\//i,
      handler: "NetworkFirst",
      options: {
        cacheName: "xt-api-cache",
        networkTimeoutSeconds: 5,
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 开发环境下将 /api 和 /uploads 代理到后端（3000 端口）
  // 生产环境由 Nginx 统一反向代理
  async rewrites() {
    const backendOrigin =
      process.env.BACKEND_ORIGIN || "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default withPWA(nextConfig);

/*
 * PWA 验收提醒（spec 8.13）：
 * 1. manifest.json display 必须为 standalone（已配置）→ 安装后无浏览器 UI
 * 2. icons 需含 192 + 512 且 purpose 含 "any maskable"（已配置）
 * 3. 需在 HTTPS（或 localhost）下 Service Worker 才会激活
 * 4. 引导用户用「安装应用 / 添加到主屏幕」，而非「添加书签」
 * 5. 生产构建（next build && next start）才会生成 SW；dev 环境已禁用
 */
