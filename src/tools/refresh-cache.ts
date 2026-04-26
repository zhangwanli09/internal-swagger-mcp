import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  clearCache,
  loadAllSources,
  loadSourceByName,
} from "../services/swagger-client.js";

const RefreshInputSchema = z.object({
  source: z
    .string()
    .optional()
    .describe("Service name. Omit to refresh the cache for all services."),
}).strict();

type RefreshInput = z.infer<typeof RefreshInputSchema>;

const RefreshCacheOutput = z.object({
  refreshed: z.array(
    z.object({
      name: z.string(),
      totalInterfaces: z.number().int(),
      fetchedAt: z.string().datetime(),
    })
  ),
  failed: z
    .array(
      z.object({
        url: z.string(),
        apiUrl: z.string(),
        error: z.string(),
      })
    )
    .optional(),
});

type RefreshCacheOutputType = z.infer<typeof RefreshCacheOutput>;

export function registerRefreshCache(server: McpServer): void {
  server.registerTool(
    "swagger_refresh_cache",
    {
      title: "Refresh Swagger Cache",
      description: `Force-refetch Swagger documentation data and update the cache.

Use this after the documentation has been updated (interfaces added or modified) to fetch the latest data.

Parameters:
- source (optional): Service name. Omit to refresh all services.

Returns: Refresh results, including success/failure status and updated interface counts.`,
      inputSchema: RefreshInputSchema,
      outputSchema: RefreshCacheOutput,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: RefreshInput) => {
      try {
        if (params.source) {
          clearCache(params.source);
          const { source: src, failures } = await loadSourceByName(params.source);
          if (!src) {
            const hint =
              failures.length > 0
                ? `${failures.length} source(s) failed to load and the target may be among them — call swagger_list_sources for failure details.`
                : "Call swagger_list_sources to see available service names.";
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: service "${params.source}" not found. ${hint}`,
                },
              ],
              isError: true,
            };
          }
          const total = src.data.modules.reduce(
            (sum, m) => sum + (m.interfaceInfos?.length ?? 0),
            0
          );
          const structured: RefreshCacheOutputType = {
            refreshed: [
              {
                name: src.name,
                totalInterfaces: total,
                fetchedAt: src.fetchedAt.toISOString(),
              },
            ],
          };
          return {
            content: [
              {
                type: "text" as const,
                text: `✓ 已刷新 "${src.name}" 的缓存\n- 接口总数: ${total}\n- 刷新时间: ${src.fetchedAt.toLocaleString("zh-CN")}`,
              },
            ],
            structuredContent: structured,
          };
        } else {
          clearCache();
          const { sources, failures } = await loadAllSources(true);
          const structured: RefreshCacheOutputType = { refreshed: [] };
          const lines: string[] = ["✓ 已刷新全部服务缓存\n"];
          for (const src of sources) {
            const total = src.data.modules.reduce(
              (sum, m) => sum + (m.interfaceInfos?.length ?? 0),
              0
            );
            structured.refreshed.push({
              name: src.name,
              totalInterfaces: total,
              fetchedAt: src.fetchedAt.toISOString(),
            });
            lines.push(`- **${src.name}**: ${total} 个接口`);
          }
          if (failures.length > 0) {
            structured.failed = failures;
            lines.push("\n⚠️ 以下服务刷新失败:");
            for (const f of failures) {
              lines.push(`- **${f.url}**: ${f.error}`);
            }
          }
          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
            structuredContent: structured,
          };
        }
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
