/**
 * 跨端续播: 播放状态云端上报 (Web / TWA 端)
 * - 播放中节流上报到 /user/playback-state, PC 客户端可从上次进度续播
 * - 未登录/失败静默
 */
import { api } from './api';
import { getToken } from './auth';

let lastReportAt = 0;

export function reportWebPlaybackState(p: {
  songId: string | null;
  clipId?: string | null;
  position: number;
  queueIds?: string[];
}): void {
  const now = Date.now();
  if (now - lastReportAt < 3000) return;
  lastReportAt = now;
  if (!getToken()) return;
  void api
    .put('/user/playback-state', { ...p, device: 'Web' })
    .catch(() => {
      /* 静默 */
    });
}
