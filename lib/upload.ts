"use client";

import type { ImageAsset } from "./types";

/**
 * Compression côté client avant upload (2400 px max) : sur mobile, une photo
 * de 4–8 Mo devient ~300–600 Ko, ce qui rend l'envoi rapide même en 4G.
 */
export async function compressImage(file: File, maxDim = 2400, quality = 0.86): Promise<Blob> {
  if (typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.type === "image/webp") return blob;
    return (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality))) ?? file;
  } catch {
    return file;
  }
}

export async function uploadImage(file: File, alt = ""): Promise<ImageAsset> {
  const blob = await compressImage(file);
  const form = new FormData();
  form.append("file", blob, file.name || "photo");
  form.append("alt", alt);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  if (!res.ok) {
    const { error } = (await res.json().catch(() => ({ error: null }))) as { error: string | null };
    throw new Error(error ?? "Échec de l'envoi de la photo");
  }
  return (await res.json()) as ImageAsset;
}
