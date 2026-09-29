const SHARE_SLUG_KEY_PREFIX = 'share_slug:';

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

function looksLikeMediaFileId(fileId = '') {
  return /\.(mp4|webm|mkv|mov|m4v|avi|wmv|flv|3gp|mp3|wav|flac|aac|m4a|ogg|oga|opus)(?:$|\?)/i.test(
    String(fileId || '')
  );
}

/**
 * Short links:
 * - Images / docs: proxy (URL stays /s/xxx)
 * - Video / audio: 302 to /file/... so Range streaming & download work reliably
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

  // Keep Telegram file ids intact (do not over-encode).
  const targetUrl = new URL(request.url);
  targetUrl.pathname = `/file/${targetId}`;

  // Video/audio need proper byte-range handling — redirect is more reliable than proxy.
  const rangeHeader = request.headers.get('Range');
  if (looksLikeMediaFileId(targetId) || rangeHeader) {
    return Response.redirect(targetUrl.toString(), 302);
  }

  try {
    const proxyRequest = new Request(targetUrl.toString(), request);
    const response = await fetch(proxyRequest);
    if (response.status >= 500) {
      return Response.redirect(targetUrl.toString(), 302);
    }
    return response;
  } catch {
    return Response.redirect(targetUrl.toString(), 302);
  }
}
