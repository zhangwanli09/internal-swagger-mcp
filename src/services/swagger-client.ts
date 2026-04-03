import axios, { AxiosError } from "axios";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type {
  ApiResponse,
  ApiResponseData,
  CachedSource,
  SourcesConfig,
  SwaggerSourceConfig,
} from "../types.js";
import { DEFAULT_CACHE_MINUTES, FIXED_HEADERS, REQUEST_TIMEOUT_MS } from "../constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES_CONFIG_PATH = resolve(__dirname, "../../swagger-sources.json");

// In-memory cache: sourceName -> CachedSource
const cache = new Map<string, CachedSource>();

let config: SourcesConfig | null = null;

function loadConfig(): SourcesConfig {
  if (config) return config;
  const raw = readFileSync(SOURCES_CONFIG_PATH, "utf-8");
  config = JSON.parse(raw) as SourcesConfig;
  return config;
}

/**
 * Parse a Web UI URL and extract the API URL for fetching swagger data.
 *
 * Input:  http://172.16.101.121:8112/?redirect=/login#/swaggerManage?fs-tenant=null&uid=xxx&formShare=0
 * Output: http://172.16.101.121:8112/flow/swagger/share?uid=xxx&fs-tenant=null
 */
export function parseWebUrl(webUrl: string): string {
  const url = new URL(webUrl);
  const base = `${url.protocol}//${url.host}`;

  // Hash part: #/swaggerManage?fs-tenant=null&uid=xxx&formShare=0
  const hash = url.hash; // includes the '#'
  const queryIndex = hash.indexOf("?");
  if (queryIndex === -1) {
    throw new Error(`Cannot parse uid from URL: ${webUrl}`);
  }

  const hashParams = new URLSearchParams(hash.slice(queryIndex + 1));
  const uid = hashParams.get("uid");
  const fsTenant = hashParams.get("fs-tenant") ?? "null";

  if (!uid) {
    throw new Error(`No uid found in URL: ${webUrl}`);
  }

  return `${base}/flow/swagger/share?uid=${uid}&fs-tenant=${encodeURIComponent(fsTenant)}`;
}

async function fetchSource(src: SwaggerSourceConfig): Promise<CachedSource> {
  const apiUrl = parseWebUrl(src.webUrl);

  let response: ApiResponse;
  try {
    const res = await axios.get<ApiResponse>(apiUrl, {
      headers: FIXED_HEADERS,
      timeout: REQUEST_TIMEOUT_MS,
      httpsAgent: undefined,
    });
    response = res.data;
  } catch (err) {
    if (err instanceof AxiosError) {
      if (err.response) {
        throw new Error(
          `HTTP ${err.response.status} fetching swagger for "${src.webUrl}"`
        );
      }
      throw new Error(`Network error fetching swagger: ${err.message}`);
    }
    throw err;
  }

  if (response.code !== "000000" || !response.data) {
    throw new Error(
      `API returned error: code=${response.code}, msg=${response.msg}`
    );
  }

  const name =
    src.name?.trim() || response.data.projectInfo?.projectName || "未命名服务";

  return {
    name,
    data: response.data,
    fetchedAt: new Date(),
    apiUrl,
  };
}

function isCacheValid(cached: CachedSource, cacheMinutes: number): boolean {
  const ageMs = Date.now() - cached.fetchedAt.getTime();
  return ageMs < cacheMinutes * 60 * 1000;
}

export async function getSource(
  src: SwaggerSourceConfig,
  cacheMinutes: number,
  forceRefresh = false
): Promise<CachedSource> {
  const tempName = src.name ?? src.webUrl;
  const cached = cache.get(tempName);

  if (!forceRefresh && cached && isCacheValid(cached, cacheMinutes)) {
    return cached;
  }

  const fresh = await fetchSource(src);
  // Use real name as cache key after fetch
  cache.set(fresh.name, fresh);
  // Also index by webUrl in case name changes
  cache.set(tempName, fresh);
  return fresh;
}

export function getAllSources(): SourcesConfig {
  return loadConfig();
}

export async function loadAllSources(forceRefresh = false): Promise<CachedSource[]> {
  const cfg = loadConfig();
  const cacheMinutes = cfg.cacheMinutes ?? DEFAULT_CACHE_MINUTES;
  return Promise.all(cfg.sources.map((src) => getSource(src, cacheMinutes, forceRefresh)));
}

export async function loadSourceByName(
  name: string,
  forceRefresh = false
): Promise<CachedSource | undefined> {
  const cfg = loadConfig();
  const cacheMinutes = cfg.cacheMinutes ?? DEFAULT_CACHE_MINUTES;
  const src = cfg.sources.find(
    (s) => (s.name ?? "").toLowerCase() === name.toLowerCase()
  );
  // Try by cached name too
  if (!src) {
    // Maybe the name matches the auto-detected projectName
    const all = await loadAllSources(false);
    return all.find((c) => c.name.toLowerCase() === name.toLowerCase());
  }
  return getSource(src, cacheMinutes, forceRefresh);
}

export function getCacheStatus(): Array<{
  name: string;
  fetchedAt: Date | null;
  apiUrl: string;
}> {
  const cfg = loadConfig();
  return cfg.sources.map((src) => {
    const tempName = src.name ?? src.webUrl;
    const cached = cache.get(tempName);
    return {
      name: cached?.name ?? tempName,
      fetchedAt: cached?.fetchedAt ?? null,
      apiUrl: cached?.apiUrl ?? parseWebUrl(src.webUrl),
    };
  });
}

export function clearCache(name?: string): void {
  if (name) {
    // Clear all entries matching this name
    for (const [key, val] of cache.entries()) {
      if (val.name.toLowerCase() === name.toLowerCase() || key === name) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}
