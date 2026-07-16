"use client";

import { create } from "zustand";

import { api } from "@/lib/api";

interface FavoritesState {
  likedIds: Set<string>;
  loaded: boolean;
  initLikedIds: (ids: string[]) => void;
  isLiked: (songId: string) => boolean;
  toggleLike: (songId: string) => Promise<void>;
  addLikedId: (songId: string) => void;
  removeLikedId: (songId: string) => void;
  loadFromServer: () => Promise<void>;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  likedIds: new Set(),
  loaded: false,

  initLikedIds: (ids: string[]) => {
    set({ likedIds: new Set(ids), loaded: true });
  },

  isLiked: (songId: string) => get().likedIds.has(songId),

  toggleLike: async (songId: string) => {
    const state = get();
    const isLiked = state.likedIds.has(songId);

    set((prev) => {
      const next = new Set(prev.likedIds);
      if (isLiked) next.delete(songId);
      else next.add(songId);
      return { likedIds: next };
    });

    try {
      if (isLiked) {
        await api.del(`/user/favorites/${songId}`);
      } else {
        await api.post("/user/favorites", { songId });
      }
    } catch {
      set((prev) => {
        const next = new Set(prev.likedIds);
        if (isLiked) next.add(songId);
        else next.delete(songId);
        return { likedIds: next };
      });
    }
  },

  addLikedId: (songId: string) => {
    set((prev) => {
      if (prev.likedIds.has(songId)) return prev;
      const next = new Set(prev.likedIds);
      next.add(songId);
      return { likedIds: next };
    });
  },

  removeLikedId: (songId: string) => {
    set((prev) => {
      if (!prev.likedIds.has(songId)) return prev;
      const next = new Set(prev.likedIds);
      next.delete(songId);
      return { likedIds: next };
    });
  },

  loadFromServer: async () => {
    try {
      const data = await api.get<{ list: { songId: string }[]; total: number }>(
        "/user/favorites?limit=500"
      );
      const ids = data?.list?.map((f) => f.songId) ?? [];
      set({ likedIds: new Set(ids), loaded: true });
    } catch {
      set({ likedIds: new Set(), loaded: true });
    }
  },
}));
