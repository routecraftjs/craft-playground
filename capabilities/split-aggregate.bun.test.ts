import { describe, it, expect, afterEach } from "bun:test";
import type { Mock } from "bun:test";
import { testContext, type TestContext } from "@routecraft/testing";
import routes, { type PricedItem } from "./split-aggregate.js";

interface OrderSummary {
  itemCount: number;
  orderTotal: number;
  items: PricedItem[];
}

describe("split-aggregate", () => {
  let t: TestContext;

  afterEach(async () => {
    if (t) await t.stop();
  });

  /**
   * @case an order is split into items, each priced, then aggregated into a summary
   * @preconditions the route ends in log(); the spy logger records the summary body
   * @expectedResult all four items come back priced, with the bulk item discounted
   */
  it("prices every item and aggregates an order summary", async () => {
    t = await testContext().routes(routes).build();
    await t.test();

    const infoSpy = t.logger.info as Mock<(...args: unknown[]) => void>;
    const summary = infoSpy.mock.calls
      .filter((call) => call[1] === "LogAdapter output")
      .map((call) => (call[0] as { body?: unknown }).body)
      .find(
        (body): body is OrderSummary =>
          typeof body === "object" && body !== null && "orderTotal" in body,
      );

    expect(summary).toBeDefined();
    expect(summary?.itemCount).toBe(4);
    // GADGET-B has quantity 15 (>= 10), so it gets the bulk discount.
    const gadget = summary?.items.find((item) => item.sku === "GADGET-B");
    expect(gadget?.discounted).toBe(true);
    expect(summary?.orderTotal).toBeGreaterThan(0);
  });
});
