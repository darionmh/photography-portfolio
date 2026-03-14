"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getStorageFolderNames } from "../lib/storage";
import type { StorageImage } from "../lib/storage";

type GalleriesContextValue = {
  galleries: string[];
  galleriesLoading: boolean;
  getCachedImages: (path: string) => StorageImage[] | undefined;
  setCachedImages: (path: string, data: StorageImage[]) => void;
};

const GalleriesContext = createContext<GalleriesContextValue | null>(null);

export function GalleriesProvider({ children }: { children: React.ReactNode }) {
  const [galleries, setGalleries] = useState<string[]>([]);
  const [galleriesLoading, setGalleriesLoading] = useState(true);
  const imagesCacheRef = useRef<Map<string, StorageImage[]>>(new Map());

  const getCachedImages = useCallback((path: string) => {
    return imagesCacheRef.current.get(path);
  }, []);

  const setCachedImages = useCallback((path: string, data: StorageImage[]) => {
    imagesCacheRef.current.set(path, data);
  }, []);

  useEffect(() => {
    setGalleriesLoading(true);
    getStorageFolderNames()
      .then((names) => {
        setGalleries(names);
        setGalleriesLoading(false);
      })
      .catch(() => {
        setGalleries([]);
        setGalleriesLoading(false);
      });
  }, []);

  return (
    <GalleriesContext.Provider
      value={{
        galleries,
        galleriesLoading,
        getCachedImages,
        setCachedImages,
      }}
    >
      {children}
    </GalleriesContext.Provider>
  );
}

export function useGalleries(): GalleriesContextValue {
  const ctx = useContext(GalleriesContext);
  if (ctx == null) {
    throw new Error("useGalleries must be used within GalleriesProvider");
  }
  return ctx;
}
