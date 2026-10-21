import { resolve } from "node:path";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";
import { setDefaultSourcesFile } from "./services/swagger-client.js";

export function startStdio({ sourcesFile }: { sourcesFile?: string } = {}): void {
  if (sourcesFile) {
    setDefaultSourcesFile(resolve(process.cwd(), sourcesFile));
  }

  serveStdio(createServer, { onerror: (err) => console.error("[mcp] stdio error:", err) });
  if (!sourcesFile && !process.env.SWAGGER_SOURCES?.trim()) {
    console.error(
      "Warning: no swagger sources configured. Pass --sources-file <path> or set SWAGGER_SOURCES env var. Tool calls will fail until one is provided."
    );
  }
  console.error("Internal Swagger MCP Server running via stdio");
}
