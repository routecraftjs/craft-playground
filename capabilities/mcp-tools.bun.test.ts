import { describe, it, expect, afterEach } from "bun:test";
import type { Mock } from "bun:test";
import { mcp, embeddingPlugin } from "@routecraft/ai";
import {
  mockAdapter,
  testContext,
  type TestContext,
} from "@routecraft/testing";
import { greet, notesCreate, notesList, notesSearch } from "./mcp-tools.js";

// The notes tools embed text. Tests run with EMBEDDING_MODEL=mock:test (set in
// the test script), a deterministic, no-download provider. Register it here.
const withMockEmbeddings = () => embeddingPlugin({ providers: { mock: {} } });

/**
 * Read the bodies that a route's `tap(log())` recorded. The spy logger stamps
 * every log adapter call with the message "LogAdapter output" and passes the
 * exchange as the first argument, so this returns each tool's result.
 */
function loggedBodies<T>(t: TestContext): T[] {
  const infoSpy = t.logger.info as Mock<(...args: unknown[]) => void>;
  return infoSpy.mock.calls
    .filter((call) => call[1] === "LogAdapter output")
    .map((call) => (call[0] as { body: T }).body);
}

describe("mcp tools", () => {
  let t: TestContext;

  afterEach(async () => {
    if (t) await t.stop();
  });

  /**
   * @case the greet tool receives an mcp payload and returns a greeting
   * @preconditions mcp() source is mocked to yield one payload
   * @expectedResult the result logged by the tool is { message: "Hello, Ada!" }
   */
  it("greet returns a greeting for the given user", async () => {
    const source = mockAdapter(mcp, { source: [{ user: "Ada" }] });

    t = await testContext().override(source).routes(greet).build();
    await t.test();

    expect(loggedBodies(t)).toContainEqual({ message: "Hello, Ada!" });
  });

  /**
   * @case notes_create stores a note, then notes_list returns it
   * @preconditions mcp() sources are mocked; mock embedding provider registered
   * @expectedResult the created note has a generated id and appears in the list
   */
  it("notes_create stores a note that notes_list returns", async () => {
    const createSource = mockAdapter(mcp, {
      source: [{ title: "Groceries", body: "Buy milk and eggs" }],
    });

    t = await testContext()
      .with({ plugins: [withMockEmbeddings()] })
      .override(createSource)
      .routes(notesCreate)
      .build();
    await t.test();

    const created = loggedBodies<{ id: string; title: string }>(t)[0];
    expect(created.title).toBe("Groceries");
    expect(created.id).toMatch(/^note-/);
    await t.stop();

    const listSource = mockAdapter(mcp, { source: [{}] });
    t = await testContext().override(listSource).routes(notesList).build();
    await t.test();

    const listed = loggedBodies<{ notes: { title: string }[] }>(t)[0];
    expect(listed.notes.some((note) => note.title === "Groceries")).toBe(true);
  });

  /**
   * @case notes_search embeds the query and returns scored notes
   * @preconditions notes are created first; mock embedding provider registered
   * @expectedResult search returns at most topK results, each with a numeric score
   */
  it("notes_search returns scored results", async () => {
    for (const note of [
      { title: "Cats", body: "Cats make wonderful pets" },
      { title: "Markets", body: "Stock prices fell today" },
    ]) {
      const src = mockAdapter(mcp, { source: [note] });
      t = await testContext()
        .with({ plugins: [withMockEmbeddings()] })
        .override(src)
        .routes(notesCreate)
        .build();
      await t.test();
      await t.stop();
    }

    const searchSource = mockAdapter(mcp, {
      source: [{ query: "household animals", topK: 1 }],
    });
    t = await testContext()
      .with({ plugins: [withMockEmbeddings()] })
      .override(searchSource)
      .routes(notesSearch)
      .build();
    await t.test();

    const result = loggedBodies<{
      results: { title: string; score: number }[];
    }>(t)[0];
    expect(result.results).toHaveLength(1);
    expect(typeof result.results[0].score).toBe("number");
  });
});
