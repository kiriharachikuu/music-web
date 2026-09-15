"use client";

import * as React from "react";
import { User } from "lucide-react";

import { cn } from "@/lib/utils";

export interface FramedAvatarProps {
  /** 头像图片地址 */
  avatarUrl?: string | null;
  /** 头像框图片地址（透明环形 PNG，叠加在头像上层） */
  frameUrl?: string | null;
  /** 外层容器尺寸等样式，如 "h-14 w-14" */
  className?: string;
  /** 占位图标样式 */
  iconClassName?: string;
  alt?: string;
}

/**
 * 带头像框的头像
 * - 圆形头像 + 可选头像框叠加（框图尺寸约 116%，覆盖头像边缘）
 * - 头像框为透明 PNG，缩放到容器 116% 后绝对定位居中
 */
export function FramedAvatar({
  avatarUrl,
  frameUrl,
  className,
  iconClassName,
  alt = "avatar",
}: FramedAvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)}>
      <div className="h-full w-full overflow-hidden rounded-full bg-primary/10">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={alt}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/60">
            <User className={cn("h-1/2 w-1/2", iconClassName)} />
          </div>
        )}
      </div>
      {frameUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={frameUrl}
          alt=""
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[116%] w-[116%] -translate-x-1/2 -translate-y-1/2"
        />
      )}
    </div>
  );
}
