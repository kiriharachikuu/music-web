import { openDB, type IDBPDatabase } from "idb";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

/**
 * XingTone —— 歌词本地缓存（IndexedDB）
 *
 * 设计要点：
 * - 复用 xt-music-cache 数据库，新增 store `lyrics`
 * - store `lyrics`：keyPath=songId，存 { songId, lrc, cachedAt }
 * - 歌词是纯文本（几 KB），无需 LRU，数量与已下载歌曲对齐
 * - SSR 环境下安全降级
 */

const DB_NAME = "xt-music-cache";
const DB_VERSION = 2;
const STORE_LYRICS = "lyrics";

export interface LyricCacheRecord {
  songId: string;
  lrc: string;
  cachedAt: number;
}

let _dbPromise: Promise<IDBPDatabase | null> | null = null;
let _dbAvailable: boolean | null = null;

const DB_TIMEOUT_MS = 2000;

function getDB(): Promise<IDBPDatabase | null> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.resolve(null);
  }
  if (_dbAvailable === false) {
    return Promise.resolve(null);
  }
  if (!_dbPromise) {
    _dbPromise = new Promise<IDBPDatabase | null>((resolve) => {
      const timeoutId = setTimeout(() => {
        _dbAvailable = false;
        resolve(null);
      }, DB_TIMEOUT_MS);

      openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("audio")) {
            db.createObjectStore("audio", { keyPath: "songId" });
          }
          if (!db.objectStoreNames.contains("meta")) {
            db.createObjectStore("meta", { keyPath: "key" });
          }
          if (!db.objectStoreNames.contains(STORE_LYRICS)) {
            db.createObjectStore(STORE_LYRICS, { keyPath: "songId" });
          }
        },
      })
        .then((db) => {
          clearTimeout(timeoutId);
          _dbAvailable = true;
          resolve(db);
        })
        .catch(() => {
          clearTimeout(timeoutId);
          _dbAvailable = false;
          resolve(null);
        });
    });
  }
  return _dbPromise;
}

export async function cacheLyric(songId: string, lrc: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  const record: LyricCacheRecord = {
    songId,
    lrc,
    cachedAt: Date.now(),
  };
  await db.put(STORE_LYRICS, record);
}

export async function getCachedLyric(songId: string): Promise<string | null> {
  const db = await getDB();
  if (!db) return null;
  const rec = (await db.get(STORE_LYRICS, songId)) as
    | LyricCacheRecord
    | undefined;
  return rec ? rec.lrc : null;
}

export async function isLyricCached(songId: string): Promise<boolean> {
  const db = await getDB();
  if (!db) return false;
  const key = await db.getKey(STORE_LYRICS, songId);
  return !!key;
}

export async function removeCachedLyric(songId: string): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.delete(STORE_LYRICS, songId);
}

export async function clearAllLyrics(): Promise<void> {
  const db = await getDB();
  if (!db) return;
  await db.clear(STORE_LYRICS);
}

function normalizeLyricResponse(data: unknown): string | null {
  if (typeof data === "string") return data || null;
  if (data && typeof data === "object") {
    if ("content" in data && typeof (data as { content?: unknown }).content === "string") {
      return (data as { content: string }).content || null;
    }
    if ("lyric" in data && typeof (data as { lyric?: unknown }).lyric === "string") {
      return (data as { lyric: string }).lyric || null;
    }
  }
  return null;
}

export async function fetchLyric(songId: string): Promise<string | null> {
  try {
    const data = await api.get<unknown>(`/songs/${songId}/lyric`);
    return normalizeLyricResponse(data);
  } catch {
    return null;
  }
}

export async function fetchAndCacheLyric(songId: string): Promise<string | null> {
  const lrc = await fetchLyric(songId);
  if (lrc) {
    await cacheLyric(songId, lrc);
  }
  return lrc;
}

export { API_BASE };
