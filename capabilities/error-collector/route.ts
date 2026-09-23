import { craft, event, jsonl, type EventPayload } from "@routecraft/routecraft";
import { env } from "../../env.js";

/**
 * A capability whose SOURCE is the event bus itself. It listens for failure
 * events from every other capability and appends each one to a JSONL file, a
 * simple dead-letter log you can tail or replay later.
 *
 * Two events cover both outcomes:
 *   - `route:exchange:failed`        an exchange failed and was NOT recovered
 *   - `route:error-handler:invoked`  a route's `.error()` caught a failure
 *
 * Event names carry no route id; the route that failed is `details.routeId`,
 * which each line records as `route`.
 *
 * The `.filter()` drops this capability's own events. Without it, writing an
 * entry could emit events this same source listens for, creating a feedback
 * loop. Subscribing only to failure events (which a healthy collector never
 * emits) is the primary guard; the filter is belt and suspenders.
 */

const SELF = "error-collector";

type Failure = EventPayload<
  "route:exchange:failed" | "route:error-handler:invoked"
>;

export default craft()
  .id("error-collector")
  .from<Failure>(
    event(["route:exchange:failed", "route:error-handler:invoked"]),
  )
  .filter((ex) => ex.body.details.routeId !== SELF)
  .transform((payload) => ({
    ts: payload.ts,
    event: payload._event,
    route: payload.details.routeId,
    details: payload.details,
  }))
  .to(
    jsonl({
      path: env.errorLogPath,
      append: true,
      createDirs: true,
    }),
  );
