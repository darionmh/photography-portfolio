"use client";

import { useState } from "react";
import GalleryImage from "@/app/components/GalleryImage";
import { useCart } from "@/app/contexts/CartContext";
import Link from "next/link";

export interface PrintfulVariant {
  id: number;
  size: string;
  retailPrice: string;
  currency: string;
  previewUrl: string | null;
  thumbnailUrl: string | null;
}

interface Props {
  productId: string;
  title: string;
  caption: string | null;
  productDescription: string | null;
  alt: string;
  originalPhotoUrl: string;
  originalWidth: number;
  originalHeight: number;
  productThumbnailUrl: string | null;
  variants: PrintfulVariant[];
  resourceId: string;
}

export default function PrintDetailClient({
  productId,
  title,
  caption,
  productDescription,
  alt,
  originalPhotoUrl,
  originalWidth,
  originalHeight,
  productThumbnailUrl,
  variants,
  resourceId,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();

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

  function handleAddToCart() {
    if (!selected) return;
    addItem({
      productId,
      variantId: selected.id,
      size: selected.size,
      title,
      retailPrice: selected.retailPrice,
      currency: selected.currency,
      resourceId,
      imageUrl,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

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

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!selected}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-foreground text-background text-sm font-medium lowercase hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-40"
          >
            {added ? "added to cart" : "add to cart"}
          </button>
          {added && (
            <Link
              href="/cart"
              className="text-sm text-muted hover:text-foreground underline underline-offset-2 lowercase transition-colors"
            >
              view cart
            </Link>
          )}
        </div>

        {productDescription && (
          <p className="text-xs text-muted leading-relaxed">{productDescription}</p>
        )}
      </div>
    </div>
  );
}
