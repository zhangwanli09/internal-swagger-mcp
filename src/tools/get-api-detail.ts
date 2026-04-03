import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadAllSources, loadSourceByName } from "../services/swagger-client.js";
import type { InterfaceInfo, Param } from "../types.js";

const GetDetailInputSchema = z.object({
  source: z
    .string()
    .describe("服务名，来自 swagger_list_sources 或 swagger_search_api 结果"),
  method: z
    .enum(["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"])
    .describe("HTTP 方法"),
  path: z
    .string()
    .describe("接口完整路径，如 /qmAuthorityCenter/systemFun/initPerformanceSolution"),
}).strict();

type GetDetailInput = z.infer<typeof GetDetailInputSchema>;

function formatParams(params: Param[], label: string): string[] {
  if (!params || params.length === 0) return [];
  const lines: string[] = [`**${label}参数**:`, ""];
  lines.push("| 参数名 | 类型 | 必填 | 描述 | 示例 |");
  lines.push("|--------|------|------|------|------|");
  for (const p of params) {
    const required = p.required ? "是" : "否";
    const type = p.paramType ?? "-";
    const desc = (p.description ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
    const example = (p.example ?? p.defaultValue ?? "").replace(/\|/g, "\\|");
    lines.push(`| ${p.paramName} | ${type} | ${required} | ${desc} | ${example} |`);
  }
  lines.push("");
  return lines;
}

export function registerGetApiDetail(server: McpServer): void {
  server.registerTool(
    "swagger_get_api_detail",
    {
      title: "Get Swagger API Detail",
      description: `获取单个 API 接口的完整详情，包括所有参数定义和响应示例。

参数说明:
- source (必填): 服务名，来自 swagger_list_sources 或 swagger_search_api 返回的 [服务名]
- method (必填): HTTP 方法，如 "GET"、"POST"
- path (必填): 接口完整路径，如 "/qmAuthorityCenter/systemFun/initPerformanceSolution"

返回内容:
- 接口基本信息（名称、描述、状态、Content-Type）
- Query/Path/Header/Form/Body 各类参数的完整定义（参数名、类型、是否必填、描述）
- Mock 响应示例
- 请求 Body 示例`,
      inputSchema: GetDetailInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params: GetDetailInput) => {
      try {
        let sources;
        const single = await loadSourceByName(params.source, false);
        if (single) {
          sources = [single];
        } else {
          sources = await loadAllSources(false);
        }

        let found: InterfaceInfo | undefined;
        let foundSourceName = "";
        let foundModuleName = "";

        outer: for (const src of sources) {
          for (const mod of src.data.modules) {
            for (const iface of mod.interfaceInfos ?? []) {
              if (
                iface.httpMethodName.toUpperCase() === params.method.toUpperCase() &&
                iface.fullPath === params.path
              ) {
                found = iface;
                foundSourceName = src.name;
                foundModuleName = mod.moduleName;
                break outer;
              }
            }
          }
        }

        if (!found) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error: 未找到接口 ${params.method} ${params.path}（服务: ${params.source}）。\n\n提示：请用 swagger_search_api 先搜索接口，确认正确的路径和方法。`,
              },
            ],
          };
        }

        const iface = found;
        const pm = iface.inParamModelData;

        const lines: string[] = [
          `# ${iface.interfaceName}`,
          "",
          `**服务**: ${foundSourceName}`,
          `**模块**: ${foundModuleName}`,
          `**方法**: ${iface.httpMethodName}`,
          `**路径**: \`${iface.fullPath}\``,
          `**状态**: ${iface.interfaceStatusName}`,
        ];

        if (iface.interfaceContentType) {
          lines.push(`**Content-Type**: ${iface.interfaceContentType}`);
        }
        if (iface.description) {
          lines.push(`**描述**: ${iface.description}`);
        }
        lines.push("");

        // Parameters
        if (pm) {
          lines.push(...formatParams(pm.queryParam, "Query "));
          lines.push(...formatParams(pm.pathParam, "Path "));
          lines.push(...formatParams(pm.headerParam, "Header "));
          lines.push(...formatParams(pm.formParam, "Form "));
          lines.push(...formatParams(pm.bodyParam, "Body "));
        }

        // Request body demo
        if (iface.bodyRequestDemo && iface.bodyRequestDemo.trim() && iface.bodyRequestDemo !== "null") {
          lines.push("**请求体示例**:");
          lines.push("```json");
          try {
            lines.push(JSON.stringify(JSON.parse(iface.bodyRequestDemo), null, 2));
          } catch {
            lines.push(iface.bodyRequestDemo);
          }
          lines.push("```");
          lines.push("");
        }

        // Mock response
        if (iface.mockReturnResultExample && iface.mockReturnResultExample.length > 0) {
          lines.push("**Mock 响应示例**:");
          lines.push("```json");
          lines.push(JSON.stringify(iface.mockReturnResultExample, null, 2));
          lines.push("```");
          lines.push("");
        }

        const text = lines.join("\n");
        return {
          content: [{ type: "text" as const, text }],
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
