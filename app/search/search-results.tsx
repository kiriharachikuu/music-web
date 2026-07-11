import Link from "next/link";
import { Search, User2, Loader2 } from "lucide-react";

import type {
  SearchResult,
  SearchCategory,
  ArtistBrief,
  ApiSong,
} from "@/lib/types";
import { SongList } from "@/components/common/song-list";
import { AlbumCard } from "@/components/common/album-card";
import { PlaylistCard } from "@/components/common/playlist-card";
import { EmptyState } from "@/components/common/empty-state";
import {
  SongListSkeleton,
  CardGridSkeleton,
} from "@/components/common/loading-skeleton";

export interface SearchResultsProps {
  results: SearchResult;
  category: SearchCategory;
  query: string;
  likedIds: Set<string>;
  onLike: (song: ApiSong) => void;
}

/** 搜索结果渲染（按分类） */
export function SearchResults({
  results,
  category,
  query,
  likedIds,
  onLike,
}: SearchResultsProps) {
  const songList = results.songs?.list ?? [];
  const albums = results.albums ?? [];
  const playlists = results.playlists ?? [];
  // 优先用后端返回的歌手；后端未返回时从歌曲结果聚合（按 artist 去重 + 统计歌曲数）
  const backendArtists = results.artists ?? [];
  const artists: ArtistBrief[] =
    backendArtists.length > 0
      ? backendArtists
      : (() => {
          const map = new Map<string, ArtistBrief>();
          for (const s of songList) {
            if (!s.artist) continue;
            if (!map.has(s.artist)) {
              map.set(s.artist, { name: s.artist, songCount: 0 });
            }
            map.get(s.artist)!.songCount++;
          }
          return Array.from(map.values());
        })();
  const isEmpty =
    songList.length === 0 &&
    albums.length === 0 &&
    playlists.length === 0 &&
    artists.length === 0;

  if (isEmpty) {
    return (
      <EmptyState
        icon={Search}
        title={`未找到「${query}」的相关结果`}
        description="换个关键词试试吧～"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* 歌曲 */}
      {(category === "all" || category === "songs") && songList.length > 0 && (
        <div>
          {category === "all" && (
            <h3 className="mb-2 text-sm font-semibold text-foreground/70">
              歌曲
            </h3>
          )}
          <div className="rounded-2xl border border-primary-500/10 bg-card/40 p-2 md:p-3">
            <SongList
              songs={songList}
              onLike={onLike}
              likedIds={likedIds}
            />
          </div>
        </div>
      )}

      {/* 专辑 */}
      {(category === "all" || category === "albums") && albums.length > 0 && (
        <div>
          {category === "all" && (
            <h3 className="mb-2 text-sm font-semibold text-foreground/70">
              专辑
            </h3>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {albums.map((a) => (
              <AlbumCard key={a.id} album={a} />
            ))}
          </div>
        </div>
      )}

      {/* 歌单 */}
      {(category === "all" || category === "playlists") &&
        playlists.length > 0 && (
          <div>
            {category === "all" && (
              <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                歌单
              </h3>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {playlists.map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </div>
          </div>
        )}

      {/* 歌手 */}
      {(category === "all" || category === "artists") &&
        artists.length > 0 && (
          <div>
            {category === "all" && (
              <h3 className="mb-2 text-sm font-semibold text-foreground/70">
                歌手
              </h3>
            )}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {artists.map((a) => (
                <ArtistCard key={a.name} artist={a} />
              ))}
            </div>
          </div>
        )}
    </div>
  );
}

export interface ArtistCardProps {
  artist: ArtistBrief;
}

/** 歌手卡片：圆形头像 + 名字 + 歌曲数 */
export function ArtistCard({ artist }: ArtistCardProps) {
  const cover = artist.cover ?? artist.avatar;
  return (
    <Link
      href={artist.id ? `/artist/${artist.id}` : "#"}
      className="flex flex-col items-center gap-2 text-center transition-transform hover:scale-105 active:scale-95"
    >
      <div className="h-24 w-24 overflow-hidden rounded-full bg-primary-700/5 shadow-card md:h-28 md:w-28">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={artist.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-primary-700/30">
            <User2 className="h-10 w-10" />
          </div>
        )}
      </div>
      <p className="text-sm font-medium">{artist.name}</p>
      <p className="text-xs text-foreground/40">{artist.songCount} 首</p>
    </Link>
  );
}

export interface SearchResultsSkeletonProps {
  category: SearchCategory;
}

/** 搜索结果骨架 */
export function SearchResultsSkeleton({
  category,
}: SearchResultsSkeletonProps) {
  return (
    <div className="space-y-3">
      {category === "all" || category === "songs" ? (
        <SongListSkeleton count={6} />
      ) : (
        <CardGridSkeleton count={6} />
      )}
      <div className="flex items-center justify-center gap-2 py-2 text-sm text-foreground/40">
        <Loader2 className="h-4 w-4 animate-spin" />
        搜索中...
      </div>
    </div>
  );
}
