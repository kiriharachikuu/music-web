/**
 * EdgeOne Pages Functions —— 反代 /api/* 与 /uploads/* 到后端
 *
 * 触发路径：/api/* 和 /uploads/*
 * 后端目标：https://xtmusicapi.chikuu.top
 *
 * 部署：放入 music-web/functions/ 目录后 git push 即可
 */

// @ts-nocheck
const TARGET = "https://xtmusicapi.chikuu.top";

const HOP_BY_HOP = [
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
];

function buildCorsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Requested-With",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, HEAD",
    "Access-Control-Max-Age": "86400",
  };
}

export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const targetUrl = TARGET + url.pathname + url.search;

  // 复制请求头 + 改写 Host，避免回源时仍然命中 www.xingtone.site 形成回环
  const headers = new Headers(request.headers);
  headers.set("Host", "xtmusicapi.chikuu.top");
  headers.set("X-Forwarded-Host", url.host);
  headers.set("X-Forwarded-Proto", url.protocol.replace(":", ""));

  // 透传客户端真实 IP
  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for") ||
    "";
  if (clientIp) {
    headers.set("X-Real-IP", clientIp);
    headers.set("X-Forwarded-For", clientIp);
  }

  const init = {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
    redirect: "manual",
  };

  // OPTIONS 预检直接放行
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...buildCorsHeaders(request.headers.get("Origin")),
      },
    });
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, init);
  } catch (err) {
    return new Response(
      JSON.stringify({
        code: 502,
        message: "upstream error",
        data: null,
        detail: String(err?.message || err),
      }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...buildCorsHeaders(request.headers.get("Origin")),
        },
      }
    );
  }

  // 透传上游响应头，但剥离 hop-by-hop 头
  const respHeaders = new Headers(upstream.headers);
  for (const h of HOP_BY_HOP) respHeaders.delete(h);

  // 兜底 CORS（虽然同源 /api 路径走 Pages Functions，但 OPTIONS 跨域会被看到）
  Object.entries(buildCorsHeaders(request.headers.get("Origin"))).forEach(([k, v]) => {
    if (!respHeaders.has(k)) respHeaders.set(k, v);
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
