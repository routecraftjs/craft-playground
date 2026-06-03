/**
 * Playground environment configuration.
 *
 * Everything here has a safe development default so the playground runs with
 * zero setup. Override any value with a real environment variable (or a .env
 * file) before deploying anywhere that is actually reachable.
 *
 * See .env.example for the full list.
 */

/**
 * Default HMAC secret used to sign and verify the demo JWT. It is intentionally
 * public so the playground works out of the box. NEVER reuse this in a real
 * deployment: set JWT_SECRET to a long random value instead.
 */
const DEV_DEFAULT_SECRET = "routecraft-playground-dev-secret-change-me";

export const env = {
  /** Shared HMAC secret for the MCP JWT auth (HS256). */
  jwtSecret: process.env["JWT_SECRET"] ?? DEV_DEFAULT_SECRET,
  /** Expected `iss` claim. Must match the token the server hands you. */
  jwtIssuer: process.env["JWT_ISSUER"] ?? "https://playground.routecraft.dev",
  /** Expected `aud` claim. Must match the token the server hands you. */
  jwtAudience: process.env["JWT_AUDIENCE"] ?? "https://mcp.routecraft.dev",

  /**
   * Port the MCP HTTP server binds to. CodeSandbox and most dev boxes expose a
   * preview URL for whatever port you bind, so PORT is honoured before the
   * default.
   */
  mcpPort: Number(process.env["PORT"] ?? 3001),
  /**
   * Host to bind to. Defaults to 0.0.0.0 so the dev box can expose the server
   * publicly. Bind to 127.0.0.1 if you only want local access.
   */
  mcpHost: process.env["MCP_HOST"] ?? "0.0.0.0",

  /**
   * Embedding model used by the semantic notes search, as "provider:model".
   * Defaults to an in-process HuggingFace model (transformers.js, no API key).
   * The model downloads on first use and is cached under node_modules.
   * Set EMBEDDING_MODEL="mock:fast" for a zero-download deterministic stub.
   */
  embeddingModel:
    process.env["EMBEDDING_MODEL"] ?? "huggingface:all-MiniLM-L6-v2",

  /** Where the error-collector writes failure events as JSONL. */
  errorLogPath: process.env["ERROR_LOG_PATH"] ?? "errors.jsonl",

  /** True when no JWT_SECRET was supplied, so we can warn loudly at startup. */
  usingDefaultSecret: !process.env["JWT_SECRET"],
} as const;
