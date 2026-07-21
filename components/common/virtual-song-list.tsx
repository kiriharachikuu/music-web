"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Play,
  Pause,
  Heart,
  Plus,
  MoreHorizontal,
  Music2,
  Check,
  ListMusic,
  ListStart,
  Disc,
  Trash2,
  Download,
  Loader2,
} from "lucide-react";

import type { ApiSong, Track, TrackType } from "@/lib/types";
import { toPlayerSong } from "@/lib/types";
import { LiveClipBadge } from "@/components/common/live-clip-badge";
import { usePlayerStore, formatTime } from "@/lib/store/player-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn, formatPlays } from "@/lib/utils";
import { AddToPlaylistDialog } from "@/components/common/add-to-playlist-dialog";
import { downloadSong, listDownloads, isDownloadAvailable } from "@/lib/download";
import { useToast } from "@/components/ui/toaster";
import { AppImage } from "@/components/ui/app-image";

type SongWithTrackType = ApiSong & { trackType?: TrackType };

interface VirtualSongListProps<T extends ApiSong | Track = SongWithTrackType> {
  songs: T[];
  showRank?: boolean;
  startRank?: number;
  selectable?: boolean;
  showTrackType?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onLike?: (song: ApiSong) => void;
  likedIds?: Set<string>;
  onDelete?: (song: ApiSong | Track) => void;
  className?: string;
  emptyText?: string;
}

const ROW_HEIGHT_MOBILE = 56;
const ROW_HEIGHT_DESKTOP = 60;

