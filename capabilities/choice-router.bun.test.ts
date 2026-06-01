import { describe, it, expect, afterEach } from "bun:test";
import type { Mock } from "bun:test";
import { testContext, type TestContext } from "@routecraft/testing";
import route from "./choice-router.js";

describe("choice-router", () => {
  let t: TestContext;

  afterEach(async () => {
    if (t) await t.stop();
  });

  /**
   * @case three tickets of differing severity are routed to different queues
   * @preconditions the route ends in a formatted log(); the spy logger records each message
   * @expectedResult critical -> page-on-call, high -> priority, normal -> backlog
   */
  it("routes each ticket to the queue for its severity", async () => {
    t = await testContext().routes(route).build();
    await t.test();

    const infoSpy = t.logger.info as Mock<(...args: unknown[]) => void>;
    const messages = infoSpy.mock.calls
      .filter((call) => call[1] === "LogAdapter output")
      .map((call) => (call[0] as { value: string }).value);

    expect(messages).toHaveLength(3);
    expect(messages).toContain(
      "[page-on-call] T-1: Checkout is completely down",
    );
    expect(messages).toContain("[priority] T-2: Search is slow at peak hours");
    expect(messages).toContain("[backlog] T-3: Typo on the about page");
  });
});
