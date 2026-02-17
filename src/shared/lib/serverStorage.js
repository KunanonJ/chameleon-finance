const SERVER_TOKEN_KEY = 'subgrid_server_token';
const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;
const BACKUP_ENDPOINTS = ['/api/db/backup', '/api/r2/backup'];
const AUTH_ENDPOINT = '/api/auth/me';
const AUTH_CACHE_TTL_MS = 60 * 1000;

let cachedCloudAuth = {
  at: 0,
  value: {
    authenticated: false,
    source: 'cloudflare-access',
    email: null,
    userId: null,
    loginUrl: '/cdn-cgi/access/login',
    logoutUrl: '/cdn-cgi/access/logout',
  },
};

function parseJsonResponse(response) {
  return response
    .json()
    .catch(() => ({ error: `HTTP ${response.status}` }));
}

function canFallbackToNextEndpoint(responseStatus) {
  return responseStatus === 404 || responseStatus === 405 || responseStatus === 501;
}

function getStorageType(endpoint) {
  return endpoint.includes('/api/db/') ? 'd1' : 'r2';
}

function getAuthHeaders(token, includeJsonContentType = false) {
  const normalizedToken = (token || '').trim();
  const headers = {};
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (!normalizedToken) return headers;
  if (!isValidServerToken(normalizedToken)) {
    throw new Error('Token must be a 64-character hexadecimal string');
  }

  headers['X-User-Token'] = normalizedToken;
  return headers;
}

function normalizeAuthStatus(raw) {
  if (!raw || raw.authenticated !== true) {
    return {
      authenticated: false,
      source: 'cloudflare-access',
      email: null,
      userId: null,
      loginUrl: raw?.loginUrl || '/cdn-cgi/access/login',
      logoutUrl: raw?.logoutUrl || '/cdn-cgi/access/logout',
    };
  }

  return {
    authenticated: true,
    source: raw.source || 'cloudflare-access',
    email: raw.email || null,
    userId: raw.userId || null,
    loginUrl: raw.loginUrl || '/cdn-cgi/access/login',
    logoutUrl: raw.logoutUrl || '/cdn-cgi/access/logout',
  };
}

function readLocalJson(key, fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function isValidServerToken(token) {
  return TOKEN_PATTERN.test((token || '').trim());
}

export function getServerToken() {
  return localStorage.getItem(SERVER_TOKEN_KEY) || '';
}

export function saveServerToken(token) {
  const trimmed = (token || '').trim();
  if (!trimmed) {
    localStorage.removeItem(SERVER_TOKEN_KEY);
    return;
  }
  localStorage.setItem(SERVER_TOKEN_KEY, trimmed);
}

export function canUseCloudBackupAuth(token, cloudAuth) {
  if (isValidServerToken(token)) return true;
  return Boolean(cloudAuth?.authenticated);
}

export async function getCloudAuthStatus({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - cachedCloudAuth.at < AUTH_CACHE_TTL_MS) {
    return cachedCloudAuth.value;
  }

  try {
    const response = await fetch(AUTH_ENDPOINT, { method: 'GET' });
    const data = await parseJsonResponse(response);
    const normalized = normalizeAuthStatus(response.ok ? data : null);
    cachedCloudAuth = { at: now, value: normalized };
    return normalized;
  } catch {
    const fallback = normalizeAuthStatus(null);
    cachedCloudAuth = { at: now, value: fallback };
    return fallback;
  }
}

export function buildServerPayload({ subscriptions, financeRecords, income }) {
  return {
    version: 3,
    backupDate: new Date().toISOString(),
    subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
    financeRecords: Array.isArray(financeRecords) ? financeRecords : [],
    income: typeof income === 'number' ? income : 0,
    budget: readLocalJson('subgrid_budget', null),
    trends: readLocalJson('subgrid_history', []),
  };
}

export async function backupToServer(token, payload) {
  const errors = [];
  for (let i = 0; i < BACKUP_ENDPOINTS.length; i++) {
    const endpoint = BACKUP_ENDPOINTS[i];
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: getAuthHeaders(token, true),
        body: JSON.stringify(payload),
      });

      const data = await parseJsonResponse(response);
      if (response.ok) {
        return { ...data, storage: data.storage || getStorageType(endpoint) };
      }

      if (i < BACKUP_ENDPOINTS.length - 1 && canFallbackToNextEndpoint(response.status)) {
        errors.push(`${endpoint}: ${data.error || `HTTP ${response.status}`}`);
        continue;
      }

      throw new Error(data.error || `Backup failed (${response.status})`);
    } catch (err) {
      if (i < BACKUP_ENDPOINTS.length - 1) {
        errors.push(`${endpoint}: ${err.message}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(errors.pop() || 'No backup endpoint available');
}

export async function restoreFromServer(token) {
  const errors = [];
  for (let i = 0; i < BACKUP_ENDPOINTS.length; i++) {
    const endpoint = BACKUP_ENDPOINTS[i];
    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: getAuthHeaders(token),
      });

      const data = await parseJsonResponse(response);
      if (response.ok) {
        return data;
      }

      if (i < BACKUP_ENDPOINTS.length - 1 && canFallbackToNextEndpoint(response.status)) {
        errors.push(`${endpoint}: ${data.error || `HTTP ${response.status}`}`);
        continue;
      }

      throw new Error(data.error || `Restore failed (${response.status})`);
    } catch (err) {
      if (i < BACKUP_ENDPOINTS.length - 1) {
        errors.push(`${endpoint}: ${err.message}`);
        continue;
      }
      throw err;
    }
  }

  throw new Error(errors.pop() || 'No restore endpoint available');
}
