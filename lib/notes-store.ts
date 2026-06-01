/**
 * A tiny in-memory store backing the MCP notes tools. State lives for the life
 * of the process only, which is exactly what you want in a playground: restart
 * and you get a clean slate, with no database or file I/O to set up.
 *
 * Each note carries an embedding (a vector produced from its text) so the
 * notes_search tool can rank notes by semantic similarity to a query.
 */

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface ScoredNote extends Note {
  /** Cosine similarity to the search query, in [-1, 1]. Higher is closer. */
  score: number;
}

interface StoredNote extends Note {
  embedding: number[];
}

const notes: StoredNote[] = [];
let nextId = 1;

/** Strip the embedding vector so tool results stay small and readable. */
function toPublic(note: StoredNote): Note {
  return {
    id: note.id,
    title: note.title,
    body: note.body,
    createdAt: note.createdAt,
  };
}

/** Cosine similarity between two equal-length vectors. */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  return denominator === 0 ? 0 : dot / denominator;
}

export function createNote(input: {
  title: string;
  body: string;
  embedding: number[];
}): Note {
  const note: StoredNote = {
    id: `note-${nextId++}`,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    embedding: input.embedding,
  };
  notes.push(note);
  return toPublic(note);
}

export function listNotes(): Note[] {
  return notes.map(toPublic);
}

/** Rank every note by similarity to the query embedding, best first. */
export function searchNotes(
  queryEmbedding: number[],
  topK: number,
): ScoredNote[] {
  return notes
    .map((note) => ({
      ...toPublic(note),
      score: cosineSimilarity(queryEmbedding, note.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
