"use client";

import * as React from "react";
import { User } from "lucide-react";

import { cn, resolveMediaUrl } from "@/lib/utils";

export interface FramedAvatarProps {
  /** 头像图片地址 */
  avatarUrl?: string | null;
  /** 头像框图片地址（透明装饰画布 PNG，叠加在最上层） */
  frameUrl?: string | null;
  /** 头像核心尺寸（CSS 长度，如 "2.5rem"）。
   *  佩戴头像框时容器自动放大为 size / 0.6，头像框包在头像外围，头像视觉大小不变 */
  size: string;
  /** 容器附加样式（无框时会落在头像本身上，可加边框等） */
  className?: string;
  alt?: string;
}

/**
 * 带头像框的头像（挂件布局）
 * - 头像框素材为装饰画布：主体环内洞最大约 0.586（四款实测），四角为刻意压在头像上的延伸装饰
 * - 头像核心按 size 渲染，容器 = size / 0.6，框图铺满容器 → 头像大小不随戴框改变
 * - 无框时退化为普通圆形头像（直径 = size）
 */
const AVATAR_INSET = 0.6;

export function FramedAvatar({
  avatarUrl,
  frameUrl,
  size,
  className,
  alt = "avatar",
}: FramedAvatarProps) {
  // /uploads/ 相对路径按 NEXT_PUBLIC_API_BASE 补全后端 origin（对齐桌面端 AvatarWithFrame），
  // 跨域部署时否则会打到前端域名导致 404、挂件不显示
  const resolvedAvatar = resolveMediaUrl(avatarUrl);
  const resolvedFrame = resolveMediaUrl(frameUrl);

  const coreStyle = { width: size, height: size };

  const avatarCore = resolvedAvatar ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedAvatar}
      alt={alt}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-primary/60">
      <User className="h-1/2 w-1/2" />
    </div>
  );

  if (!resolvedFrame) {
    return (
      <div
        style={coreStyle}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-full bg-primary/10",
          className
        )}
      >
        {avatarCore}
      </div>
    );
  }

  return (
    <div
      style={{
        width: `calc(${size} / ${AVATAR_INSET})`,
        height: `calc(${size} / ${AVATAR_INSET})`,
      }}
      className={cn("relative shrink-0", className)}
    >
      <div
        style={coreStyle}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
      >
        {avatarCore}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolvedFrame}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
