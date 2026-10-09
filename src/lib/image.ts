/** Downscale + compress a picked photo on-device so tiles stay light on budget phones. */
export async function fileToDataUrl(file: File, max = 320, quality = 0.72): Promise<string> {
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return bitmap.dataUrl;
  ctx.drawImage(bitmap.source as CanvasImageSource, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

type Loadable = { width: number; height: number; source: ImageBitmap | HTMLImageElement; dataUrl: string };

async function loadBitmap(file: File): Promise<Loadable> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal membaca gambar"));
    reader.readAsDataURL(file);
  });
  if (typeof createImageBitmap === "function") {
    const bmp = await createImageBitmap(file);
    return { width: bmp.width, height: bmp.height, source: bmp, dataUrl };
  }
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Gambar tidak bisa dimuat"));
    img.src = dataUrl;
  });
  return { width: img.naturalWidth, height: img.naturalHeight, source: img, dataUrl };
}
