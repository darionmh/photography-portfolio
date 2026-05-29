"use client";

import { useState } from "react";
import GalleryImage from "@/app/components/GalleryImage";

export interface PrintfulVariant {
  id: number;
  size: string;
  retailPrice: string;
  currency: string;
  previewUrl: string | null;
  thumbnailUrl: string | null;
}

interface Props {
  title: string;
  caption: string | null;
  alt: string;
  originalPhotoUrl: string;
  originalWidth: number;
  originalHeight: number;
  productThumbnailUrl: string | null;
  productDescription: string | null;
  variants: PrintfulVariant[];
  resourceId: string;
}

export default function PrintDetailClient({
  title,
  caption,
  alt,
  originalPhotoUrl,
  originalWidth,
  originalHeight,
  productThumbnailUrl,
  productDescription,
  variants,
  resourceId,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const selected = variants[selectedIdx] ?? null;

  const imageUrl =
    selected?.previewUrl ??
    selected?.thumbnailUrl ??
    productThumbnailUrl ??
    null;

  const price = selected
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: selected.currency || "USD",
      }).format(parseFloat(selected.retailPrice))
    : null;

  const cappedWidth = Math.min(originalWidth, 900);
  const cappedHeight = Math.round(cappedWidth * (originalHeight / originalWidth));

  return (
    <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
      <div className="w-full">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={alt}
            className="w-full h-auto"
            loading="eager"
          />
        ) : (
          <GalleryImage
            src={originalPhotoUrl}
            alt={alt}
            width={cappedWidth}
            height={cappedHeight}
            quality={85}
            priority
            className="w-full h-auto"
          />
        )}

        {variants.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {variants.map((v, i) => {
              const thumb = v.thumbnailUrl ?? v.previewUrl;
              if (!thumb) return null;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedIdx(i)}
                  className={`shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-muted cursor-pointer ${
                    i === selectedIdx
                      ? "border-foreground"
                      : "border-transparent hover:border-border"
                  }`}
                  aria-label={v.size}
                >
                  <img
                    src={thumb}
                    alt={v.size}
                    className="w-full h-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-medium text-foreground lowercase leading-snug">
            {title}
          </h1>
          {caption && (
            <p className="text-muted text-sm leading-relaxed mt-2">{caption}</p>
          )}
        </div>

        {variants.length > 0 && (
          <div>
            <p className="text-xs text-muted lowercase mb-2">size</p>
            <div className="flex flex-wrap gap-2">
              {variants.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedIdx(i)}
                  className={`px-3 py-1.5 text-xs rounded border lowercase transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-muted cursor-pointer ${
                    i === selectedIdx
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-foreground border-border hover:border-foreground/40"
                  }`}
                >
                  {v.size}
                </button>
              ))}
            </div>
          </div>
        )}

        {price && (
          <p className="text-foreground text-lg font-medium">{price}</p>
        )}

        <form action="/api/checkout" method="POST">
          <input type="hidden" name="resourceId" value={resourceId} />
          {selected && (
            <input type="hidden" name="variantId" value={selected.id} />
          )}
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium lowercase hover:opacity-80 transition-opacity cursor-pointer"
          >
            buy print
          </button>
        </form>

        {productDescription && (
          <p className="text-xs text-muted leading-relaxed">{productDescription}</p>
        )}
      </div>
    </div>
  );
}
