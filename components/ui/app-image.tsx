"use client";

import { useEffect, useRef, useState } from "react";
import { Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppImageProps {
  src: string | null | undefined;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  fallbackIcon?: boolean;
  style?: React.CSSProperties;
  draggable?: boolean;
}

export function AppImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  fallbackIcon = true,
  style,
  draggable,
}: AppImageProps) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 跟随 src 变化重置 error/loaded：
  // 1. 新图加载成功前显示占位，避免继续显示旧封面（移动端 Image 缓存命中时常出现）
  // 2. 切歌时若新 src 同样失败，能再次触发 onError 而非被旧 error 短路
  const lastSrcRef = useRef<string | null | undefined>(src);
  useEffect(() => {
    if (lastSrcRef.current !== src) {
      lastSrcRef.current = src;
      setError(false);
      setLoaded(false);
    }
  }, [src]);

  if (!src || error) {
    if (!fallbackIcon) return null;
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-primary/10 text-primary/40",
          className
        )}
        style={style}
      >
        <Music2 className="h-1/2 w-1/2" />
      </div>
    );
  }

  // 用原生 <img> 而非 next/image：
  // 1. next/image 的优化端点 /_next/image 在 dev rewrites 和生产 nginx 都没匹配 /uploads/...，
  //    后端相对路径封面会被 next/image 走 404，最终回退到 Music2 占位
  // 2. 后端图本身已带尺寸优化，前端再走 next/image 优化收益不大
  // 3. 对 /uploads 路径、原域名、data: 都直接交给浏览器加载
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={cn(
        "object-cover transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        fill ? "absolute inset-0 h-full w-full" : "",
        className
      )}
      // 切歌时不强制 lazy，避免移动端懒加载延迟显示新封面
      loading={priority ? "eager" : "eager"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      draggable={draggable}
      style={style}
    />
  );
}
