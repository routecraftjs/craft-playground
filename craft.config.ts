import { defineConfig } from "@routecraft/routecraft";
import { mcpPlugin, jwt, embeddingPlugin } from "@routecraft/ai";
import { env } from "./env.js";
import pkg from "./package.json" with { type: "json" };

/**
 * Playground configuration.
 *
 * The MCP plugin runs the capabilities that use `mcp()` as a long-lived HTTP
 * server (see capabilities/mcp-tools/route.ts). It binds to env.mcpHost:env.mcpPort
 * and requires a bearer JWT on every request. The matching token is minted and
 * printed at startup by index.ts, so you never have to craft one by hand.
 */
export const craftConfig = defineConfig({
  plugins: [
    mcpPlugin({
      name: "routecraft-playground",
      title: "Routecraft Playground",
      version: pkg.version,
      description: "Sample MCP tools you can call from any MCP client.",
      transport: "http",
      host: env.mcpHost,
      port: env.mcpPort,
      // Allow any browser origin to reach the server. This is what lets
      // browser-based MCP clients (the MCP Inspector in "direct" mode, web
      // Claude) connect from a forwarded dev-box URL. It does not weaken auth:
      // every request still needs a valid bearer token (the default CORS only
      // reflected localhost origins, which blocked the Inspector UI).
      cors: { origin: "*" },
      auth: jwt({
        secret: env.jwtSecret,
        issuer: env.jwtIssuer,
        audience: env.jwtAudience,
      }),
    }),
    // Embedding providers for the semantic notes search. `huggingface` runs an
    // in-process model (transformers.js, no API key); `mock` is a deterministic
    // zero-download stub used by tests and available via EMBEDDING_MODEL.
    embeddingPlugin({ providers: { huggingface: {}, mock: {} } }),
  ],
});
