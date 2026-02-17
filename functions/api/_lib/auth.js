const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

function normalizeIdentity(value) {
  return String(value || '').trim().toLowerCase();
}

function toHex(bytes) {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashIdentityToToken(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toHex(digest);
}

export function getCloudflareAccessIdentity(request) {
  const email = normalizeIdentity(request.headers.get('Cf-Access-Authenticated-User-Email'));
  const userId = normalizeIdentity(request.headers.get('Cf-Access-Authenticated-User-Id'));
  const subject = normalizeIdentity(request.headers.get('Cf-Access-Authenticated-User-Sub'));
  const fallback = normalizeIdentity(request.headers.get('Cf-Access-User-Email'));

  const stableIdentity = userId || subject || email || fallback;
  if (!stableIdentity) return null;

  return {
    source: 'cloudflare-access',
    stableIdentity,
    email: email || fallback || null,
    userId: userId || subject || null,
  };
}

export async function resolveUserToken(request) {
  const token = normalizeIdentity(request.headers.get('X-User-Token'));
  if (TOKEN_PATTERN.test(token)) {
    return {
      token,
      authMode: 'token',
      identity: null,
    };
  }

  const identity = getCloudflareAccessIdentity(request);
  if (!identity) return null;

  return {
    token: await hashIdentityToToken(identity.stableIdentity),
    authMode: 'cloudflare-access',
    identity,
  };
}
