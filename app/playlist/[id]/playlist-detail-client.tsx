"use client";

import * as React from "react";
import {
  Play,
  Heart,
  ListMusic,
  User2,
  Trash2,
  GripVertical,
  Music2,
  Pencil,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { PlaylistDetail, ApiSong } from "@/lib/types";
import { toPlayerSong, toPlayerSongs } from "@/lib/types";
import { usePlayerStore } from "@/lib/store/player-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { cn, formatPlays } from "@/lib/utils";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { EditPlaylistSheet } from "@/app/profile/tabs/edit-playlist-sheet";
import { EditPlaylistDialog } from "@/app/profile/tabs/edit-playlist-dialog";
import { useToast } from "@/components/ui/toaster";

/**
 * 歌单详情客户端组件
 * - Apple Music 风格 Hero：封面模糊放大做渐变背景 + 大封面 + 大标题
 * - 展示创建者（头像 + 用户名）、播放次数、歌曲数、描述
 * - 操作：播放全部 / 收藏
 * - 歌单创建者可管理歌曲：拖拽排序 + 删除
 */
export function PlaylistDetailClient({
  playlist,
}: {
  playlist: PlaylistDetail;
}) {
  const play = usePlayerStore((s) => s.play);
  const openLogin = useAuthStore((s) => s.openLogin);
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const loadLikedFromServer = useFavoritesStore((s) => s.loadFromServer);
  const isMobile = useIsMobile();
  const toast = useToast();
  const [favorited, setFavorited] = React.useState(false);
  const [favLoading, setFavLoading] = React.useState(false);
  const [manageMode, setManageMode] = React.useState(false);
  const [songList, setSongList] = React.useState<ApiSong[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [, setRefreshKey] = React.useState(0);

  // 是否为歌单创建者（可管理歌曲）
  const isOwner = React.useMemo(() => {
    const token = getToken();
    if (!token || !playlist.user) return false;
    try {
      const userStr = localStorage.getItem("xt_music_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id === playlist.user.id;
      }
    } catch {
      /* 忽略 */
    }
    return false;
  }, [playlist.user]);

  // 从 playlistSongs 映射出歌曲数组，按 sort 升序
  React.useEffect(() => {
    const songs = (playlist.playlistSongs ?? [])
      .slice()
      .sort((a, b) => a.sort - b.sort)
      .map((ps) => {
        const { album, ...rest } = ps.song;
        return {
          ...rest,
          albumName: rest.albumName ?? album?.name ?? undefined,
        } as ApiSong;
      });
    setSongList(songs);
  }, [playlist.playlistSongs]);

  // 检查是否已收藏
  React.useEffect(() => {
    if (!getToken()) return;
    api
      .get<{ favorited: boolean }>(`/user/playlists/${playlist.id}/favorite`)
      .then((res) => setFavorited(res.favorited))
      .catch(() => {});
  }, [playlist.id]);

  // 加载喜欢的歌曲列表（仅加载一次）
  React.useEffect(() => {
    if (!getToken()) return;
    const loaded = useFavoritesStore.getState().loaded;
    if (!loaded) {
      void loadLikedFromServer();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 喜欢/取消喜欢（未登录时触发登录弹窗）
  const handleLike = (song: ApiSong) => {
    if (!getToken()) {
      openLogin();
      return;
    }
    void toggleLike(song.id);
  };

  // 切换收藏
  const toggleFavorite = async () => {
    if (!getToken()) {
      openLogin();
      return;
    }
    setFavLoading(true);
    try {
      const res = await api.post<{ favorited: boolean }>(
        `/user/playlists/${playlist.id}/favorite`
      );
      setFavorited(res.favorited);
    } catch {
      /* 忽略 */
    } finally {
      setFavLoading(false);
    }
  };

  /** 播放全部 */
  const playAll = () => {
    if (songList.length === 0) return;
    play(toPlayerSong(songList[0]), toPlayerSongs(songList));
  };

  /** 删除歌单中的歌曲 */
  const handleRemoveSong = async (songId: string) => {
    setRemovingId(songId);
    try {
      await api.del(`/user/playlists/${playlist.id}/songs/${songId}`);
      setSongList((prev) => prev.filter((s) => s.id !== songId));
    } catch {
      /* 忽略 */
    } finally {
      setRemovingId(null);
    }
  };

  // dnd-kit 传感器：PointerSensor（鼠标/触摸）+ KeyboardSensor（无障碍）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /** 拖拽结束：乐观更新 + 调用后端 reorder + 失败回滚 */
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = songList.findIndex((s) => s.id === active.id);
    const newIndex = songList.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    // 保存旧顺序用于回滚
    const oldList = [...songList];
    // 乐观更新：立即交换位置
    const newList = arrayMove(songList, oldIndex, newIndex);
    setSongList(newList);

    setSaving(true);
    try {
      await api.put(`/user/playlists/${playlist.id}/songs/reorder`, {
        songIds: newList.map((s) => s.id),
      });
    } catch {
      // 失败回滚到旧顺序
      setSongList(oldList);
    } finally {
      setSaving(false);
    }
  };

  const creator = playlist.user;

  return (
    <section className="animate-fade-in space-y-8">
      {/* ===== Hero 区域 ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* 封面模糊放大作为渐变背景（毛玻璃氛围） */}
        <div className="absolute inset-0 -z-10" aria-hidden>
          {playlist.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={playlist.cover}
              alt=""
              className="h-full w-full scale-150 object-cover opacity-50 blur-3xl"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/75 to-background" />
        </div>

        <div className="flex flex-col gap-6 p-6 md:flex-row md:items-end md:gap-8 md:p-8">
          {/* 大封面 */}
          <div className="h-44 w-44 shrink-0 overflow-hidden rounded-2xl bg-primary/5 shadow-card-dark md:h-56 md:w-56">
            {playlist.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.cover}
                alt={playlist.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary/40">
                <ListMusic className="h-16 w-16" />
              </div>
            )}
          </div>

          {/* 右侧信息 */}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-foreground/50">
              歌单
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              {playlist.name}
            </h1>

            {/* 创建者 */}
            <div className="flex items-center gap-2 text-sm text-foreground/60">
              {creator?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={creator.avatar}
                  alt={creator.username}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary/60">
                  <User2 className="h-3.5 w-3.5" />
                </span>
              )}
              <span>{creator?.username ?? "未知用户"}</span>
            </div>

            {/* 播放次数 / 歌曲数 */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground/40">
              {playlist.playCount > 0 && (
                <>
                  <span>{formatPlays(playlist.playCount)} 次播放</span>
                  <span>·</span>
                </>
              )}
              <span>{songList.length} 首歌</span>
            </div>

            {playlist.description && (
              <p className="mt-2 max-w-2xl line-clamp-3 text-sm text-foreground/60">
                {playlist.description}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== 操作按钮 ===== */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={playAll}
          disabled={songList.length === 0}
          className="rounded-full bg-primary px-5 text-white shadow-card hover:bg-primary/90 active:bg-primary/95"
        >
          <Play className="h-4 w-4 translate-x-[1px]" />
          播放全部
        </Button>
        <Button
          onClick={toggleFavorite}
          disabled={favLoading}
          variant="outline"
          className="rounded-full px-5"
          aria-label={favorited ? "取消收藏" : "收藏"}
        >
          <Heart
            className={cn(
              "h-4 w-4 transition-colors",
              favorited && "fill-current text-primary dark:text-primary/60"
            )}
          />
          {favorited ? "已收藏" : "收藏"}
        </Button>
        {isOwner && (
          <Button
            onClick={() => setEditOpen(true)}
            variant="outline"
            className="rounded-full px-5"
          >
            <Pencil className="h-4 w-4" />
            编辑歌单
          </Button>
        )}
        {isOwner && songList.length > 0 && (
          <Button
            onClick={() => setManageMode((m) => !m)}
            variant={manageMode ? "default" : "outline"}
            disabled={saving}
            className="rounded-full px-5"
          >
            <ListMusic className="h-4 w-4" />
            {manageMode ? "完成管理" : "管理歌曲"}
          </Button>
        )}
        {manageMode && (
          <span className="text-xs text-foreground/40">
            拖拽手柄调整顺序，点击删除移除歌曲
          </span>
        )}
        <span className="ml-auto text-xs text-foreground/40">
          共 {songList.length} 首
        </span>
      </div>

      {/* ===== 曲目列表 ===== */}
      {songList.length > 0 ? (
        <div className="rounded-2xl border border-primary/10 bg-card/40 p-2 md:p-3">
          {!manageMode ? (
            <SongList
              songs={songList}
              likedIds={likedIds}
              onLike={handleLike}
              showTrackType={true}
            />
          ) : (
            /* 管理模式：拖拽排序 + 删除 */
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={songList.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {songList.map((song, index) => (
                    <SortableSongRow
                      key={song.id}
                      song={song}
                      index={index}
                      onRemove={handleRemoveSong}
                      removingId={removingId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      ) : (
        <EmptyState
          icon={ListMusic}
          title="歌单暂无歌曲"
          description="该歌单还没有添加任何歌曲。"
        />
      )}

      {(() => {
        const EditComponent = isMobile ? EditPlaylistSheet : EditPlaylistDialog;
        return (
          <EditComponent
            open={editOpen}
            onOpenChange={setEditOpen}
            mode="edit"
            playlist={playlist}
            onSaved={() => {
              setRefreshKey((k) => k + 1);
              toast.success("歌单已更新");
            }}
          />
        );
      })()}
    </section>
  );
}

// ===== 可拖拽歌曲行 =====

interface SortableSongRowProps {
  song: ApiSong;
  index: number;
  onRemove: (songId: string) => void;
  removingId: string | null;
}

function SortableSongRow({
  song,
  index,
  onRemove,
  removingId,
}: SortableSongRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-foreground/5",
        isDragging && "bg-background opacity-80 shadow-lg ring-1 ring-primary/30"
      )}
    >
      {/* 拖拽手柄（仅手柄区域可发起拖拽） */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex h-8 w-6 shrink-0 cursor-grab items-center justify-center text-foreground/30 transition-colors hover:text-foreground/60 active:cursor-grabbing"
        aria-label="拖拽排序"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {/* 序号 */}
      <span className="w-6 shrink-0 text-center text-xs text-foreground/40">
        {index + 1}
      </span>
      {/* 封面 */}
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-primary/5">
        {song.coverUrl || (song.album?.cover && song.album.cover) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={song.coverUrl || song.album?.cover || undefined}
            alt={song.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary/30">
            <Music2 className="h-4 w-4" />
          </div>
        )}
      </div>
      {/* 歌名 + 歌手 */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{song.title}</p>
        <p className="truncate text-xs text-foreground/50">{song.artist}</p>
      </div>
      {/* 删除按钮 */}
      <button
        type="button"
        onClick={() => onRemove(song.id)}
        disabled={removingId === song.id}
        className="flex h-8 w-8 items-center justify-center rounded-full text-foreground/40 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 disabled:opacity-30"
        aria-label="删除"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
