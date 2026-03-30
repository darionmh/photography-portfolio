import React from "react";

interface GalleryImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  draggable?: boolean;
  quality?: number;
}

export function optimizedSrc(src: string, width: number, quality: number): string {
  return `/api/img?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/**
 * Image component that routes through /api/img so that thumbnails are resized
 * and converted to WebP server-side instead of downloading full-res originals.
 */
export default function GalleryImage({
  src,
  priority,
  loading,
  draggable,
  width,
  height,
  quality = 75,
  ...props
}: GalleryImageProps) {
  return (
    <img
      {...props}
      src={optimizedSrc(src, width, quality)}
      width={width}
      height={height}
      loading={priority ? "eager" : loading ?? "lazy"}
      fetchPriority={priority ? "high" : undefined}
      draggable={draggable ?? false}
    />
  );
}
