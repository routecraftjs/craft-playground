// Entry point for the opt-in mail demo. Run it with `bun run mail-demo`, which
// starts a local GreenMail server first (see scripts/mail-demo.ts). Running
// `craft run mail-demo.ts` directly works too, as long as a mail server is
// listening on the host/ports in lib/env.ts.
export { craftConfig } from "./craft.config.js";
import mailDemo from "./capabilities/mail-demo.js";

export default mailDemo;
