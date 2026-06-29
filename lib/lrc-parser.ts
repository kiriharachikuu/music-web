/**
 * XingTone —— LRC 歌词解析器
 *
 * 支持特性：
 * 1. [mm:ss.xx] 时间戳（精度 10ms），兼容 [mm:ss.xxx]（毫秒）与 [mm:ss]（无小数）
 * 2. 多时间戳行：[00:01.00][00:15.00]歌词 → 拆分为两条独立行
 * 3. 双语歌词：原文行后紧跟同时间戳的译文行，合并为 translation 字段
 * 4. 过滤元信息行：[ti:][ar:][al:][by:][offset:][re:][ve:][length:]
 * 5. 二分查找当前行，O(log n) 高效定位
 */

/** 单行歌词（含可选译文） */
export interface LyricLine {
  /** 时间戳（秒，浮点） */
  time: number;
  /** 原文 */
  text: string;
  /** 译文（可选，双语歌词场景） */
  translation?: string;
}

/** 时间标签正则：[mm:ss.xx] / [mm:ss.xxx] / [mm:ss] */
const TIME_TAG_RE = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

/** 元信息行正则：[ti:...] [ar:...] 等 */
const META_RE = /^\[(ti|ar|al|by|offset|re|ve|length):(.*)\]$/i;

/**
 * 将时间标签的各部分解析为秒数
 * - mm 分钟
 * - ss 秒
 * - frac 2 位 = 百分秒；3 位 = 毫秒；其他位数按小数处理
 */
function parseTime(mm: string, ss: string, frac: string | undefined): number {
  const minutes = parseInt(mm, 10) || 0;
  const seconds = parseInt(ss, 10) || 0;
  let millis = 0;
  if (frac) {
    if (frac.length === 2) {
      // 2 位 = 百分秒（10ms 精度）→ 毫秒
      millis = parseInt(frac, 10) * 10;
    } else if (frac.length === 3) {
      // 3 位 = 毫秒
      millis = parseInt(frac, 10);
    } else {
      // 其他位数：按小数部分处理（如 [00:01.5] = 1.5 秒）
      millis = Math.round(parseFloat(`0.${frac}`) * 1000);
    }
  }
  return minutes * 60 + seconds + millis / 1000;
}

/**
 * 解析 LRC 文本为有序歌词数组
 * - 返回结果按 time 升序排序
 * - 双语合并：相邻行同时间戳（误差 < 1ms），第一行原文，第二行译文
 *
 * @param lrc LRC 原始文本
 * @returns 有序歌词行数组，空文本返回 []
 */
export function parseLRC(lrc: string): LyricLine[] {
  if (!lrc) return [];

  const lines = lrc.split(/\r?\n/);
  const rawLines: LyricLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 过滤元信息行
    if (META_RE.test(trimmed)) continue;

    // 提取所有时间标签
    TIME_TAG_RE.lastIndex = 0;
    const times: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = TIME_TAG_RE.exec(trimmed)) !== null) {
      times.push(parseTime(match[1], match[2], match[3]));
    }
    if (times.length === 0) continue;

    // 剩余文本作为歌词
    const text = trimmed.replace(TIME_TAG_RE, "").trim();
    for (const t of times) {
      rawLines.push({ time: t, text });
    }
  }

  // 按时间升序排序
  rawLines.sort((a, b) => a.time - b.time);

  // 合并双语：相邻行同时间戳，原文 + 译文
  const result: LyricLine[] = [];
  let i = 0;
  while (i < rawLines.length) {
    const cur = rawLines[i];
    const next = rawLines[i + 1];
    if (
      next &&
      !cur.translation &&
      Math.abs(next.time - cur.time) < 0.001 &&
      next.text
    ) {
      // 同时间戳的下一行作为译文
      result.push({ ...cur, translation: next.text });
      i += 2;
    } else {
      result.push(cur);
      i += 1;
    }
  }

  return result;
}

/**
 * 二分查找：找到 currentTime 对应的当前歌词行索引
 * - 返回 -1 表示 currentTime 在第一行之前（前奏阶段）
 * - 返回 0..n-1 为最近一个 time <= currentTime 的行索引
 *
 * @param lines 已排序的歌词行
 * @param currentTime 当前播放时间（秒）
 */
export function findActiveLineIndex(
  lines: LyricLine[],
  currentTime: number
): number {
  if (lines.length === 0) return -1;
  if (currentTime < lines[0].time) return -1;

  let lo = 0;
  let hi = lines.length - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentTime) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
