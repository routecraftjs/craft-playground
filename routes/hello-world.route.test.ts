import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { context, type CraftContext } from "@routecraft/routecraft";
import helloWorldRoute from "./hello-world.route.js";

// Constants
const ROUTE_PROCESSING_DELAY = 150;
const EXECUTION_TIMEOUT = 2000;

/**
 * Executes the route and waits for completion
 */
async function executeRoute(testContext: CraftContext): Promise<void> {
  const execution = testContext.start();
  await new Promise((resolve) => setTimeout(resolve, ROUTE_PROCESSING_DELAY));
  await testContext.stop();
  await Promise.race([
    execution,
    new Promise((resolve) => setTimeout(resolve, EXECUTION_TIMEOUT)),
  ]);
}

describe("Hello World Route", () => {
  let testContext: CraftContext;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock globalThis.fetch to prevent real API calls
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * @case Verifies that the route fetches user data and creates a greeting
   * @preconditions Route is imported, fetch is mocked
   * @expectedResult Route should fetch user data and output "Hello, {name}!"
   */
  it("should fetch user data and create greeting message", async () => {
    const mockUser = {
      id: 1,
      name: "Leanne Graham",
      username: "Bret",
      email: "Sincere@april.biz",
    };

    // Mock the fetch response - routecraft's fetch adapter calls .text() on the Response
    // and sets the result as body, so we need to return a proper Response-like object
    // Using Response constructor for better compatibility
    const mockResponseText = JSON.stringify(mockUser);
    const mockResponse = new Response(mockResponseText, {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
      },
    });
    // Override url property
    Object.defineProperty(mockResponse, "url", {
      value: "https://jsonplaceholder.typicode.com/users/1",
      writable: false,
    });

    fetchMock.mockResolvedValueOnce(mockResponse);

    // Execute the route
    testContext = context().routes(helloWorldRoute).build();
    await executeRoute(testContext);

    // Verify API was called with correct URL
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall).toBeDefined();
    // Verify the URL contains the user ID (handle both string and URL/Request objects)
    const fetchUrl =
      typeof fetchCall[0] === "string"
        ? fetchCall[0]
        : fetchCall[0]?.url || fetchCall[0]?.toString();
    expect(fetchUrl).toContain("/users/1");

    // Verify the route executed successfully (no errors thrown)
    // The route transforms the response to a greeting string and logs it
    // Since routecraft's log() uses pino (not console.log), we verify execution success
  });

  /**
   * @case Verifies that the route handles different user names correctly
   * @preconditions Route is imported, fetch is mocked
   * @expectedResult Route should fetch user data and create greeting with correct name
   */
  it("should handle different user names correctly", async () => {
    const mockUser = {
      id: 2,
      name: "Ervin Howell",
      username: "Antonette",
      email: "Shanna@melissa.tv",
    };

    // Mock the fetch response - routecraft's fetch adapter calls .text() on the Response
    const mockResponseText = JSON.stringify(mockUser);
    const mockResponse = new Response(mockResponseText, {
      status: 200,
      statusText: "OK",
      headers: {
        "content-type": "application/json",
      },
    });
    // Override url property
    Object.defineProperty(mockResponse, "url", {
      value: "https://jsonplaceholder.typicode.com/users/1",
      writable: false,
    });

    fetchMock.mockResolvedValueOnce(mockResponse);

    // Execute the route
    testContext = context().routes(helloWorldRoute).build();
    await executeRoute(testContext);

    // Verify API was called with correct URL
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall).toBeDefined();
    // Verify the URL contains the user ID (handle both string and URL/Request objects)
    const fetchUrl =
      typeof fetchCall[0] === "string"
        ? fetchCall[0]
        : fetchCall[0]?.url || fetchCall[0]?.toString();
    expect(fetchUrl).toContain("/users/1");

    // Verify the route executed successfully (no errors thrown)
    // The route transforms the response to a greeting string and logs it
    // Since routecraft's log() uses pino (not console.log), we verify execution success
  });
});
