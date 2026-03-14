"use client";

const RECAPTCHA_ACTION = "view_gallery";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

function getSiteKey(): string | null {
  if (typeof window === "undefined") return null;
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? null;
}

/** Load the reCAPTCHA v3 script. Resolves when grecaptcha is ready. */
function loadScript(): Promise<void> {
  const key = getSiteKey();
  if (!key) return Promise.resolve();

  return new Promise((resolve, reject) => {
    if (window.grecaptcha?.execute) {
      window.grecaptcha.ready(() => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${key}`;
    script.async = true;
    script.onload = () => {
      window.grecaptcha?.ready(() => resolve());
    };
    script.onerror = () => reject(new Error("reCAPTCHA script failed to load"));
    document.head.appendChild(script);
  });
}

let loadPromise: Promise<void> | null = null;

/** Get a reCAPTCHA v3 token. Returns null if site key is not configured. */
export async function getRecaptchaToken(): Promise<string | null> {
  const key = getSiteKey();
  if (!key) return null;

  if (!loadPromise) loadPromise = loadScript();
  await loadPromise;

  const token = await window.grecaptcha?.execute(key, { action: RECAPTCHA_ACTION });
  return token ?? null;
}

export function isRecaptchaEnabled(): boolean {
  return Boolean(getSiteKey());
}
