/**
 * Inline text content overrides for uploaded files.
 * Keeps the same file id / short link (/s/xxx or /file/id) while replacing body.
 */

export const FILE_CONTENT_PREFIX = 'file_content:';

const MAX_CONTENT_SIZE = 1024 * 1024; // 1 MiB

const TEXT_EXTS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'xml',
  'csv',
  'log',
  'css',
  'js',
  'ts',
  'html',
  'htm',
  'svg',
  'yml',
  'yaml',
  'ini',
  'conf',
  'cfg',
  'env',
  'sql',
  'py',
  'sh',
  'bat',
  'ps1',
]);

function ensureKv(env) {
  if (!env?.img_url) {
    throw new Error('KV binding img_url is not configured.');
  }
}

export function buildFileContentKey(fileId) {
  return `${FILE_CONTENT_PREFIX}${String(fileId || '').trim()}`;
}

export function isEditableTextFile(fileName = '', mimeType = '') {
  const name = String(fileName || '');
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  if (ext && TEXT_EXTS.has(ext)) return true;
  const mime = String(mimeType || '').toLowerCase();
  return (
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('javascript') ||
    mime.includes('markdown')
  );
}

export function guessTextContentType(fileName = '', fallback = 'text/plain; charset=utf-8') {
  const ext = String(fileName || '').includes('.')
    ? String(fileName).split('.').pop().toLowerCase()
    : '';
  const map = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    css: 'text/css; charset=utf-8',
    js: 'text/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    md: 'text/markdown; charset=utf-8',
    markdown: 'text/markdown; charset=utf-8',
    xml: 'application/xml; charset=utf-8',
    svg: 'image/svg+xml; charset=utf-8',
    csv: 'text/csv; charset=utf-8',
  };
  return map[ext] || fallback;
}

export async function getFileContentOverride(env, fileId) {
  ensureKv(env);
  const id = String(fileId || '').trim();
  if (!id) return null;
  try {
    const raw = await env.img_url.get(buildFileContentKey(id), { type: 'json' });
    if (!raw || typeof raw !== 'object') return null;
    return {
      content: String(raw.content || ''),
      contentType: String(raw.contentType || 'text/plain; charset=utf-8'),
      updatedAt: Number(raw.updatedAt || 0),
      size: Number(raw.size || 0),
    };
  } catch {
    return null;
  }
}

export async function putFileContentOverride(
  env,
  fileId,
  { content, contentType = 'text/plain; charset=utf-8' } = {}
) {
  ensureKv(env);
  const id = String(fileId || '').trim();
  if (!id) {
    throw new Error('File id is required.');
  }

  const normalized = String(content ?? '');
  const byteLength = new TextEncoder().encode(normalized).byteLength;
  if (byteLength > MAX_CONTENT_SIZE) {
    throw new Error('Content exceeds 1 MiB limit.');
  }

  const now = Date.now();
  const payload = {
    content: normalized,
    contentType: String(contentType || 'text/plain; charset=utf-8'),
    updatedAt: now,
    size: byteLength,
  };

  await env.img_url.put(buildFileContentKey(id), JSON.stringify(payload), {
    metadata: {
      updatedAt: now,
      size: byteLength,
      contentType: payload.contentType,
    },
  });

  return payload;
}

export async function deleteFileContentOverride(env, fileId) {
  ensureKv(env);
  const id = String(fileId || '').trim();
  if (!id) return false;
  await env.img_url.delete(buildFileContentKey(id));
  return true;
}
