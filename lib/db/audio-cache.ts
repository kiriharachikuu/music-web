import { openDB, type IDBPDatabase } from "idb";
import type { ApiSong } from "@/lib/types";

/**
 * XingTone —— 音频离线缓存（IndexedDB + LRU）
 *
 * 设计要点：
 * - DB 名：xt-music-cache，版本 1
 * - store `audio`：keyPath=songId，存 { songId, blob, size, cachedAt, song }
 * - store `meta`：keyPath=key，存 { key, value }，用于扩展元数据（如全局配置）
 * - LRU 策略：每次读取更新 cachedAt；超 maxEntries 时淘汰 cachedAt 最小的一条
 * - IndexedDB 原生支持存储 Blob，无需转 base64
 * - 仅在浏览器端可用，SSR 环境下所有方法安全降级（返回 null / 空数组 / 0）
 */

const DB_NAME = "xt-music-cache";
const DB_VERSION = 1;
const STORE_AUDIO = "audio";
const STORE_META = "meta";

/** LRU 最大条目数，超出则淘汰最久未访问 */
const MAX_ENTRIES = 30;

/** audio store 记录结构 */
export interface AudioCacheRecord {
  songId: string;
  blob: Blob;
  /** 字节大小（取自 blob.size，便于汇总展示） */
  size: number;
  /** 最近访问时间戳（ms）；写入与读取时更新 */
  cachedAt: number;
  song: ApiSong;
}

/** 列表展示用的精简结构 */
export interface DownloadListItem {
  songId: string;
  song: ApiSong;
  size: number;
  cachedAt: number;
}

let _dbPromise: Promise<IDBPDatabase> | null = null;

/** 获取（懒加载）IndexedDB 连接，SSR / 不支持时返回 null */
function getDB(): Promise<IDBPDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  if (!_dbPromise) {
    _dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_AUDIO)) {
          db.createObjectStore(STORE_AUDIO, { keyPath: "songId" });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "key" });
        }
      },
    });
  }
  return _dbPromise;
}

/**
 * LRU 淘汰：当条目数 >= MAX_ENTRIES 时，删除 cachedAt 最小的一条
 * - 仅在写入新记录前调用
 */
async function evictIfNeeded(db: IDBPDatabase): Promise<void> {
  const total = await db.count(STORE_AUDIO);
  if (total < MAX_ENTRIES) return;
  // 遍历找 cachedAt 最小的记录（条目数有限，无需索引）
  const all = (await db.getAll(STORE_AUDIO)) as AudioCacheRecord[];
  if (all.length === 0) return;
  let oldest = all[0];
  for (const r of all) {
    if (r.cachedAt < oldest.cachedAt) oldest = r;
  }
  await db.delete(STORE_AUDIO, oldest.songId);
}

/**
 * 缓存音频到 IndexedDB
 * - 若已存在同名记录则覆盖（更新 blob 与 cachedAt，不触发淘汰）
 * - 新增记录时若已达上限，先淘汰最久未访问的记录
 */
export async function cacheAudio(song: ApiSong, blob: Blob): Promise<void> {
  const db = await getDB();
  if (!db) return;
  // 仅新增记录时才需要 LRU 淘汰，覆盖已存在记录时跳过
  const existing = await db.getKey(STORE_AUDIO, song.id);
  if (!existing) {
    await evictIfNeeded(db);
  }
  const record: AudioCacheRecord = {
    songId: song.id,
    blob,
    size: blob.size,
    cachedAt: Date.now(),
    song,
  };
  await db.put(STORE_AUDIO, record);
}

/**
 * 读取缓存的音频并标记为最近访问（更新 cachedAt）
 * - 用于播放时优先取本地缓存
 * - 返回 null 表示未缓存或 DB 不可用
 */
export async function getCachedAudio(
  songId: string
): Promise<{ blob: Blob; song: ApiSong } | null> {
  const db = await getDB();
  if (!db) return null;
  const rec = (await db.get(STORE_AUDIO, songId)) as
    | AudioCacheRecord
    | undefined;
  if (!rec) return null;
  // 更新 cachedAt，标记最近访问
  rec.cachedAt = Date.now();
  await db.put(STORE_AUDIO, rec);
  return { blob: rec.blob, song: rec.song };
}

/**
 * 读取并返回 blob: URL（URL.createObjectURL）
 * - 调用方负责在不再使用时 URL.revokeObjectURL 释放
 * - 返回 null 表示未缓存
 */
export async function getCachedUrl(songId: string): Promise<string | null> {
  const cached = await getCachedAudio(songId);
  if (!cached) return null;
  return URL.createObjectURL(cached.blob);
}

/**
 * 列出所有已缓存歌曲（按 cachedAt 降序，最近访问在前）
 * - 用于"下载管理"页面展示
 */
export async function listDownloads(): Promise<DownloadListItem[]> {
  const db = await getDB();
  if (!db) return [];
  const all = (await db.getAll(STORE_AUDIO)) as AudioCacheRecord[];
  return all
    .map((r) => ({
      songId: r.songId,
      song: r.song,
      size: r.size,
      cachedAt: r.cachedAt,
    }))
    .sort((a, b) => b.cachedAt - a.cachedAt);
}

/** 删除单条缓存 */
export async function removeDownload(songId: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete(STORE_AUDIO, songId);
}

/** 清空全部缓存 */
export async function clearAllDownloads(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.clear(STORE_AUDIO);
}

/**
 * 获取缓存总字节数
 * - 用于"下载管理"顶部展示占用空间
 */
export async function getCacheSize(): Promise<number> {
  const db = await getDB();
  if (!db) return 0;
  const all = (await db.getAll(STORE_AUDIO)) as AudioCacheRecord[];
  return all.reduce((sum, r) => sum + (r.size || 0), 0);
}

/**
 * 判断指定歌曲是否已缓存
 * - 不更新 cachedAt（只读判断）
 */
export async function isCached(songId: string): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;
  const key = await db.getKey(STORE_AUDIO, songId);
  return !!key;
}
