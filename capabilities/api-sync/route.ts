import { craft, simple, http, log, noop, only } from "@routecraft/routecraft";
import type { HttpResult } from "@routecraft/routecraft";
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
 * `.error()` is one of several resilience wrappers; `.retry()` and `.timeout()`
 * ship beside it and scope over the steps below them.
 *
 * The item schema enforces each record's structure; the transform adds a
 * business rule (a real email) on top. Throwing there is what exercises the
 * `.error()` boundary, so the bad record is dead-lettered rather than rejected
 * at the schema. The two layers are deliberate, not redundant.
 */

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string(),
});
type Contact = z.infer<typeof ContactSchema>;

export default craft()
  .id("api-sync")
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
    if (!contact.email.includes("@")) {
      throw new Error(`invalid email for ${contact.name}: ${contact.email}`);
    }
    return contact;
  })
  .enrich(
    http<Contact, { id: number }>({
      method: "POST",
      url: "https://jsonplaceholder.typicode.com/users",
      body: (ex) => ex.body,
      throwOnHttpError: true,
    }),
    only((result: HttpResult<{ id: number }>) => result.body, "created"),
  )
  .transform((synced) => ({
    status: "synced" as const,
    name: synced.name,
    id: synced.created.id,
  }))
  .tap(log(({ body }) => `Synced ${body.name} as user ${body.id}`))
  .to(noop());
