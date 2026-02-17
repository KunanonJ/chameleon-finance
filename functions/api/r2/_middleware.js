import { resolveUserToken } from '../_lib/auth.js';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-User-Token",
  "Access-Control-Max-Age": "86400",
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!context.env.R2_BUCKET) {
    return jsonResponse({ error: "R2 not configured" }, 501);
  }

  const auth = await resolveUserToken(context.request);
  if (!auth) {
    return jsonResponse({ error: "Missing auth: provide X-User-Token or sign in via Cloudflare Access" }, 401);
  }

  context.data.userPrefix = `users/${auth.token}`;
  context.data.authMode = auth.authMode;
  context.data.corsHeaders = corsHeaders;

  const response = await context.next();

  // Ensure CORS headers are on every response
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}
