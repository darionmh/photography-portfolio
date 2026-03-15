"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { auth } from "@/app/lib/firebase";
import { toResourceId } from "@/app/lib/resource-id";

interface AdminImage {
  url: string;
  name: string;
  fullPath: string;
  size: number;
  contentType: string;
  dimensions: { width: number; height: number } | null;
}

type ImageMeta = Record<string, string>;

export default function ManageGalleryPage() {
  const params = useParams();
  const router = useRouter();
  const folder = typeof params.folder === "string" ? decodeURIComponent(params.folder) : "";
  const [images, setImages] = useState<AdminImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const nextIdRef = useRef(0);
  const [pendingFiles, setPendingFiles] = useState<{ id: number; file: File }[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [deletingGallery, setDeletingGallery] = useState(false);
  const [deleteGalleryError, setDeleteGalleryError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<Record<string, ImageMeta>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImage, setEditingImage] = useState<{ fullPath: string; name: string } | null>(null);
  const [editFilename, setEditFilename] = useState("");
  const [editForm, setEditForm] = useState<{ key: string; value: string }[]>([]);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    if (!folder) return;
    const user = auth.currentUser;
    if (!user) return;
    setImagesLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `/api/admin/images?path=${encodeURIComponent(folder)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setImages(data.images ?? []);
    } catch {
      setImages([]);
    } finally {
      setImagesLoading(false);
    }
  }, [folder]);

  useEffect(() => {
    setRenameValue(folder);
    fetchImages();
  }, [folder, fetchImages]);

  useEffect(() => {
    if (pendingFiles.length === 0) {
      setPreviewUrls([]);
      return;
    }
    const urls = pendingFiles.map(({ file }) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [pendingFiles]);

  // Fetch metadata (key/value) for current images from public API
  useEffect(() => {
    if (images.length === 0) {
      setMetadata({});
      return;
    }
    const ids = images.map((img) => toResourceId(img.fullPath)).join(",");
    fetch(`/api/image-stats?ids=${encodeURIComponent(ids)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.stats && typeof data.stats === "object") {
          const next: Record<string, ImageMeta> = {};
          for (const [id, s] of Object.entries(data.stats as Record<string, { metadata?: Record<string, string> }>)) {
            next[id] = s.metadata ?? {};
          }
          setMetadata(next);
        }
      })
      .catch(() => {});
  }, [images]);

  function openEdit(img: AdminImage) {
    const rid = toResourceId(img.fullPath);
    const m = metadata[rid] ?? {};
    setEditForm(
      Object.entries(m).length > 0
        ? Object.entries(m).map(([key, value]) => ({ key, value }))
        : [{ key: "", value: "" }]
    );
    setEditingId(rid);
    setEditingImage({ fullPath: img.fullPath, name: img.name });
    setEditFilename(img.name);
    setMetaError(null);
  }

  function addEditRow() {
    setEditForm((p) => [...p, { key: "", value: "" }]);
  }

  function setEditRow(i: number, field: "key" | "value", val: string) {
    setEditForm((p) => p.map((row, j) => (j === i ? { ...row, [field]: val } : row)));
  }

  function removeEditRow(i: number) {
    setEditForm((p) => (p.length <= 1 ? [{ key: "", value: "" }] : p.filter((_, j) => j !== i)));
  }

  async function handleSaveMetadata(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId || !editingImage) return;
    const user = auth.currentUser;
    if (!user) return;
    const meta: ImageMeta = {};
    for (const row of editForm) {
      const k = row.key.trim();
      if (k) meta[k] = row.value;
    }
    const newName = editFilename.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
    const doRename = newName && newName !== editingImage.name;

    setMetaError(null);
    setSavingMeta(true);
    try {
      const token = await user.getIdToken();
      let resourceId = editingId;

      if (doRename) {
        const renameRes = await fetch("/api/admin/images/rename", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fromPath: editingImage.fullPath, toName: newName }),
        });
        const renameData = await renameRes.json();
        if (!renameRes.ok) throw new Error(renameData.error ?? "Rename failed");
        resourceId = toResourceId(renameData.newPath);
      }

      const res = await fetch("/api/admin/image-metadata", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resourceId, metadata: meta }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }
      setMetadata((prev) => ({ ...prev, [resourceId]: meta }));
      setEditingId(null);
      setEditingImage(null);
      if (doRename) fetchImages();
    } catch (err) {
      setMetaError((err as Error).message);
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleDelete(fullPath: string) {
    const user = auth.currentUser;
    if (!user) return;
    setDeleting(fullPath);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: fullPath }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Delete failed");
      }
      setImages((prev) => prev.filter((img) => img.fullPath !== fullPath));
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const newName = renameValue.trim();
    if (!newName || newName === folder) return;
    const user = auth.currentUser;
    if (!user) return;
    setRenameError(null);
    setRenaming(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/folders/rename", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: folder, to: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rename failed");
      router.replace(`/admin/dashboard/${encodeURIComponent(newName)}`);
    } catch (err) {
      setRenameError((err as Error).message);
    } finally {
      setRenaming(false);
    }
  }

  async function handleUploadMore(e: React.FormEvent) {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user || pendingFiles.length === 0) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const token = await user.getIdToken();
      const formData = new FormData();
      formData.set("folder", folder);
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
      const uploaded = data.uploaded?.length ?? 0;
      const errs = data.errors?.length ?? 0;
      setUploadMessage({
        ok: errs === 0,
        text: uploaded ? `Uploaded ${uploaded} file(s).${errs ? ` ${errs} failed.` : ""}` : errs ? "Upload failed." : "Done.",
      });
      setPendingFiles([]);
      setFileInputKey((k) => k + 1);
      fetchImages();
    } catch (err) {
      setUploadMessage({ ok: false, text: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  function removePendingFile(id: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setPendingFiles((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleDeleteGallery() {
    if (!confirm(`Delete the gallery "${folder}" and all ${images.length} image(s)? This cannot be undone.`)) return;
    const user = auth.currentUser;
    if (!user) return;
    setDeleteGalleryError(null);
    setDeletingGallery(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/admin/folders", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: folder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      router.replace("/admin/dashboard");
    } catch (err) {
      setDeleteGalleryError((err as Error).message);
    } finally {
      setDeletingGallery(false);
    }
  }

  if (!folder) {
    return (
      <div>
        <p className="text-muted lowercase">Invalid gallery.</p>
        <Link href="/admin/dashboard" className="text-sm text-foreground underline mt-2 inline-block">
          ← back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-10">
      <div>
        <Link href="/admin/dashboard" className="text-sm text-muted hover:text-foreground lowercase mb-2 inline-block">
          ← dashboard
        </Link>
        <h1 className="text-xl font-medium lowercase text-foreground">
          {folder}
        </h1>
      </div>

      <section>
        <h2 className="text-sm font-medium lowercase text-foreground mb-3">
          rename gallery
        </h2>
        <form onSubmit={handleRename} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            className="px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 lowercase max-w-xs"
            placeholder="New name"
          />
          <button
            type="submit"
            disabled={renaming || renameValue.trim() === folder || !renameValue.trim()}
            className="px-4 py-2 rounded-md bg-foreground text-background text-sm lowercase disabled:opacity-50 cursor-pointer"
          >
            {renaming ? "renaming…" : "rename"}
          </button>
        </form>
        {renameError && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1 lowercase">{renameError}</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium lowercase text-foreground mb-3">
          delete gallery
        </h2>
        <p className="text-sm text-muted mb-2">
          Permanently delete this gallery and all its images.
        </p>
        <button
          type="button"
          onClick={handleDeleteGallery}
          disabled={deletingGallery}
          className="px-4 py-2 rounded-md bg-red-600 text-white text-sm lowercase hover:bg-red-700 disabled:opacity-50 cursor-pointer"
        >
          {deletingGallery ? "deleting…" : "delete gallery"}
        </button>
        {deleteGalleryError && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-1 lowercase">{deleteGalleryError}</p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium lowercase text-foreground mb-3">
          upload more images
        </h2>
        <form onSubmit={handleUploadMore} className="flex flex-col gap-3">
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
            className="text-sm text-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-foreground file:text-background file:cursor-pointer cursor-pointer"
          />
          {pendingFiles.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {pendingFiles.map(({ id, file }, i) => (
                <li key={id} className="relative flex flex-col w-20">
                  <div className="aspect-square rounded overflow-hidden bg-surface border border-border">
                    {previewUrls[i] ? (
                      <img src={previewUrls[i]} alt="" className="w-full h-full object-cover" />
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
                    className="absolute top-0 right-0 w-4 h-4 rounded-full bg-red-600 text-white text-[10px] leading-none flex items-center justify-center hover:bg-red-700 cursor-pointer"
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="submit"
            disabled={uploading || pendingFiles.length === 0}
            className="px-4 py-2 rounded-md bg-foreground text-background text-sm lowercase disabled:opacity-50 cursor-pointer w-fit"
          >
            {uploading ? "uploading…" : "upload"}
          </button>
        </form>
        {uploadMessage && (
          <p className={`text-sm lowercase ${uploadMessage.ok ? "text-foreground" : "text-red-600 dark:text-red-400"}`}>
            {uploadMessage.text}
          </p>
        )}
      </section>

      <section>
        <h2 className="text-sm font-medium lowercase text-foreground mb-3">
          images ({images.length})
        </h2>
        <p className="text-xs text-muted mb-2">
          Edit metadata (key/value). Use keys like <code className="text-[10px]">alt</code>, <code className="text-[10px]">caption</code>, <code className="text-[10px]">title</code> for gallery/lightbox.
        </p>
        {imagesLoading ? (
          <p className="text-sm text-muted lowercase">loading…</p>
        ) : images.length === 0 ? (
          <p className="text-sm text-muted lowercase">No images in this gallery.</p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <li key={img.fullPath} className="relative group">
                <div className="aspect-square relative rounded-md overflow-hidden bg-surface border border-border">
                  <Image
                    src={img.url}
                    alt={metadata[toResourceId(img.fullPath)]?.alt ?? img.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  />
                </div>
                <p className="text-xs text-muted truncate mt-1 lowercase" title={img.name}>
                  {img.name}
                </p>
                <div className="absolute top-1 left-1 right-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(img)}
                    className="px-2 py-1 rounded bg-foreground/90 text-background text-xs lowercase hover:opacity-90 cursor-pointer"
                  >
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(img.fullPath)}
                    disabled={deleting === img.fullPath}
                    className="px-2 py-1 rounded bg-red-600/90 text-white text-xs lowercase hover:bg-red-600 disabled:opacity-50 cursor-pointer"
                  >
                    {deleting === img.fullPath ? "…" : "delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editingId && editingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-4"
          onClick={() => !savingMeta && (setEditingId(null), setEditingImage(null))}
          role="dialog"
          aria-modal="true"
          aria-label="Edit image metadata"
        >
          <div
            className="bg-background border border-border rounded-lg shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium lowercase text-foreground mb-4">
              edit metadata
            </h3>
            <form onSubmit={handleSaveMetadata} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted lowercase">filename</span>
                <input
                  type="text"
                  value={editFilename}
                  onChange={(e) => setEditFilename(e.target.value)}
                  className="px-2 py-1.5 rounded border border-border bg-background text-foreground text-sm lowercase"
                  placeholder="image.jpg"
                />
              </label>
              <div className="space-y-2">
                {editForm.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="text"
                      value={row.key}
                      onChange={(e) => setEditRow(i, "key", e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded border border-border bg-background text-foreground text-sm lowercase"
                      placeholder="key"
                    />
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => setEditRow(i, "value", e.target.value)}
                      className="flex-1 min-w-0 px-2 py-1.5 rounded border border-border bg-background text-foreground text-sm lowercase"
                      placeholder="value"
                    />
                    <button
                      type="button"
                      onClick={() => removeEditRow(i)}
                      className="px-2 py-1.5 rounded border border-border text-muted hover:text-foreground text-xs lowercase cursor-pointer shrink-0"
                      aria-label="Remove row"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addEditRow}
                className="text-xs text-muted hover:text-foreground lowercase cursor-pointer self-start"
              >
                + add key/value
              </button>
              {metaError && (
                <p className="text-sm text-red-600 dark:text-red-400 lowercase">{metaError}</p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  type="submit"
                  disabled={savingMeta}
                  className="px-4 py-2 rounded bg-foreground text-background text-sm lowercase disabled:opacity-50 cursor-pointer"
                >
                  {savingMeta ? "saving…" : "save"}
                </button>
                <button
                  type="button"
                  onClick={() => !savingMeta && (setEditingId(null), setEditingImage(null))}
                  className="px-4 py-2 rounded border border-border text-foreground text-sm lowercase cursor-pointer"
                >
                  cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
