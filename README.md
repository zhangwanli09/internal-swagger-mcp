# internal-swagger-mcp

Let AI agents query your internal Swagger platform's API docs via MCP.

> This server talks to the internal Swagger management platform's private share endpoint (`/flow/swagger/share?uid=...`), not a public OpenAPI URL.

## Tools

| Tool | Purpose |
|------|---------|
| `swagger_list_sources` | List all configured services and their cache status |
| `swagger_search_api` | Search APIs by keyword (filterable by method / service) |
| `swagger_get_api_detail` | View an API's full parameters and mock example |
| `swagger_refresh_cache` | Force-refresh the doc cache (default TTL is 30 minutes) |

## Connecting MCP clients

Requires Node.js ≥ 18. Swagger sources are always supplied by the client — this server holds no configuration. Pass them as a JSON array string: via the `SWAGGER_SOURCES` env var in stdio mode, or via the `X-Swagger-Sources` header in HTTP mode.

Start in HTTP mode (for deploying on a shared internal host):

```bash
npx -y internal-swagger-mcp --http   # defaults to port 3000; override with --port or PORT
```

In the snippets below, `<SOURCE>` looks like `http://your-server/...#/swaggerManage?uid=xxx`. **Project-level config is recommended** for every client (each project pins its own Swagger source and the config can be committed to git). If `swagger_list_sources` runs successfully inside the client, the integration is working.

### Claude Code

[Official docs](https://code.claude.com/docs/en/mcp) — using `--scope project` writes to the project root's `.mcp.json`.

Local (stdio):

```bash
claude mcp add swagger --scope project --env SWAGGER_SOURCES='["<SOURCE>"]' -- npx -y internal-swagger-mcp
```

Remote (HTTP):

```bash
claude mcp add --transport http swagger --scope project http://<internal-IP>:3000/mcp --header 'X-Swagger-Sources: ["<SOURCE>"]'
```

### opencode

[Official docs](https://opencode.ai/docs/mcp-servers) — place this in `opencode.json` at the project root.

Local (stdio):

```json
{
  "mcp": {
    "swagger": {
      "type": "local",
      "command": ["npx", "-y", "internal-swagger-mcp"],
      "environment": {
        "SWAGGER_SOURCES": "[\"<SOURCE>\"]"
      }
    }
  }
}
```

Remote (HTTP):

```json
{
  "mcp": {
    "swagger": {
      "type": "remote",
      "url": "http://<internal-IP>:3000/mcp",
      "headers": {
        "X-Swagger-Sources": "[\"<SOURCE>\"]"
      }
    }
  }
}
```

### Cursor

[Official docs](https://cursor.com/docs/context/mcp) — place this in `.cursor/mcp.json` at the project root.

Local (stdio):

```json
{
  "mcpServers": {
    "swagger": {
      "command": "npx",
      "args": ["-y", "internal-swagger-mcp"],
      "env": {
        "SWAGGER_SOURCES": "[\"<SOURCE>\"]"
      }
    }
  }
}
```

Remote (HTTP):

```json
{
  "mcpServers": {
    "swagger": {
      "url": "http://<internal-IP>:3000/mcp",
      "headers": {
        "X-Swagger-Sources": "[\"<SOURCE>\"]"
      }
    }
  }
}
```

## HTTP deployment security

The server binds to `0.0.0.0` by default for easy intranet sharing, and prints a warning if started bare. In production, set at least one of the following:

| Environment variable | Effect |
|------|--------|
| `MCP_BIND_HOST` | Bind address; set to `127.0.0.1` to restrict access to the local host (default `0.0.0.0`) |
| `MCP_BEARER_TOKEN` | Require an `Authorization: Bearer <token>` header on every request |
| `MCP_ALLOWED_ORIGINS` | Comma-separated Origin allowlist (DNS-rebinding protection) |

> When `MCP_ALLOWED_ORIGINS` is set, requests without an `Origin` header are rejected — except for requests carrying a valid `MCP_BEARER_TOKEN`, so server-to-server calls still work.
