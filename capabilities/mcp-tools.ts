import { craft, noop, log } from "@routecraft/routecraft";
import { mcp } from "@routecraft/ai";
import { z } from "zod";
import { createNote, listNotes } from "../lib/notes-store.js";

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
 * against). Each tool below is intentionally small; together they show a read
 * tool, a write tool, and a pure-function tool.
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
  .transform((payload) => createNote(payload))
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

export default [greet, notesCreate, notesList];
