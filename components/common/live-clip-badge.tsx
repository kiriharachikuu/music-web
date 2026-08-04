import { cn } from "@/lib/utils";

export function LiveClipBadge({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex h-4 items-center justify-center rounded-full bg-primary px-1.5 font-bold text-[10px] leading-none text-primary-foreground",
        onClick && "cursor-pointer hover:bg-primary/80",
        className
      )}
    >
      LIVE
    </span>
  );
}
