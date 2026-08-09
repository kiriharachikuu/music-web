"use client";

import { create } from "zustand";

interface UpdatePromptState {
  open: boolean;
  version: string;
  show: (version: string) => void;
  dismiss: () => void;
}

export const useUpdatePromptStore = create<UpdatePromptState>((set) => ({
  open: false,
  version: "",
  show: (version) => set({ open: true, version }),
  dismiss: () => set({ open: false }),
}));
