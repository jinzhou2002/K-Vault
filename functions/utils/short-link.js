/**
 * Short public links for K-Vault.
 * Maps share_slug:{slug} -> real /file id (used by functions/s/[slug].js).
 *
 * Env:
 *   ENABLE_SHORT_URLS  - default on when KV is bound; set "false" to disable
 *   SHORT_URL_LENGTH   - slug length 4-16, default 6
 */

export const SHARE_SLUG_KEY_PREFIX = "share_slug:";

function isTruthy(value, defaultValue = false) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!normalized) return defaultValue;
  if (["1", "true", "yes", "on", "enable", "enabled"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "disable", "disabled"].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

export function shouldEnableShortUrls(env) {
  if (!env?.img_url) return false;
  // Default ON when KV is available; explicitly set false to keep long /file links.
  return isTruthy(env.ENABLE_SHORT_URLS, true);
}

function getSlugLength(env) {
  const parsed = Number.parseInt(String(env?.SHORT_URL_LENGTH || "6"), 10);
  if (!Number.isFinite(parsed)) return 6;
  return Math.min(16, Math.max(4, parsed));
}

function generateSlug(length) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}

/**
 * Create a short slug mapped to the real file id used by /file/*.
 * @returns {Promise<string|null>} slug or null if short links unavailable
 */
export async function createShareSlug(env, fileId) {
  if (!shouldEnableShortUrls(env)) return null;

  const targetId = String(fileId || "").trim();
  if (!targetId) return null;

  const baseLength = getSlugLength(env);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const length = baseLength + Math.floor(attempt / 3);
    const slug = generateSlug(length);
    const key = `${SHARE_SLUG_KEY_PREFIX}${slug}`;

    try {
      const existing = await env.img_url.get(key);
      if (existing) continue;
      await env.img_url.put(key, targetId);
      return slug;
    } catch (error) {
      console.warn("createShareSlug failed:", error?.message || error);
      return null;
    }
  }

  return null;
}

/**
 * Prefer /s/{slug}; fall back to /file/{id}.
 */
export async function buildPublicSrc(env, fileId) {
  const id = String(fileId || "").trim();
  if (!id) return "/file/";

  const slug = await createShareSlug(env, id);
  if (slug) return `/s/${slug}`;
  return `/file/${id}`;
}

/**
 * Absolute public URL for notices / webhooks.
 */
export function buildAbsolutePublicUrl(env, src, fallbackOrigin = "") {
  const path = String(src || "").startsWith("/") ? src : `/${src || ""}`;
  const candidates = [env?.PUBLIC_BASE_URL, fallbackOrigin];
  for (const raw of candidates) {
    if (!raw) continue;
    try {
      return `${new URL(String(raw)).toString().replace(/\/+$/, "")}${path}`;
    } catch {
      // ignore invalid base
    }
  }
  return path;
}

/**
 * Rewrite upload JSON responses of shape [{ src: "/file/..." }, ...] to short links.
 */
export async function rewriteUploadResponseWithShortLinks(response, env) {
  if (!(response instanceof Response) || !response.ok) return response;

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("application/json")) return response;
  if (!shouldEnableShortUrls(env)) return response;

  let payload;
  try {
    payload = await response.clone().json();
  } catch {
    return response;
  }

  if (!Array.isArray(payload)) return response;

  let changed = false;
  for (const item of payload) {
    if (!item || typeof item !== "object") continue;
    const src = String(item.src || "");
    const match = src.match(/^\/file\/(.+)$/);
    if (!match) continue;

    let fileId = match[1];
    try {
      fileId = decodeURIComponent(fileId);
    } catch {
      // keep raw
    }

    const shortSrc = await buildPublicSrc(env, fileId);
    if (shortSrc !== src) {
      item.fileSrc = src;
      item.src = shortSrc;
      changed = true;
    }
  }

  if (!changed) return response;

  return new Response(JSON.stringify(payload), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
