# internal-swagger-mcp

[![npm](https://img.shields.io/npm/v/internal-swagger-mcp)](https://www.npmjs.com/package/internal-swagger-mcp)
[![license](https://img.shields.io/npm/l/internal-swagger-mcp)](./LICENSE)

English | [简体中文](./README.zh-CN.md)

Let AI agents search and read your internal Swagger platform's API docs via MCP.

> [!NOTE]
> This server talks to the internal Swagger management platform's private share endpoint (`/flow/swagger/share?uid=...`), not a public OpenAPI URL.

Implements [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) and still serves 2025-era clients, over both stdio and stateless HTTP (no sticky sessions needed). Requires Node.js ≥ 22.

## Tools

| Tool | Purpose |
|------|---------|
| `swagger_list_sources` | List configured services and their cache status |
| `swagger_search_api` | Search APIs by keyword, optionally filtered by method / service |
| `swagger_get_api_detail` | Show an API's full parameters and mock example |
| `swagger_refresh_cache` | Force-refresh the doc cache (default TTL: 30 minutes) |

## Sources

The server holds no configuration; each client supplies a list of Swagger share links (`<SOURCE>` below), which look like `http://your-server/...#/swaggerManage?uid=xxx`.

For local (stdio) mode, put them in `swagger-sources.json` at the project root and commit it:

```json
["<SOURCE_1>", "<SOURCE_2>"]
```

The path resolves against the working directory (the project root under project-scoped configs), and the file is re-read on every tool call. Alternatively, drop `--sources-file` from the configs below and set the `SWAGGER_SOURCES` env var to the same JSON array.

For remote (HTTP) mode, sources go in the `X-Swagger-Sources` header of each request.

## Connecting MCP clients

Use **project scope** so each repo pins its own sources. Once connected, `swagger_list_sources` should list your services.

For remote mode, start the server on a shared host first (see [Security](#http-deployment-security)):

```bash
npx -y internal-swagger-mcp --http   # port 3000; override with --port or PORT
```

### Claude Code

[Docs](https://code.claude.com/docs/en/mcp) — writes to `.mcp.json`.

```bash
# Local
claude mcp add swagger --scope project -- npx -y internal-swagger-mcp --sources-file ./swagger-sources.json

# Remote
claude mcp add --transport http swagger --scope project http://<internal-IP>:3000/mcp --header 'X-Swagger-Sources: ["<SOURCE>"]'
```

### opencode

[Docs](https://opencode.ai/docs/mcp-servers) — `opencode.json`. For remote, use `"type": "remote"` with `url` and `headers`.

```json
{
  "mcp": {
    "swagger": {
      "type": "local",
      "command": ["npx", "-y", "internal-swagger-mcp", "--sources-file", "./swagger-sources.json"]
    }
  }
}
```

### Cursor and other `mcpServers` clients

[Docs](https://cursor.com/docs/context/mcp) — `.cursor/mcp.json`.

```json
{
  "mcpServers": {
    "swagger": {
      "command": "npx",
      "args": ["-y", "internal-swagger-mcp", "--sources-file", "./swagger-sources.json"]
    }
  }
}
```

Remote: replace the entry with `{ "url": "http://<internal-IP>:3000/mcp", "headers": { "X-Swagger-Sources": "[\"<SOURCE>\"]" } }`.

## HTTP deployment security

The server binds to `0.0.0.0` by default and warns at startup if none of these is set:

| Environment variable | Effect |
|------|--------|
| `MCP_BIND_HOST` | Bind address, e.g. `127.0.0.1` for local-only |
| `MCP_BEARER_TOKEN` | Require `Authorization: Bearer <token>` (add it to the client's headers) |
| `MCP_ALLOWED_ORIGINS` | Comma-separated Origin allowlist; requests without `Origin` then need a valid bearer token |

## License

[MIT](./LICENSE)
