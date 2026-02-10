/**
 * SECURITY NOTE: This token is hardcoded for now.
 * In production, this should be:
 * 1. Moved to a backend API endpoint
 * 2. Never exposed in client-side JavaScript
 * 3. Revoked immediately and replaced with a new token
 *
 * The current token should be revoked: pk_KuI_oR-IQ1-fqpAfz3FPEw
 */
const LOGO_API_TOKEN = "pk_KuI_oR-IQ1-fqpAfz3FPEw";

/**
 * HTML escaping utility for preventing XSS vulnerabilities
 * @param {string} text - Text to escape
 * @returns {string} - Escaped HTML-safe text
 */
function escapeHtml(text) {
  if (!text) return "";
  const element = document.createElement("div");
  element.textContent = text;
  return element.innerHTML;
}
