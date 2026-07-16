"use client";

import * as React from "react";
import { ListMusic, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { Playlist } from "@/lib/types";
import { api } from "@/lib/api";
import { PlaylistCard } from "@/components/common/playlist-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/common/confirm-dialog";
import { useToast } from "@/components/ui/toaster";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { EditPlaylistSheet } from "./edit-playlist-sheet";
import { EditPlaylistDialog } from "./edit-playlist-dialog";

/** 子模块 2：我的歌单 */
export function PlaylistsTab() {
  const isMobile = useIsMobile();
  const [playlists, setPlaylists] = React.useState<Playlist[] | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editMode, setEditMode] = React.useState<"create" | "edit">("create");
  const [editingPlaylist, setEditingPlaylist] = React.useState<Playlist | undefined>();
  const confirm = useConfirm();
  const toast = useToast();

  const load = async () => {
    try {
      const data = await api.get<Playlist[]>("/user/playlists");
      setPlaylists(data ?? []);
    } catch {
      setPlaylists([]);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditingPlaylist(undefined);
    setEditMode("create");
    setEditOpen(true);
  };

  const openEdit = (pl: Playlist) => {
    setEditingPlaylist(pl);
    setEditMode("edit");
    setEditOpen(true);
  };

  const remove = async (pl: Playlist) => {
    if (
      !(await confirm({
        title: "删除歌单",
        description: `确定删除歌单「${pl.name}」吗？此操作不可恢复。`,
        confirmText: "删除",
        variant: "destructive",
      }))
    )
      return;
    try {
      await api.del(`/user/playlists/${pl.id}`);
      void load();
      toast.success("歌单已删除");
    } catch {
      /* 忽略 */
    }
  };

  if (playlists === null) return <PageSkeleton variant="grid" />;

  const EditComponent = isMobile ? EditPlaylistSheet : EditPlaylistDialog;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/40">
          共 {playlists.length} 个歌单
        </span>
        <Button
          onClick={openCreate}
          className="rounded-full bg-primary px-4 text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          新建歌单
        </Button>
      </div>

      {playlists.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {playlists.map((pl) => (
            <div key={pl.id} className="group relative">
              <PlaylistCard playlist={pl} />
              {/* 操作按钮：PC 端 hover 显示，移动端始终可见 */}
              <div className="absolute right-1.5 top-1.5 z-10 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                {isMobile ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                        aria-label="更多操作"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                      <DropdownMenuItem onClick={() => openEdit(pl)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        编辑歌单
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => remove(pl)}
                        className="text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        删除歌单
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        openEdit(pl);
                      }}
                      aria-label="编辑歌单"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        remove(pl);
                      }}
                      aria-label="删除歌单"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={ListMusic}
          title="还没有歌单"
          description="新建一个歌单，收藏你喜爱的歌曲。"
          action={
            <Button
              onClick={openCreate}
              className="rounded-full bg-primary px-5 text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              新建歌单
            </Button>
          }
        />
      )}

      <EditComponent
        open={editOpen}
        onOpenChange={setEditOpen}
        mode={editMode}
        playlist={editingPlaylist}
        onSaved={() => void load()}
      />
    </div>
  );
}
