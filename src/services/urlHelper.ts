/**
 * Utilities for resolving publicly accessible join URLs and extracting PIN codes from scanned QR codes
 */

export function getPublicBaseUrl(serverPublicUrl?: string): string {
  // If running in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local') || hostname.endsWith('.internal');

    // If on localhost or inside a sandbox and server reported a public Cloud Run URL, use that
    if (isLocal && serverPublicUrl && !serverPublicUrl.includes('localhost') && !serverPublicUrl.includes('127.0.0.1')) {
      return serverPublicUrl.replace(/\/$/, '');
    }

    return window.location.origin.replace(/\/$/, '');
  }

  if (serverPublicUrl) {
    return serverPublicUrl.replace(/\/$/, '');
  }

  return 'https://quizterm.app';
}

/**
 * Builds the canonical scan URL for a game join PIN
 */
export function getPublicJoinUrl(joinCode: string, serverPublicUrl?: string, customBaseUrl?: string): string {
  const code = encodeURIComponent((joinCode || '').trim().toUpperCase());
  const base = customBaseUrl ? customBaseUrl.replace(/\/$/, '') : getPublicBaseUrl(serverPublicUrl);
  return `${base}/join/${code}`;
}

/**
 * Robust extractor for access PIN codes from query parameters, path segments, and URL hashes
 */
export function extractJoinCodeFromCurrentUrl(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const url = new URL(window.location.href);

    // 1. Check standard query params: ?join=..., ?code=..., ?pin=..., ?access=...
    const queryCode =
      url.searchParams.get('join') ||
      url.searchParams.get('code') ||
      url.searchParams.get('pin') ||
      url.searchParams.get('access') ||
      url.searchParams.get('joinCode') ||
      url.searchParams.get('game');

    if (queryCode && queryCode.trim().length > 0) {
      return queryCode.trim().toUpperCase();
    }

    // 2. Check path segments: e.g. /join/SA50AI
    const pathMatch = url.pathname.match(/\/join\/([A-Za-z0-9_-]{3,12})/i);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1].trim().toUpperCase();
    }

    // 3. Check hash: e.g. #join=SA50AI or #pin=SA50AI or #SA50AI
    const hash = url.hash.replace(/^#/, '').trim();
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const hashJoin = hashParams.get('join') || hashParams.get('code') || hashParams.get('pin');
      if (hashJoin) {
        return hashJoin.trim().toUpperCase();
      }

      // If hash is directly a 4-8 char alphanumeric code
      if (/^[A-Za-z0-9]{4,8}$/.test(hash)) {
        return hash.toUpperCase();
      }
    }
  } catch (err) {
    console.warn('[urlHelper] Failed to parse URL for join code:', err);
  }

  return null;
}
