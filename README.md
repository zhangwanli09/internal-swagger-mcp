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

A relative `--sources-file` path resolves against the MCP server process's working directory. The relative paths below assume the client starts the server from the project root. Use an absolute path if your client starts it elsewhere. The server re-reads the file on every tool call. You can also omit `--sources-file` and set `SWAGGER_SOURCES` in the server process's environment to the same JSON array.

For remote (HTTP) mode, send the JSON array in the `X-Swagger-Sources` header on every `POST /mcp`, including legacy clients' `initialize` requests.

## Connecting MCP clients

Use **project scope** so each repo pins its own sources. Once connected, `swagger_list_sources` should list your services.

For remote mode, start the server on a shared host first (see [Security](#http-deployment-security)):

```bash
npx -y internal-swagger-mcp --http   # port 3000; override with --port or PORT
```

### Claude Code

`--scope project` writes to `.mcp.json`. Replace `<internal-IP>` and `<SOURCE>` with your server address and Swagger share link. See the [Claude Code docs](https://code.claude.com/docs/en/mcp).

```bash
# Local
claude mcp add swagger --scope project -- npx -y internal-swagger-mcp --sources-file ./swagger-sources.json

# Remote
claude mcp add --transport http swagger --scope project "http://<internal-IP>:3000/mcp" --header 'X-Swagger-Sources: ["<SOURCE>"]'
```

### OpenCode

In `opencode.json`, OpenCode v2 uses `mcp.servers.swagger` as shown below. For v1, put `swagger` directly under `mcp`. For remote mode, replace the local entry with `"type": "remote"`, `url`, and `headers`. See the [OpenCode docs](https://opencode.ai/docs/mcp-servers).

```json
{
  "mcp": {
    "servers": {
      "swagger": {
        "type": "local",
        "command": ["npx", "-y", "internal-swagger-mcp", "--sources-file", "./swagger-sources.json"]
      }
    }
  }
}
```

### Cursor and other `mcpServers` clients

In Cursor, put this in `.cursor/mcp.json`. For other clients using `mcpServers`, use an absolute path if they lack Cursor's `${workspaceFolder}` variable. See the [Cursor docs](https://cursor.com/docs/mcp).

```json
{
  "mcpServers": {
    "swagger": {
      "command": "npx",
      "args": ["-y", "internal-swagger-mcp", "--sources-file", "${workspaceFolder}/swagger-sources.json"]
    }
  }
}
```

Remote: replace the entry with `{ "url": "http://<internal-IP>:3000/mcp", "headers": { "X-Swagger-Sources": "[\"<SOURCE>\"]" } }`.

## HTTP deployment security

The server binds to `0.0.0.0` by default. It warns at startup when it binds to `0.0.0.0` and both the bearer token and Origin allowlist are empty.

| Environment variable | Effect |
|------|--------|
| `MCP_BIND_HOST` | Bind address, e.g. `127.0.0.1` for local-only |
| `MCP_BEARER_TOKEN` | Require `Authorization: Bearer <token>` on all `/mcp` requests (add it to the client's headers) |
| `MCP_ALLOWED_ORIGINS` | Comma-separated Origin allowlist for `/mcp`. With the allowlist enabled, clients that omit `Origin` must authenticate with a configured bearer token. If you set both variables, every client needs the token. |

## License

[MIT](./LICENSE)
