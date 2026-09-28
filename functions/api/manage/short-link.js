import {
  buildAbsolutePublicUrl,
  ensureShortSrcForRecord,
  shouldEnableShortUrls,
} from '../../utils/short-link.js';

/**
 * Ensure / create a short link for a dashboard file id.
 * POST JSON: { id: "file-kv-key" }
 * GET ?id=file-kv-key
 */
export async function onRequestPost(context) {
  return handleEnsure(context);
}

export async function onRequestGet(context) {
  return handleEnsure(context);
}

async function handleEnsure(context) {
  const { request, env } = context;

  if (!env?.img_url) {
    return json({ error: 'KV binding img_url is not configured.' }, 500);
  }

  let id = '';
  try {
    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      id = String(body?.id || body?.name || body?.key || '').trim();
    }
  } catch {
    id = '';
  }

  if (!id) {
    const url = new URL(request.url);
    id = String(url.searchParams.get('id') || '').trim();
  }

  if (!id) {
    return json({ error: 'Missing file id' }, 400);
  }

  if (!shouldEnableShortUrls(env)) {
    const src = `/file/${id}`;
    return json({
      src,
      url: buildAbsolutePublicUrl(env, src, new URL(request.url).origin),
      short: false,
    });
  }

  const src = await ensureShortSrcForRecord(env, id);
  const slug = String(src || '').startsWith('/s/')
    ? String(src).slice(3)
    : '';

  return json({
    src,
    slug: slug || undefined,
    url: buildAbsolutePublicUrl(env, src, new URL(request.url).origin),
    short: Boolean(slug),
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
