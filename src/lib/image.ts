/**
 * Turning a picked file into a photo we can actually store.
 *
 * Everything is kept in localStorage, which has a small quota, so uploads
 * are downscaled and re-encoded before they are saved. This also strips
 * EXIF data, including any GPS coordinates, from the original file.
 */

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 1000;
const JPEG_QUALITY = 0.72;
const MAX_STORED_BYTES = 420 * 1024;

export type PhotoResult =
  | { ok: true; dataUrl: string }
  | { ok: false; reason: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode failed"));
    image.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

/** Rough byte size of a data URL payload. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.round((base64.length * 3) / 4);
}

export async function preparePhoto(file: File): Promise<PhotoResult> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, reason: `${file.name} is not an image.` };
  }
  if (file.size > MAX_SOURCE_BYTES) {
    return { ok: false, reason: `${file.name} is larger than 12 MB.` };
  }

  try {
    const original = await readAsDataUrl(file);
    const image = await loadImage(original);

    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return { ok: false, reason: "Your browser could not process that image." };
    context.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    if (dataUrlBytes(dataUrl) > MAX_STORED_BYTES) {
      return { ok: false, reason: `${file.name} is still too detailed to save.` };
    }
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, reason: `${file.name} could not be read.` };
  }
}
