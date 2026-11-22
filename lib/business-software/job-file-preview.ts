export function jobFilePreviewKind(mimeType: unknown): "image" | "pdf" | null {
  const mime = String(mimeType || "").split(";", 1)[0].trim().toLowerCase();
  if (/^image\/(jpeg|png|gif|webp|avif)$/.test(mime)) return "image";
  return mime === "application/pdf" ? "pdf" : null;
}

export function jobFilePreviewUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/api/")) return null;
  try {
    const url = new URL(value, "https://local.invalid");
    if (url.origin !== "https://local.invalid" || !/^\/api\/(jobs|admin\/jobs|bms-live\/jobs)\/[^/]+\/files$/.test(url.pathname)) return null;
    url.searchParams.set("inline", "1");
    return url.pathname + url.search;
  } catch { return null; }
}

export function jobFileResponseHeaders(mimeType: unknown, fileName: unknown, inlineRequested: boolean): Record<string,string> {
  const mime = String(mimeType || "").split(";", 1)[0].trim().toLowerCase();
  const contentType = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mime) ? mime : "application/octet-stream";
  const name = String(fileName || "file").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "file";
  const fallback = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  let encoded: string;
  try { encoded = encodeURIComponent(name); } catch { encoded = encodeURIComponent(fallback); }
  encoded = encoded.replace(/['()*]/g, char => "%" + char.charCodeAt(0).toString(16).toUpperCase());
  return {
    "Content-Type": contentType,
    "Content-Disposition": (inlineRequested && jobFilePreviewKind(mime) ? "inline" : "attachment") + '; filename="' + fallback + '"; filename*=UTF-8\'\'' + encoded,
    "Cache-Control": "private, max-age=60",
    "Vary": "Cookie",
    "X-Content-Type-Options": "nosniff"
  };
}
