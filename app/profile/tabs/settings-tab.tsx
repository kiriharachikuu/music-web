"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Monitor,
  Music2,
  Play,
  Trash2,
  LogOut,
  Check,
  HardDrive,
  Lock,
  Palette,
  KeyRound,
} from "lucide-react";

import { clearAllDownloads } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/common/confirm-dialog";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { androidBridge } from "@/lib/jsbridge/android-bridge";
import { getPlatform } from "@/lib/platform";
import { useColorThemeStore, type ColorTheme } from "@/lib/store/color-theme-store";
import { ChangePasswordDialog } from "./change-password-dialog";

/** localStorage key */
const DOWNLOADS_KEY = "xt-music-downloads";
const SETTINGS_KEY = "xt-music-settings";

/** 用户偏好设置（音质 / 自动播放） */
interface UserSettings {
  quality: "standard" | "high" | "lossless";
  autoplay: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  quality: "standard",
  autoplay: false,
};

/** SettingsTab 的 props */
export interface SettingsTabProps {
  onLogout: () => void;
}

/** 子模块 5：设置（外观主题 / 音质 / 自动播放 / 清除缓存 / 退出登录） */
export function SettingsTab({ onLogout }: SettingsTabProps) {
  const { theme, setTheme } = useTheme();
  const colorTheme = useColorThemeStore((s) => s.theme);
  const setColorTheme = useColorThemeStore((s) => s.setTheme);
  const [mounted, setMounted] = React.useState(false);
  const [settings, setSettings] = React.useState<UserSettings>(DEFAULT_SETTINGS);
  const [isTWA, setIsTWA] = React.useState(false);
  const [cacheSizeMB, setCacheSizeMBState] = React.useState(500);
  const [lockScreenPlayerEnabled, setLockScreenPlayerEnabledState] = React.useState(true);
  const cacheSizeSavedRef = React.useRef(500);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  React.useEffect(() => {
    setMounted(true);
    const platform = getPlatform();
    setIsTWA(platform.isTWA);
    if (platform.isTWA) {
      const savedSize = androidBridge.getCacheSizeMB();
      setCacheSizeMBState(savedSize);
      cacheSizeSavedRef.current = savedSize;
      setLockScreenPlayerEnabledState(androidBridge.isLockScreenPlayerEnabled());
    }
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  const update = (patch: Partial<UserSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  const handleCacheSizeInput = (mb: number) => {
    const clamped = Math.max(50, Math.min(5000, Math.floor(mb)));
    setCacheSizeMBState(clamped);
  };

  const handleCacheSizeCommit = () => {
    const current = cacheSizeMB;
    if (current === cacheSizeSavedRef.current) return;
    cacheSizeSavedRef.current = current;
    androidBridge.setCacheSizeMB(current);
    toast.success(`临时缓存已设置为 ${current}MB`);
  };

  const handleLockScreenPlayerChange = (enabled: boolean) => {
    setLockScreenPlayerEnabledState(enabled);
    androidBridge.setLockScreenPlayerEnabled(enabled);
    toast.success(enabled ? "锁屏/通知栏播放器已开启" : "锁屏/通知栏播放器已关闭");
  };

  /** 清除缓存：localStorage 关键 key + Cache API + IndexedDB 音频缓存 */
  const clearCache = async () => {
    if (
      !(await confirm({
        title: "清除本地缓存",
        description: "下载记录与偏好将被重置，确定继续吗？",
        confirmText: "清除",
        variant: "destructive",
      }))
    )
      return;
    try {
      ["xt-music-player", DOWNLOADS_KEY, SETTINGS_KEY, "xt-music-search-history"].forEach(
        (k) => localStorage.removeItem(k)
      );
      // 清空 IndexedDB 下载缓存（音频 Blob）
      await clearAllDownloads();
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      toast.success("缓存已清除");
    } catch {
      toast.error("清除失败");
    }
  };

  return (
    <React.Fragment>
      <div className="space-y-6">
      {/* 外观主题：预览卡片，点击立即应用 */}
      <div>
        <p className="mb-3 text-sm font-medium text-foreground/80">外观主题</p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              {
                key: "light",
                label: "亮色",
                icon: Sun,
                // 预览：白底 + 深色文字 + 主色色块
                preview: (
                  <div className="flex h-full items-center justify-between bg-white px-2.5">
                    <span className="text-xs font-semibold text-gray-900">
                      Aa
                    </span>
                    <span className="h-3 w-3 rounded-sm bg-[#8B00FF]" />
                  </div>
                ),
              },
              {
                key: "dark",
                label: "暗色",
                icon: Moon,
                // 预览：深底 + 浅色文字 + 主色色块
                preview: (
                  <div className="flex h-full items-center justify-between bg-gray-900 px-2.5">
                    <span className="text-xs font-semibold text-gray-100">
                      Aa
                    </span>
                    <span className="h-3 w-3 rounded-sm bg-[#A855F7]" />
                  </div>
                ),
              },
              {
                key: "system",
                label: "跟随系统",
                icon: Monitor,
                // 预览：左右分屏（左亮右暗）
                preview: (
                  <div className="flex h-full">
                    <div className="flex flex-1 items-center justify-center bg-white">
                      <Sun className="h-3 w-3 text-gray-900" />
                    </div>
                    <div className="flex flex-1 items-center justify-center bg-gray-900">
                      <Moon className="h-3 w-3 text-gray-100" />
                    </div>
                  </div>
                ),
              },
            ] as const
          ).map((t) => {
            const isActive = mounted && theme === t.key;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTheme(t.key)}
                aria-pressed={isActive}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 transition-all",
                  isActive
                    ? "border-primary shadow-sm shadow-primary/20"
                    : "border-transparent bg-foreground/5 hover:bg-foreground/10"
                )}
              >
                {/* 预览区 */}
                <div className="h-12 w-full border-b border-border/40">
                  {t.preview}
                </div>
                {/* 标签行 */}
                <div className="flex items-center justify-center gap-1 py-1.5">
                  <Icon
                    className={cn(
                      "h-3 w-3",
                      isActive
                        ? "text-primary dark:text-primary/70"
                        : "text-foreground/50"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isActive
                        ? "text-primary dark:text-primary/70"
                        : "text-foreground/60"
                    )}
                  >
                    {t.label}
                  </span>
                </div>
                {/* 选中角标 */}
                {isActive && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 颜色主题：星瞳紫 / 天蓝色 / 淡粉色 */}
      <div>
        <p className="mb-3 text-sm font-medium text-foreground/80">颜色主题</p>
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              {
                key: "purple" as ColorTheme,
                label: "星瞳紫",
                desc: "默认品牌色",
                color: "#8B00FF",
                preview: (
                  <div className="flex h-full items-center justify-between px-2.5" style={{ background: "linear-gradient(135deg, #FAF5FF 0%, #8B00FF 100%)" }}>
                    <span className="text-xs font-semibold text-gray-900">Aa</span>
                    <span className="h-3 w-3 rounded-sm bg-[#8B00FF]" />
                  </div>
                ),
              },
              {
                key: "sky" as ColorTheme,
                label: "天蓝色",
                desc: "清爽明亮",
                color: "#007AFF",
                preview: (
                  <div className="flex h-full items-center justify-between px-2.5" style={{ background: "linear-gradient(135deg, #E3F2FF 0%, #007AFF 100%)" }}>
                    <span className="text-xs font-semibold text-gray-900">Aa</span>
                    <span className="h-3 w-3 rounded-sm bg-[#007AFF]" />
                  </div>
                ),
              },
              {
                key: "pink" as ColorTheme,
                label: "淡粉色",
                desc: "柔和温暖",
                color: "#FF375F",
                preview: (
                  <div className="flex h-full items-center justify-between px-2.5" style={{ background: "linear-gradient(135deg, #FFE8EE 0%, #FF375F 100%)" }}>
                    <span className="text-xs font-semibold text-gray-900">Aa</span>
                    <span className="h-3 w-3 rounded-sm bg-[#FF375F]" />
                  </div>
                ),
              },
            ] as const
          ).map((t) => {
            const isActive = mounted && colorTheme === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setColorTheme(t.key)}
                aria-pressed={isActive}
                className={cn(
                  "group relative overflow-hidden rounded-xl border-2 transition-all",
                  isActive
                    ? "border-primary shadow-sm shadow-primary/20"
                    : "border-transparent bg-foreground/5 hover:bg-foreground/10"
                )}
              >
                <div className="h-12 w-full border-b border-border/40">
                  {t.preview}
                </div>
                <div className="flex flex-col items-center justify-center gap-0.5 py-1.5">
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      isActive ? "text-primary" : "text-foreground/60"
                    )}
                  >
                    {t.label}
                  </span>
                  <span className="text-[10px] text-foreground/40">
                    {t.desc}
                  </span>
                </div>
                {isActive && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 音质选择（占位：当前单文件架构，多码率切换即将支持） */}
      <div>
        <SettingsRow icon={Music2} title="播放音质">
          <div className="flex items-center gap-1.5 opacity-50">
            {(
              [
                { key: "standard", label: "标准" },
                { key: "high", label: "高清" },
                { key: "lossless", label: "无损" },
              ] as const
            ).map((q) => {
              const isActive = settings.quality === q.key;
              return (
                <button
                  key={q.key}
                  type="button"
                  disabled
                  aria-disabled="true"
                  className={cn(
                    "cursor-not-allowed rounded-full px-3 py-1.5 text-xs font-medium",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-foreground/5 text-foreground/50"
                  )}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
        </SettingsRow>
        <p className="mt-1.5 px-4 text-[11px] text-foreground/40">
          多码率切换即将支持
        </p>
      </div>

      {/* 自动播放开关 */}
      <SettingsRow icon={Play} title="自动播放">
        <Switch
          checked={settings.autoplay}
          onChange={(v) => update({ autoplay: v })}
          ariaLabel="自动播放"
        />
      </SettingsRow>

      {/* TWA 锁屏/通知栏播放器开关（仅 TWA 环境显示） */}
      {isTWA && (
        <SettingsRow icon={Lock} title="锁屏与通知栏播放器">
          <Switch
            checked={lockScreenPlayerEnabled}
            onChange={handleLockScreenPlayerChange}
            ariaLabel="锁屏与通知栏播放器"
          />
        </SettingsRow>
      )}

      {/* TWA 临时缓存大小（仅 TWA 环境显示） */}
      {isTWA && (
        <div>
          <SettingsRow icon={HardDrive} title="临时缓存大小">
            <span className="text-sm font-medium text-foreground/80">
              {cacheSizeMB} MB
            </span>
          </SettingsRow>
          <div className="mt-2 space-y-2 px-4">
            <input
              type="range"
              min={50}
              max={5000}
              step={50}
              value={cacheSizeMB}
              onChange={(e) => handleCacheSizeInput(Number(e.target.value))}
              onPointerUp={handleCacheSizeCommit}
              onKeyUp={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
                  handleCacheSizeCommit();
                }
              }}
              className="w-full h-2 rounded-full bg-foreground/10 appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[11px] text-foreground/40">
              <span>50MB</span>
              <span>500MB（默认）</span>
              <span>5000MB</span>
            </div>
          </div>
        </div>
      )}

      {/* 清除缓存 */}
      <SettingsRow icon={Trash2} title="清除缓存">
        <Button
          variant="outline"
          onClick={clearCache}
          className="rounded-full px-4 text-sm"
        >
          清除
        </Button>
      </SettingsRow>

      {/* 修改密码 */}
      <SettingsRow icon={KeyRound} title="修改密码">
        <Button
          variant="outline"
          onClick={() => setChangePasswordOpen(true)}
          className="rounded-full px-4 text-sm"
        >
          修改
        </Button>
      </SettingsRow>

      {/* 退出登录 */}
      <div className="pt-2">
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>
      </div>
      </div>

      <ChangePasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
      />
    </React.Fragment>
  );
}

/** 设置行：左侧图标+标题，右侧控件 */
function SettingsRow({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Sun;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-primary/10 bg-card/40 px-4 py-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:text-primary/70">
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-sm font-medium">{title}</span>
      </div>
      {children}
    </div>
  );
}

/** 自定义开关：开启态 primary-700 填充 */
function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 overflow-hidden rounded-full transition-colors",
        checked ? "bg-primary" : "bg-foreground/15"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
          checked ? "left-[calc(100%-22px)]" : "left-0.5"
        )}
      />
    </button>
  );
}
