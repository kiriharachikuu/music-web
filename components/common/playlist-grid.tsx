"use client";

import type { Playlist, ApiSong } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { api } from "@/lib/api";
import { usePlayerStore } from "@/lib/store/player-store";
import { PlaylistCard } from "@/components/common/playlist-card";
import { cn } from "@/lib/utils";

/**
 * 歌单网格（带播放能力）
 * - 网格布局：PC 6 列 / 平板 4 列 / 手机 2 列
 * - hover 显示播放按钮，点击后拉取歌单歌曲并播放
 * - 用于发现页"精选歌单"等场景
 */
export function PlaylistGrid({
  playlists,
  showPlayButton = true,
  className,
}: {
  playlists: Playlist[];
  showPlayButton?: boolean;
  className?: string;
}) {
  const play = usePlayerStore((s) => s.play);

  const handlePlay = async (pl: Playlist) => {
    try {
      // 拉取歌单内歌曲（后端返回 ApiSong[]）
      const songs = await api.get<ApiSong[]>(`/playlists/${pl.id}/songs`);
      if (songs && songs.length > 0) {
        play(toPlayerSong(songs[0]), toPlayerSongs(songs));
      }
    } catch {
      // 静默处理（api 层已处理 401 等）
    }
  };

  if (playlists.length === 0) return null;

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6",
        className
      )}
    >
      {playlists.map((pl) => (
        <PlaylistCard
          key={pl.id}
          playlist={pl}
          onPlay={showPlayButton ? handlePlay : undefined}
        />
      ))}
    </div>
  );
}
