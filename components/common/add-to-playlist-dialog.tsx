"use client";

import * as React from "react";
import { ListMusic, Loader2, Plus, Check } from "lucide-react";

import type { Playlist } from "@/lib/types";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * "添加到歌单" 对话框
 * - 打开时拉取用户歌单列表
 * - 点击歌单即添加歌曲，已添加的歌单显示 ✓
 * - 支持快速新建歌单
 */
export function AddToPlaylistDialog({
  songId,
  open,
  onOpenChange,
}: {
  songId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const openLogin = useAuthStore((s) => s.openLogin);
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addedIds, setAddedIds] = React.useState<Set<string>>(new Set());
  const [newPlaylistName, setNewPlaylistName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  // 拉取用户歌单列表
  React.useEffect(() => {
    if (!open || !getToken()) return;
    setLoading(true);
    setAddedIds(new Set());
    api
      .get<Playlist[]>("/user/playlists")
      .then((data) => setPlaylists(data ?? []))
      .catch(() => setPlaylists([]))
      .finally(() => setLoading(false));
  }, [open]);

  // 添加到歌单
  const handleAdd = async (playlistId: string) => {
    if (!songId) return;
    setAddingId(playlistId);
    try {
      await api.post(`/user/playlists/${playlistId}/songs`, { songIds: [songId] });
      setAddedIds((prev) => new Set(prev).add(playlistId));
    } catch {
      /* 忽略 */
    } finally {
      setAddingId(null);
    }
  };

  // 快速新建歌单并添加
  const handleCreateAndAdd = async () => {
    if (!songId || !newPlaylistName.trim()) return;
    setCreating(true);
    try {
      const pl = await api.post<Playlist>("/user/playlists", {
        name: newPlaylistName.trim(),
      });
      await api.post(`/user/playlists/${pl.id}/songs`, { songIds: [songId] });
      setPlaylists((prev) => [pl, ...prev]);
      setAddedIds((prev) => new Set(prev).add(pl.id));
      setNewPlaylistName("");
    } catch {
      /* 忽略 */
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-primary-700" />
            添加到歌单
          </DialogTitle>
          <DialogDescription>选择一个歌单，将歌曲添加进去</DialogDescription>
        </DialogHeader>

        {/* 快速新建歌单 */}
        <div className="flex gap-2">
          <Input
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            placeholder="新建歌单..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && newPlaylistName.trim()) {
                void handleCreateAndAdd();
              }
            }}
            className="h-9"
          />
          <Button
            onClick={handleCreateAndAdd}
            disabled={!newPlaylistName.trim() || creating}
            size="sm"
            className="shrink-0"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            新建
          </Button>
        </div>

        {/* 歌单列表 */}
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-foreground/40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : playlists.length === 0 ? (
            <p className="py-8 text-center text-sm text-foreground/40">
              还没有歌单，在上方创建一个吧
            </p>
          ) : (
            playlists.map((pl) => {
              const added = addedIds.has(pl.id);
              return (
                <button
                  key={pl.id}
                  type="button"
                  onClick={() => handleAdd(pl.id)}
                  disabled={addingId === pl.id || added}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-primary-700/5 disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-700/5 text-primary-700/60">
                    {pl.cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={pl.cover}
                        alt={pl.name}
                        className="h-full w-full rounded-md object-cover"
                      />
                    ) : (
                      <ListMusic className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pl.name}</p>
                    <p className="text-xs text-foreground/40">
                      {pl.isPublic ? "公开" : "私有"}
                    </p>
                  </div>
                  {addingId === pl.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary-700" />
                  ) : added ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
