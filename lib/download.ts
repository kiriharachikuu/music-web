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
import { fetchAndCacheLyric, isLyricCached, fetchLyric } from "@/lib/db/lyric-cache";
import { getPlatform } from "@/lib/platform/detect";
import { androidBridge } from "@/lib/jsbridge/android-bridge";
import { setupDownloadListeners, removeDownloadListeners } from "@/lib/jsbridge/native-events";
import { useDownloadProgressStore } from "@/lib/store/download-progress-store";

/**
 * XingTone —— 下载触发器
 *
 * 平台差异：
 * - Desktop（Electron）：通过 IPC 由主进程下载到 %USERPROFILE%/Music/XingTone/，
 *   进度通过 onDownloadProgress 事件回传，本地文件可离线播放
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

function isDesktop(): boolean {
  return getPlatform().isElectron;
}

/** 获取渲染进程可用的 desktop IPC 接口 */
function getDesktopAPI() {
  if (typeof window === "undefined") return null;
  return window.electronAPI ?? null;
}

/** 监听主进程下载进度（由 UI 层注册一次） */
export function onDesktopDownloadProgress(
  cb: (item: {
    id: string;
    progress: number;
    state: "pending" | "downloading" | "completed" | "error";
    error?: string;
  }) => void
): () => void {
  const api = getDesktopAPI();
  if (!api?.onDownloadProgress) return () => {};
  return api.onDownloadProgress(cb);
}

/**
 * 把 Desktop 主进程下载进度同步到 download-progress-store
 * - 应用启动时调用一次即可（模块级单例，幂等）
 * - state: "completed" / "error" 时从 inFlight 移除（completed 由 listDownloads 接管展示）
 */
let _desktopProgressBridgeInstalled = false;
export function installDesktopProgressBridge(): void {
  if (_desktopProgressBridgeInstalled) return;
  if (!isDesktop()) return;
  const api = getDesktopAPI();
  if (!api?.onDownloadProgress) return;
  _desktopProgressBridgeInstalled = true;
  api.onDownloadProgress((item) => {
    const store = useDownloadProgressStore.getState();
    if (item.state === "completed" || item.state === "error") {
      if (item.state === "error") {
        store.markError(item.id, item.error);
        // 失败态短暂展示后清理，避免永久占据 inFlight
        setTimeout(() => store.clear(item.id), 4000);
      } else {
        store.clear(item.id);
      }
      return;
    }
    // pending / downloading：更新进度（pending 默认 0）
    store.updateProgress(item.id, item.progress ?? 0);
  });
}

/**
 * 下载并缓存一首歌曲
 * @throws 网络错误或后端不可达时抛 Error
 */
