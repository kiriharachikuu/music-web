/**
 * XingTone —— 全局类型定义
 *
 * 对照后端 Prisma schema（music-server/prisma/schema.prisma）。
 * - 后端歌曲实体命名为 ApiSong（与 player-store 内的播放器 Song 区分）
 * - 播放器使用的 Song 直接从 player-store 复用，并在此 re-export
 */
import type { Song as PlayerSong } from "@/lib/store/player-store";

// ===== 基础实体（对照 Prisma 模型） =====

/** 歌曲（后端完整结构） */
export interface ApiSong {
  id: string;
  title: string;
  artist: string;
  albumId?: string | null;
  /** 专辑名（后端 join 返回，便于展示） */
  albumName?: string;
  duration: number; // 秒
  fileUrl: string;
  coverUrl?: string | null;
  lyricUrl?: string | null;
  releaseDate: string;
  plays: number;
  status: "PUBLISHED" | "DRAFT";
  tags?: Tag[];
}

/** 专辑 */
export interface Album {
  id: string;
  name: string;
  artist: string;
  cover?: string | null;
  description?: string | null;
  releaseDate: string;
  songCount: number;
}

/** 专辑详情（GET /api/albums/:id，含所属歌曲列表） */
export interface AlbumDetail extends Album {
  songs: ApiSong[];
}

/** 歌单 */
export interface Playlist {
  id: string;
  name: string;
  cover?: string | null;
  description?: string | null;
  userId: string;
  username?: string;
  isPublic: boolean;
  playCount: number;
  /** 歌单内歌曲数（后端可附带） */
  songCount?: number;
  createdAt: string;
}

/** 歌单详情中的关联项（PlaylistSong，含 song 与 album 关联） */
export interface PlaylistSongItem {
  id: string;
  playlistId: string;
  songId: string;
  sort: number;
  createdAt: string;
  /** 后端 include: { album: true } 在 song 上附带关联专辑 */
  song: ApiSong & {
    album?: { id: string; name: string; artist: string; cover?: string | null } | null;
  };
}

/** 歌单详情（GET /api/playlists/:id，含创建者与歌曲列表） */
export interface PlaylistDetail extends Playlist {
  user: {
    id: string;
    username: string;
    avatar?: string | null;
  };
  playlistSongs: PlaylistSongItem[];
}

/** 首页 Banner */
export interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  /** 点击跳转内部路径（优先级最低） */
  linkUrl?: string | null;
  /** 关联歌曲 ID：点击优先播放该歌曲（优先级最高） */
  songId?: string | null;
  /** 广告外链：点击打开新窗口（优先级中） */
  adUrl?: string | null;
  /** 关联歌曲数据（discover / admin 接口 include 返回） */
  song?: ApiSong | null;
  sort: number;
}

/** 标签 */
export interface Tag {
  id: string;
  name: string;
}

/** 用户角色 */
export type UserRole = "USER" | "ADMIN";

/** 用户资料 */
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  role: UserRole;
  createdAt: string;
}

/** 历史播放记录 */
export interface PlayHistoryItem {
  id: string;
  song: ApiSong;
  playTime: string; // ISO 时间字符串
}

/** 下载记录（移动端） */
export interface DownloadRecord {
  id: string;
  song: ApiSong;
  createdAt: string;
  /** 本地缓存大小（字节，前端估算） */
  size?: number;
}

// ===== API 响应 / 聚合数据 =====

/** 后端统一响应结构 { code, data, message } */
export interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}

/** 发现页聚合数据（GET /api/discover） */
export interface DiscoverData {
  banners: Banner[];
  /** 每日推荐（30 首歌曲） */
  dailyRecommend: ApiSong[];
  /** 新歌推送 */
  newSongs: ApiSong[];
  /** 精选歌单 */
  featuredPlaylists: Playlist[];
}

/** 排行榜聚合数据（GET /api/rankings） */
export interface RankingsData {
  /** 飙升榜 */
  soar: ApiSong[];
  /** 新歌榜 */
  new: ApiSong[];
  /** 热歌榜 */
  hot: ApiSong[];
}

/** 排行榜分类 key */
export type RankingType = "soar" | "new" | "hot";

/** 分页结果通用结构 */
export interface Paginated<T> {
  list: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  /** 是否还有更多 */
  hasMore?: boolean;
}

/** 搜索结果聚合（GET /api/search） */
export interface SearchResult {
  songs: Paginated<ApiSong>;
  albums: Album[];
  playlists: Playlist[];
  artists: ArtistBrief[];
}

/** 歌手概要（搜索结果中） */
export interface ArtistBrief {
  name: string;
  cover?: string | null;
  songCount: number;
}

/** 搜索结果分类 Tab */
export type SearchCategory = "all" | "songs" | "albums" | "playlists" | "artists";

/**
 * 搜索排序
 * - latest：按发布时间最新（请求映射为 sort=time）
 * - oldest：按发布时间最早（请求映射为 sort=time_asc）
 * - relevance：按相关度
 */
export type SearchSort = "latest" | "oldest" | "relevance";

// ===== 播放器适配 =====

/** 播放器使用的 Song（复用 player-store 定义） */
export type { PlayerSong };

/**
 * 将后端 ApiSong 转换为播放器可用的 PlayerSong
 * - url ← fileUrl
 * - cover ← coverUrl
 * - album ← albumName
 */
export function toPlayerSong(s: ApiSong): PlayerSong {
  return {
    id: s.id,
    title: s.title,
    artist: s.artist,
    album: s.albumName,
    cover: s.coverUrl ?? undefined,
    url: s.fileUrl,
    duration: s.duration,
  };
}

/** 批量转换 */
export function toPlayerSongs(list: ApiSong[]): PlayerSong[] {
  return list.map(toPlayerSong);
}
