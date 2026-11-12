import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MediaImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  aspectRatio?: string;
  unoptimized?: boolean;
}

export function MediaImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 100vw, 640px",
  priority = false,
  aspectRatio,
  unoptimized = false,
}: MediaImageProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-raised",
        !aspectRatio && "aspect-video",
        className,
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={unoptimized || src.startsWith("blob:") || src.startsWith("data:")}
          className="object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={alt}
          className="flex size-full items-center justify-center text-muted-fg"
        >
          <ImageOff className="size-8" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
