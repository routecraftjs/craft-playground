export { craftConfig } from "./craft.config.js";
import helloWorld from "./capabilities/hello-world.js";
import mcpTools from "./capabilities/mcp-tools.js";
import splitAggregate from "./capabilities/split-aggregate.js";
import ticketRouter from "./capabilities/choice-router.js";
import { printMcpBanner } from "./lib/dev-token.js";

// Print the MCP server URL, a ready-to-use bearer token, and the Inspector
// command before the engine starts. Runs once on `bun run start`; tests import
// the capabilities directly, so they never trigger this banner.
printMcpBanner();

// Every capability registered with the engine. The mcp() tools are served over
// HTTP; the rest fire once at startup to show their output in the terminal.
export default [helloWorld, ...mcpTools, ...splitAggregate, ticketRouter];
