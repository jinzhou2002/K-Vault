import { updatePasteById } from '../../../utils/paste-store.js';
import { apiError, apiSuccess, buildAbsoluteUrl, decodePathParam, parsePositiveInt } from '../../../utils/api-v1.js';
import { deletePasteById, getPasteById } from '../../../utils/paste-store.js';

async function handleGet(context, pasteId) {
  const url = new URL(context.request.url);
  const password =
    url.searchParams.get('password')
    || context.request.headers.get('X-Paste-Password')
    || '';

  const result = await getPasteById(pasteId, context.env, { password });
  if (!result.ok) {
    return apiError(
      result.code || 'PASTE_READ_FAILED',
      result.message || 'Failed to read paste.',
      result.status || 400
    );
  }

  return apiSuccess({
    paste: {
      id: result.paste.id,
      content: result.paste.content,
      language: result.paste.language,
      createdAt: result.paste.createdAt ? new Date(Number(result.paste.createdAt)).toISOString() : null,
      expiresAt: result.paste.expiresAt ? new Date(Number(result.paste.expiresAt)).toISOString() : null,
      hasPassword: Boolean(result.paste.hasPassword),
      size: Number(result.paste.size || 0),
    },
  });
}

async function handleDelete(context, pasteId) {
  const deleted = await deletePasteById(pasteId, context.env);
  if (!deleted) {
    return apiError('PASTE_NOT_FOUND', 'Paste not found.', 404);
  }
  return apiSuccess({
    deleted: true,
    pasteId,
  });
}

async function handleUpdate(context, pasteId) {
  let body = {};
  try {
    body = await context.request.json();
  } catch {
    body = {};
  }

  if (body?.content == null || !String(body.content).trim()) {
    return apiError('VALIDATION_ERROR', 'Field "content" is required.', 400);
  }

  const expiresInRaw = body?.expires_in ?? body?.expiresIn;
  const expiresIn =
    expiresInRaw === null || expiresInRaw === ''
      ? expiresInRaw
      : parsePositiveInt(expiresInRaw, { defaultValue: 0, min: 1, max: 3650 * 24 * 3600 });

  const result = await updatePasteById(
    pasteId,
    {
      content: body.content,
      language: body.language,
      expiresIn:
        expiresInRaw === undefined
          ? undefined
          : expiresIn === null || expiresIn === ''
            ? null
            : expiresIn > 0
              ? expiresIn
              : null,
      password: body.password,
      clearPassword: Boolean(body.clearPassword || body.clear_password),
    },
    context.env
  );

  if (!result.ok) {
    return apiError(
      result.code || 'PASTE_UPDATE_FAILED',
      result.message || 'Failed to update paste.',
      result.status || 400
    );
  }

  return apiSuccess({
    paste: {
      id: result.paste.id,
      language: result.paste.language,
      createdAt: result.paste.createdAt
        ? new Date(Number(result.paste.createdAt)).toISOString()
        : null,
      expiresAt: result.paste.expiresAt
        ? new Date(Number(result.paste.expiresAt)).toISOString()
        : null,
      hasPassword: result.paste.hasPassword,
      size: Number(result.paste.size || 0),
    },
    links: {
      view: buildAbsoluteUrl(context.request, `/api/v1/paste/${encodeURIComponent(result.paste.id)}`),
      raw: buildAbsoluteUrl(context.request, `/api/v1/paste/${encodeURIComponent(result.paste.id)}`),
    },
    message: 'Paste updated. Share link unchanged.',
  });
}

export async function onRequest(context) {
  const pasteId = decodePathParam(context.params?.id || '');
  if (!pasteId) {
    return apiError('VALIDATION_ERROR', 'Paste id is required.', 400);
  }

  const method = String(context.request.method || 'GET').toUpperCase();
  if (method === 'GET') {
    return handleGet(context, pasteId);
  }
  if (method === 'DELETE') {
    return handleDelete(context, pasteId);
  }
  if (method === 'PUT' || method === 'PATCH') {
    return handleUpdate(context, pasteId);
  }

  return apiError('METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
}