export function VirtualSongList<T extends ApiSong | Track = SongWithTrackType>({
  songs,
  showRank = false,
  startRank = 1,
  selectable = false,
  showTrackType = false,
  selectedIds,
  onToggleSelect,
  onLike,
  likedIds,
  onDelete,
  className,
  emptyText = "暂无歌曲",
}: VirtualSongListProps<T>) {
  const play = usePlayerStore((s) => s.play);
  const toggle = usePlayerStore((s) => s.toggle);
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const addToQueue = usePlayerStore((s) => s.addToQueue);
  const playNext = usePlayerStore((s) => s.playNext);
  const [addToPlaylistSongIds, setAddToPlaylistSongIds] = React.useState<
    string[]
  >([]);
  const [addToPlaylistClipIds, setAddToPlaylistClipIds] = React.useState<
    string[]
  >([]);
  const [playlistDialogOpen, setPlaylistDialogOpen] = React.useState(false);
  const [downloadedIds, setDownloadedIds] = React.useState<Set<string>>(
    new Set()
  );
  const [downloadingIds, setDownloadingIds] = React.useState<Set<string>>(
    new Set()
  );
  const toast = useToast();
  const parentRef = React.useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: songs.length,
    getScrollElement: () => parentRef.current,
    estimateSize: React.useCallback(
      () => (isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT_DESKTOP),
      [isMobile]
    ),
    overscan: 8,
  });

  React.useEffect(() => {
    if (!isDownloadAvailable()) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await listDownloads();
        if (!cancelled && list.length > 0) {
          setDownloadedIds(new Set(list.map((d) => d.songId)));
        }
      } catch {
        /* 静默降级 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDownload = async (song: T) => {
    if (downloadingIds.has(song.id)) return;
    if (downloadedIds.has(song.id)) {
      toast.show("已下载到本地", { description: song.title });
      return;
    }
    setDownloadingIds((prev) => new Set(prev).add(song.id));
    try {
      await downloadSong(song as ApiSong);
      setDownloadedIds((prev) => new Set(prev).add(song.id));
      toast.show("下载完成", { description: song.title });
    } catch (err) {
      toast.show("下载失败", {
        description: err instanceof Error ? err.message : "未知错误",
      });
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(song.id);
        return next;
      });
    }
  };

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-foreground/40">
        <Disc className="mb-3 h-12 w-12" />
        <p className="text-sm">{emptyText}</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn("w-full overflow-auto", className)}
      style={{ height: "100%" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const song = songs[virtualItem.index];
          const rank = startRank + virtualItem.index;
          const isTop3 = showRank && rank <= 3;
          const isActive = currentSong?.id === song.id;
          const isSelected = selectedIds?.has(song.id) ?? false;
          const isLiked = likedIds?.has(song.id) ?? false;
          const isDownloaded = downloadedIds.has(song.id);
          const isDownloading = downloadingIds.has(song.id);

          const top3BadgeClass =
            rank === 1
              ? "bg-gradient-to-b from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/50"
              : rank === 2
                ? "bg-gradient-to-b from-gray-300 to-gray-500 shadow-lg shadow-gray-400/50"
                : "bg-gradient-to-b from-orange-400 to-orange-600 shadow-lg shadow-orange-500/50";

          const handlePlay = () => {
            if (isActive) {
              toggle();
            } else {
              play(toPlayerSong(song), songs.map(toPlayerSong));
            }
          };

          return (
            <div
              key={song.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div
                className={cn(
                  "group flex h-full items-center gap-3 px-2 transition-colors md:gap-4 md:px-4",
                  isActive
                    ? "bg-primary/5"
                    : "hover:bg-foreground/[0.03]"
                )}
              >
                {selectable ? (
                  <button
                    type="button"
                    onClick={() => onToggleSelect?.(song.id)}
                    aria-label={isSelected ? "取消选择" : "选择"}
                    className={cn(
                      "flex h-10 w-6 shrink-0 items-center justify-center rounded-md border transition-colors md:h-8 md:w-6",
                      isSelected
                        ? "border-primary bg-primary text-white"
                        : "border-foreground/20 hover:border-primary"
                    )}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </button>
                ) : showRank ? (
                  <div className="flex w-8 shrink-0 justify-center md:w-10">
                    {isTop3 ? (
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold text-white",
                          top3BadgeClass
                        )}
                      >
                        {rank}
                      </span>
                    ) : (
                      <span className="font-mono text-sm font-medium text-foreground/40">
                        {rank.toString().padStart(2, "0")}
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePlay}
                    aria-label={isActive && isPlaying ? "暂停" : "播放"}
                    className="flex h-10 w-8 shrink-0 items-center justify-center rounded-full text-foreground/50 hover:bg-primary/10 hover:text-primary dark:hover:text-primary/60 md:h-8 md:w-8"
                  >
                    {isActive && isPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4 translate-x-[1px]" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handlePlay}
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-primary/5 md:h-12 md:w-12"
                >
                  {("cover" in song && (song as any).cover) ||
                  ("coverUrl" in song && song.coverUrl) ||
                  ("album" in song && song.album?.cover) ? (
                    <AppImage
                      src={
                        ("cover" in song && (song as any).cover) ||
                        ("coverUrl" in song && song.coverUrl) ||
                        ("album" in song ? song.album?.cover : undefined) ||
                        undefined
                      }
                      alt={song.title}
                      fill
                      className="rounded-lg"
                      sizes="48px"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-primary/40">
                      <Music2 className="h-5 w-5" />
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePlay}
                  className="min-w-0 flex-1 text-left"
                >
                  <p
                    className={cn(
                      "flex items-center gap-1.5 truncate text-sm font-medium",
                      isActive && "text-primary dark:text-primary/60"
                    )}
                  >
                    {showTrackType &&
                      "trackType" in song &&
                      song.trackType === "live_clip" && <LiveClipBadge />}
                    <span className="truncate">{song.title}</span>
                  </p>
                  <p className="truncate text-xs text-foreground/50">
                    {song.artist}
                  </p>
                </button>

                <div className="hidden items-center gap-1 md:flex">
                  {onLike && (
                    <button
                      type="button"
                      onClick={() => onLike(song as ApiSong)}
                      aria-label={isLiked ? "取消喜欢" : "喜欢"}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                        isLiked
                          ? "text-red-500 hover:bg-red-500/10"
                          : "text-foreground/40 hover:bg-foreground/10 hover:text-foreground"
                      )}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          isLiked && "fill-current"
                        )}
                      />
                    </button>
                  )}
                  <span className="w-16 shrink-0 text-right text-xs text-foreground/40">
                    {formatTime(song.duration)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="更多操作"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-foreground/10 hover:text-foreground md:group-hover:opacity-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          const added = playNext(toPlayerSong(song));
                          if (added) {
                            toast.success("将作为下一首播放", { description: song.title });
                          } else {
                            toast.show("已在播放队列中", { description: song.title });
                          }
                        }}
                        className="gap-2"
                      >
                        <ListStart className="h-4 w-4" />
                        下一首播放
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const added = addToQueue(toPlayerSong(song));
                          if (added) {
                            toast.success("已添加到播放队列", { description: song.title });
                          } else {
                            toast.show("已在播放队列中", { description: song.title });
                          }
                        }}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        添加到队列
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (song.trackType === "live_clip") {
                            setAddToPlaylistSongIds([]);
                            setAddToPlaylistClipIds([song.id]);
                          } else {
                            setAddToPlaylistSongIds([song.id]);
                            setAddToPlaylistClipIds([]);
                          }
                          setPlaylistDialogOpen(true);
                        }}
                        className="gap-2"
                      >
                        <ListMusic className="h-4 w-4" />
                        添加到歌单
                      </DropdownMenuItem>
                      {isDownloadAvailable() && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDownload(song)}
                            disabled={isDownloaded || isDownloading}
                            className="gap-2"
                          >
                            {isDownloading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isDownloaded ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                            {isDownloaded
                              ? "已下载"
                              : isDownloading
                                ? "下载中..."
                                : "下载"}
                          </DropdownMenuItem>
                        </>
                      )}
                      {onDelete && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDelete(song)}
                            className="gap-2 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                            删除
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {selectable && (
                  <span className="w-12 shrink-0 text-right text-xs text-foreground/40 md:hidden">
                    {formatTime(song.duration)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddToPlaylistDialog
        open={playlistDialogOpen}
        onOpenChange={setPlaylistDialogOpen}
        songIds={addToPlaylistSongIds.length > 0 ? addToPlaylistSongIds : undefined}
        clipIds={addToPlaylistClipIds.length > 0 ? addToPlaylistClipIds : undefined}
      />
    </div>
  );
}
