import { McpServer } from "@modelcontextprotocol/server";
import { registerListSources } from "./tools/list-sources.js";
import { registerSearchApi } from "./tools/search-api.js";
import { registerGetApiDetail } from "./tools/get-api-detail.js";
import { registerRefreshCache } from "./tools/refresh-cache.js";
import { VERSION } from "./constants.js";

export function createServer(): McpServer {
  const server = new McpServer({ name: "internal-swagger-mcp", version: VERSION });
  registerListSources(server);
  registerSearchApi(server);
  registerGetApiDetail(server);
  registerRefreshCache(server);
  return server;
}
