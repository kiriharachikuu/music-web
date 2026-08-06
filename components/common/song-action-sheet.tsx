"use client";

import * as React from "react";
import Link from "next/link";
import {
  Heart,
  Plus,
  Music2,
  Check,
  ListMusic,
  ListStart,
  Disc,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";

import type { ApiSong, Track } from "@/lib/types";
import { LiveClipBadge } from "@/components/common/live-clip-badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AppImage } from "@/components/ui/app-image";

/**
 * 移动端歌曲操作抽屉
 * - 收纳歌曲行的全部操作按钮，以底部 Sheet 展示（Apple Music 风格）
 * - 顶部歌曲信息（封面 + 标题 + 歌手），下方为操作列表
 * - 操作由父组件通过回调注入，下载/喜欢等状态也由父组件维护
 */
export interface SongActionSheetProps {
  song: (ApiSong | Track) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isLiked: boolean;
  onLike: () => void;
  isDownloaded: boolean;
  isDownloading: boolean;
  onDownload: () => void;
  canDownload: boolean;
  onAddToQueue: () => void;
  onPlayNext: () => void;
  onAddToPlaylist: () => void;
  onDelete?: () => void;
}

export function SongActionSheet({
  song,
  open,
  onOpenChange,
  isLiked,
  onLike,
  isDownloaded,
  isDownloading,
  onDownload,
  canDownload,
  onAddToQueue,
  onPlayNext,
  onAddToPlaylist,
  onDelete,
}: SongActionSheetProps) {
  const cover =
    (song && "cover" in song && (song as any).cover) ||
    (song && "coverUrl" in song && (song as any).coverUrl) ||
    (song && "album" in song ? (song as any).album?.cover : undefined) ||
    undefined;
  const albumId = song && "albumId" in song ? (song as any).albumId : undefined;
  const isLiveClip =
    !!song && "trackType" in song && (song as any).trackType === "live_clip";
  const sessionName =
    song && "sessionName" in song ? (song as any).sessionName : undefined;
  const albumName =
    song && "albumName" in song ? (song as any).albumName : undefined;

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
          {song && (
            <SheetHeader className="space-y-3 text-center">
              {/* 封面 */}
              <div className="flex justify-center">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-primary/5">
                  {cover ? (
                    <AppImage
                      src={cover}
                      alt={song.title}
                      fill
                      className="rounded-xl object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-primary/40">
                      <Music2 className="h-8 w-8" />
                    </span>
                  )}
                </div>
              </div>
              <SheetTitle className="flex items-center justify-center gap-1.5 text-base font-semibold tracking-tight">
                {isLiveClip && <LiveClipBadge />}
                <span className="truncate">{song.title}</span>
              </SheetTitle>
              <SheetDescription className="truncate text-sm text-foreground/50">
                {song.artist}
                {isLiveClip && sessionName
                  ? ` · ${sessionName}`
                  : albumName
                    ? ` · ${albumName}`
                    : ""}
              </SheetDescription>
            </SheetHeader>
          )}

          {/* 操作列表 */}
          <div className="mt-5 space-y-1">
            <ActionRow
              icon={
                <Heart
                  className={cn("h-5 w-5", isLiked && "fill-current")}
                />
              }
              label={isLiked ? "取消喜欢" : "喜欢"}
              textClass={isLiked ? "text-primary dark:text-primary/60" : undefined}
              iconClass={isLiked ? "text-primary dark:text-primary/60" : undefined}
              onClick={() => onLike()}
            />
            {canDownload && (
              <ActionRow
                icon={
                  isDownloading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isDownloaded ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Download
                      className={cn("h-5 w-5", isDownloaded && "fill-current")}
                    />
                  )
                }
                label={
                  isDownloading
                    ? "下载中…"
                    : isDownloaded
                      ? "已下载"
                      : "下载"
                }
                textClass={
                  isDownloading || isDownloaded
                    ? "text-primary dark:text-primary/60"
                    : undefined
                }
                iconClass={
                  isDownloading || isDownloaded
                    ? "text-primary dark:text-primary/60"
                    : undefined
                }
                disabled={isDownloading || isDownloaded}
                onClick={() => onDownload()}
              />
            )}
            <ActionRow
              icon={<ListStart className="h-5 w-5" />}
              label="下一首播放"
              onClick={() => onPlayNext()}
            />
            <ActionRow
              icon={<ListMusic className="h-5 w-5" />}
              label="添加到队列"
              onClick={() => onAddToQueue()}
            />
            <ActionRow
              icon={<Plus className="h-5 w-5" />}
              label="添加到歌单"
              onClick={() => onAddToPlaylist()}
            />
            {albumId && (
              <Link
                href={`/album/${albumId}`}
                onClick={() => onOpenChange(false)}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors active:bg-foreground/5"
              >
                <span className="flex h-5 w-5 items-center justify-center">
                  <Disc className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium">查看专辑</span>
              </Link>
            )}
            {onDelete && (
              <ActionRow
                icon={<Trash2 className="h-5 w-5" />}
                label="删除"
                textClass="text-red-500"
                iconClass="text-red-500"
                onClick={() => onDelete()}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** 操作行：触摸友好的全宽按钮 */
function ActionRow({
  icon,
  label,
  onClick,
  disabled,
  textClass,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  textClass?: string;
  iconClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors active:bg-foreground/5 disabled:opacity-50"
    >
      <span className={cn("flex h-5 w-5 items-center justify-center", iconClass)}>
        {icon}
      </span>
      <span className={cn("text-sm font-medium", textClass)}>{label}</span>
    </button>
  );
}
