#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListSources } from "./tools/list-sources.js";
import { registerSearchApi } from "./tools/search-api.js";
import { registerGetApiDetail } from "./tools/get-api-detail.js";
import { registerRefreshCache } from "./tools/refresh-cache.js";

const server = new McpServer({
  name: "swagger-mcp-server",
  version: "1.0.0",
});

registerListSources(server);
registerSearchApi(server);
registerGetApiDetail(server);
registerRefreshCache(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Swagger MCP Server running via stdio");
}

main().catch((err: unknown) => {
  console.error("Server error:", err);
  process.exit(1);
});
