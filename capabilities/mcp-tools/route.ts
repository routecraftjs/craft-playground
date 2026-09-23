import { craft, noop, log, only } from "@routecraft/routecraft";
import { mcp, embedding, type EmbeddingResult } from "@routecraft/ai";
import { z } from "zod";
import { env } from "../../env.js";
import { createNote, listNotes, searchNotes } from "./notes-store.js";

/**
 * MCP tools exposed over the HTTP transport (configured in craft.config.ts).
 *
 * A capability becomes an MCP tool the moment its source is `mcp()`:
 *   - the tool NAME is the route `.id()`
 *   - the tool TITLE and DESCRIPTION come from `.title()` / `.description()`
 *   - the tool INPUT SCHEMA comes from `.input()` (validated before any of your
 *     code runs, so the body inside `.transform()` is already typed and safe)
 *
 * Whatever the final `.transform()` returns becomes the tool's result: for an
 * mcp() source the value is sent back to the caller over the protocol, so the
 * closing `.to(noop())` is just a conventional end of pipeline. The
 * `.tap(log())` after each transform logs the result server-side, which is
 * handy when watching tool calls in the terminal (and is what the tests assert
 * against).
 *
 * The notes tools show off semantic search: `notes_create` embeds each note
 * with an in-process model (`enrich(embedding(...), only(...))`), and
 * `notes_search` embeds the query and ranks notes by cosine similarity. No API
 * key required.
 */

/**
 * `.enrich()` replaces the body with what it fetches, so this merges the vector
 * in under `embedding` and keeps the tool input beside it.
 */
const keepEmbedding = only((r: EmbeddingResult) => r.embedding, "embedding");

const GreetInput = z.object({
  user: z
    .string()
    .trim()
    .min(1, { message: "User is required." })
    .describe("The name of the person to greet."),
});
type GreetInput = z.infer<typeof GreetInput>;

export const greet = craft()
  .id("greet")
  .title("Greet")
  .description("Greet a person by name. A minimal, side-effect-free tool.")
  .input({ body: GreetInput })
  .from<GreetInput>(mcp())
  .transform((payload) => ({ message: `Hello, ${payload.user}!` }))
  .tap(log())
  .to(noop());

const CreateNoteInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required." })
    .describe("Short title for the note."),
  body: z
    .string()
    .trim()
    .min(1, { message: "Body is required." })
    .describe("The note contents."),
});
type CreateNoteInput = z.infer<typeof CreateNoteInput>;

export const notesCreate = craft()
  .id("notes_create")
  .title("Create note")
  .description("Create a note and keep it in memory until the server restarts.")
  .input({ body: CreateNoteInput })
  .from<CreateNoteInput>(mcp())
  .enrich(
    embedding(env.embeddingModel, {
      using: (ex) => `${ex.body.title}\n${ex.body.body}`,
    }),
    keepEmbedding,
  )
  .transform((payload) =>
    createNote({
      title: payload.title,
      body: payload.body,
      embedding: payload.embedding,
    }),
  )
  .tap(log())
  .to(noop());

const ListNotesInput = z.object({});
type ListNotesInput = z.infer<typeof ListNotesInput>;

export const notesList = craft()
  .id("notes_list")
  .title("List notes")
  .description("List every note created since the server started.")
  .input({ body: ListNotesInput })
  .from<ListNotesInput>(mcp())
  .transform(() => ({ notes: listNotes() }))
  .tap(log())
  .to(noop());

const SearchNotesInput = z.object({
  query: z
    .string()
    .trim()
    .min(1, { message: "Query is required." })
    .describe("Natural-language search query."),
  topK: z
    .number()
    .int()
    .positive()
    .max(20)
    .default(3)
    .describe("How many results to return. Default 3."),
});
type SearchNotesInput = z.infer<typeof SearchNotesInput>;

export const notesSearch = craft()
  .id("notes_search")
  .title("Search notes")
  .description("Find notes by meaning using semantic (vector) similarity.")
  .input({ body: SearchNotesInput })
  .from<SearchNotesInput>(mcp())
  .enrich(
    embedding(env.embeddingModel, {
      using: (ex) => ex.body.query,
    }),
    keepEmbedding,
  )
  .transform((payload) => ({
    results: searchNotes(payload.embedding, payload.topK),
  }))
  .tap(log())
  .to(noop());

export default [greet, notesCreate, notesList, notesSearch];
