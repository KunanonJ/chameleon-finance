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

  const token = context.request.headers.get("X-User-Token");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return jsonResponse({ error: "Missing or invalid token" }, 401);
  }

  context.data.userPrefix = `users/${token}`;
  context.data.corsHeaders = corsHeaders;

  const response = await context.next();

  // Ensure CORS headers are on every response
  const newResponse = new Response(response.body, response);
  for (const [key, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}
