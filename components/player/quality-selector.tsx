"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayerStore } from "@/lib/store/player-store";
import { setQualityPreference } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";

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

export function QualitySelector() {
  const { availableQualities, currentQuality, switchQuality, isSwitchingQuality } = usePlayerStore();
  const [isOpen, setIsOpen] = useState(false);
  const { success, error } = useToast();

  if (availableQualities.length === 0) {
    return null;
  }

  const handleSelectQuality = async (level: string) => {
    if (level === currentQuality) {
      setIsOpen(false);
      return;
    }

    setIsOpen(false);

    try {
      // "default" 级别不保存到后端（Prisma 枚举无 DEFAULT）
      if (level !== "default") {
        await setQualityPreference(level.toUpperCase() as "HIGH" | "MEDIUM" | "LOW");
      }
      await switchQuality(level);
      success(`已切换到${QUALITY_CONFIG[level]?.label || level}`);
    } catch {
      error("切换音质失败");
    }
  };

  const currentConfig = QUALITY_CONFIG[currentQuality];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchingQuality}
        className="group flex items-center gap-2 text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-colors ${currentConfig?.color || "text-white/70"} group-hover:text-white`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
            />
          </svg>
          {isSwitchingQuality && (
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
            </div>
          )}
        </div>
        {/* 桌面端显示文字 */}
        <div className="hidden md:flex flex-col items-start">
          <span className={`font-medium transition-colors ${currentConfig?.color || "text-white/70"} group-hover:text-white`}>
            {currentConfig?.label || currentQuality}
          </span>
          <span className="text-[10px] text-white/40">{currentConfig?.sublabel}</span>
        </div>
        {/* 桌面端显示下拉箭头 */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`hidden md:block h-4 w-4 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900/98 backdrop-blur-xl rounded-2xl border border-gray-800/80 shadow-2xl z-50 overflow-hidden"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              <div className="px-5 py-4 border-b border-gray-800/60">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">当前歌曲音质</h3>
                  <motion.button
                    onClick={() => setIsOpen(false)}
                    className="text-white/40 hover:text-white/70 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </motion.button>
                </div>
              </div>

              <div className="py-2 max-h-80 overflow-y-auto">
                {availableQualities.map((quality, index) => {
                  const config = QUALITY_CONFIG[quality.level];
                  const isSelected = quality.level === currentQuality;
                  return (
                    <motion.button
                      key={quality.level}
                      onClick={() => handleSelectQuality(quality.level)}
                      className={`w-full flex items-center gap-3 px-5 py-3.5 transition-all duration-200 ${
                        isSelected
                          ? "bg-primary/10"
                          : "hover:bg-white/4"
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-primary/20"
                          : "bg-white/5"
                      }`}>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-5 w-5 ${isSelected ? config?.color || "text-primary" : "text-white/50"}`}
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
                          <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/80"}`}>
                            {config?.label || quality.level}
                          </span>
                          {config?.badge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isSelected ? "bg-primary/20 text-primary" : "bg-white/10 text-white/50"
                            }`}>
                              {config.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-white/40">{config?.sublabel}</span>
                      </div>

                      <div className="flex items-center">
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
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="px-5 py-3 border-t border-gray-800/60 bg-gray-900/50">
                <p className="text-xs text-white/30 text-center">
                  选择音质将影响下载大小和播放效果
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
