"use client";

import * as React from "react";
import {
  Heart,
  Play,
  CheckSquare,
  Square,
  ListStart,
  ListMusic,
  Trash2,
} from "lucide-react";

import type { ApiSong } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { api, getFavoriteLiveClips } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { AddToPlaylistDialog } from "@/components/common/add-to-playlist-dialog";
import { Button } from "@/components/ui/button";

/** 子模块 1：我喜欢的音乐（歌曲 + 歌切） */
export function FavoritesTab() {
  const [songs, setSongs] = React.useState<ApiSong[] | null>(null);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [manageMode, setManageMode] = React.useState(false);
  const [playlistDialogOpen, setPlaylistDialogOpen] = React.useState(false);
  const play = usePlayerStore((s) => s.play);
  const playNextMany = usePlayerStore((s) => s.playNextMany);
  const openLogin = useAuthStore((s) => s.openLogin);
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const initLikedIds = useFavoritesStore((s) => s.initLikedIds);
  const likedClipIds = useFavoritesStore((s) => s.likedClipIds);
  const toggleFavoriteClip = useFavoritesStore((s) => s.toggleFavoriteClip);
  const loadFavoriteClipsFromServer = useFavoritesStore(
    (s) => s.loadFavoriteClipsFromServer
  );

  React.useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    try {
      // 并行加载歌曲收藏和歌切收藏
      const [songData, clips] = await Promise.all([
        api.get<{ list: { songId: string; song: ApiSong }[]; total: number }>(
          "/user/favorites"
        ),
        getFavoriteLiveClips<any>(),
      ]);

      const songList = (songData?.list ?? []).map((f) => f.song);
      // 将歌切映射为 ApiSong 格式，附带 session 数据用于展示所属直播合集
      const clipList: ApiSong[] = (clips ?? []).map((c) => ({
        id: c.id,
        title: c.title,
        artist: c.artist,
        duration: c.duration,
        fileUrl: c.fileUrl,
        coverUrl: c.coverUrl ?? undefined,
        releaseDate: "",
        plays: 0,
        status: "PUBLISHED" as const,
        trackType: "live_clip" as const,
        sessionId: c.session?.id,
        sessionName: c.session?.title,
      }));

      setSongs([...songList, ...clipList]);
      initLikedIds(songList.map((f) => f.id));
      void loadFavoriteClipsFromServer();
    } catch {
      setSongs([]);
    }
  };

  // 喜欢/取消喜欢（未登录时触发登录弹窗）
  const handleLike = (song: ApiSong) => {
    if (!getToken()) {
      openLogin();
      return;
    }
    if (song.trackType === "live_clip") {
      void toggleFavoriteClip(song.id);
    } else {
      void toggleLike(song.id);
    }
    void load();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = songs != null && songs.length > 0 && selected.size === songs.length;

  const toggleAll = () => {
    if (!songs) return;
    setSelected(allSelected ? new Set() : new Set(songs.map((s) => s.id)));
  };

  /** 播放选中（或全部） */
  const playSelected = () => {
    if (!songs || songs.length === 0) return;
    const list =
      selected.size > 0
        ? songs.filter((s) => selected.has(s.id))
        : songs;
    if (list.length === 0) return;
    play(toPlayerSong(list[0]), toPlayerSongs(list));
  };

  /** 取消喜欢选中 */
  const removeSelected = async () => {
    if (selected.size === 0 || !songs) return;
    try {
      await Promise.all(
        Array.from(selected).map((id) => {
          const song = songs.find((s) => s.id === id);
          if (song?.trackType === "live_clip") {
            return api.del(`/user/live-clips/${id}/favorite`);
          }
          return api.del(`/user/favorites/${id}`);
        })
      );
      setSelected(new Set());
      void load();
    } catch {
      /* 忽略 */
    }
  };

  if (songs === null) return <PageSkeleton variant="list" />;

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={playSelected}
          className="rounded-full bg-primary px-5 text-white shadow-card hover:bg-primary/90 active:bg-primary/95"
        >
          <Play className="h-4 w-4 translate-x-[1px]" />
          播放{selected.size > 0 ? `(${selected.size})` : "全部"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setManageMode((m) => !m);
            setSelected(new Set());
          }}
          className="rounded-full px-4"
        >
          {manageMode ? "退出管理" : "批量管理"}
        </Button>
        {manageMode && (
          <>
            <Button
              variant="ghost"
              onClick={toggleAll}
              className="rounded-full px-3 text-sm"
            >
              {allSelected ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <Square className="h-4 w-4" />
              )}
              全选
            </Button>
            {selected.size > 0 && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (!songs) return;
                    const list = songs.filter((s) => selected.has(s.id));
                    playNextMany(toPlayerSongs(list));
                    setSelected(new Set());
                    setManageMode(false);
                  }}
                  className="rounded-full px-3 text-sm"
                >
                  <ListStart className="h-4 w-4" />
                  下一首播放
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPlaylistDialogOpen(true)}
                  className="rounded-full px-3 text-sm"
                >
                  <ListMusic className="h-4 w-4" />
                  加入歌单
                </Button>
                <Button
                  variant="ghost"
                  onClick={removeSelected}
                  className="rounded-full px-3 text-sm text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  删除选中
                </Button>
              </>
            )}
          </>
        )}
        <span className="ml-auto text-xs text-foreground/40">
          共 {songs.length} 首
        </span>
      </div>

      {songs.length > 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
          <SongList
            songs={songs}
            selectable={manageMode}
            selectedIds={selected}
            onToggleSelect={toggleSelect}
            likedIds={new Set([...likedIds, ...likedClipIds])}
            onLike={handleLike}
            showTrackType={true}
            emptyText="还没有喜欢的歌曲"
          />
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="还没有喜欢的音乐"
          description="去发现页找找喜欢的歌吧～"
        />
      )}

      {/* 批量加入歌单弹窗 */}
      <AddToPlaylistDialog
        songIds={
          songs
            ? Array.from(selected).filter(
                (id) => !songs.find((s) => s.id === id)?.trackType ||
                  songs.find((s) => s.id === id)?.trackType !== "live_clip"
              )
            : []
        }
        clipIds={
          songs
            ? Array.from(selected).filter((id) =>
                songs.find((s) => s.id === id)?.trackType === "live_clip"
              )
            : []
        }
        open={playlistDialogOpen}
        onOpenChange={(v) => {
          setPlaylistDialogOpen(v);
          if (!v) {
            setSelected(new Set());
            setManageMode(false);
          }
        }}
      />
    </div>
  );
}
