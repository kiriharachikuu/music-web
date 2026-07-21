/**
 * XingTone —— API 请求层
 *
 * - baseURL 从 NEXT_PUBLIC_API_BASE 读取（默认 /api）
 * - 统一处理 { code, data, message } 响应，直接返回 data
 * - 自动注入 Authorization: Bearer <token> 头（从 auth.ts 读取）
 * - 401 在客户端弹出登录弹窗（不跳转页面），由 auth-store 控制
 * - 提供 api.get / post / put / del 客户端方法
 * - 提供 serverFetch 供 Server Component 使用（带 revalidate + 容错）
 * - GET 请求内存缓存（默认 30s），避免快速导航重复请求
 */
import type { ApiResponse, LiveSession, LiveClipTrack, Paginated } from "@/lib/types";
import { getToken, clearAuth } from "@/lib/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { resolveMediaPaths } from "@/lib/utils";

/** API 基址：客户端与服务端共用（Server Component 中也可读取 env） */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || "/api";

/** 后端管理后台地址（个人中心管理员入口跳转用） */
export const ADMIN_URL =
  process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";

/** 内存缓存：url -> { data, timestamp } */
const cache = new Map<string, { data: unknown; timestamp: number }>();
/** 默认缓存 TTL：30 秒 */
const DEFAULT_CACHE_TTL = 30 * 1000;

/** 清除缓存：不传 pattern 则全部清除，传 pattern 则清除匹配的 */
export function invalidateCache(pattern?: string) {
  if (typeof window === "undefined") return;
  if (!pattern) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
}

/**
 * 带缓存的 GET 请求
 * - 仅客户端生效（SSR 有自己的 revalidate 机制）
 * - 默认缓存 30 秒，可通过 init.cacheTtlMs 自定义
 */
async function cachedGet<T>(
  path: string,
  init?: RequestInit & { cacheTtlMs?: number; skipCache?: boolean }
): Promise<T> {
  if (typeof window === "undefined" || init?.skipCache) {
    return request<T>("GET", path, undefined, init);
  }

  const cacheKey = path;
  const cached = cache.get(cacheKey);
  const ttl = init?.cacheTtlMs ?? DEFAULT_CACHE_TTL;

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data as T;
  }

  const data = await request<T>("GET", path, undefined, init);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}

/**
 * 客户端 / 服务端通用请求方法
 * - 自动注入 Authorization 头（客户端）
 * - 抛出 Error 以便调用方 try/catch
 * - 401：在浏览器环境下清除登录态并跳转登录
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit
): Promise<T> {
  const url = path.startsWith("http") ? path : API_BASE + path;

  // 客户端自动注入 Authorization 头
  const authHeaders: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = getToken();
    if (token && !url.includes("/auth/")) {
      authHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(init?.headers as Record<string, string> | undefined),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: "include",
      ...init,
    });
  } catch (e) {
    // 网络错误 / 后端未启动
    throw new Error("网络请求失败，请稍后重试");
  }

  // 401：未登录，清除登录态并弹出登录弹窗（仅客户端，不跳转页面）
  // auth-store 内部去重，多次 401 仅弹一次
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      clearAuth();
      useAuthStore.getState().openLogin();
    }
    throw new Error("未登录");
  }

  if (!res.ok) {
    // 尝试解析后端错误信息
    let message = `请求失败 (${res.status})`;
    try {
      const json = (await res.json()) as ApiResponse<unknown>;
      if (json?.message) message = json.message;
    } catch {
      /* 忽略解析错误 */
    }
    throw new Error(message);
  }

  // 解析统一响应结构
  const json = (await res.json()) as ApiResponse<T>;
  // 递归解析 /uploads/ 媒体路径为可访问的绝对 URL
  return resolveMediaPaths(json.data);
}

/** 客户端 API 实例 */
export const api = {
  get: <T>(path: string, init?: RequestInit & { cacheTtlMs?: number; skipCache?: boolean }) =>
    cachedGet<T>(path, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => {
    invalidateCache(path);
    return request<T>("POST", path, body, init);
  },
  put: <T>(path: string, body?: unknown, init?: RequestInit) => {
    invalidateCache(path);
    return request<T>("PUT", path, body, init);
  },
  patch: <T>(path: string, body?: unknown, init?: RequestInit) => {
    invalidateCache(path);
    return request<T>("PATCH", path, body, init);
  },
  del: <T>(path: string, init?: RequestInit) => {
    invalidateCache(path);
    return request<T>("DELETE", path, undefined, init);
  },
};

/**
 * Server Component 专用数据获取
 * - 带 revalidate（默认 60s），实现 ISR 数据缓存
 * - 容错：fetch 失败 / 后端未启动时返回 null，保证 SSR 与 build 不中断
 * - 超时控制（6s）：build 时后端可能未就绪，避免 fetch 挂起导致页面收集超时
 * - 不抛错，由调用方判空降级
 */
export async function serverFetch<T>(
  path: string,
  revalidate = 60
): Promise<T | null> {
  const url = path.startsWith("http") ? path : API_BASE + path;
  // 超时中断：防止 build / 运行时 fetch 挂起
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as ApiResponse<T>;
    // SSR 也需要解析媒体路径，确保首屏渲染的图片/音频 URL 正确
    const data = json.data ?? null;
    return data ? resolveMediaPaths(data) : null;
  } catch {
    // 后端未启动 / 网络异常 / 超时：静默降级
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getLiveSessions(
  page?: number,
  limit?: number
): Promise<Paginated<LiveSession>> {
  const params = new URLSearchParams();
  if (page != null) params.set("page", String(page));
  if (limit != null) params.set("limit", String(limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return api.get<Paginated<LiveSession>>(`/live-sessions${query}`);
}

export async function getLiveSession(id: string): Promise<LiveSession & { clips: LiveClipTrack[] }> {
  return api.get<LiveSession & { clips: LiveClipTrack[] }>(`/live-sessions/${id}`);
}

export async function favoriteLiveSession(id: string): Promise<void> {
  return api.post<void>(`/user/live-sessions/${id}/favorite`);
}

export async function unfavoriteLiveSession(id: string): Promise<void> {
  return api.del<void>(`/user/live-sessions/${id}/favorite`);
}

export async function getFavoriteLiveSessions(): Promise<LiveSession[]> {
  return api.get<LiveSession[]>("/user/live-sessions/favorites");
}

// 歌切收藏
export async function favoriteLiveClip(id: string): Promise<{ favorited: boolean }> {
  return api.post<{ favorited: boolean }>(`/user/live-clips/${id}/favorite`);
}

export async function unfavoriteLiveClip(id: string): Promise<{ favorited: boolean }> {
  return api.del<{ favorited: boolean }>(`/user/live-clips/${id}/favorite`);
}

export async function getFavoriteLiveClipIds(): Promise<string[]> {
  return api.get<string[]>("/user/live-clips/favorites");
}

/** 获取已收藏的歌切完整数据列表 */
export async function getFavoriteLiveClips<T = unknown>(): Promise<T[]> {
  return api.get<T[]>("/user/live-clips/favorites/list");
}
