"use client";

import * as React from "react";
import { User, Camera, Loader2 } from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { api, API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toaster";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: UserProfile;
  onUpdated: (profile: UserProfile) => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onUpdated,
}: EditProfileDialogProps) {
  const [username, setUsername] = React.useState("");
  const [avatar, setAvatar] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const toast = useToast();
  const avatarFileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setUsername(profile.username);
      setAvatar(profile.avatar || "");
    }
  }, [open, profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = getToken();
      const res = await fetch(`${API_BASE}/user/upload/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "上传失败");
      const url = json.data?.url || json.url || "";
      setAvatar(url);
      toast.success("头像上传成功");
    } catch (err) {
      toast.error("上传失败", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setUploading(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!username.trim()) return;
    setSaving(true);
    try {
      const updated = await api.patch<UserProfile>("/user/profile", {
        username: username.trim(),
        avatar: avatar.trim() || undefined,
      });
      onUpdated(updated);
      toast.success("资料已更新");
    } catch (err) {
      toast.error("保存失败", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑资料</DialogTitle>
          <DialogDescription>修改昵称和头像</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-20 w-20 overflow-hidden rounded-full bg-primary-700/10 ring-2 ring-primary-700 ring-offset-2 ring-offset-background">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt="头像预览"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-primary-700/60">
                    <User className="h-10 w-10" />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                disabled={uploading || saving}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-700 text-white shadow-lg transition-all hover:bg-primary-600 disabled:opacity-50"
                aria-label="上传头像"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Camera className="h-3.5 w-3.5" />
                )}
              </button>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground/80">头像</p>
              <p className="mt-1 text-xs text-foreground/50">
                点击相机按钮上传新头像
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">昵称</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入新昵称"
              className="mt-1"
              maxLength={20}
              disabled={saving}
            />
            <p className="mt-1.5 text-[11px] text-foreground/40">
              {username.length}/20
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !username.trim()}
            className="bg-primary-700 text-white hover:bg-primary-600"
          >
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
