import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadAllSources } from "../services/swagger-client.js";
import { DEFAULT_CACHE_MINUTES } from "../constants.js";

const ListSourcesOutput = z.object({
  sources: z.array(
    z.object({
      name: z.string().optional(),
      loaded: z.boolean(),
      url: z.string().optional(),
      projectPath: z.string().optional(),
      status: z.string().optional(),
      totalInterfaces: z.number().int().optional(),
      fetchedAt: z.string().datetime().optional(),
      cacheValidMinutes: z.number().int().optional(),
      modules: z.array(z.string()).optional(),
      apiUrl: z.string().optional(),
      error: z.string().optional(),
    })
  ),
});

type ListSourcesOutputType = z.infer<typeof ListSourcesOutput>;

export function registerListSources(server: McpServer): void {
  server.registerTool(
    "swagger_list_sources",
    {
      title: "List Swagger Sources",
      description: `List all configured Swagger documentation sources and their cache status.

For each service, returns:
- name: Service name (from config, or auto-read from projectName).
- fetchedAt: Last cache time (null means not yet loaded).
- totalInterfaces: Total interface count (shown when loaded).
- modules: Module list.

Use this before calling swagger_search_api to discover which services are available.`,
      inputSchema: z.object({}).strict(),
      outputSchema: ListSourcesOutput,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async () => {
      try {
        const { sources, failures } = await loadAllSources(false);

        const structured: ListSourcesOutputType = { sources: [] };
        const lines: string[] = ["# 已配置的 Swagger 文档源\n"];

        for (const src of sources) {
          const totalInterfaces = src.data.modules.reduce(
            (sum, m) => sum + (m.interfaceInfos?.length ?? 0),
            0
          );
          const moduleNames = src.data.modules.map((m) => m.moduleName);

          structured.sources.push({
            name: src.name,
            loaded: true,
            projectPath: src.data.projectInfo.projectPath,
            status: src.data.projectInfo.projectStatusName ?? undefined,
            totalInterfaces,
            fetchedAt: src.fetchedAt.toISOString(),
            cacheValidMinutes: DEFAULT_CACHE_MINUTES,
            modules: moduleNames,
          });

          lines.push(`## ${src.name}`);
          lines.push(`- **项目路径**: ${src.data.projectInfo.projectPath}`);
          lines.push(`- **状态**: ${src.data.projectInfo.projectStatusName ?? "未知"}`);
          lines.push(`- **接口总数**: ${totalInterfaces}`);
          lines.push(`- **缓存时间**: ${src.fetchedAt.toLocaleString("zh-CN")}`);
          lines.push(`- **缓存有效期**: ${DEFAULT_CACHE_MINUTES} 分钟`);
          if (moduleNames.length > 0) lines.push(`- **模块**: ${moduleNames.join("、")}`);
          lines.push("");
        }

        for (const f of failures) {
          structured.sources.push({
            loaded: false,
            url: f.url,
            apiUrl: f.apiUrl,
            error: f.error,
          });
          lines.push(`## ⚠️ 未加载: ${f.url}`);
          lines.push(`- **API URL**: ${f.apiUrl}`);
          lines.push(`- **错误**: ${f.error}`);
          lines.push("");
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
          structuredContent: structured,
        };
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
