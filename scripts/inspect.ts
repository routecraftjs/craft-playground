import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { env } from "../env.js";
import { publicBaseUrl, publicMcpUrl } from "../dev-token.js";

// Launch the MCP Inspector UI pre-pointed at this playground's MCP server.
//
// The Inspector only lets us pre-fill the server URL and transport via the UI
// URL's query params; the connection type (Direct vs Proxy) and the bearer
// header are set in the UI. So we print a ready URL with the server URL filled
// in, plus the two manual steps, then start the Inspector.

const UI_PORT = 6274;

// A fresh token gates the Inspector UI/proxy (it is the only guard on
// CodeSandbox, where every port gets a public URL).
const proxyToken = randomBytes(24).toString("hex");

// In Direct mode the browser connects to this URL, so prefer the public one.
const serverUrl =
  publicMcpUrl(env.mcpPort) ?? `http://localhost:${env.mcpPort}/mcp`;
const uiBase = publicBaseUrl(UI_PORT) ?? `http://localhost:${UI_PORT}`;
const uiUrl = `${uiBase}/?MCP_PROXY_AUTH_TOKEN=${proxyToken}&transport=streamable-http&serverUrl=${serverUrl}`;

const line = "=".repeat(72);
console.log(
  [
    "",
    line,
    " MCP Inspector (server URL + transport pre-filled)",
    line,
    " Open:",
    "",
    `   ${uiUrl}`,
    "",
    " Then set the two things the Inspector cannot pre-fill:",
    "   1. Connection Type -> Direct  (not Via Proxy)",
    "   2. Authentication  -> Authorization: Bearer <run `bun run token`>",
    line,
    "",
  ].join("\n"),
);

const child = spawn("bunx", ["@modelcontextprotocol/inspector"], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOST: "0.0.0.0",
    MCP_AUTO_OPEN_ENABLED: "false",
    MCP_PROXY_AUTH_TOKEN: proxyToken,
  },
});
child.on("exit", (code) => process.exit(code ?? 0));
