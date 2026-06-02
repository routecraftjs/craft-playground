import { defineConfig } from "@routecraft/routecraft";
import { mcpPlugin, jwt, embeddingPlugin } from "@routecraft/ai";
import { env } from "./lib/env.js";
import pkg from "./package.json" with { type: "json" };

/**
 * Playground configuration.
 *
 * The MCP plugin runs the capabilities that use `mcp()` as a long-lived HTTP
 * server (see capabilities/mcp-tools.ts). It binds to env.mcpHost:env.mcpPort
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
