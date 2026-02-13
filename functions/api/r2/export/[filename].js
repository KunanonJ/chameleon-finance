/**
 * GET    /api/r2/export/:filename - Download an export file
 * DELETE /api/r2/export/:filename - Delete an export file
 */

export async function onRequestGet(context) {
  const { env, data, params } = context;
  const prefix = data.userPrefix;
  const { filename } = params;

  if (!filename) {
    return new Response(JSON.stringify({ error: "Missing filename" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = `${prefix}/exports/${filename}`;
  const object = await env.R2_BUCKET.get(key);

  if (!object) {
    return new Response(JSON.stringify({ error: "Export not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = object.httpMetadata?.contentType || "application/octet-stream";

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export async function onRequestDelete(context) {
  const { env, data, params } = context;
  const prefix = data.userPrefix;
  const { filename } = params;

  if (!filename) {
    return new Response(JSON.stringify({ error: "Missing filename" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = `${prefix}/exports/${filename}`;
  await env.R2_BUCKET.delete(key);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
