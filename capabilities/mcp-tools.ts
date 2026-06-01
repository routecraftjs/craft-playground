import { craft, noop, log } from "@routecraft/routecraft";
import { mcp, embedding } from "@routecraft/ai";
import { z } from "zod";
import { env } from "../lib/env.js";
import { createNote, listNotes, searchNotes } from "../lib/notes-store.js";

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
 * with an in-process model (`enrich(embedding(...))`), and `notes_search`
 * embeds the query and ranks notes by cosine similarity. No API key required.
 */

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
  .description("Create a note and store it in memory for this session.")
  .input({ body: CreateNoteInput })
  .from<CreateNoteInput>(mcp())
  // Embed the note's text so it can be found later by meaning, not keywords.
  // `enrich` merges the result ({ embedding }) into the body.
  .enrich(
    embedding(env.embeddingModel, {
      using: (ex) => `${ex.body.title}\n${ex.body.body}`,
    }),
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
  .description("List every note created in this session.")
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
    .optional()
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
  )
  .transform((payload) => ({
    results: searchNotes(payload.embedding, payload.topK ?? 3),
  }))
  .tap(log())
  .to(noop());

export default [greet, notesCreate, notesList, notesSearch];
