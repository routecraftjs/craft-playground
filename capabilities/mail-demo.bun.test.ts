import { describe, it, expect, afterEach } from "bun:test";
import type { Mock } from "bun:test";
import { mail } from "@routecraft/routecraft";
import {
  mockAdapter,
  testContext,
  type TestContext,
} from "@routecraft/testing";
import { mailReader } from "./mail-demo.js";

function loggedMessages(t: TestContext): string[] {
  const infoSpy = t.logger.info as Mock<(...args: unknown[]) => void>;
  return infoSpy.mock.calls
    .filter((call) => call[1] === "LogAdapter output")
    .map((call) => (call[0] as { value?: string }).value)
    .filter((value): value is string => Boolean(value));
}

describe("mail demo", () => {
  let t: TestContext;

  afterEach(async () => {
    if (t) await t.stop();
  });

  /**
   * @case the reader processes a message delivered over IMAP
   * @preconditions the mail() source is mocked to yield one message
   * @expectedResult a "Received mail" summary is logged for that message
   */
  it("reads and summarises an incoming message", async () => {
    const source = mockAdapter(mail, {
      source: [
        {
          uid: 1,
          messageId: "<1@playground.local>",
          from: "robot@playground.local",
          to: "demo@localhost",
          subject: "Scheduled report",
          date: new Date(),
          body: { text: "hello from the timer" },
        },
      ],
    });

    t = await testContext().override(source).routes(mailReader).build();
    await t.test();

    expect(
      loggedMessages(t).some((message) =>
        message.startsWith(
          'Received mail from robot@playground.local: "Scheduled report"',
        ),
      ),
    ).toBe(true);
  });
});
