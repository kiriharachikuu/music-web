"use client";

import { useState } from "react";
import { usePlayerStore } from "@/lib/store/player-store";
import { setQualityPreference } from "@/lib/api";
import { useToast } from "@/components/ui/toaster";

const QUALITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "高音质", color: "text-green-400" },
  medium: { label: "中等音质", color: "text-yellow-400" },
  low: { label: "低音质", color: "text-gray-400" },
  default: { label: "默认音质", color: "text-gray-400" },
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
      await setQualityPreference(level.toUpperCase() as "HIGH" | "MEDIUM" | "LOW");
      await switchQuality(level);
      success(`已切换到${QUALITY_LABELS[level]?.label || level}`);
    } catch {
      error("切换音质失败");
    }
  };

  const currentLabel = QUALITY_LABELS[currentQuality];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitchingQuality}
        className="flex items-center gap-1.5 text-sm text-white/80 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
        <span className={`${currentLabel?.color || "text-white/80"} font-medium`}>
          {currentLabel?.label || currentQuality}
        </span>
        {isSwitchingQuality && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full right-0 mt-2 w-40 bg-gray-900/95 backdrop-blur-md rounded-lg border border-gray-700/50 shadow-xl z-50 overflow-hidden">
            <div className="py-2">
              {availableQualities.map((quality) => {
                const label = QUALITY_LABELS[quality.level];
                const isSelected = quality.level === currentQuality;
                return (
                  <button
                    key={quality.level}
                    onClick={() => handleSelectQuality(quality.level)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                      isSelected
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                      <span className={isSelected ? label?.color : ""}>
                        {label?.label || quality.level}
                      </span>
                    </div>
                    {quality.bitrate > 0 && (
                      <span className="text-white/40 text-xs">
                        {quality.bitrate}kbps
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}