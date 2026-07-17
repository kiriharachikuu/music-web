"use client";

import { create } from "zustand";

import { api, getFavoriteLiveSessions, favoriteLiveSession, unfavoriteLiveSession, favoriteLiveClip, unfavoriteLiveClip, getFavoriteLiveClipIds } from "@/lib/api";

interface FavoritesState {
  likedIds: Set<string>;
  loaded: boolean;
  likedSessionIds: Set<string>;
  loadingSessions: boolean;
  likedClipIds: Set<string>;
  loadingClips: boolean;
  initLikedIds: (ids: string[]) => void;
  isLiked: (songId: string) => boolean;
  toggleLike: (songId: string) => Promise<void>;
  addLikedId: (songId: string) => void;
  removeLikedId: (songId: string) => void;
  loadFromServer: () => Promise<void>;
  loadFavoriteSessionsFromServer: () => Promise<void>;
  toggleFavoriteSession: (sessionId: string) => Promise<void>;
  isSessionLiked: (sessionId: string) => boolean;
  loadFavoriteClipsFromServer: () => Promise<void>;
  toggleFavoriteClip: (clipId: string) => Promise<void>;
  isClipLiked: (clipId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  likedIds: new Set(),
  loaded: false,
  likedSessionIds: new Set(),
  loadingSessions: false,
  likedClipIds: new Set(),
  loadingClips: false,

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

  loadFavoriteSessionsFromServer: async () => {
    set({ loadingSessions: true });
    try {
      const sessions = await getFavoriteLiveSessions();
      const ids = sessions?.map((s) => s.id) ?? [];
      set({ likedSessionIds: new Set(ids), loadingSessions: false });
    } catch {
      set({ likedSessionIds: new Set(), loadingSessions: false });
    }
  },

  toggleFavoriteSession: async (sessionId: string) => {
    const state = get();
    const isLiked = state.likedSessionIds.has(sessionId);

    set((prev) => {
      const next = new Set(prev.likedSessionIds);
      if (isLiked) next.delete(sessionId);
      else next.add(sessionId);
      return { likedSessionIds: next };
    });

    try {
      if (isLiked) {
        await unfavoriteLiveSession(sessionId);
      } else {
        await favoriteLiveSession(sessionId);
      }
    } catch {
      set((prev) => {
        const next = new Set(prev.likedSessionIds);
        if (isLiked) next.add(sessionId);
        else next.delete(sessionId);
        return { likedSessionIds: next };
      });
    }
  },

  isSessionLiked: (sessionId: string) => get().likedSessionIds.has(sessionId),

  loadFavoriteClipsFromServer: async () => {
    set({ loadingClips: true });
    try {
      const ids = await getFavoriteLiveClipIds();
      set({ likedClipIds: new Set(ids), loadingClips: false });
    } catch {
      set({ likedClipIds: new Set(), loadingClips: false });
    }
  },

  toggleFavoriteClip: async (clipId: string) => {
    const state = get();
    const isLiked = state.likedClipIds.has(clipId);

    set((prev) => {
      const next = new Set(prev.likedClipIds);
      if (isLiked) next.delete(clipId);
      else next.add(clipId);
      return { likedClipIds: next };
    });

    try {
      if (isLiked) {
        await unfavoriteLiveClip(clipId);
      } else {
        await favoriteLiveClip(clipId);
      }
    } catch {
      set((prev) => {
        const next = new Set(prev.likedClipIds);
        if (isLiked) next.add(clipId);
        else next.delete(clipId);
        return { likedClipIds: next };
      });
    }
  },

  isClipLiked: (clipId: string) => get().likedClipIds.has(clipId),
}));
