/**
 * GET    /api/r2/attachment/:subId/:filename - Download an attachment
 * DELETE /api/r2/attachment/:subId/:filename - Delete an attachment
 */

export async function onRequestGet(context) {
  const { env, data, params } = context;
  const prefix = data.userPrefix;
  const { subId, filename } = params;

  if (!subId || !filename) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = `${prefix}/attachments/${subId}/${filename}`;
  const object = await env.R2_BUCKET.get(key);

  if (!object) {
    return new Response(JSON.stringify({ error: "Attachment not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = object.httpMetadata?.contentType || "application/octet-stream";

  return new Response(object.body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}

export async function onRequestDelete(context) {
  const { env, data, params } = context;
  const prefix = data.userPrefix;
  const { subId, filename } = params;

  if (!subId || !filename) {
    return new Response(JSON.stringify({ error: "Missing parameters" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = `${prefix}/attachments/${subId}/${filename}`;
  await env.R2_BUCKET.delete(key);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
