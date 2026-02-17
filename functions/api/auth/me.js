import { getCloudflareAccessIdentity } from '../_lib/auth.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=UTF-8',
    },
  });
}

function buildAccessUrls(requestUrl) {
  const url = new URL(requestUrl);
  const origin = `${url.protocol}//${url.host}`;
  return {
    loginUrl: `${origin}/cdn-cgi/access/login`,
    logoutUrl: `${origin}/cdn-cgi/access/logout`,
  };
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS_HEADERS });
}

export async function onRequestGet({ request }) {
  const identity = getCloudflareAccessIdentity(request);
  const urls = buildAccessUrls(request.url);
  if (!identity) {
    return jsonResponse({
      authenticated: false,
      source: 'cloudflare-access',
      email: null,
      userId: null,
      ...urls,
    });
  }

  return jsonResponse({
    authenticated: true,
    source: identity.source,
    email: identity.email,
    userId: identity.userId,
    ...urls,
  });
}
