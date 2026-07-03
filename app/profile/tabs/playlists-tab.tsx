"use client";

import * as React from "react";
import { ListMusic, Plus, Pencil, Trash2 } from "lucide-react";

import type { Playlist } from "@/lib/types";
import { api } from "@/lib/api";
import { PlaylistCard } from "@/components/common/playlist-card";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/components/common/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

/** 子模块 2：我的歌单 */
export function PlaylistsTab() {
  const [playlists, setPlaylists] = React.useState<Playlist[] | null>(null);
  const [dialog, setDialog] = React.useState<{
    open: boolean;
    mode: "create" | "rename";
    playlist?: Playlist;
    name: string;
    cover: string;
  }>({ open: false, mode: "create", name: "", cover: "" });
  const confirm = useConfirm();

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

  const openCreate = () =>
    setDialog({ open: true, mode: "create", name: "", cover: "" });

  const openRename = (pl: Playlist) =>
    setDialog({
      open: true,
      mode: "rename",
      playlist: pl,
      name: pl.name,
      cover: pl.cover ?? "",
    });

  const submit = async () => {
    const { mode, playlist, name, cover } = dialog;
    if (!name.trim()) return;
    try {
      if (mode === "create") {
        await api.post("/user/playlists", { name: name.trim(), cover: cover.trim() || undefined });
      } else if (playlist) {
        await api.put(`/user/playlists/${playlist.id}`, {
          name: name.trim(),
          cover: cover.trim() || undefined,
        });
      }
      setDialog((d) => ({ ...d, open: false }));
      void load();
    } catch {
      /* 忽略 */
    }
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
    } catch {
      /* 忽略 */
    }
  };

  if (playlists === null) return <PageSkeleton variant="grid" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/40">
          共 {playlists.length} 个歌单
        </span>
        <Button
          onClick={openCreate}
          className="rounded-full bg-primary-700 px-4 text-white hover:bg-primary-600"
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
              {/* 重命名 / 删除 浮层 */}
              <div className="absolute right-1.5 top-1.5 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    openRename(pl);
                  }}
                  aria-label="重命名"
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
                  aria-label="删除"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
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
              className="rounded-full bg-primary-700 px-5 text-white hover:bg-primary-600"
            >
              <Plus className="h-4 w-4" />
              新建歌单
            </Button>
          }
        />
      )}

      {/* 新建 / 重命名弹窗 */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => setDialog((d) => ({ ...d, open: o }))}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create" ? "新建歌单" : "重命名歌单"}
            </DialogTitle>
            <DialogDescription>
              设置歌单名称与封面地址（可选）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs text-foreground/50">
                歌单名称
              </label>
              <Input
                value={dialog.name}
                onChange={(e) =>
                  setDialog((d) => ({ ...d, name: e.target.value }))
                }
                placeholder="给歌单起个名字"
                className="rounded-lg"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-foreground/50">
                封面地址（自定义封面 URL）
              </label>
              <Input
                value={dialog.cover}
                onChange={(e) =>
                  setDialog((d) => ({ ...d, cover: e.target.value }))
                }
                placeholder="https://..."
                className="rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDialog((d) => ({ ...d, open: false }))}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={submit}
              className="rounded-full bg-primary-700 text-white hover:bg-primary-600"
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
