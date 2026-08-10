/**
 * EdgeOne Pages Functions —— 反代 /uploads/* 到后端静态资源
 *
 * 文件名：[[path]].js
 * 触发路径：/uploads/*
 * 后端目标：https://xtmusicapi.chikuu.top/uploads/*
 *
 * 与 api/[[path]].js 区别：
 * 1. 显式禁用 OPTIONS（uploads 是公开 GET，没必要预检）
 * 2. 透传 Range 头（音频 seek 必须）
 * 3. 缓存策略：让浏览器/CDN 长期缓存不可变资源
 */

// @ts-nocheck
const TARGET = "https://xtmusicapi.chikuu.top";

const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
];

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = TARGET + url.pathname + url.search;

  const headers = new Headers(request.headers);
  headers.set("Host", "xtmusicapi.chikuu.top");
  headers.set("X-Forwarded-Host", url.host);

  // 透传 Range（音频断点续传/拖动进度必须）
  if (request.headers.get("range")) {
    headers.set("range", request.headers.get("range") || "");
  }
  if (request.headers.get("if-range")) {
    headers.set("if-range", request.headers.get("if-range") || "");
  }

  const init = {
    method: "GET",
    headers,
    redirect: "manual",
  };

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    return new Response("upstream error: " + String(err?.message || err), {
      status: 502,
    });
  }

  const respHeaders = new Headers(upstream.headers);
  for (const h of HOP_BY_HOP) respHeaders.delete(h);

  // 不可变资源缓存 30 天（带 hash 文件名可用 1 年）
  const lowerPath = url.pathname.toLowerCase();
  if (/\.(mp3|flac|m4a|aac|ogg|wav)$/.test(lowerPath)) {
    respHeaders.set("Cache-Control", "public, max-age=2592000, immutable");
  } else if (/\.(jpg|jpeg|png|webp|gif|avif|svg)$/.test(lowerPath)) {
    respHeaders.set("Cache-Control", "public, max-age=2592000, immutable");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
