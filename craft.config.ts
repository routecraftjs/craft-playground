import { defineConfig } from "@routecraft/routecraft";
import { mcpPlugin, jwt, embeddingPlugin } from "@routecraft/ai";
import { env } from "./env.js";
import { inspectorOrigins, publicMcpUrl } from "./dev-token.js";
import pkg from "./package.json" with { type: "json" };

const inspector = inspectorOrigins();
const publicUrl = publicMcpUrl(env.mcpPort);

/**
 * Playground configuration.
 *
 * One listener (`servers.default`, on env.mcpHost:env.mcpPort) carries the MCP
 * endpoint at `/mcp`, which serves every capability whose source is `mcp()`
 * (see capabilities/mcp-tools/route.ts). Every request needs a bearer JWT; the
 * matching token is minted and printed at startup by index.ts.
 *
 * Browser access is admitted per origin, not by CORS alone: `browserOrigins`
 * lets the MCP Inspector UI (locally and on the dev box's public URL) through
 * the ingress gate, and `cors` lets that same browser read the responses.
 *
 * `resource.url` names the public URL on a dev box, which also makes the
 * ingress trust that hostname. Locally it is left unset, which the `start`
 * script's `NODE_ENV=development` permits.
 */
export const craftConfig = defineConfig({
  servers: {
    default: { host: env.mcpHost, port: env.mcpPort },
  },
  plugins: [
    mcpPlugin({
      name: "routecraft-playground",
      title: "Routecraft Playground",
      version: pkg.version,
      description: "Sample MCP tools you can call from any MCP client.",
      transport: "http",
      ...(publicUrl ? { resource: { url: publicUrl } } : {}),
      browserOrigins: inspector,
      cors: { origin: inspector },
      auth: jwt({
        secret: env.jwtSecret,
        issuer: env.jwtIssuer,
        audience: env.jwtAudience,
      }),
    }),
    // `huggingface` runs an in-process model (transformers.js, no API key);
    // `mock` is a deterministic zero-download stub used by tests.
    embeddingPlugin({ providers: { huggingface: {}, mock: {} } }),
  ],
});
