# internal-swagger-mcp

[![npm](https://img.shields.io/npm/v/internal-swagger-mcp)](https://www.npmjs.com/package/internal-swagger-mcp)
[![license](https://img.shields.io/npm/l/internal-swagger-mcp)](./LICENSE)

[English](./README.md) | 简体中文

通过 MCP 让 AI 智能体检索和查阅内部 Swagger 平台的接口文档。

> [!NOTE]
> 本服务对接的是内部 Swagger 管理平台的私有分享接口（`/flow/swagger/share?uid=...`），而不是公开的 OpenAPI 地址。

实现 [MCP 2026-07-28](https://modelcontextprotocol.io/specification/2026-07-28) 规范，同时兼容 2025 年各版本的客户端；支持 stdio 和无状态 HTTP（无需会话保持）。需要 Node.js ≥ 22。

## 工具

| 工具 | 用途 |
|------|------|
| `swagger_list_sources` | 列出已配置的服务及其缓存状态 |
| `swagger_search_api` | 按关键词搜索接口，可按请求方法 / 服务筛选 |
| `swagger_get_api_detail` | 查看接口的完整参数和 Mock 示例 |
| `swagger_refresh_cache` | 强制刷新文档缓存（默认缓存 30 分钟） |

## 文档来源

服务本身不保存任何配置，由各客户端提供 Swagger 分享链接列表（下文记作 `<SOURCE>`），格式形如 `http://your-server/...#/swaggerManage?uid=xxx`。

本地（stdio）模式下，把链接写进项目根目录的 `swagger-sources.json` 并提交到仓库：

```json
["<SOURCE_1>", "<SOURCE_2>"]
```

路径相对于工作目录解析（项目级配置下即项目根目录），每次调用工具都会重新读取该文件。也可以去掉下文配置中的 `--sources-file`，改为把同样的 JSON 数组设置到环境变量 `SWAGGER_SOURCES`。

远程（HTTP）模式下，来源通过每个请求的 `X-Swagger-Sources` 请求头传入。

## 接入 MCP 客户端

请使用**项目级**配置，让每个仓库固定自己的文档来源。接入后，`swagger_list_sources` 能列出你的服务即表示成功。

远程模式需先在共享主机上启动服务（另见[安全配置](#http-部署安全)）：

```bash
npx -y internal-swagger-mcp --http   # 默认端口 3000，可用 --port 或 PORT 覆盖
```

### Claude Code

[文档](https://code.claude.com/docs/en/mcp) — 写入 `.mcp.json`。

```bash
# 本地
claude mcp add swagger --scope project -- npx -y internal-swagger-mcp --sources-file ./swagger-sources.json

# 远程
claude mcp add --transport http swagger --scope project http://<内网IP>:3000/mcp --header 'X-Swagger-Sources: ["<SOURCE>"]'
```

### opencode

[文档](https://opencode.ai/docs/mcp-servers) — `opencode.json`。远程模式改用 `"type": "remote"`，并配置 `url` 和 `headers`。

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

### Cursor 及其他 `mcpServers` 格式的客户端

[文档](https://cursor.com/docs/context/mcp) — `.cursor/mcp.json`。

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

远程模式：把该条目替换为 `{ "url": "http://<内网IP>:3000/mcp", "headers": { "X-Swagger-Sources": "[\"<SOURCE>\"]" } }`。

## HTTP 部署安全

服务默认绑定 `0.0.0.0`，若以下变量均未设置，启动时会输出警告：

| 环境变量 | 作用 |
|------|------|
| `MCP_BIND_HOST` | 绑定地址，如设为 `127.0.0.1` 则仅允许本机访问 |
| `MCP_BEARER_TOKEN` | 要求请求携带 `Authorization: Bearer <token>`（需同时加到客户端的 headers 中） |
| `MCP_ALLOWED_ORIGINS` | 逗号分隔的 Origin 白名单；启用后，不带 `Origin` 的请求必须携带有效的 Bearer token |

## 许可证

[MIT](./LICENSE)
