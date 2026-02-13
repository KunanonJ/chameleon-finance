/**
 * POST /api/r2/backup - Save a full data backup
 * GET  /api/r2/backup - Restore the latest backup (or specific key via ?key=)
 */

export async function onRequestPost(context) {
  const { request, env, data } = context;
  const prefix = data.userPrefix;

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.subscriptions || !Array.isArray(body.subscriptions)) {
    return new Response(JSON.stringify({ error: "Missing subscriptions array" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, "-");
  const jsonStr = JSON.stringify(body);

  const customMetadata = {
    backupDate: now.toISOString(),
    subscriptionCount: String(body.subscriptions.length),
    version: String(body.version || 1),
  };

  // Write latest (overwrite)
  await env.R2_BUCKET.put(`${prefix}/data/latest.json`, jsonStr, {
    httpMetadata: { contentType: "application/json" },
    customMetadata,
  });

  // Write timestamped backup
  const backupKey = `${prefix}/data/backups/backup-${timestamp}.json`;
  await env.R2_BUCKET.put(backupKey, jsonStr, {
    httpMetadata: { contentType: "application/json" },
    customMetadata,
  });

  return new Response(JSON.stringify({
    ok: true,
    key: backupKey,
    backupDate: now.toISOString(),
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestGet(context) {
  const { env, data } = context;
  const prefix = data.userPrefix;
  const url = new URL(context.request.url);
  const specificKey = url.searchParams.get("key");

  const key = specificKey || `${prefix}/data/latest.json`;

  // If a specific key is requested, verify it belongs to this user
  if (specificKey && !specificKey.startsWith(prefix + "/")) {
    return new Response(JSON.stringify({ error: "Access denied" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const object = await env.R2_BUCKET.get(key);

  if (!object) {
    return new Response(JSON.stringify({ error: "No backup found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await object.text();
  return new Response(body, {
    headers: { "Content-Type": "application/json" },
  });
}
