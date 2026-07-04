/**
 * XingTone —— 音频引擎抽象层
 *
 * 目标：把播放器状态机（player-store）与具体音频实现（Howler / 原生）解耦，
 * 让 TWA 模式可切换到原生 Media3 引擎，浏览器模式继续使用 Howler。
 *
 * 双引擎职责划分：
 * - HowlerEngine：浏览器模式，html5 流式播放、预加载下一首、Media Session 集成
 * - NativeEngine：TWA 模式，所有控制转发到 AndroidJSBridge，原生 Media3 接管；
 *   事件由原生通过 WebView.evaluateJavascript("window.__nativePlayerEvents.onXxx()") 回传
 *
 * 事件流：
 * - 引擎层：仅感知播放/暂停/结束/加载完成/时间更新/错误等基础事件
 * - store 层：订阅这些事件并更新 currentTime / isPlaying / duration / error 状态
 */

/**
 * 引擎事件集合
 * - 所有时间参数单位：秒（与 player-store 一致；原生回调的 ms 由 NativeEngine 内部转换）
 */
export interface AudioEngineEvents {
  /** 实际开始播放（已通过浏览器自动播放策略） */
  onPlay: () => void;
  /** 暂停（用户主动或系统暂停） */
  onPause: () => void;
  /** 当前曲目播放结束（store 层根据 playMode 决定下一首） */
  onEnd: () => void;
  /** 音频元数据加载完成，duration 可读 */
  onLoad: (duration: number) => void;
  /** 播放进度变化（高频，约 4Hz） */
  onTimeUpdate: (currentTime: number) => void;
  /** 加载或播放错误，message 用于 Toast 提示 */
  onError: (message: string) => void;
}

/** 加载播放的可选参数 */
export interface LoadOptions {
  /** HTTP 请求头（如 Authorization），blob: URL 不需要 */
  headers?: Record<string, string>;
  /** 起始播放位置（秒），默认 0 */
  startTime?: number;
  /** 歌曲元数据（用于原生 Media3 通知显示） */
  metadata?: {
    title: string;
    artist: string;
    coverUrl?: string;
  };
}

/**
 * 音频引擎接口
 * - 所有方法同步返回 void，不阻塞
 * - 状态变化通过事件回调通知，避免 await 卡死
 */
export interface AudioEngine {
  /** 引擎类型，便于调试 */
  readonly type: "howler" | "native";

  /**
   * 加载并播放指定 URL
   * - url 可为 http(s):// 网络地址或 blob: 本地地址
   * - headers 用于 JWT 鉴权（仅网络地址需要）
   * - startTime 用于断点续播（秒）
   * - 多次调用应替换当前实例（不并发）
   */
  loadAndPlay(url: string, opts?: LoadOptions): Promise<void>;

  /** 继续播放（已加载但暂停后恢复） */
  play(): void;

  /** 暂停 */
  pause(): void;

  /** 跳转到指定时间（秒） */
  seek(time: number): void;

  /** 设置音量 0~1 */
  setVolume(volume: number): void;

  /** 当前播放位置（秒），从最近一次 onTimeUpdate 同步 */
  getPosition(): number;

  /** 当前曲目总时长（秒），从 onLoad 同步 */
  getDuration(): number;

  /** 卸载当前实例，释放资源（含 blob: URL revoke） */
  unload(): void;

  /** 设置事件回调（仅最新一次 setEvents 生效） */
  setEvents(events: AudioEngineEvents): void;

  /**
   * 预加载下一首歌曲（不播放，仅预热网络/磁盘缓存）
   * - 仅 HowlerEngine 实现完整预加载；NativeEngine 转发到原生 Media3 预取
   */
  preloadNext(url: string, opts?: { headers?: Record<string, string> }): void;
}
