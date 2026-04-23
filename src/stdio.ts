import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerListSources } from "./tools/list-sources.js";
import { registerSearchApi } from "./tools/search-api.js";
import { registerGetApiDetail } from "./tools/get-api-detail.js";
import { registerRefreshCache } from "./tools/refresh-cache.js";

export async function startStdio(): Promise<void> {
  const server = new McpServer({
    name: "swagger-mcp-server",
    version: "1.0.0",
  });

  registerListSources(server);
  registerSearchApi(server);
  registerGetApiDetail(server);
  registerRefreshCache(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (!process.env.SWAGGER_SOURCES?.trim()) {
    console.error(
      "Warning: SWAGGER_SOURCES env var not set. Tool calls will fail until it is provided."
    );
  }
  console.error("Swagger MCP Server running via stdio");
}
