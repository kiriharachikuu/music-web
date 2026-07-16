"use client";

import * as React from "react";
import { ListMusic, Upload, ImageIcon, Loader2, Camera } from "lucide-react";

import type { Playlist } from "@/lib/types";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useToast } from "@/components/ui/toaster";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface EditPlaylistSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  playlist?: Playlist;
  onSaved: () => void;
}

export function EditPlaylistSheet({
  open,
  onOpenChange,
  mode,
  playlist,
  onSaved,
}: EditPlaylistSheetProps) {
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
            <SheetTitle className="text-xl font-bold tracking-tight">
              {mode === "create" ? "新建歌单" : "编辑歌单"}
            </SheetTitle>
            <SheetDescription className="text-sm text-foreground/50">
              {mode === "create" ? "创建一个新歌单" : "修改歌单名称和封面"}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground/80">
                歌单名称
              </label>
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
              <label className="text-sm font-medium text-foreground/80">
                歌单封面
              </label>
              <div className="mt-1 flex items-start gap-4">
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
                <div className="flex-1 min-w-0">
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

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name.trim()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full py-3 font-medium shadow-lg transition-all active:scale-[0.98]",
                "bg-primary text-white shadow-primary/30 hover:bg-primary/90",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "保存中…" : mode === "create" ? "创建歌单" : "保存"}
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="w-full rounded-full border border-foreground/10 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              取消
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
