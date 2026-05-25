const ORIGIN_BY_REGION: Readonly<Record<string, string>> = {
  eu: 'https://liveshopping-api-eu.bambuser.com',
  us: 'https://liveshopping-api-us.bambuser.com',
};

export const resolveOrigin = (baseUrl: string, region: string): string =>
  (baseUrl || ORIGIN_BY_REGION[region] || ORIGIN_BY_REGION.eu).replace(/\/$/, '');
