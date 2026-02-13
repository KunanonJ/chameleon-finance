/**
 * POST /api/r2/attachments/:subId - Upload a file attachment
 * GET  /api/r2/attachments/:subId - List attachments for a subscription
 */

const ALLOWED_TYPES = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function onRequestPost(context) {
  const { request, env, data, params } = context;
  const prefix = data.userPrefix;
  const subId = params.subId;

  if (!subId) {
    return new Response(JSON.stringify({ error: "Missing subscription ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form data" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: "File exceeds 10MB limit" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: "File type not allowed. Use PNG, JPEG, WebP, GIF, or PDF." }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Sanitize filename
  const sanitized = file.name
    .replace(/[/\\:*?"<>|]/g, "_")
    .slice(0, 128);

  const key = `${prefix}/attachments/${subId}/${sanitized}`;

  await env.R2_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: {
      originalName: file.name,
      mimeType: file.type,
      uploadDate: new Date().toISOString(),
      subscriptionId: subId,
    },
  });

  return new Response(JSON.stringify({
    ok: true,
    key,
    filename: sanitized,
    size: file.size,
  }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestGet(context) {
  const { env, data, params } = context;
  const prefix = data.userPrefix;
  const subId = params.subId;

  if (!subId) {
    return new Response(JSON.stringify({ error: "Missing subscription ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const listed = await env.R2_BUCKET.list({
    prefix: `${prefix}/attachments/${subId}/`,
  });

  const attachments = listed.objects.map(obj => {
    const parts = obj.key.split("/");
    return {
      filename: parts[parts.length - 1],
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      mimeType: obj.customMetadata?.mimeType || "application/octet-stream",
    };
  });

  return new Response(JSON.stringify(attachments), {
    headers: { "Content-Type": "application/json" },
  });
}
