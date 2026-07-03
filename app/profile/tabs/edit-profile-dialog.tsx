"use client";

import * as React from "react";
import { User } from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { api } from "@/lib/api";
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

/** 编辑资料弹窗 props */
export interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: UserProfile;
  onUpdated: (profile: UserProfile) => void;
}

/** 编辑资料弹窗：修改昵称和头像 URL */
export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onUpdated,
}: EditProfileDialogProps) {
  const [username, setUsername] = React.useState("");
  const [avatar, setAvatar] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const toast = useToast();

  // 打开时回显
  React.useEffect(() => {
    if (open) {
      setUsername(profile.username);
      setAvatar(profile.avatar || "");
    }
  }, [open, profile]);

  const handleSave = async () => {
    if (!username.trim()) return;
    setSaving(true);
    try {
      const updated = await api.patch<UserProfile>("/user/profile", {
        username: username.trim(),
        avatar: avatar.trim() || undefined,
      });
      onUpdated(updated);
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
        <div className="space-y-4">
          {/* 头像预览 */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full bg-primary-700/10 ring-2 ring-primary-700 ring-offset-2 ring-offset-background">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="头像预览"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-primary-700/60">
                  <User className="h-8 w-8" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium">头像 URL</label>
              <Input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="粘贴图片链接"
                className="mt-1"
              />
            </div>
          </div>
          {/* 昵称 */}
          <div>
            <label className="text-sm font-medium">昵称</label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="输入新昵称"
              className="mt-1"
              maxLength={20}
            />
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
