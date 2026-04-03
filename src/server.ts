#!/usr/bin/env node
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerListSources } from "./tools/list-sources.js";
import { registerSearchApi } from "./tools/search-api.js";
import { registerGetApiDetail } from "./tools/get-api-detail.js";
import { registerRefreshCache } from "./tools/refresh-cache.js";

const PORT = Number(process.env.PORT ?? 3000);

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const server = new McpServer({ name: "swagger-mcp-server", version: "1.0.0" });
  registerListSources(server);
  registerSearchApi(server);
  registerGetApiDetail(server);
  registerRefreshCache(server);

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.error(`Swagger MCP Server (HTTP) listening on http://0.0.0.0:${PORT}/mcp`);
  console.error(`Health check: http://0.0.0.0:${PORT}/health`);
});
