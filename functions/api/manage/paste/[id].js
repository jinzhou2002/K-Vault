import { getPasteById, updatePasteById } from '../../../utils/paste-store.js';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function decodeId(raw) {
  try {
    return decodeURIComponent(raw || '');
  } catch {
    return String(raw || '');
  }
}

export async function onRequest(context) {
  const { request, params, env } = context;
  const method = String(request.method || 'GET').toUpperCase();
  const pasteId = decodeId(params.id);

  if (!env.img_url) {
    return jsonResponse({ success: false, error: 'KV binding img_url is not configured.' }, 500);
  }

  if (!pasteId) {
    return jsonResponse({ success: false, error: 'Paste id is required.' }, 400);
  }

  if (method === 'GET') {
    const password =
      new URL(request.url).searchParams.get('password') ||
      request.headers.get('X-Paste-Password') ||
      '';
    const result = await getPasteById(pasteId, env, { password });
    if (!result.ok) {
      return jsonResponse(
        { success: false, error: result.message, code: result.code },
        result.status || 400
      );
    }
    return jsonResponse({ success: true, paste: result.paste });
  }

  if (method === 'PUT' || method === 'POST' || method === 'PATCH') {
    let body = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    if (body?.content == null || !String(body.content).trim()) {
      return jsonResponse({ success: false, error: 'Field "content" is required.' }, 400);
    }

    const result = await updatePasteById(
      pasteId,
      {
        content: body.content,
        language: body.language,
        expiresIn: body.expires_in ?? body.expiresIn,
        password: body.password,
        clearPassword: Boolean(body.clearPassword || body.clear_password),
      },
      env
    );

    if (!result.ok) {
      return jsonResponse(
        { success: false, error: result.message, code: result.code },
        result.status || 400
      );
    }

    return jsonResponse({
      success: true,
      paste: result.paste,
      message: 'Paste updated. Share link unchanged.',
      links: {
        view: `/api/v1/paste/${encodeURIComponent(result.paste.id)}`,
      },
    });
  }

  return jsonResponse({ success: false, error: 'Method not allowed.' }, 405);
}
