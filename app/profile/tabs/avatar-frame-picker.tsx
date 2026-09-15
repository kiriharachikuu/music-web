"use client";

import * as React from "react";
import { Loader2, Check, CircleSlash } from "lucide-react";

import type { AvatarFrame, UserProfile } from "@/lib/types";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FramedAvatar } from "@/components/framed-avatar";
import { useToast } from "@/components/ui/toaster";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
} from "@/components/ui/responsive-dialog";

export interface AvatarFramePickerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: UserProfile;
  onUpdated: (profile: UserProfile) => void;
}

/**
 * 头像框选择器
 * - 打开时拉取可见头像框列表（GET /avatar-frames）
 * - 点击佩戴（PATCH /user/profile { avatarFrameId }），空字符串表示摘下
 */
export function AvatarFramePicker({
  open,
  onOpenChange,
  profile,
  onUpdated,
}: AvatarFramePickerProps) {
  const [frames, setFrames] = React.useState<AvatarFrame[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [wearingId, setWearingId] = React.useState<string | null>(null);
  const toast = useToast();

  const currentFrameId = profile.avatarFrame?.id ?? null;

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<AvatarFrame[]>("/avatar-frames", { skipCache: true })
      .then((list) => {
        if (!cancelled) setFrames(list ?? []);
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleWear = async (frameId: string | null) => {
    if (loading) return;
    // 重复点击当前佩戴的框视为摘下
    const nextId = frameId && frameId !== currentFrameId ? frameId : "";
    setWearingId(nextId || null);
    try {
      const updated = await api.patch<UserProfile>("/user/profile", {
        avatarFrameId: nextId,
      });
      onUpdated(updated);
      toast.success(nextId ? "头像框已佩戴" : "已摘下头像框");
      onOpenChange(false);
    } catch (err) {
      toast.error("操作失败", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setWearingId(null);
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-w-lg">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>头像装扮</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            选择喜欢的头像框，所有设备同步生效
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-foreground/50">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto py-1 sm:grid-cols-4">
            {/* 摘下头像框 */}
            <button
              type="button"
              onClick={() => handleWear(null)}
              disabled={wearingId !== null}
              className={cn(
                "group flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors disabled:opacity-60",
                currentFrameId === null
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40"
              )}
            >
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary/50">
                <CircleSlash className="h-7 w-7" />
              </span>
              <span className="w-full truncate text-center text-xs">
                不使用
              </span>
              {currentFrameId === null && (
                <Check className="h-3.5 w-3.5 text-primary" />
              )}
            </button>

            {frames.map((frame) => {
              const active = currentFrameId === frame.id;
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => handleWear(frame.id)}
                  disabled={wearingId !== null}
                  className={cn(
                    "group flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors disabled:opacity-60",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <FramedAvatar
                    frameUrl={frame.imageUrl}
                    // 核心 3rem，戴框容器 = 3/0.6 = 5rem（80px），与旧网格占位一致
                    size="3rem"
                  />
                  <span className="w-full truncate text-center text-xs">
                    {frame.name}
                  </span>
                  {active && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              );
            })}

            {!loading && frames.length === 0 && (
              <p className="col-span-full py-6 text-center text-sm text-foreground/40">
                暂无可选头像框
              </p>
            )}
          </div>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
