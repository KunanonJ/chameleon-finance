/**
 * POST /api/r2/exports - Save an export file to R2
 * GET  /api/r2/exports - List all saved exports
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

  const { filename, content, contentType } = body;

  if (!filename || !content) {
    return new Response(JSON.stringify({ error: "Missing filename or content" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Sanitize filename
  const sanitized = filename.replace(/[/\\:*?"<>|]/g, "_").slice(0, 128);
  const key = `${prefix}/exports/${sanitized}`;

  await env.R2_BUCKET.put(key, content, {
    httpMetadata: { contentType: contentType || "application/octet-stream" },
    customMetadata: {
      originalFilename: filename,
      exportDate: new Date().toISOString(),
    },
  });

  return new Response(JSON.stringify({
    ok: true,
    key,
    filename: sanitized,
  }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestGet(context) {
  const { env, data } = context;
  const prefix = data.userPrefix;

  const listed = await env.R2_BUCKET.list({
    prefix: `${prefix}/exports/`,
  });

  const exports = listed.objects.map(obj => {
    const parts = obj.key.split("/");
    return {
      filename: parts[parts.length - 1],
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
    };
  });

  // Sort newest first
  exports.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  return new Response(JSON.stringify(exports), {
    headers: { "Content-Type": "application/json" },
  });
}
