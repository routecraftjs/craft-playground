import { describe, it, expect, afterEach } from "bun:test";
import type { Mock } from "bun:test";
import { http } from "@routecraft/routecraft";
import {
  mockAdapter,
  testContext,
  type TestContext,
} from "@routecraft/testing";
import route from "./api-sync.js";

describe("api-sync", () => {
  let t: TestContext;

  afterEach(async () => {
    if (t) await t.stop();
  });

  /**
   * @case three valid contacts sync; one invalid contact is dead-lettered
   * @preconditions http is mocked to succeed; the invalid record throws on validation
   * @expectedResult http is called three times, the bad record triggers .error() once
   */
  it("syncs valid records and dead-letters the bad one", async () => {
    const httpMock = mockAdapter(http, {
      send: async () => ({
        status: 201,
        headers: { "content-type": "application/json" },
        body: { id: 11 },
        url: "https://jsonplaceholder.typicode.com/users",
      }),
    });

    let recovered = 0;
    t = await testContext()
      .on("route:api-sync:error-handler:invoked", () => {
        recovered += 1;
      })
      .override(httpMock)
      .routes(route)
      .build();
    await t.test();

    // Only the three valid contacts reach the HTTP step.
    expect(httpMock.calls.send).toHaveLength(3);
    // The poison record is caught by the route-level .error() boundary.
    expect(recovered).toBe(1);

    const infoSpy = t.logger.info as Mock<(...args: unknown[]) => void>;
    const synced = infoSpy.mock.calls
      .filter((call) => call[1] === "LogAdapter output")
      .map((call) => (call[0] as { value?: string }).value)
      .filter((value): value is string => Boolean(value?.startsWith("Synced")));
    expect(synced).toHaveLength(3);
  });
});
