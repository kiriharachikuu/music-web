"use client";

import * as React from "react";
import { History, Trash2 } from "lucide-react";

import type { PlayHistoryItem, ApiSong } from "@/lib/types";
import { api } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { useAuthStore } from "@/lib/store/auth-store";
import { useFavoritesStore } from "@/lib/store/favorites-store";
import { SongList } from "@/components/common/song-list";
import { EmptyState } from "@/components/common/empty-state";
import { PageSkeleton } from "@/components/common/loading-skeleton";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/common/confirm-dialog";

/** 子模块 3：历史播放 */
export function HistoryTab() {
  const [items, setItems] = React.useState<PlayHistoryItem[] | null>(null);
  const confirm = useConfirm();
  const openLogin = useAuthStore((s) => s.openLogin);
  const likedIds = useFavoritesStore((s) => s.likedIds);
  const toggleLike = useFavoritesStore((s) => s.toggleLike);
  const loadLikedFromServer = useFavoritesStore((s) => s.loadFromServer);

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

  const load = async () => {
    try {
      // 后端返回分页结构 { list, total, page, limit, totalPages }
      const data = await api.get<{ list: PlayHistoryItem[]; total: number }>(
        "/user/history"
      );
      setItems(data?.list ?? []);
    } catch {
      setItems([]);
    }
  };

  React.useEffect(() => {
    void load();
  }, []);

  const clearAll = async () => {
    if (
      !(await confirm({
        title: "清空播放历史",
        description: "确定清空全部播放历史吗？此操作不可恢复。",
        confirmText: "清空",
        variant: "destructive",
      }))
    )
      return;
    try {
      await api.del("/user/history");
      setItems([]);
    } catch {
      /* 忽略 */
    }
  };

  // 删除单条播放历史
  const deleteItem = async (songId: string) => {
    try {
      await api.del(`/user/history/${songId}`);
      setItems((prev) => prev ? prev.filter((it) => it.song.id !== songId) : prev);
    } catch {
      /* 忽略 */
    }
  };

  if (items === null) return <PageSkeleton variant="list" />;

  // 按日期分组
  const groups = groupByDate(items);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-foreground/40">
          共 {items.length} 条记录
        </span>
        {items.length > 0 && (
          <Button
            variant="ghost"
            onClick={clearAll}
            className="rounded-full px-3 text-sm text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            清空历史
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={History}
          title="暂无播放历史"
          description="听过的歌会出现在这里。"
        />
      ) : (
        groups.map((g) => (
          <div key={g.label} className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground/70">
              {g.label}
            </h3>
            <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
              <SongList
                songs={g.items.map((it) => it.song)}
                onDelete={(song) => void deleteItem(song.id)}
                likedIds={likedIds}
                onLike={handleLike}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/** 按日期分组：今天 / 昨天 / 更早 */
function groupByDate(items: PlayHistoryItem[]) {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const today: PlayHistoryItem[] = [];
  const yesterday: PlayHistoryItem[] = [];
  const earlier: PlayHistoryItem[] = [];
  for (const it of items) {
    const t = new Date(it.playTime).getTime();
    if (t >= startOfToday) today.push(it);
    else if (t >= startOfYesterday) yesterday.push(it);
    else earlier.push(it);
  }
  const groups: { label: string; items: PlayHistoryItem[] }[] = [];
  if (today.length) groups.push({ label: "今天", items: today });
  if (yesterday.length) groups.push({ label: "昨天", items: yesterday });
  if (earlier.length) groups.push({ label: "更早", items: earlier });
  return groups;
}
