"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { FavoritesTab } from "../tabs/favorites-tab";

export default function FavoritesPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/profile"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/5 text-foreground/70 transition-colors hover:bg-foreground/10"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-bold">我喜欢的音乐</h1>
      </div>
      <FavoritesTab />
    </div>
  );
}