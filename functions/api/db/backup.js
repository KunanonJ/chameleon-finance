import { resolveUserToken } from '../_lib/auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-User-Token',
  'Access-Control-Max-Age': '86400',
};

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS user_backups (
    user_token TEXT PRIMARY KEY,
    payload_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=UTF-8',
    },
  });
}

function getDatabaseBinding(env) {
  return env.USER_DB || env.DB || env.ABDULL_DB || null;
}

async function ensureSchema(db) {
  await db.exec(CREATE_TABLE_SQL);
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const db = getDatabaseBinding(env);
  if (!db) {
    return jsonResponse({ error: 'D1 database binding not configured' }, 501);
  }

  const auth = await resolveUserToken(request);
  if (!auth) {
    return jsonResponse({ error: 'Missing auth: provide X-User-Token or sign in via Cloudflare Access' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  if (!Array.isArray(body?.subscriptions)) {
    return jsonResponse({ error: 'Missing subscriptions array' }, 400);
  }

  await ensureSchema(db);

  const now = new Date().toISOString();
  const normalizedPayload = JSON.stringify({
    ...body,
    backupDate: now,
  });

  await db.prepare(`
    INSERT INTO user_backups (user_token, payload_json, updated_at)
    VALUES (?1, ?2, ?3)
    ON CONFLICT(user_token) DO UPDATE SET
      payload_json = excluded.payload_json,
      updated_at = excluded.updated_at
  `).bind(auth.token, normalizedPayload, now).run();

  return jsonResponse({
    ok: true,
    backupDate: now,
    storage: 'd1',
    authMode: auth.authMode,
  });
}

export async function onRequestGet({ request, env }) {
  const db = getDatabaseBinding(env);
  if (!db) {
    return jsonResponse({ error: 'D1 database binding not configured' }, 501);
  }

  const auth = await resolveUserToken(request);
  if (!auth) {
    return jsonResponse({ error: 'Missing auth: provide X-User-Token or sign in via Cloudflare Access' }, 401);
  }

  await ensureSchema(db);

  const row = await db.prepare(`
    SELECT payload_json
    FROM user_backups
    WHERE user_token = ?1
    LIMIT 1
  `).bind(auth.token).first();

  if (!row?.payload_json) {
    return jsonResponse({ error: 'No backup found' }, 404);
  }

  return new Response(row.payload_json, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=UTF-8',
    },
  });
}
