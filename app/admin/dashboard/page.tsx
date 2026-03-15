"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { auth } from "@/app/lib/firebase";

export default function AdminDashboardPage() {
  const [galleries, setGalleries] = useState<string[]>([]);
  const [galleriesLoading, setGalleriesLoading] = useState(true);
  const [folder, setFolder] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const nextIdRef = useRef(0);
  const [pendingFiles, setPendingFiles] = useState<{ id: number; file: File }[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    uploaded: { name: string; path: string }[];
    errors: { name: string; error: string }[];
  } | null>(null);

  useEffect(() => {
    if (pendingFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = pendingFiles.map(({ file }) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingFiles]);

  const fetchGalleries = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    setGalleriesLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/galleries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setGalleries(data.galleries ?? []);
    } catch (e) {
      console.error(e);
      setGalleries([]);
    } finally {
      setGalleriesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleries();
  }, [fetchGalleries]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || pendingFiles.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      const targetFolder = (newFolder.trim() || folder).trim();
      formData.set("folder", targetFolder);
      for (const { file } of pendingFiles) {
        formData.append("files", file);
      }
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUploadResult({ uploaded: data.uploaded ?? [], errors: data.errors ?? [] });
      setPendingFiles([]);
      setFileInputKey((k) => k + 1);
      if (targetFolder && !galleries.includes(targetFolder)) {
        fetchGalleries();
      }
    } catch (err) {
      setUploadResult({
        uploaded: [],
        errors: [{ name: "", error: (err as Error).message }],
      });
    } finally {
      setUploading(false);
    }
  }

  function removePendingFile(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="max-w-2xl space-y-12">
      <section>
        <h1 className="text-xl font-medium lowercase text-foreground mb-6">
          upload images
        </h1>

        <form onSubmit={handleUpload} className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted lowercase">gallery (folder)</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 lowercase"
              disabled={galleriesLoading}
            >
              <option value="">— select or create below —</option>
              {galleries.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newFolder}
              onChange={(e) => setNewFolder(e.target.value)}
              placeholder="new gallery name"
              className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/20 lowercase"
            />
          </div>
          <p className="text-xs text-muted">
            Select an existing gallery or type a new folder name. Use letters, numbers, hyphens, underscores.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted lowercase">images</label>
          <input
            key={fileInputKey}
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
            multiple
            onChange={(e) => {
              const list = e.target.files;
              if (list?.length) {
                const newEntries = Array.from(list).map((file) => ({
                  id: ++nextIdRef.current,
                  file,
                }));
                setPendingFiles((prev) => [...prev, ...newEntries]);
              }
            }}
            className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-foreground file:text-background file:cursor-pointer cursor-pointer"
          />
          {pendingFiles.length > 0 && (
            <ul className="flex flex-wrap gap-3 mt-2">
              {pendingFiles.map(({ id, file }, i) => (
                <li key={id} className="relative group flex flex-col w-24">
                  <div className="aspect-square rounded-md overflow-hidden bg-surface border border-border">
                    {previewUrls[i] ? (
                      <img
                        src={previewUrls[i]}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted/30 animate-pulse" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted truncate mt-0.5 lowercase" title={file.name}>
                    {file.name}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => removePendingFile(id, e)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-600 text-white text-xs leading-none flex items-center justify-center hover:bg-red-700 cursor-pointer"
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="submit"
          disabled={uploading || pendingFiles.length === 0}
          className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-foreground text-background font-medium lowercase hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {uploading ? "uploading…" : "upload"}
        </button>
      </form>

        {uploadResult && (
        <div className="mt-8 p-4 rounded-md border border-border bg-surface">
          <h2 className="text-sm font-medium lowercase text-foreground mb-2">
            result
          </h2>
          {uploadResult.uploaded.length > 0 && (
            <p className="text-sm text-foreground mb-1">
              Uploaded: {uploadResult.uploaded.map((u) => u.name).join(", ")}
            </p>
          )}
          {uploadResult.errors.length > 0 && (
            <ul className="text-sm text-red-600 dark:text-red-400 list-disc list-inside">
              {uploadResult.errors.map((e, i) => (
                <li key={i}>
                  {e.name ? `${e.name}: ` : ""}
                  {e.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      </section>

      <section>
        <h2 className="text-lg font-medium lowercase text-foreground mb-3">
          manage galleries
        </h2>
        <p className="text-sm text-muted mb-4">
          Rename a gallery, upload more images, or delete images.
        </p>
        {galleriesLoading ? (
          <p className="text-sm text-muted lowercase">loading…</p>
        ) : galleries.length === 0 ? (
          <p className="text-sm text-muted lowercase">No galleries yet. Upload images to create one.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {galleries.map((g) => (
              <li key={g}>
                <Link
                  href={`/admin/dashboard/${encodeURIComponent(g)}`}
                  className="inline-block px-4 py-2 rounded-md border border-border bg-surface text-foreground text-sm lowercase hover:bg-border"
                >
                  {g}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
