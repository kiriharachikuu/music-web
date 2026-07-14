"use client";

import * as React from "react";
import { User, Pencil, X, Loader2 } from "lucide-react";

import type { UserProfile } from "@/lib/types";
import { api } from "@/lib/api";
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
  const toast = useToast();

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
            {/* 头像预览 + URL 输入 */}
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-primary-700/10 ring-2 ring-primary-700 ring-offset-2 ring-offset-background">
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
              <div className="flex-1 min-w-0">
                <label className="text-sm font-medium text-foreground/80">
                  头像 URL
                </label>
                <Input
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  placeholder="粘贴图片链接"
                  className="mt-1"
                  disabled={saving}
                />
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
                "bg-primary-700 text-white shadow-primary-700/30 hover:bg-primary-600",
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
