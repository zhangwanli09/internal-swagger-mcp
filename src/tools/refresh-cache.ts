import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { clearCache, loadAllSources, loadSourceByName } from "../services/swagger-client.js";

const RefreshInputSchema = z.object({
  source: z
    .string()
    .optional()
    .describe("服务名，不填则刷新全部服务的缓存"),
}).strict();

type RefreshInput = z.infer<typeof RefreshInputSchema>;

export function registerRefreshCache(server: McpServer): void {
  server.registerTool(
    "swagger_refresh_cache",
    {
      title: "Refresh Swagger Cache",
      description: `强制重新拉取 Swagger 文档数据并更新缓存。

当文档内容更新后（新增/修改接口），用此工具刷新缓存以获取最新数据。

参数说明:
- source (可选): 服务名，不填则刷新全部服务

返回: 刷新结果，包括成功/失败状态和接口数量变化。`,
      inputSchema: RefreshInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: RefreshInput) => {
      try {
        if (params.source) {
          clearCache(params.source);
          const src = await loadSourceByName(params.source, true);
          if (!src) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error: 未找到服务 "${params.source}"，请用 swagger_list_sources 查看可用服务名。`,
                },
              ],
              isError: true,
            };
          }
          const total = src.data.modules.reduce(
            (sum, m) => sum + (m.interfaceInfos?.length ?? 0),
            0
          );
          return {
            content: [
              {
                type: "text" as const,
                text: `✓ 已刷新 "${src.name}" 的缓存\n- 接口总数: ${total}\n- 刷新时间: ${src.fetchedAt.toLocaleString("zh-CN")}`,
              },
            ],
          };
        } else {
          clearCache();
          const sources = await loadAllSources(true);
          const lines: string[] = ["✓ 已刷新全部服务缓存\n"];
          for (const src of sources) {
            const total = src.data.modules.reduce(
              (sum, m) => sum + (m.interfaceInfos?.length ?? 0),
              0
            );
            lines.push(`- **${src.name}**: ${total} 个接口`);
          }
          return {
            content: [{ type: "text" as const, text: lines.join("\n") }],
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
