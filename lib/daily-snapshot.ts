import type { ApiSong, LiveClipTrack } from "@/lib/types";

/**
 * 每日推荐客户端快照
 * - 详情页（/daily-recommend/songs、/daily-recommend/clips）直接复用 Discover 页
 *   已请求到的同一份随机子集，避免两次独立请求（不同随机种子）导致列表不一致
 * - 存储介质：sessionStorage（关闭浏览器失效；带 dailyDate 跨日自动失效）
 * - SSR 不可用，仅供客户端组件在 useEffect 中调用
 */

const STORAGE_KEY = "xt:daily-discover:v1";

export type DailyKind = "songs" | "clips";

export type DailySnapshotPayload = {
  /** YYYY-MM-DD 快照日期；跨日校验用 */
  dailyDate: string;
  songs: ApiSong[];
  clips: LiveClipTrack[];
};

export type DailySnapshot = Partial<Record<DailyKind, ApiSong[] | LiveClipTrack[]>> & {
  dailyDate: string;
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 读取今日快照（跨日视为不存在） */
export function readDailySnapshot(): DailySnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DailySnapshot;
    if (!parsed || typeof parsed !== "object" || !parsed.dailyDate) return null;
    if (parsed.dailyDate !== todayKey()) {
      // 跨日：清理
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 写入今日快照（覆盖式） */
export function writeDailySnapshot(payload: DailySnapshotPayload): void {
  if (typeof window === "undefined") return;
  try {
    const { dailyDate, songs, clips } = payload;
    const next: DailySnapshot = { dailyDate };
    if (Array.isArray(songs)) next.songs = songs;
    if (Array.isArray(clips)) next.clips = clips;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 容量超限 / 隐私模式：静默失败
  }
}

/** 写入指定 kind 的子集（Discover 拉取后可只更新一种） */
export function patchDailySnapshot(kind: DailyKind, list: ApiSong[] | LiveClipTrack[]): void {
  if (typeof window === "undefined") return;
  const prev = readDailySnapshot();
  const next: DailySnapshot = { ...(prev ?? { dailyDate: todayKey() }), dailyDate: todayKey() };
  (next as Record<DailyKind, unknown>)[kind] = list;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}
