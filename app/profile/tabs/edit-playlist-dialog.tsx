"use client";

import * as React from "react";
import { ListMusic, Camera, Loader2 } from "lucide-react";

import type { Playlist } from "@/lib/types";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";

export interface EditPlaylistDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  playlist?: Playlist;
  onSaved: () => void;
}

export function EditPlaylistDialog({
  open,
  onOpenChange,
  mode,
  playlist,
  onSaved,
}: EditPlaylistDialogProps) {
  const [name, setName] = React.useState("");
  const [cover, setCover] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const toast = useToast();
  const coverFileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setName(playlist?.name ?? "");
      setCover(playlist?.cover ?? "");
    }
  }, [open, playlist]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mode === "create") {
      toast.error("请先创建歌单后再上传封面");
      return;
    }
    if (!playlist) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getToken();
      const res = await fetch(`${API_BASE}/user/playlists/${playlist.id}/cover`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "上传失败");
      const url = json.data?.url || json.url || "";
      setCover(url);
      toast.success("封面上传成功");
    } catch (err) {
      toast.error("上传失败", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (mode === "create") {
        await api.post("/user/playlists", {
          name: name.trim(),
          cover: cover.trim() || undefined,
        });
      } else if (playlist) {
        await api.put(`/user/playlists/${playlist.id}`, {
          name: name.trim(),
          cover: cover.trim() || undefined,
        });
      }
      onSaved();
      onOpenChange(false);
      toast.success(mode === "create" ? "歌单已创建" : "歌单已更新");
    } catch (err) {
      toast.error("保存失败", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-md rounded-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {mode === "create" ? "新建歌单" : "编辑歌单"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {mode === "create" ? "创建一个新歌单" : "修改歌单名称和封面"}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium">歌单名称</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="给歌单起个名字"
              className="mt-1"
              maxLength={50}
              disabled={saving}
            />
            <p className="mt-1.5 text-[11px] text-foreground/40">
              {name.length}/50
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">歌单封面</label>
            <div className="mt-1 flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-xl bg-primary/10 ring-2 ring-primary/30">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cover}
                      alt="封面预览"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary/40">
                      <ListMusic className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => coverFileRef.current?.click()}
                  disabled={uploading || saving || mode === "create"}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50"
                  aria-label="上传封面"
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleCoverUpload}
                  className="hidden"
                />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground/80">封面</p>
                <p className="mt-1 text-xs text-foreground/50">
                  {mode === "create"
                    ? "新建歌单后可上传封面"
                    : "点击相机按钮更换封面"}
                </p>
              </div>
            </div>
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="bg-primary text-white hover:bg-primary/90"
          >
            {saving ? "保存中…" : mode === "create" ? "创建" : "保存"}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
