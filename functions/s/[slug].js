import { SHARE_SLUG_KEY_PREFIX } from '../utils/short-link.js';

function decodePathParam(rawValue = '') {
  try {
    return decodeURIComponent(String(rawValue || ''));
  } catch {
    return String(rawValue || '');
  }
}

function normalizeSlug(rawValue = '') {
  const value = String(rawValue || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,64}$/.test(value)) return '';
  return value;
}

/**
 * Serve short links by proxying /file/* (no 302).
 * Keeps the browser URL as /s/xxxxxx so copy-link stays short.
 */
export async function onRequest(context) {
  const { request, env, params } = context;
  const rawValue = decodePathParam(params?.slug || '');
  if (!rawValue) {
    return new Response('Not found', { status: 404 });
  }

  let targetId = '';
  const normalizedSlug = normalizeSlug(rawValue);

  if (normalizedSlug && env?.img_url) {
    const mappedId = await env.img_url.get(`${SHARE_SLUG_KEY_PREFIX}${normalizedSlug}`);
    if (mappedId) {
      targetId = String(mappedId);
    }
  }

  if (!targetId) {
    // Backward compatibility: `/s/:id` can also directly carry a file id.
    targetId = rawValue;
  }

  const targetUrl = new URL(`/file/${encodeURIComponent(targetId)}`, request.url);
  const sourceUrl = new URL(request.url);
  sourceUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // Proxy instead of redirect so address bar / "copy image address" stay short.
  const proxyRequest = new Request(targetUrl.toString(), request);
  return fetch(proxyRequest);
}
