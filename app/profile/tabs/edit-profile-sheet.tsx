"use client";

import * as React from "react";
import { User, Pencil, X, Loader2, Upload, Camera } from "lucide-react";

import type { UserProfile } from "@/lib/types";
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
import { cn } from "@/lib/utils";

/** 编辑资料底部抽屉 props */
export interface EditProfileSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: UserProfile;
  onUpdated: (profile: UserProfile) => void;
}

/**
 * 编辑资料底部抽屉
 * - 从屏幕底部滑出，非模态弹窗形式
 * - 修改昵称和头像 URL
 * - 适配 TWA/iOS 安全区域
 */
export function EditProfileSheet({
  open,
  onOpenChange,
  profile,
  onUpdated,
}: EditProfileSheetProps) {
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
              编辑资料
            </SheetTitle>
            <SheetDescription className="text-sm text-foreground/50">
              修改昵称和头像
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            {/* 头像预览 + 上传 + URL 输入 */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-primary/10 ring-2 ring-primary ring-offset-2 ring-offset-background">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatar}
                      alt="头像预览"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary/60">
                      <User className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  disabled={uploading || saving}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50"
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
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground/80">头像</p>
                <p className="mt-1 text-xs text-foreground/50">
                  点击相机按钮上传新头像
                </p>
              </div>
            </div>

            {/* 昵称 */}
            <div>
              <label className="text-sm font-medium text-foreground/80">
                昵称
              </label>
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

          {/* 操作按钮 */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !username.trim()}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-full py-3 font-medium shadow-lg transition-all active:scale-[0.98]",
                "bg-primary text-white shadow-primary/30 hover:bg-primary/90",
                "disabled:cursor-not-allowed disabled:opacity-60"
              )}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "保存中…" : "保存"}
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
