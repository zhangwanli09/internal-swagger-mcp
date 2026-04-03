export const CHARACTER_LIMIT = 25000;

export const FIXED_HEADERS: Record<string, string> = {
  "Authorization": "Bearer permit-token",
  "fs-tenant": "null",
  "clientId": "web",
  "originType": "1",
  "X-Requested-With": "XMLHttpRequest",
  "Content-Type": "application/json;charset=UTF-8",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "zh-CN",
};

export const DEFAULT_CACHE_MINUTES = 30;
export const REQUEST_TIMEOUT_MS = 30000;
