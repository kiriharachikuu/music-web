import type { ApiSong } from "@/lib/types";
import { resolveMediaUrl } from "@/lib/utils";
import { getToken } from "@/lib/auth";
import {
  cacheAudio,
  getCachedAudio,
  isCached,
  listDownloads as listDownloadsWeb,
  removeDownload as removeDownloadWeb,
  clearAllDownloads as clearAllDownloadsWeb,
  getCacheSize as getCacheSizeWeb,
  getCachedUrl as getCachedUrlWeb,
} from "@/lib/db/audio-cache";
import { fetchAndCacheLyric, isLyricCached } from "@/lib/db/lyric-cache";
import { getPlatform } from "@/lib/platform/detect";
import { androidBridge } from "@/lib/jsbridge/android-bridge";
import { setupDownloadListeners } from "@/lib/jsbridge/native-events";

/**
 * XingTone —— 下载触发器
 *
 * 平台差异：
 * - TWA 模式（App 内）：由原生 SongDownloadManager 下载到应用沙盒目录
 *   （filesDir/songs/{songId}.mp3），元数据存 SharedPreferences
 * - 浏览器模式：fetch → Blob → IndexedDB（LRU 30 首）
 *
 * 鉴权：音频走 /uploads/ 由 nginx 代理公开访问，
 *      但为兼容需 cookie 鉴权的部署，携带 credentials: "include"。
 *      若存在 Bearer token 也一并带上（兼容受保护资源）。
 */

export interface DownloadResult {
  cached: boolean;
  newlyDownloaded: boolean;
  size: number;
}

function isTWA(): boolean {
  return getPlatform().isTWA;
}

/**
 * 下载并缓存一首歌曲
 * @throws 网络错误或后端不可达时抛 Error
 */
export async function downloadSong(song: ApiSong): Promise<DownloadResult> {
  if (isTWA()) {
    if (androidBridge.isSongDownloaded(song.id)) {
      if (!(await isLyricCached(song.id))) {
        fetchAndCacheLyric(song.id).catch(() => {});
      }
      return { cached: true, newlyDownloaded: false, size: 0 };
    }
    const url = resolveMediaUrl(song.fileUrl);
    if (!url) {
      throw new Error("音频地址无效");
    }
    const token = getToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

    fetchAndCacheLyric(song.id).catch(() => {});

    return new Promise<DownloadResult>((resolve, reject) => {
      setupDownloadListeners({
        onComplete: (sid, size) => {
          if (sid === song.id) {
            resolve({ cached: true, newlyDownloaded: true, size });
          }
        },
        onError: (sid, msg) => {
          if (sid === song.id) {
            reject(new Error(msg || "下载失败"));
          }
        },
      });
      androidBridge.downloadSong(song.id, url, headers, {
        title: song.title,
        artist: song.artist,
        albumName: song.albumName || "",
        coverUrl: song.coverUrl || "",
        fileUrl: song.fileUrl,
      });
    });
  }

  const cached = await getCachedAudio(song.id);
  if (cached) {
    if (!(await isLyricCached(song.id))) {
      fetchAndCacheLyric(song.id).catch(() => {});
    }
    return { cached: true, newlyDownloaded: false, size: 0 };
  }

  const url = resolveMediaUrl(song.fileUrl);
  if (!url) {
    throw new Error("音频地址无效");
  }

  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  fetchAndCacheLyric(song.id).catch(() => {});

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

/** 便捷判断：歌曲是否已下载 */
export async function isDownloaded(songId: string): Promise<boolean> {
  if (isTWA()) {
    return androidBridge.isSongDownloaded(songId);
  }
  return isCached(songId);
}

/** 判断下载功能是否可用（TWA 支持原生下载，浏览器支持 IndexedDB 下载） */
export function isDownloadAvailable(): boolean {
  return true;
}

/**
 * 获取已下载歌曲的本地播放 URL
 * - TWA：返回 file:// 绝对路径
 * - 浏览器：返回 blob: URL
 * - 未下载：返回 null
 */
export async function getCachedUrl(songId: string): Promise<string | null> {
  if (isTWA()) {
    const path = androidBridge.getLocalSongPath(songId);
    return path ? `file://${path}` : null;
  }
  return getCachedUrlWeb(songId);
}

/** 下载列表项（与 IndexedDB 的 DownloadListItem 对齐） */
export interface DownloadListItem {
  songId: string;
  song: ApiSong;
  size: number;
  cachedAt: number;
}

/** 获取已下载列表（按 cachedAt 降序） */
export async function listDownloads(): Promise<DownloadListItem[]> {
  if (isTWA()) {
    const list = androidBridge.listDownloadedSongs();
    return list
      .map((item) => ({
        songId: item.songId,
        size: item.size,
        cachedAt: item.cachedAt,
        song: {
          id: item.songId,
          title: item.title,
          artist: item.artist,
          albumName: item.albumName,
          coverUrl: item.coverUrl,
          fileUrl: item.fileUrl,
          duration: 0,
        } as ApiSong,
      }))
      .sort((a, b) => b.cachedAt - a.cachedAt);
  }
  return listDownloadsWeb();
}

/** 获取总缓存大小（字节） */
export async function getCacheSize(): Promise<number> {
  if (isTWA()) {
    return androidBridge.getDownloadedTotalSize();
  }
  return getCacheSizeWeb();
}

/** 删除单条下载 */
export async function removeDownload(songId: string): Promise<void> {
  if (isTWA()) {
    androidBridge.removeDownloadedSong(songId);
    return;
  }
  return removeDownloadWeb(songId);
}

/** 清空全部下载 */
export async function clearAllDownloads(): Promise<void> {
  if (isTWA()) {
    androidBridge.clearAllDownloadedSongs();
    return;
  }
  return clearAllDownloadsWeb();
}

export { getCachedAudio } from "@/lib/db/audio-cache";
