import {
  guessTextContentType,
  isEditableTextFile,
  putFileContentOverride,
} from '../../../utils/file-content.js';

const PREFIXES = ['img:', 'vid:', 'aud:', 'doc:', 'r2:', 's3:', 'discord:', 'hf:', 'webdav:', 'github:', ''];

function decodeFileId(raw) {
  try {
    return decodeURIComponent(raw || '');
  } catch {
    return String(raw || '');
  }
}

async function getRecordWithKey(env, fileId) {
  const hasKnownPrefix = PREFIXES.some((prefix) => prefix && fileId.startsWith(prefix));
  const candidateKeys = hasKnownPrefix ? [fileId] : PREFIXES.map((prefix) => `${prefix}${fileId}`);

  for (const key of candidateKeys) {
    const record = await env.img_url.getWithMetadata(key);
    if (record?.metadata) {
      return { record, kvKey: key };
    }
  }

  return { record: null, kvKey: fileId };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * PUT/POST JSON: { content, contentType? }
 * Overwrites text body for an existing file id. Short links stay the same.
 */
export async function onRequest(context) {
  const { request, params, env } = context;
  const method = String(request.method || 'GET').toUpperCase();

  if (!env.img_url) {
    return jsonResponse({ success: false, error: 'KV binding img_url is not configured.' }, 500);
  }

  if (method !== 'PUT' && method !== 'POST' && method !== 'PATCH') {
    return jsonResponse({ success: false, error: 'Method not allowed.' }, 405);
  }

  const fileId = decodeFileId(params.id);
  const { record, kvKey } = await getRecordWithKey(env, fileId);

  if (!record?.metadata) {
    return jsonResponse({ success: false, error: `File metadata not found for ID: ${fileId}` }, 404);
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (body?.content == null) {
    return jsonResponse({ success: false, error: 'Field "content" is required.' }, 400);
  }

  const fileName = record.metadata.fileName || kvKey;
  const force = Boolean(body.force);
  if (!force && !isEditableTextFile(fileName, body.contentType || '')) {
    return jsonResponse(
      {
        success: false,
        error:
          'Only text-like documents can be edited online. Pass force=true to override anyway.',
      },
      400
    );
  }

  const contentType =
    String(body.contentType || body.content_type || '').trim() ||
    guessTextContentType(fileName);

  try {
    const saved = await putFileContentOverride(env, kvKey, {
      content: body.content,
      contentType,
    });

    const metadata = {
      ...record.metadata,
      fileSize: saved.size,
      contentOverridden: true,
      contentUpdatedAt: saved.updatedAt,
    };
    await env.img_url.put(kvKey, record.value || '', { metadata });

    return jsonResponse({
      success: true,
      key: kvKey,
      fileName,
      size: saved.size,
      contentType: saved.contentType,
      updatedAt: saved.updatedAt,
      shortSlug: metadata.shortSlug || null,
      message: 'Content updated. Share link unchanged.',
      links: {
        file: `/file/${encodeURIComponent(kvKey)}`,
        short: metadata.shortSlug ? `/s/${metadata.shortSlug}` : null,
      },
    });
  } catch (error) {
    return jsonResponse(
      { success: false, error: error.message || 'Failed to update content.' },
      400
    );
  }
}
