import { describe, it, expect, afterEach, beforeEach } from "bun:test";
import { craft, simple, noop } from "@routecraft/routecraft";
import { testContext, type TestContext } from "@routecraft/testing";
import { env } from "../../env.js";
import collector from "./route.js";

// A route that always fails, to generate a failure event for the collector.
const failing = craft()
  .id("boom")
  .from(simple([{ x: 1 }]))
  .transform(() => {
    throw new Error("kaboom");
  })
  .to(noop());

describe("error-collector", () => {
  let t: TestContext;

  beforeEach(async () => {
    // Start from an empty log (ERROR_LOG_PATH points at a temp file in tests).
    await Bun.write(env.errorLogPath, "");
  });

  afterEach(async () => {
    if (t) await t.stop();
  });

  /**
   * @case a failing route emits an exchange:failed event
   * @preconditions the collector listens on the event bus and writes JSONL
   * @expectedResult the failure is appended to the error log as a JSON line
   */
  it("writes failures to the JSONL log", async () => {
    t = await testContext().routes([collector, failing]).build();
    await t.test({ delayBeforeDrainMs: 100 });
    await t.stop();

    const content = await Bun.file(env.errorLogPath).text();
    const lines = content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { event: string });

    expect(lines.length).toBeGreaterThan(0);
    expect(lines.some((entry) => entry.event.includes("boom"))).toBe(true);
    expect(
      lines.some((entry) => /failed|error-handler/.test(entry.event)),
    ).toBe(true);
  });
});
