"use client";

import Image from "next/image";
import { useState } from "react";
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

  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={cn(
        "object-cover transition-opacity duration-300",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
      priority={priority}
      sizes={sizes}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      loading={priority ? "eager" : "lazy"}
      style={style}
      draggable={draggable}
    />
  );
}
