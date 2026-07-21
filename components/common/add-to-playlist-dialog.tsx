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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { AppImage } from "@/components/ui/app-image";

export function AddToPlaylistDialog({
  songIds,
  clipIds,
  open,
  onOpenChange,
}: {
  songIds?: string[];
  clipIds?: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const openLogin = useAuthStore((s) => s.openLogin);
  const [playlists, setPlaylists] = React.useState<Playlist[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addedIds, setAddedIds] = React.useState<Set<string>>(new Set());
  const [newPlaylistName, setNewPlaylistName] = React.useState("");
  const [creating, setCreating] = React.useState(false);

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

  const hasItems = (songIds?.length ?? 0) > 0 || (clipIds?.length ?? 0) > 0;

  const handleAdd = async (playlistId: string) => {
    if (!hasItems) return;
    setAddingId(playlistId);
    try {
      await api.post(`/user/playlists/${playlistId}/songs`, {
        songIds: songIds?.length ? songIds : undefined,
        clipIds: clipIds?.length ? clipIds : undefined,
      });
      setAddedIds((prev) => new Set(prev).add(playlistId));
      setTimeout(() => onOpenChange(false), 300);
    } catch {
      /* 忽略 */
    } finally {
      setAddingId(null);
    }
  };

  const handleCreateAndAdd = async () => {
    if (!hasItems || !newPlaylistName.trim()) return;
    setCreating(true);
    try {
      const pl = await api.post<Playlist>("/user/playlists", {
        name: newPlaylistName.trim(),
      });
      await api.post(`/user/playlists/${pl.id}/songs`, {
        songIds: songIds?.length ? songIds : undefined,
        clipIds: clipIds?.length ? clipIds : undefined,
      });
      setPlaylists((prev) => [pl, ...prev]);
      setAddedIds((prev) => new Set(prev).add(pl.id));
      setNewPlaylistName("");
      setTimeout(() => onOpenChange(false), 300);
    } catch {
      /* 忽略 */
    } finally {
      setCreating(false);
    }
  };

  const content = (
    <>
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
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-primary/5 disabled:opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary/60">
                  {pl.cover ? (
                    <AppImage
                      src={pl.cover}
                      alt={pl.name}
                      width={40}
                      height={40}
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
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : added ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="border-t-0 rounded-t-[28px] p-0 sm:rounded-t-[32px]"
        >
          <div
            className="relative flex h-1.5 w-12 shrink-0 rounded-full bg-foreground/20 mx-auto mt-3 mb-1"
            aria-hidden="true"
          />
          <div className="px-6 pb-6 pt-2 md:px-8 md:pb-8">
            <SheetHeader className="space-y-1.5 text-center">
              <SheetTitle className="flex items-center justify-center gap-2 text-xl font-bold tracking-tight">
                <ListMusic className="h-5 w-5 text-primary" />
                添加到歌单
              </SheetTitle>
              <SheetDescription className="text-sm text-foreground/50">
                选择一个歌单，将{(songIds?.length ?? clipIds?.length ?? 0) > 1 ? ` ${songIds?.length ?? clipIds?.length} 首` : ""}歌曲添加进去
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">{content}</div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListMusic className="h-5 w-5 text-primary" />
            添加到歌单
          </DialogTitle>
          <DialogDescription>
            选择一个歌单，将{(songIds?.length ?? clipIds?.length ?? 0) > 1 ? ` ${songIds?.length ?? clipIds?.length} 首` : ""}歌曲添加进去
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
