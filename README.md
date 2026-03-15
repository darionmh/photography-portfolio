# The Places We Went

A photography portfolio built with Next.js and Firebase Storage. Galleries are loaded from your bucket; images support lightbox, deep linking, download, and share. Optional reCAPTCHA v3 and Vercel Analytics are included.

## Features

- **Galleries** – Top-level folders in Firebase Storage become galleries; home shows all images.
- **Lightbox** – Click any image to expand; keyboard (Escape, Arrow Left/Right), focus trap, and return focus.
- **Deep links** – Share a URL with `?image=...` to open that image in the lightbox.
- **Download & share** – Download button in lightbox; share uses Web Share API or copies link.
- **Theme** – Light (default) or dark mode, persisted in `localStorage`.
- **Responsive** – Mobile: horizontal gallery pills + dropdown; desktop: sticky sidebar.
- **reCAPTCHA v3** (optional) – Gate gallery/image data behind verification to reduce scraping.
- **Analytics** – Vercel Analytics and Speed Insights; custom events for lightbox, gallery selection, theme, contact, etc.

## Tech stack

- **Next.js 16** (App Router)
- **React 19**
- **Firebase** (client: Storage for images; optional server: Admin SDK when reCAPTCHA is on)
- **Tailwind CSS 4**
- **Vercel** – Analytics, Speed Insights, deployment

## Getting started

### Prerequisites

- Node.js 18+
- A Firebase project with Storage (and a bucket with image folders)

### 1. Clone and install

```bash
git clone <your-repo-url>
cd photography-portfolio
npm install
```

### 2. Firebase

- In [Firebase Console](https://console.firebase.google.com), create a project and enable **Storage**.
- Add your bucket structure: create top-level folders (e.g. `Cover Photos`, `Landscapes`); put images inside. Supported extensions: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif`.
- In **Project settings → General**, add a web app and copy the config. Add each field to `.env.local` as `NEXT_PUBLIC_FIREBASE_*` (see table below).

### 3. Environment variables

Copy `.env.example` to `.env.local` and set at least:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_INSTAGRAM_URL` | Yes | Full URL to your Instagram (header, footer, about). |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase web app config (Project settings → Your apps). |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID. |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | Firebase messaging sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | Firebase app ID. |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | Firebase Analytics measurement ID (optional). |
| `NEXT_PUBLIC_COPYRIGHT_NAME` | No | Name in footer copyright line (e.g. `Darion Higgins`). |
| `NEXT_PUBLIC_CONTACT_EMAIL` | No | If set, shows a “contact” mailto link in the footer. |
| `NEXT_PUBLIC_BUYMEACOFFEE_URL` | No | If set, shows a “support” link in the footer and “buy me a coffee” in the about section. |
| `NEXT_PUBLIC_SITE_URL` | No | Canonical URL for Open Graph (e.g. `https://theplaceswewent.com`). |

**Optional – reCAPTCHA (bot protection)**

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | If using reCAPTCHA | From [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin) (v3). |
| `RECAPTCHA_SECRET_KEY` | If using reCAPTCHA | Secret key for server-side verification. |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | If using reCAPTCHA | Full JSON string of your Firebase service account key. |
| `FIREBASE_STORAGE_BUCKET` | No | Bucket name (e.g. `myapp.firebasestorage.app`) if different from client config. |

When reCAPTCHA keys are set, gallery list and image data are served via API routes after token verification; otherwise the app talks to Firebase Storage directly from the client.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the home feed (all images) and the galleries from your bucket in the nav/sidebar.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (with Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Run production server. |
| `npm run lint` | Run ESLint. |

## Project structure

```
app/
  api/              # Optional: used when reCAPTCHA is on
    galleries/      # POST: verify token, return folder names
    images/         # POST: verify token, return images (signed URLs)
  components/      # Header, Footer, ThemeScript
  contexts/        # GalleriesContext (list + image cache)
  home/             # Main page + GalleryList + lightbox (Home.tsx)
  lib/              # Firebase client, storage helpers, recaptcha, firebase-admin
  [[...gallery]]/  # Catch-all route: / and /:gallery
  layout.tsx       # Root layout, metadata, Analytics, SpeedInsights
  not-found.tsx    # 404 page
```

## Deploy on Vercel

1. Push the repo to GitHub/GitLab/Bitbucket and [import the project on Vercel](https://vercel.com/new).
2. Add the same environment variables in the Vercel project (Settings → Environment Variables). For `FIREBASE_SERVICE_ACCOUNT_JSON`, paste the full JSON as one line.
3. Deploy. Enable **Web Analytics** and **Speed Insights** (and **Custom Events** for analytics) in the Vercel dashboard so you get page views and the custom events (lightbox, gallery selected, theme toggled, etc.).

### SEO

- **Sitemap** – `/sitemap.xml` is generated (home page). Set `NEXT_PUBLIC_SITE_URL` so the sitemap uses your canonical URL.
- **Robots** – `/robots.txt` allows all crawlers and points to the sitemap.
- **Open Graph** – Add a 1200×630 image at `public/og.jpg` for link previews (e.g. social sharing). If missing, previews may fall back to your site title/description only.
- **Structured data** – Person and WebSite JSON-LD are in the layout; gallery pages get dynamic `<title>` and canonical URLs.

## Image naming (optional)

Filenames like `photo.1920x1080.jpg` are parsed for dimensions and used for layout and `alt` text. Other names still work; dimensions and alt fall back to defaults.

## License

Private. All rights reserved.
