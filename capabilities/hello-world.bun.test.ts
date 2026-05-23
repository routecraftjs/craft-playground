import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";
import { testContext, type TestContext } from "@routecraft/testing";
import capabilities from "./hello-world.js";

describe("Hello World Capability", () => {
  let t: TestContext;
  let fetchMock: ReturnType<typeof mock>;

  beforeEach(() => {
    // Mock globalThis.fetch to prevent real API calls
    fetchMock = mock();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  afterEach(async () => {
    if (t) {
      await t.stop();
    }
  });

  /**
   * @case Verifies that the capability fetches user data and greets the person by name
   * @preconditions Capability is imported and fetch is mocked to return a JSON Placeholder user
   * @expectedResult Capability fetches the user and logs "Hello, [name]!" via the LogAdapter
   */
  test("should fetch user and greet by name", async () => {
    const mockUser = {
      id: 1,
      name: "Leanne Graham",
      username: "Bret",
      email: "Sincere@april.biz",
    };

    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map([["content-type", "application/json"]]),
      text: async () => JSON.stringify(mockUser),
      url: "https://jsonplaceholder.typicode.com/users/1",
    });

    // Create context with imported capability and run the full lifecycle (t.logger is a spy)
    t = await testContext().routes(capabilities).build();
    await t.test();

    // Verify fetch was called with the correct URL
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://jsonplaceholder.typicode.com/users/1",
      expect.objectContaining({
        method: "GET",
      }),
    );

    // Verify the log was called (capability completed)
    expect(t.logger.info).toHaveBeenCalled();

    // Find the LogAdapter output call (pino.info(object, message)); lifecycle also logs at info
    const infoSpy = t.logger.info as ReturnType<typeof mock>;
    const logAdapterCall = infoSpy.mock.calls.find(
      (call: unknown[]) => call[1] === "LogAdapter output",
    );
    expect(logAdapterCall).toBeDefined();
    const result = logAdapterCall![0];

    // Assert the greeting message
    expect(result).toBeDefined();
    expect(result.body).toBe("Hello, Leanne Graham!");
  });
});
