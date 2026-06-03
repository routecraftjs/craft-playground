import { createHmac } from "node:crypto";
import { env } from "./env.js";

/**
 * Mint a short-lived, self-signed HS256 JWT for talking to the playground's
 * MCP server. This is the same flow any IdP performs: build a header and a
 * claims set, then sign `base64url(header).base64url(payload)` with the shared
 * secret. We do it locally so the playground needs no external identity
 * provider to demonstrate authenticated MCP.
 *
 * The token carries the issuer and audience the server verifies (see
 * craft.config.ts) plus an `exp` claim, which the framework requires. We mint a
 * fresh one on every startup so it is always valid for the current session.
 */
export function mintDevToken(ttlSeconds = 60 * 60 * 24 * 7): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: "playground-dev",
    name: "Playground Developer",
    iss: env.jwtIssuer,
    aud: env.jwtAudience,
    iat: now,
    exp: now + ttlSeconds,
  };

  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signature = createHmac("sha256", env.jwtSecret)
    .update(signingInput)
    .digest("base64url");

  return `${signingInput}.${signature}`;
}

/**
 * The public URL of the MCP server, derived from the dev box's environment, or
 * undefined when running locally. Set MCP_PUBLIC_URL to override.
 */
export function publicMcpUrl(port: number): string | undefined {
  const override = process.env["MCP_PUBLIC_URL"];
  if (override) return `${override.replace(/\/+$/, "")}/mcp`;

  // CodeSandbox sets CODESANDBOX_HOST like "abc123-$PORT.csb.app".
  const codesandbox = process.env["CODESANDBOX_HOST"];
  if (codesandbox) {
    return `https://${codesandbox.replace("$PORT", String(port))}/mcp`;
  }

  // GitHub Codespaces forwards ports under a known domain.
  const codespace = process.env["CODESPACE_NAME"];
  const domain = process.env["GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"];
  if (codespace && domain) {
    return `https://${codespace}-${port}.${domain}/mcp`;
  }

  return undefined;
}

/**
 * Print a startup banner with everything you need to call the MCP server:
 * the URL (public, when running on a dev box), a ready-to-paste bearer token,
 * and the MCP Inspector command.
 */
export function printMcpBanner(): void {
  const token = mintDevToken();
  const localUrl = `http://localhost:${env.mcpPort}/mcp`;
  const publicUrl = publicMcpUrl(env.mcpPort);
  // The URL to connect from outside the box: public if we can derive it.
  const connectUrl = publicUrl ?? localUrl;
  const line = "=".repeat(72);

  const urlRows = publicUrl
    ? [` Public URL:  ${publicUrl}`, ` Local URL:   ${localUrl}`]
    : [
        ` Local URL:   ${localUrl}`,
        `              (on a dev box, set MCP_PUBLIC_URL or use the preview URL for port ${env.mcpPort})`,
      ];

  const rows = [
    "",
    line,
    " Routecraft Playground - MCP server is starting",
    line,
    ...urlRows,
    "",
    " Bearer token (valid for 7 days, regenerated each startup):",
    "",
    `   ${token}`,
    "",
    " Open it in the MCP Inspector:",
    "",
    "   npx @modelcontextprotocol/inspector",
    "",
    `   then connect to ${connectUrl} with transport "Streamable HTTP"`,
    "   and add header  Authorization: Bearer <token above>",
  ];

  if (env.usingDefaultSecret) {
    rows.push(
      "",
      " WARNING: using the built-in demo JWT secret. Set JWT_SECRET before",
      "          exposing this server to anyone you do not trust.",
    );
  }

  rows.push(line, "");

  console.log(rows.join("\n"));
}
