import { craft, event, jsonl } from "@routecraft/routecraft";
import { env } from "../lib/env.js";

/**
 * A capability whose SOURCE is the event bus itself. It listens for failure
 * events from every other capability and appends each one to a JSONL file, a
 * simple dead-letter log you can tail or replay later.
 *
 * Two event shapes cover both outcomes:
 *   - `route:*:exchange:failed`        an exchange failed and was NOT recovered
 *   - `route:*:error-handler:invoked`  a route's `.error()` caught a failure
 *
 * The `.filter()` drops this capability's own events. Without it, writing an
 * entry could emit events this same source listens for, creating a feedback
 * loop. Subscribing only to failure events (which a healthy collector never
 * emits) is the primary guard; the filter is belt and suspenders.
 */

const SELF_PREFIX = "route:error-collector:";

export default craft()
  .id("error-collector")
  .from(event(["route:*:exchange:failed", "route:*:error-handler:invoked"]))
  .filter((ex) => !ex.body._event.startsWith(SELF_PREFIX))
  .transform((payload) => ({
    ts: payload.ts,
    event: payload._event,
    details: payload.details,
  }))
  .to(
    jsonl({
      path: env.errorLogPath,
      mode: "append",
      createDirs: true,
    }),
  );
