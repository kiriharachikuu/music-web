import type { ApiSong } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/utils";
import { getToken } from "@/lib/auth";
import { cacheAudio, getCachedAudio, isCached } from "@/lib/db/audio-cache";

/**
 * XingTone —— 下载触发器
 *
 * 流程：
 * 1. 先查本地缓存（getCachedAudio），已缓存直接返回 { cached: true }
 * 2. 未缓存：fetch 音频 URL（resolveMediaUrl 处理相对路径），转 Blob
 * 3. 调用 cacheAudio 存入 IndexedDB（LRU 自动淘汰）
 * 4. 失败抛错，由调用方 toast 提示
 *
 * 鉴权：音频走 /uploads/ 由 nginx 代理公开访问（与 Howler 播放一致），
 *      但为兼容需 cookie 鉴权的部署，携带 credentials: "include"。
 *      若存在 Bearer token 也一并带上（兼容受保护资源）。
 */

export interface DownloadResult {
  /** 是否已缓存（命中或新写入均为 true） */
  cached: boolean;
  /** 本次是否为新下载（false 表示命中已有缓存） */
  newlyDownloaded: boolean;
  /** 下载字节数（命中缓存时为 0） */
  size: number;
}

/**
 * 下载并缓存一首歌曲
 * - 已缓存：直接返回，不重复下载
 * - 未缓存：fetch → blob → 存入 IndexedDB
 * @throws 网络错误或后端不可达时抛 Error
 */
export async function downloadSong(song: ApiSong): Promise<DownloadResult> {
  // 1. 命中缓存
  const cached = await getCachedAudio(song.id);
  if (cached) {
    return { cached: true, newlyDownloaded: false, size: 0 };
  }

  // 2. 拉取音频二进制
  const url = resolveMediaUrl(song.fileUrl);
  if (!url) {
    throw new Error("音频地址无效");
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });
  } catch {
    throw new Error("网络请求失败，请检查网络后重试");
  }

  if (!res.ok) {
    throw new Error(`下载失败 (${res.status})`);
  }

  const blob = await res.blob();
  if (blob.size === 0) {
    throw new Error("音频内容为空");
  }

  // 3. 写入缓存（LRU 内部自动淘汰）
  await cacheAudio(song, blob);

  return { cached: true, newlyDownloaded: true, size: blob.size };
}

/**
 * 批量下载多首歌曲
 * - 串行执行，避免并发拉取打满带宽
 * - 单首失败不中断后续，结果数组中标记 error
 */
export async function downloadSongs(
  songs: ApiSong[]
): Promise<{ song: ApiSong; ok: boolean; error?: string }[]> {
  const results: { song: ApiSong; ok: boolean; error?: string }[] = [];
  for (const song of songs) {
    try {
      await downloadSong(song);
      results.push({ song, ok: true });
    } catch (e) {
      results.push({
        song,
        ok: false,
        error: e instanceof Error ? e.message : "下载失败",
      });
    }
  }
  return results;
}

/** 便捷判断：歌曲是否已下载（仅查询，不更新 cachedAt） */
export async function isDownloaded(songId: string): Promise<boolean> {
  return isCached(songId);
}

// re-export 缓存层方法，调用方无需关心 db 模块路径
export {
  getCachedAudio,
  getCachedUrl,
  listDownloads,
  removeDownload,
  clearAllDownloads,
  getCacheSize,
} from "@/lib/db/audio-cache";
