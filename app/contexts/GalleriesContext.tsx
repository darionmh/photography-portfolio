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
import { getRecaptchaToken, isRecaptchaEnabled } from "../lib/recaptcha";
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
    function finishWithDirectFirebase() {
      getStorageFolderNames()
        .then((names) => {
          setGalleries(names);
          setGalleriesLoading(false);
        })
        .catch(() => {
          setGalleries([]);
          setGalleriesLoading(false);
        });
    }
    if (isRecaptchaEnabled()) {
      getRecaptchaToken()
        .then((token) => {
          if (!token) {
            finishWithDirectFirebase();
            return null;
          }
          return fetch("/api/galleries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        })
        .then(async (res) => {
          if (!res?.ok) {
            finishWithDirectFirebase();
            return null;
          }
          return res.json();
        })
        .then((data) => {
          if (data && Array.isArray(data.galleries)) {
            setGalleries(data.galleries);
          } else {
            finishWithDirectFirebase();
            return;
          }
          setGalleriesLoading(false);
        })
        .catch(() => {
          finishWithDirectFirebase();
        });
    } else {
      finishWithDirectFirebase();
    }
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
