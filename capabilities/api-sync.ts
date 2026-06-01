import { craft, simple, http, log, noop } from "@routecraft/routecraft";
import { z } from "zod";

/**
 * Resilient API sync: read a batch of records and POST each one to an HTTP API,
 * one record at a time, without letting a single bad record sink the batch.
 *
 * Resilience here comes from a route-level `.error()` boundary. When a step
 * throws (an invalid record, or a failed HTTP call) the handler catches it,
 * turns it into a dead-letter result, and the batch keeps going. The failure is
 * also emitted as an event, which the error-collector capability records to a
 * JSONL file.
 *
 * Note: Routecraft 0.5.0 ships `.error()` as the resilience primitive;
 * `.retry()` / `.timeout()` wrappers are on the roadmap. When they land this is
 * where a `.retry()` around the HTTP call would go.
 */

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string(),
});
type Contact = z.infer<typeof ContactSchema>;

export default craft()
  .id("api-sync")
  // Route-level error boundary: recover a failed record into a dead-letter
  // result so the rest of the batch still syncs. Returning a value ends this
  // exchange cleanly (it does not continue to the HTTP step).
  .error((err, ex) => ({
    status: "dead-letter" as const,
    reason: err instanceof Error ? err.message : String(err),
    record: ex.body,
  }))
  .from(
    simple<Contact[]>([
      { name: "Ada Lovelace", email: "ada@example.com" },
      { name: "Alan Turing", email: "alan@example.com" },
      { name: "Grace Hopper", email: "grace@example.com" },
      { name: "Broken Record", email: "not-an-email" }, // poison: no "@"
    ]),
  )
  .split()
  .schema(ContactSchema)
  .transform((contact) => {
    // A cheap validation that throws for the poison record.
    if (!contact.email.includes("@")) {
      throw new Error(`invalid email for ${contact.name}: ${contact.email}`);
    }
    return contact;
  })
  .enrich(
    http<Contact, { id: number }>({
      method: "POST",
      url: "https://jsonplaceholder.typicode.com/users",
      body: (ex: { body: Contact }) => ex.body,
      throwOnHttpError: true,
    }),
  )
  // enrich(http) merges the HttpResult into the body, so the parsed response
  // lives at `.body` (the original contact fields are still alongside it).
  .transform((synced) => ({
    status: "synced" as const,
    name: synced.name,
    id: synced.body.id,
  }))
  .tap(log(({ body }) => `Synced ${body.name} as user ${body.id}`))
  .to(noop());
