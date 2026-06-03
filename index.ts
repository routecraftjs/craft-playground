export { craftConfig } from "./craft.config.js";
import helloWorld from "./capabilities/hello-world/route.js";
import mcpTools from "./capabilities/mcp-tools/route.js";
import apiSync from "./capabilities/api-sync/route.js";
import errorCollector from "./capabilities/error-collector/route.js";
import { printMcpBanner } from "./dev-token.js";

// Print the MCP server URL, a ready-to-use bearer token, and the Inspector
// command before the engine starts. Runs once on `bun run start`; tests import
// the capabilities directly, so they never trigger this banner.
printMcpBanner();

// Every capability registered with the engine. The mcp() tools are served over
// HTTP and the error-collector listens to the event bus; the rest fire once at
// startup to show their output in the terminal.
export default [helloWorld, ...mcpTools, apiSync, errorCollector];
