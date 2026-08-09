import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type OfflineQuality = "standard" | "higher" | "lossless" | "follow-online";

interface SettingsState {
  offlineQuality: OfflineQuality;
  setOfflineQuality: (q: OfflineQuality) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      offlineQuality: "standard",
      setOfflineQuality: (q) => set({ offlineQuality: q }),
    }),
    {
      name: "xingtone-settings",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
