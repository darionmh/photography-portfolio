"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@vercel/analytics";
import { useGalleries } from "../contexts/GalleriesContext";
import { HOME_PAGE, pathForGallery, formatGalleryName } from "../lib/galleries";
import { getRecaptchaToken, isRecaptchaEnabled } from "../lib/recaptcha";
import { getImagesFromStorage, type StorageImage } from "../lib/storage";

const SKELETON_COUNT = 6;
const IMAGE_PARAM = "image";

/** Max width for gallery thumbnails; Next.js will serve at or below this. */
const GALLERY_MAX_WIDTH = 640;
/** Max width for expanded/lightbox view. */
const EXPANDED_MAX_WIDTH = 1600;

function capDimensions(
  width: number,
  height: number,
  maxWidth: number
): { width: number; height: number } {
  if (width <= maxWidth) return { width, height };
  const scale = maxWidth / width;
  return { width: maxWidth, height: Math.round(height * scale) };
}

/** Encode storage fullPath to a URL-safe resource id for deep linking. */
function toResourceId(fullPath: string): string {
  const base64 = btoa(unescape(encodeURIComponent(fullPath)));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Decode resource id from URL back to storage fullPath. */
function fromResourceId(id: string): string | null {
  try {
    const base64 = id.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return null;
  }
}

function pathWithImage(pathname: string, resourceId: string | null): string {
  if (resourceId == null) return pathname;
  return `${pathname}?${IMAGE_PARAM}=${resourceId}`;
}

const GALLERY_SKELETON_COUNT = 5;

function GalleryList({
  variant,
  galleries,
  galleriesLoading,
  currentPage,
  onSelect,
}: {
  variant: "horizontal" | "vertical";
  galleries: string[];
  galleriesLoading: boolean;
  currentPage: string;
  onSelect: (page: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () =>
      setHasOverflow(el.scrollWidth > el.clientWidth);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [galleries]);

  const showSkeletons = galleriesLoading && galleries.length === 0;

  const baseTouch =
    "min-h-[44px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-muted transition-colors font-medium text-sm";
  const activeClass = "underline underline-offset-4 decoration-2 text-foreground";
  const inactiveClass =
    "text-muted hover:text-foreground/80";

  const homeActive = currentPage === HOME_PAGE;
  const homeClass = homeActive ? activeClass : inactiveClass;

  if (variant === "horizontal") {
    return (
      <nav aria-label="Galleries" className="flex flex-col gap-1 lowercase">
        <div className="relative">
          <div
            ref={scrollRef}
            className="flex gap-2 overflow-x-auto pb-2 -mb-2 overscroll-x-contain snap-x snap-mandatory [scrollbar-width:thin] min-w-0"
          >
            <button
              type="button"
              onClick={() => onSelect(HOME_PAGE)}
              className={`shrink-0 snap-start px-4 py-2.5 rounded-full whitespace-nowrap lowercase ${baseTouch} ${homeClass}`}
              aria-current={homeActive ? "page" : undefined}
            >
              Home
            </button>
            <span className="shrink-0 self-center text-xs font-semibold tracking-wider text-muted lowercase">
              Galleries
            </span>
            {showSkeletons
              ? Array.from({ length: GALLERY_SKELETON_COUNT }, (_, i) => (
                  <div
                    key={i}
                    className="shrink-0 h-[44px] w-20 rounded-full bg-surface animate-pulse"
                    aria-hidden
                  />
                ))
              : galleries.map((name) => {
                  const isActive = currentPage === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onSelect(name)}
                      className={`shrink-0 snap-start pl-2 px-4 py-2.5 rounded-full whitespace-nowrap lowercase ${baseTouch} ${
                        isActive ? activeClass : inactiveClass
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {formatGalleryName(name)}
                    </button>
                  );
                })}
          </div>
          {!showSkeletons && hasOverflow && (
            <div
              className="absolute right-0 top-0 bottom-2 w-12 flex items-center justify-end gap-1 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none"
              aria-hidden
            >
              <svg
                className="shrink-0 w-4 h-4 text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          )}
        </div>
      </nav>
    );
  }

  return (
    <nav aria-label="Galleries" className="flex flex-col gap-1 lowercase">
      <button
        type="button"
        onClick={() => onSelect(HOME_PAGE)}
        className={`block w-full text-left px-4 py-2 rounded-md lowercase ${baseTouch} ${homeClass}`}
        aria-current={homeActive ? "page" : undefined}
      >
        Home
      </button>
      <h2 className="px-4 pt-2 pb-0.5 text-xs font-semibold tracking-wider text-muted lowercase">
        Galleries
      </h2>
      {showSkeletons
        ? Array.from({ length: GALLERY_SKELETON_COUNT }, (_, i) => (
            <div
              key={i}
              className="h-9 w-full max-w-[8rem] rounded-md bg-surface animate-pulse ml-4"
              aria-hidden
            />
          ))
        : galleries.map((name) => {
            const isActive = currentPage === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onSelect(name)}
                className={`block w-full text-left pl-6 pr-4 py-2 rounded-md lowercase ${baseTouch} ${
                  isActive ? activeClass : inactiveClass
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                {formatGalleryName(name)}
              </button>
            );
          })}
    </nav>
  );
}

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = pathname === "/" ? HOME_PAGE : pathname.slice(1);
  const imageParam = searchParams.get(IMAGE_PARAM);

  const {
    galleries,
    galleriesLoading,
    getCachedImages,
    setCachedImages,
  } = useGalleries();
  const [images, setImages] = useState<StorageImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [imageStats, setImageStats] = useState<Record<string, { downloads: number; shares: number }>>({});
  const [expanded, setExpanded] = useState<StorageImage | null>(null);
  const [expandedImageLoaded, setExpandedImageLoaded] = useState(false);
  const userClosedRef = useRef(false);
  const currentPathRef = useRef<string>("");
  const expandedPathRef = useRef<string | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);
  const lightboxCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  // Only reset loading when we're showing a different image (by fullPath), not when expanded gets a new object reference
  useEffect(() => {
    if (!expanded) {
      expandedPathRef.current = null;
      return;
    }
    if (expandedPathRef.current !== expanded.fullPath) {
      expandedPathRef.current = expanded.fullPath;
      setExpandedImageLoaded(false);
    }
  }, [expanded]);

  useEffect(() => {
    const path = currentPage === HOME_PAGE ? "" : currentPage;
    currentPathRef.current = path;

    const cached = getCachedImages(path);
    if (cached !== undefined) {
      setImages(cached);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setImages([]);

    if (isRecaptchaEnabled()) {
      getRecaptchaToken()
        .then((token) => {
          if (!token) {
            if (currentPathRef.current === path) setIsLoading(false);
            return null;
          }
          return fetch("/api/images", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, path }),
          });
        })
        .then((res) => {
          if (!res || currentPathRef.current !== path) return;
          if (!res.ok) {
            setIsLoading(false);
            return;
          }
          return res.json();
        })
        .then((data) => {
          if (currentPathRef.current !== path) return;
          const dataList = Array.isArray(data?.images) ? data.images : [];
          setCachedImages(path, dataList as StorageImage[]);
          setImages(dataList as StorageImage[]);
          setIsLoading(false);
        })
        .catch(() => {
          if (currentPathRef.current === path) setIsLoading(false);
        });
    } else {
      getImagesFromStorage(path).then(
        (data) => {
          if (currentPathRef.current !== path) return;
          setCachedImages(path, data);
          setImages(data);
          setIsLoading(false);
        },
        () => {
          if (currentPathRef.current !== path) return;
          setIsLoading(false);
        }
      );
    }
  }, [currentPage, getCachedImages, setCachedImages]);

  // Fetch download/share counts when images change
  useEffect(() => {
    if (images.length === 0) {
      setImageStats({});
      return;
    }
    const ids = images.map((img) => toResourceId(img.fullPath)).join(",");
    fetch(`/api/image-stats?ids=${encodeURIComponent(ids)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.stats && typeof data.stats === "object") {
          setImageStats(data.stats);
        }
      })
      .catch(() => {});
  }, [images]);

  // Deep link: sync lightbox with URL (resource id in param)
  useEffect(() => {
    if (!imageParam) {
      userClosedRef.current = false;
      if (expanded) setExpanded(null);
      return;
    }
    if (isLoading) return;
    if (userClosedRef.current) return;
    const fullPath = fromResourceId(imageParam);
    if (fullPath) {
      const match = images.find((img) => img.fullPath === fullPath);
      if (match) {
        // Only update if we're not already showing this image (avoids new reference -> loading reset)
        setExpanded((prev) => (prev?.fullPath === fullPath ? prev : match));
      } else if (images.length > 0) {
        router.replace(pathname, { scroll: false });
      }
    } else {
      router.replace(pathname, { scroll: false });
    }
  }, [images, isLoading, imageParam, pathname, router]);

  const openExpanded = useCallback(
    (image: StorageImage, trigger?: HTMLElement) => {
      lightboxTriggerRef.current = trigger ?? null;
      setExpanded(image);
      track("lightbox_opened", { gallery: currentPage || "home", path: pathname });
      router.push(pathWithImage(pathname, toResourceId(image.fullPath)), { scroll: false });
    },
    [router, pathname, currentPage]
  );

  const selectGallery = useCallback(
    (page: string) => {
      track("gallery_selected", { gallery: page === HOME_PAGE ? "home" : page });
      router.push(pathForGallery(page), { scroll: false });
    },
    [router]
  );

  const closeExpanded = useCallback(() => {
    userClosedRef.current = true;
    track("lightbox_closed");
    const trigger = lightboxTriggerRef.current;
    setExpanded(null);
    lightboxTriggerRef.current = null;
    window.history.replaceState(null, "", pathname);
    router.replace(pathname, { scroll: false });
    if (trigger?.focus) setTimeout(() => trigger.focus(), 0);
  }, [router, pathname]);

  const recordImageAction = useCallback(
    (resourceId: string, action: "download" | "share") => {
      fetch("/api/image-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceId, action }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (typeof data?.downloads === "number" && typeof data?.shares === "number") {
            setImageStats((prev) => ({
              ...prev,
              [resourceId]: { downloads: data.downloads, shares: data.shares },
            }));
          }
        })
        .catch(() => {});
    },
    []
  );

  const handleDownload = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!expanded) return;
      track("image_downloaded", { gallery: currentPage || "home" });
      recordImageAction(toResourceId(expanded.fullPath), "download");
      const filename = expanded.name || "image";
      fetch(expanded.url, { mode: "cors" })
        .then((res) => res.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        })
        .catch(() => {
          window.open(expanded.url, "_blank", "noopener,noreferrer");
        });
    },
    [expanded, currentPage, recordImageAction]
  );

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!expanded) return;
      track("image_shared", { gallery: currentPage || "home" });
      recordImageAction(toResourceId(expanded.fullPath), "share");
      const shareUrl = typeof window !== "undefined" ? window.location.href : "";
      const title = expanded.dimensions?.baseName ?? expanded.name;
      if (typeof navigator !== "undefined" && navigator.share) {
        navigator
          .share({
            title: title || "Photo",
            url: shareUrl,
          })
          .catch(() => {});
      } else {
        navigator.clipboard?.writeText(shareUrl).catch(() => {});
      }
    },
    [expanded, currentPage, recordImageAction]
  );

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeExpanded();
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const idx = images.findIndex((img) => img.fullPath === expanded.fullPath);
        if (idx < 0) return;
        const nextIdx = e.key === "ArrowRight" ? idx + 1 : idx - 1;
        const next = images[nextIdx];
        if (next) {
          e.preventDefault();
          track("lightbox_navigate", { direction: e.key === "ArrowRight" ? "next" : "prev" });
          setExpanded(next);
          router.push(pathWithImage(pathname, toResourceId(next.fullPath)), { scroll: false });
        }
      }
      if (e.key === "Tab") {
        const dialog = lightboxCloseButtonRef.current?.closest("[role=dialog]");
        if (!dialog) return;
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("button, [href]")).filter(
          (el) => !el.hasAttribute("disabled") && el.tabIndex !== -1
        );
        if (focusable.length === 0) return;
        const i = focusable.indexOf(document.activeElement as HTMLElement);
        const nextI = e.shiftKey ? (i <= 0 ? focusable.length - 1 : i - 1) : (i >= focusable.length - 1 ? 0 : i + 1);
        e.preventDefault();
        focusable[nextI]?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded, closeExpanded, images, pathname, router]);

  // Lock body scroll when lightbox is open; focus close button for keyboard users
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => lightboxCloseButtonRef.current?.focus(), 50);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const instagramUrl =
    process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com";
  const buyMeACoffeeUrl = process.env.NEXT_PUBLIC_BUYMEACOFFEE_URL;

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:gap-8">
        <div className="order-2 lg:order-1 flex-1 min-w-0">
          {currentPage === HOME_PAGE && (
            <section
              id="about"
              className="mb-8 pb-8 border-b border-border/80"
              aria-labelledby="about-heading"
            >
              <h2 id="about-heading" className="text-lg font-medium tracking-tight text-foreground mb-3 lowercase">
                About
              </h2>
              <p className="text-muted text-sm leading-relaxed max-w-xl">
                Landscapes, wildlife, architecture, whatever the road turns up.
                I like the mix of big sky and small detail, the planned stop and the turn we didn’t expect.
              </p>
              <p className="text-muted text-sm leading-relaxed max-w-xl mt-4">
                Photography turns experience into something you can return to and share. It’s a way to look twice, and proof that we were here.
                The places we went, and what stuck.
              </p>
              <p className="text-sm text-foreground mt-4">
                Follow for more, or reach out{" "}
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("instagram_clicked", { location: "about" })}
                  className="font-medium text-foreground hover:text-muted underline-offset-4 hover:underline transition-colors cursor-pointer"
                >
                  @the_places_we_went
                </a>
                {buyMeACoffeeUrl && (
                  <>
                    {" "}
                    — or{" "}
                    <a
                      href={buyMeACoffeeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track("buymeacoffee_clicked", { location: "about" })}
                      className="font-medium text-foreground hover:text-muted underline-offset-4 hover:underline transition-colors cursor-pointer"
                    >
                      buy me a coffee
                    </a>
                    {" "}
                    if you’d like to support the work.
                  </>
                )}
              </p>
            </section>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {isLoading
          ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <div
                key={i}
                className="aspect-[4/3] w-full bg-surface animate-pulse"
                aria-hidden
              />
            ))
          : images.length === 0
          ? (
              <p className="col-span-full text-sm text-muted py-8 text-center">
                No images in this gallery yet.
              </p>
            )
          : images.map((image, index) => {
          const intrinsicW = image.dimensions?.width ?? 800;
          const intrinsicH = image.dimensions?.height ?? 600;
          const { width, height } = capDimensions(intrinsicW, intrinsicH, GALLERY_MAX_WIDTH);
          const baseName = image.dimensions?.baseName ?? image.name;
          const galleryContext =
            currentPage === HOME_PAGE ? "the places we went" : formatGalleryName(currentPage);
          const alt = `${baseName} — ${galleryContext}`;
          const isAboveFold = index < 6;

          const rid = toResourceId(image.fullPath);
          const stats = imageStats[rid];
          const d = stats?.downloads ?? 0;
          const s = stats?.shares ?? 0;
          const hasStats = d > 0 || s > 0;

          return (
            <button
              key={image.fullPath}
              type="button"
              onClick={(e) => openExpanded(image, e.currentTarget)}
              onContextMenu={(e) => e.preventDefault()}
              className="block w-full text-left overflow-hidden cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-muted select-none relative"
            >
              <Image
                src={image.url}
                alt={alt}
                width={width}
                height={height}
                title={`${image.name} (${(image.size / 1024).toFixed(1)} KB). Click to expand`}
                className="w-full h-auto object-cover cursor-pointer pointer-events-none"
                sizes="(max-width: 640px) 50vw, 33vw"
                draggable={false}
                {...(isAboveFold ? { priority: true } : { loading: "lazy" })}
              />
              {hasStats && (
                <span
                  className="absolute bottom-1 left-1 right-1 text-[10px] text-white/90 bg-black/40 px-1.5 py-0.5 rounded lowercase"
                  aria-label={`${d} downloads, ${s} shares`}
                >
                  {d} ↓ · {s} ↗
                </span>
              )}
            </button>
          );
            })}
          </div>
        </div>
        <aside
          className="hidden lg:block lg:shrink-0 lg:w-48 lg:sticky lg:top-24 lg:self-start"
          aria-label="Galleries"
        >
          <GalleryList
            variant="vertical"
            galleries={galleries}
            galleriesLoading={galleriesLoading}
            currentPage={currentPage}
            onSelect={selectGallery}
          />
        </aside>
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded image"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 overscroll-contain"
          onClick={closeExpanded}
        >
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              paddingTop: "max(0.75rem, env(safe-area-inset-top))",
              paddingRight: "max(0.75rem, env(safe-area-inset-right))",
              paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
              paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
            }}
          >
            <div
              className="relative flex items-center justify-center min-w-[120px] min-h-[120px] max-h-[min(80vh,80dvh)] select-none"
              onClick={(e) => e.stopPropagation()}
              onContextMenu={(e) => e.preventDefault()}
            >
              {!expandedImageLoaded && (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  aria-hidden
                >
                  <div className="w-10 h-10 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                </div>
              )}
              <Image
                src={expanded.url}
                alt={`${expanded.dimensions?.baseName ?? expanded.name} — ${
                  currentPage === HOME_PAGE ? "the places we went" : formatGalleryName(currentPage)
                }`}
                width={capDimensions(
                  expanded.dimensions?.width ?? 1920,
                  expanded.dimensions?.height ?? 1080,
                  EXPANDED_MAX_WIDTH
                ).width}
                height={capDimensions(
                  expanded.dimensions?.width ?? 1920,
                  expanded.dimensions?.height ?? 1080,
                  EXPANDED_MAX_WIDTH
                ).height}
                className={`max-w-full max-h-[min(80vh,80dvh)] w-auto h-auto object-contain transition-opacity duration-200 [-webkit-user-drag:none] [user-drag:none] ${
                  expandedImageLoaded ? "opacity-100" : "opacity-0"
                }`}
                sizes="100vw"
                loading="lazy"
                draggable={false}
                onLoad={() => setExpandedImageLoaded(true)}
              />
              <div className="absolute bottom-0 right-0 translate-y-full flex items-center gap-5 px-4 pt-4 pb-2 touch-manual">
                {(() => {
                  const rid = toResourceId(expanded.fullPath);
                  const st = imageStats[rid];
                  const dc = st?.downloads ?? 0;
                  const sc = st?.shares ?? 0;
                  return (
                    <span className="text-xs text-background/70 lowercase" aria-label={`${dc} downloads, ${sc} shares`}>
                      {dc} ↓ · {sc} ↗
                    </span>
                  );
                })()}
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center w-9 h-9 rounded-full text-background/90 bg-background/10 hover:bg-background/20 active:bg-background/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-background cursor-pointer"
                  aria-label="Download"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" x2="12" y1="15" y2="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center w-9 h-9 rounded-full text-background/90 bg-background/10 hover:bg-background/20 active:bg-background/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-background cursor-pointer"
                  aria-label="Share"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" x2="12" y1="2" y2="15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <button
            ref={lightboxCloseButtonRef}
            type="button"
            onClick={closeExpanded}
            className="absolute z-10 flex items-center justify-center min-w-[44px] min-h-[44px] p-2 text-background/90 hover:bg-background/10 hover:text-background active:bg-background/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-background rounded-full touch-manual cursor-pointer"
            style={{
              top: "max(0.75rem, env(safe-area-inset-top))",
              right: "max(0.75rem, env(safe-area-inset-right))",
            }}
            aria-label="Close (Escape)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
