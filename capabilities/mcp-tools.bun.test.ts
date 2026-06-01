import { describe, it, expect, afterEach } from "bun:test";
import type { Mock } from "bun:test";
import { mcp } from "@routecraft/ai";
import {
  mockAdapter,
  testContext,
  type TestContext,
} from "@routecraft/testing";
import { greet, notesCreate, notesList } from "./mcp-tools.js";

/**
 * Read the bodies that the route's `tap(log())` recorded. The spy logger
 * stamps every log adapter call with the message "LogAdapter output" and
 * passes the exchange as the first argument, so this returns the result of
 * each tool invocation.
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
   * @preconditions both tools share the in-memory store; mcp() sources are mocked
   * @expectedResult the created note has a generated id and appears in the list
   */
  it("notes_create stores a note that notes_list returns", async () => {
    const createSource = mockAdapter(mcp, {
      source: [{ title: "First note", body: "Hello from the playground" }],
    });

    t = await testContext().override(createSource).routes(notesCreate).build();
    await t.test();

    const created = loggedBodies<{ id: string; title: string }>(t)[0];
    expect(created.title).toBe("First note");
    expect(created.id).toMatch(/^note-/);
    await t.stop();

    const listSource = mockAdapter(mcp, { source: [{}] });
    t = await testContext().override(listSource).routes(notesList).build();
    await t.test();

    const listed = loggedBodies<{ notes: { title: string }[] }>(t)[0];
    expect(listed.notes.some((note) => note.title === "First note")).toBe(true);
  });
});
