/**
 * A tiny in-memory store backing the MCP notes tools. State lives for the life
 * of the process only, which is exactly what you want in a playground: restart
 * and you get a clean slate, with no database or file I/O to set up.
 */

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

const notes: Note[] = [];
let nextId = 1;

export function createNote(input: { title: string; body: string }): Note {
  const note: Note = {
    id: `note-${nextId++}`,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
  };
  notes.push(note);
  return note;
}

export function listNotes(): Note[] {
  // Return a copy so callers cannot mutate the backing array.
  return [...notes];
}
