import { networkInterfaces } from "os";
import { timingSafeEqual } from "crypto";
import express, { type NextFunction, type Request, type Response } from "express";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createServer } from "./server.js";
import { runWithSources } from "./services/source-context.js";

export async function startHttp({ port }: { port: number }): Promise<void> {
  const ALLOWED_ORIGINS = (process.env.MCP_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const BEARER_TOKEN = process.env.MCP_BEARER_TOKEN?.trim() || "";
  const BIND_HOST = process.env.MCP_BIND_HOST?.trim() || "0.0.0.0";

  const onerror = (err: Error) => console.error("[mcp] request error:", err);
  const mcpHandler = toNodeHandler(createMcpHandler(createServer, { onerror }), { onerror });

  const app = express();
  app.use(express.json());

  // Origin and bearer checks apply to every method on /mcp.
  app.use("/mcp", (req, res, next) => {
    const origin = req.header("origin");
    const hasBearer = Boolean(req.header("authorization"));
    if (ALLOWED_ORIGINS.length > 0) {
      if (origin) {
        if (!ALLOWED_ORIGINS.includes(origin)) {
          res.status(403).json({ error: `Origin "${origin}" is not allowed.` });
          return;
        }
      } else if (!BEARER_TOKEN || !hasBearer) {
        // Missing Origin is only acceptable for server-to-server calls that
        // authenticate with a Bearer token; otherwise it may be a DNS-rebinding
        // attack stripping the header.
        res.status(403).json({
          error: "Missing Origin header. When MCP_ALLOWED_ORIGINS is set, requests without Origin must include a Bearer token.",
        });
        return;
      }
    }

    if (BEARER_TOKEN) {
      const auth = req.header("authorization") ?? "";
      const expected = `Bearer ${BEARER_TOKEN}`;
      const authBuf = Buffer.from(auth);
      const expectedBuf = Buffer.from(expected);
      const ok =
        authBuf.length === expectedBuf.length &&
        timingSafeEqual(authBuf, expectedBuf);
      if (!ok) {
        res.status(401).json({ error: "Missing or invalid Authorization bearer token." });
        return;
      }
    }

    next();
  });

  app.post("/mcp", async (req, res, next) => {
    try {
    const headerVal = req.header("x-swagger-sources");
    if (!headerVal || !headerVal.trim()) {
      res.status(400).json({
        error: "Missing X-Swagger-Sources header. Provide a JSON array of swagger Web UI URLs.",
      });
      return;
    }

    let sources: string[];
    try {
      const parsed = JSON.parse(headerVal);
      if (!Array.isArray(parsed) || !parsed.every((u) => typeof u === "string")) {
        throw new Error("must be a JSON array of URL strings");
      }
      sources = parsed;
    } catch (err) {
      res.status(400).json({
        error: `Invalid X-Swagger-Sources header: ${err instanceof Error ? err.message : String(err)}`,
      });
      return;
    }

    // A fresh server instance is built per request; it serves both 2026-07-28
    // (stateless) and 2025-era (initialize handshake) clients.
    await runWithSources(sources, () => mcpHandler(req, res, req.body));
    } catch (err) {
      next(err);
    }
  });

  // Other methods carry no tool calls, so they need no sources; the SDK answers them.
  app.all("/mcp", (req, res, next) => {
    mcpHandler(req, res).catch(next);
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[mcp] unhandled error:", err);
    if (res.headersSent) {
      res.end();
      return;
    }
    res.status(500).json({
      error: `Internal server error: ${err instanceof Error ? err.message : String(err)}`,
    });
  });

  app.listen(port, BIND_HOST, () => {
    const displayHost = BIND_HOST === "0.0.0.0" ? getLocalIP() : BIND_HOST;
    console.error(`Internal Swagger MCP Server (HTTP) listening on http://${displayHost}:${port}/mcp`);
    console.error(`Health check: http://${displayHost}:${port}/health`);
    if (BIND_HOST === "0.0.0.0" && !BEARER_TOKEN && ALLOWED_ORIGINS.length === 0) {
      console.error(
        "⚠️  Bound to 0.0.0.0 without MCP_BEARER_TOKEN or MCP_ALLOWED_ORIGINS — server is open to the network."
      );
    }
  });
}

function getLocalIP(): string {
  for (const iface of Object.values(networkInterfaces())) {
    for (const net of iface ?? []) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "127.0.0.1";
}
