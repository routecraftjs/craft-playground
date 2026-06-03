import { mintDevToken } from "../dev-token.js";

// Print just the bearer token, for when the server is already running and you
// have scrolled past the startup banner. Run with `bun run token`.
console.log(mintDevToken());