export async function downloadSong(song: ApiSong): Promise<DownloadResult> {
  // ========== Desktop（Electron） ==========
  if (isDesktop()) {
    const api = getDesktopAPI();
    if (!api?.downloadFile) {
      throw new Error("桌面下载接口不可用");
    }
    const existing = await api.getLocalPath?.(song.id);
    if (existing) {
      return { cached: true, newlyDownloaded: false, size: 0 };
    }
    const url = resolveMediaUrl(song.fileUrl);
    if (!url) {
      throw new Error("音频地址无效");
    }
    const token = getToken();
    const fileName = `${song.artist} - ${song.title}`.replace(/[<>:"/\\|?*]/g, "_");
    // 注册到进度 store（Desktop 侧由 onDownloadProgress 持续更新）
    useDownloadProgressStore.getState().register(song);
    // 异步触发下载，不等待完成（UI 通过 onDownloadProgress 监听进度）
    api
      .downloadFile(url, `${fileName}.mp3`, {
        songId: song.id,
        title: song.title,
        artist: song.artist,
        albumName: song.albumName || "",
        coverUrl: song.coverUrl || "",
        fileUrl: song.fileUrl,
        token,
      })
      .catch(() => {
        // 错误由 onDownloadProgress 事件回传
      });
    fetchAndCacheLyric(song.id).catch(() => {});
    return { cached: true, newlyDownloaded: true, size: 0 };
  }

  // ========== TWA ==========
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

    // TWA: 同时缓存歌词到原生存储，供离线页面使用
    (async () => {
      try {
        const lrc = await fetchLyric(song.id);
        if (lrc) {
          androidBridge.cacheLyric(song.id, lrc);
        }
      } catch {}
    })();

    // TWA 原生未回传中间进度，按 0% 占位直到完成/失败
    useDownloadProgressStore.getState().register(song);

    return new Promise<DownloadResult>((resolve, reject) => {
      // 按 songId 注册回调，支持并发下载；Promise 完成后移除避免内存泄漏
      setupDownloadListeners(song.id, {
        onComplete: (sid, size) => {
          useDownloadProgressStore.getState().clear(sid);
          removeDownloadListeners(sid);
          resolve({ cached: true, newlyDownloaded: true, size });
        },
        onError: (sid, msg) => {
          useDownloadProgressStore.getState().markError(sid, msg);
          removeDownloadListeners(sid);
          reject(new Error(msg || "下载失败"));
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

  // ========== 浏览器（IndexedDB） ==========
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

  // 注册到进度 store；浏览器侧用流式读取计算 0~100 进度
  useDownloadProgressStore.getState().register(song);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers,
      credentials: "include",
    });
  } catch {
    useDownloadProgressStore.getState().markError(song.id, "网络请求失败");
    throw new Error("网络请求失败，请检查网络后重试");
  }

  if (!res.ok) {
    useDownloadProgressStore.getState().markError(song.id, `HTTP ${res.status}`);
    throw new Error(`下载失败 (${res.status})`);
  }

  // 流式读取：边读边更新进度，最终拼装为 Blob
  const contentLengthHeader = res.headers.get("content-length");
  const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  const reader = res.body?.getReader();
  let blob: Blob;
  if (reader) {
    const chunks: BlobPart[] = [];
    let received = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        // 显式拷贝为独立 ArrayBuffer，避免 SharedArrayBuffer 类型不匹配
        const copy = new Uint8Array(value.byteLength);
        copy.set(value);
        chunks.push(copy);
        received += value.byteLength;
        if (totalBytes > 0) {
          useDownloadProgressStore
            .getState()
            .updateProgress(song.id, (received / totalBytes) * 100);
        }
      }
    }
    blob = new Blob(chunks, { type: res.headers.get("content-type") || "audio/mpeg" });
  } else {
    // 浏览器不支持流式读取时，回退为一次性读取
    blob = await res.blob();
  }

  if (blob.size === 0) {
    useDownloadProgressStore.getState().markError(song.id, "音频内容为空");
    throw new Error("音频内容为空");
  }

  await cacheAudio(song, blob);
  useDownloadProgressStore.getState().clear(song.id);

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
  if (isDesktop()) {
    const api = getDesktopAPI();
    if (api?.getLocalPath) {
      const p = await api.getLocalPath(songId);
      return !!p;
    }
    return false;
  }
  if (isTWA()) {
    return androidBridge.isSongDownloaded(songId);
  }
  return isCached(songId);
}

/**
 * 判断下载功能是否对外展示
 * - 仅 Desktop（Electron 客户端）与 Android（TWA 增强壳）展示下载入口
 * - 浏览器 / 浏览器 PWA / iOS Safari 不提供离线缓存，因此不展示
 */
export function isDownloadAvailable(): boolean {
  const p = getPlatform();
  return p.isTWA || p.isElectron;
}

/**
 * 获取已下载歌曲的本地播放 URL
 * - Desktop：通过 IPC 查询本地文件路径，返回 file:// URL
 * - TWA：返回 file:// 绝对路径
 * - 浏览器：返回 blob: URL
 * - 未下载：返回 null
 */
export async function getCachedUrl(songId: string): Promise<string | null> {
  if (isDesktop()) {
    const api = getDesktopAPI();
    if (api?.getLocalPath) {
      const localPath = await api.getLocalPath(songId);
      if (localPath) {
        // Windows 本地路径需转换为 file:// URL
        const normalized = localPath.replace(/\\/g, "/");
        return normalized.startsWith("/")
          ? `file://${normalized}`
          : `file:///${normalized}`;
      }
    }
    return null;
  }
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
  localCoverPath?: string; // TWA 本地封面路径（file:// 前缀）
  localPath?: string; // Desktop 本地文件绝对路径
}

/** 获取已下载列表（按 cachedAt 降序） */
export async function listDownloads(): Promise<DownloadListItem[]> {
  if (isDesktop()) {
    const api = getDesktopAPI();
    if (!api?.getDownloads) return [];
    const items = await api.getDownloads();
    return items
      .map((item) => {
        const meta = (item.meta || {}) as Record<string, unknown>;
        return {
          songId: item.id,
          size: item.size || 0,
          cachedAt: (meta.downloadedAt as number) || Date.now(),
          localPath: item.localPath,
          song: {
            id: item.id,
            title: (meta.title as string) || item.fileName,
            artist: (meta.artist as string) || "未知歌手",
            albumName: (meta.albumName as string) || "",
            coverUrl: (meta.coverUrl as string) || "",
            fileUrl: (meta.fileUrl as string) || item.url,
            duration: 0,
          } as ApiSong,
        } as DownloadListItem;
      })
      .sort((a, b) => b.cachedAt - a.cachedAt);
  }
  if (isTWA()) {
    const list = androidBridge.listDownloadedSongs();
    return list
      .map((item) => ({
        songId: item.songId,
        size: item.size,
        cachedAt: item.cachedAt,
        localCoverPath: item.localCoverPath || undefined,
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
  if (isDesktop()) {
    const api = getDesktopAPI();
    if (!api?.getDownloads) return 0;
    const items = await api.getDownloads();
    return items.reduce((sum, item) => sum + (item.size || 0), 0);
  }
  if (isTWA()) {
    return androidBridge.getDownloadedTotalSize();
  }
  return getCacheSizeWeb();
}

/** 删除单条下载 */
export async function removeDownload(songId: string): Promise<void> {
  if (isDesktop()) {
    const api = getDesktopAPI();
    if (api?.removeDownload) {
      await api.removeDownload(songId);
    }
    return;
  }
  if (isTWA()) {
    androidBridge.removeDownloadedSong(songId);
    return;
  }
  return removeDownloadWeb(songId);
}

/** 清空全部下载 */
export async function clearAllDownloads(): Promise<void> {
  if (isDesktop()) {
    const api = getDesktopAPI();
    if (!api?.getDownloads) return;
    const items = await api.getDownloads();
    for (const item of items) {
      await api.removeDownload?.(item.id);
    }
    return;
  }
  if (isTWA()) {
    androidBridge.clearAllDownloadedSongs();
    return;
  }
  return clearAllDownloadsWeb();
}

export { getCachedAudio } from "@/lib/db/audio-cache";
