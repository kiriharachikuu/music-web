"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { usePlayerStore } from "@/lib/store/player-store";
import { setQualityPreference } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

const QUALITY_CONFIG: Record<string, { label: string; sublabel: string; color: string; badge?: string }> = {
  high: {
    label: "高音质",
    sublabel: "极高 320kbps",
    color: "text-green-400",
    badge: "HQ",
  },
  medium: {
    label: "中等音质",
    sublabel: "标准 192kbps",
    color: "text-yellow-400",
  },
  low: {
    label: "低音质",
    sublabel: "流畅 128kbps",
    color: "text-gray-400",
  },
  default: {
    label: "默认音质",
    sublabel: "自动选择",
    color: "text-gray-400",
  },
};

export interface QualitySheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function QualitySheet({ open, onOpenChange }: QualitySheetProps) {
  const { availableQualities, currentQuality, switchQuality, isSwitchingQuality, setPreferredQuality } = usePlayerStore();
  const { success, error } = useToast();

  const handleSelectQuality = async (level: string) => {
    if (level === currentQuality) {
      onOpenChange(false);
      return;
    }

    onOpenChange(false);

    try {
      if (level !== "default") {
        await setQualityPreference(level.toUpperCase() as "HIGH" | "MEDIUM" | "LOW");
      }
      // 同步更新 store 中的偏好音质，确保切歌时能自动应用
      setPreferredQuality(level);
      await switchQuality(level);
      success(`已切换到${QUALITY_CONFIG[level]?.label || level}`);
    } catch {
      error("切换音质失败");
    }
  };

  if (availableQualities.length === 0) {
    return null;
  }

  const currentConfig = QUALITY_CONFIG[currentQuality];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "flex flex-col gap-0 border-white/10 bg-black/40 p-0 text-white backdrop-blur-xl rounded-t-2xl",
          "[&>button]:text-white/70 [&>button:hover]:text-white [&>button]:top-4 [&>button]:right-4",
          "pb-safe"
        )}
      >
        {/* 顶部把手 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <SheetHeader className="border-b border-white/10 px-5 py-3">
          <SheetTitle className="text-white text-base">音质选择</SheetTitle>
          <SheetDescription className="text-xs text-white/40">
            当前：{currentConfig?.label || currentQuality}
          </SheetDescription>
        </SheetHeader>

        <div className="py-2">
          {availableQualities.map((quality, index) => {
            const config = QUALITY_CONFIG[quality.level];
            const isSelected = quality.level === currentQuality;
            return (
              <motion.button
                key={quality.level}
                onClick={() => handleSelectQuality(quality.level)}
                disabled={isSwitchingQuality}
                className={cn(
                  "w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-200",
                  isSelected ? "bg-primary/10" : "hover:bg-white/5",
                  isSwitchingQuality && "opacity-50 cursor-not-allowed"
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  isSelected ? "bg-primary/20" : "bg-white/5"
                )}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={cn("h-5 w-5", isSelected ? (config?.color || "text-primary") : "text-white/50")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 18V5l12-2v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-medium", isSelected ? "text-white" : "text-white/80")}>
                      {config?.label || quality.level}
                    </span>
                    {config?.badge && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded font-medium",
                        isSelected ? "bg-primary/20 text-primary" : "bg-white/10 text-white/50"
                      )}>
                        {config.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-white/40">{config?.sublabel}</span>
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-primary"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-white/5 bg-black/20">
          <p className="text-xs text-white/30 text-center">
            选择音质将影响下载大小和播放效果
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
