/**
 * POST /api/event
 * Receives analytics events from the client and writes them to Analytics Engine.
 *
 * Expected JSON body:
 *   { event: string, props?: Record<string, string|number> }
 *
 * Analytics Engine schema (per data point):
 *   blob1  = event name
 *   blob2  = country (from CF headers)
 *   blob3  = prop key-value pairs as JSON
 *   double1 = numeric value (if provided in props.value)
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS preflight is handled by onRequestOptions below
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (!env.ANALYTICS) {
    return new Response(JSON.stringify({ ok: false, error: "Analytics not configured" }), {
      status: 501,
      headers,
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON" }), {
      status: 400,
      headers,
    });
  }

  const event = typeof body.event === "string" ? body.event.slice(0, 64) : "";
  if (!event) {
    return new Response(JSON.stringify({ ok: false, error: "Missing event name" }), {
      status: 400,
      headers,
    });
  }

  const country = request.cf?.country || "unknown";
  const props = body.props && typeof body.props === "object" ? body.props : {};
  const numericValue = typeof props.value === "number" ? props.value : 0;

  env.ANALYTICS.writeDataPoint({
    blobs: [event, country, JSON.stringify(props)],
    doubles: [numericValue],
    indexes: [event],
  });

  return new Response(JSON.stringify({ ok: true }), { status: 202, headers });
}

/** Handle CORS preflight */
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
