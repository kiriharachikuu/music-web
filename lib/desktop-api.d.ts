/**
 * Electron 桌面客户端注入的 API 类型声明
 *
 * 仅在 music-desktop 的 preload 脚本执行后可用；
 * 浏览器 / TWA 环境下 window.electronAPI 为 undefined。
 */

export type DesktopDownloadState =
  | "pending"
  | "downloading"
  | "completed"
  | "error";

export interface DesktopDownloadItem {
  id: string;
  url: string;
  fileName: string;
  progress: number;
  state: DesktopDownloadState;
  localPath?: string;
  size?: number;
  error?: string;
  meta?: Record<string, unknown>;
}

export type DesktopControlCommand =
  | "play"
  | "pause"
  | "toggle-play"
  | "prev"
  | "next"
  | "volume-up"
  | "volume-down";

export interface DesktopWindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
}

export interface DesktopVersionInfo {
  app: string;
  electron: string;
  chrome: string;
  node: string;
}

export interface DesktopUpdateInfo {
  hasUpdate: boolean;
  version?: string;
  forceUpdate?: boolean;
  downloadUrl?: string;
  releaseNotes?: string;
}

export interface ElectronAPI {
  platform: "desktop";
  version: string;

  getPlatform(): Promise<string>;
  getVersions(): Promise<DesktopVersionInfo>;

  minimizeWindow(): Promise<void>;
  maximizeWindow(): Promise<void>;
  closeWindow(): Promise<void>;
  getWindowState(): Promise<DesktopWindowState>;
  onWindowState(cb: (state: DesktopWindowState) => void): () => void;

  onControlCommand(cb: (cmd: DesktopControlCommand) => void): () => void;
  sendControlCommand(cmd: DesktopControlCommand): Promise<void>;

  downloadFile(
    url: string,
    fileName: string,
    meta?: Record<string, unknown>
  ): Promise<void>;
  onDownloadProgress(cb: (item: DesktopDownloadItem) => void): () => void;
  getDownloads(): Promise<DesktopDownloadItem[]>;
  getLocalPath(id: string): Promise<string | null>;
  removeDownload(id: string): Promise<void>;

  checkForUpdates(): Promise<DesktopUpdateInfo>;
}

declare global {
  interface Window {
    __XINGTONE_DESKTOP__?: true;
    electronAPI?: ElectronAPI;
  }
}

export {};
