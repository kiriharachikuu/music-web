"use client";

import { APP_VERSION } from "@/lib/constants/changelog";
import { useUpdatePromptStore } from "@/lib/store/update-prompt-store";

const LAST_SEEN_VERSION_KEY = "xingtone-last-seen-version";
const POLL_INTERVAL = 5 * 60 * 1000;

type PlatformVersion = {
  version?: string;
  versionCode?: number;
};

let pollingTimer: number | null = null;

async function fetchPlatformVersion(): Promise<string | null> {
  const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as PlatformVersion;
  return data.version || (data.versionCode ? String(data.versionCode) : null);
}

async function checkVersion() {
  try {
    const version = await fetchPlatformVersion();
    if (!version) return;

    const lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY);

    if (!lastSeenVersion) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, version || APP_VERSION);
      return;
    }

    if (lastSeenVersion !== version) {
      useUpdatePromptStore.getState().show(version);
      localStorage.setItem(LAST_SEEN_VERSION_KEY, version);
    }
  } catch {
    // 版本轮询失败不影响正常使用
  }
}

export function startVersionPolling() {
  if (typeof window === "undefined" || pollingTimer !== null) return;

  void checkVersion();
  pollingTimer = window.setInterval(() => {
    void checkVersion();
  }, POLL_INTERVAL);
}
