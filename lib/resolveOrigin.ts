const ORIGIN_BY_REGION: Readonly<Record<string, string>> = {
  eu: 'https://liveshopping-api-eu.bambuser.com',
  us: 'https://liveshopping-api-us.bambuser.com',
};

export const resolveOrigin = (baseUrl: string, region: string): string =>
  (baseUrl || ORIGIN_BY_REGION[region] || ORIGIN_BY_REGION.eu).replace(/\/$/, '');

// n8n expression form of resolveOrigin, evaluated at request-build time by n8n
// against `$credentials`. Shared with the BambuserApi credential's baseUrl
// binding so runtime helper calls and credential URL resolution always agree
// on the same per-region origins.
export const RESOLVE_ORIGIN_EXPRESSION =
  `={{ ($credentials.baseUrl || "").replace(/\\/$/, "") || ($credentials.region === "us" ? "${ORIGIN_BY_REGION.us}" : "${ORIGIN_BY_REGION.eu}") }}`;
