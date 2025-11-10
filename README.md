# RouteCraft Playground 🚀

Welcome to the **RouteCraft Playground**! This is a ready-to-run RouteCraft project where you can experiment with building integration routes directly in your browser—no installation required.

## What is RouteCraft?

RouteCraft is a TypeScript-first integration framework inspired by Apache Camel. It provides a fluent DSL for building data integration pipelines with:

- 🔌 **Adapters** - Connect to external systems (HTTP, databases, message queues, etc.)
- 🔄 **Operations** - Transform, filter, enrich, and route data
- 📦 **Type Safety** - Full TypeScript support with intelligent type inference
- 🎯 **Declarative Routes** - Express complex integrations as readable code

## Getting Started in CodeSandbox

### 1. Install Dependencies

CodeSandbox should automatically install dependencies. If not, click the **Install** button or run:

```bash
pnpm install
```

### 2. Build the Project

Compile TypeScript to JavaScript:

```bash
pnpm run build
```

### 3. Run Your Routes

Execute the compiled routes:

```bash
pnpm run start
```

You should see output in the CodeSandbox terminal showing your route execution!

### 4. Run Tests

Test your routes to ensure they work correctly:

```bash
pnpm run test
```

Or run tests in watch mode during development:

```bash
pnpm run test:watch
```

## Example Route Explained

Check out `routes/hello-world.route.ts` - it demonstrates a complete integration flow:

```typescript
import {
  log,
  craft,
  simple,
  fetch,
  type FetchResult,
} from "@routecraft/routecraft";

export default craft()
  .id("hello-world") // Give your route a name
  .from(simple({ userId: 1 })) // Start with simple data
  .enrich<
    FetchResult<{ id: number; name: string; username: string; email: string }>
  >(
    // Enrich with external API call
    fetch({
      method: "GET",
      url: (ex) =>
        `https://jsonplaceholder.typicode.com/users/${ex.body.userId}`,
    }),
  )
  .transform((result) => `Hello, ${result.body.name}!`) // Format the message
  .to(log()); // Log the result
```

**What's happening?**

1. 📥 **Input**: Starts with `{ userId: 1 }`
2. 🌐 **Enrich**: Fetches user data from JSONPlaceholder API (with type safety)
3. ✨ **Transform**: Formats greeting message using the enriched data
4. 📝 **Output**: Logs "Hello, [User's Name]!"

## Try These Experiments

### Experiment 1: Change the User ID

Edit the `simple()` adapter in `hello-world.route.ts`:

```typescript
.from(simple({ userId: 3 }))  // Try different user IDs (1-10)
```

### Experiment 2: Add Multiple Users

Create a batch route (new file: `routes/batch-users.route.ts`):

```typescript
import {
  log,
  craft,
  simple,
  fetch,
  type FetchResult,
} from "@routecraft/routecraft";

export default craft()
  .id("batch-users")
  .from(simple([{ userId: 1 }, { userId: 2 }, { userId: 3 }]))
  .enrich<
    FetchResult<{ id: number; name: string; username: string; email: string }>
  >(
    fetch({
      method: "GET",
      url: (ex) =>
        `https://jsonplaceholder.typicode.com/users/${ex.body.userId}`,
    }),
  )
  .transform((result) => ({ name: result.body.name, email: result.body.email }))
  .to(log());
```

Don't forget to export it in `index.ts`:

```typescript
import batchUsersRoute from "./routes/batch-users.route.js";

export default [helloWorldRoute, batchUsersRoute];
```

### Experiment 3: Filter Data

Add filtering to only show certain users:

```typescript
import {
  log,
  craft,
  simple,
  fetch,
  type FetchResult,
} from "@routecraft/routecraft";

export default craft()
  .id("filtered-users")
  .from(simple([{ userId: 1 }, { userId: 2 }, { userId: 3 }]))
  .enrich<
    FetchResult<{ id: number; name: string; username: string; email: string }>
  >(
    fetch({
      method: "GET",
      url: (ex) =>
        `https://jsonplaceholder.typicode.com/users/${ex.body.userId}`,
    }),
  )
  .filter((result) => result.body.id <= 2) // Only users with ID 1 or 2
  .transform((result) => `User: ${result.body.name}`)
  .to(log());
```

## Project Structure

```
.
├── routes/                         # Your integration routes
│   ├── hello-world.route.ts       # Example route
│   └── hello-world.route.test.ts  # Example route tests
├── adapters/                       # Custom adapters (optional)
├── plugins/                        # Custom plugins (optional)
├── craft.config.ts                # RouteCraft configuration
├── index.ts                       # Route registry
├── vitest.config.ts               # Test configuration
├── package.json                   # Dependencies & scripts
└── tsconfig.json                  # TypeScript configuration
```

## Available Scripts

- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm run start` - Run your compiled routes
- `pnpm run test` - Run tests with Vitest
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:coverage` - Run tests with coverage report
- `pnpm run lint` - Check code quality with ESLint
- `pnpm run format` - Check code formatting with Prettier
- `pnpm run format:write` - Auto-fix code formatting
- `pnpm run typecheck` - Type-check without emitting files

## Key Concepts

### Adapters

Adapters connect your routes to external systems:

- **`simple(data)`** - Start with static data
- **`fetch(options)`** - Make HTTP requests
- **`timer(options)`** - Trigger on a schedule
- **`direct()`** - Receive data from other routes

### Operations

Operations transform and control data flow:

- **`transform(fn)`** - Modify the message body
- **`filter(predicate)`** - Skip messages that don't match
- **`enrich(adapter)`** - Add data from external sources
- **`choice()`** - Route based on conditions
- **`split(fn)`** - Break one message into many
- **`aggregate(options)`** - Combine many messages into one

### Type Safety

RouteCraft infers types as you build your route:

```typescript
craft()
  .from(simple({ count: 1 })) // Body type: { count: number }
  .transform((ex) => ex.body.count * 2) // Body type: number
  .transform((n) => `Count: ${n}`) // Body type: string
  .to(log());
```

## Testing Your Routes

RouteCraft routes can be tested using Vitest. Check out `routes/hello-world.route.test.ts` for an example.

### Writing Tests

To test a route:

1. **Import the route** and create a test context
2. **Mock external dependencies** (like HTTP calls)
3. **Execute the route** using the context
4. **Verify the behavior** with assertions

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { context } from "@routecraft/routecraft";
import myRoute from "./my-route.js";

describe("My Route", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock fetch to prevent real API calls
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
  });

  it("should process data correctly", async () => {
    // Mock the response
    const mockResponse = new Response(JSON.stringify({ data: "test" }));
    fetchMock.mockResolvedValueOnce(mockResponse);

    // Execute the route
    const testContext = context().routes(myRoute).build();
    const execution = testContext.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await testContext.stop();
    await execution;

    // Verify behavior
    expect(fetchMock).toHaveBeenCalled();
  });
});
```

### Running Tests

```bash
# Run all tests once
pnpm run test

# Watch mode for development
pnpm run test:watch

# Generate coverage report
pnpm run test:coverage
```

## Learn More

- 📚 **Documentation**: [routecraft.dev](https://routecraft.dev)
- 🐙 **GitHub**: [github.com/routecraftjs/routecraft](https://github.com/routecraftjs/routecraft)
- 💬 **Issues**: [Report bugs or request features](https://github.com/routecraftjs/routecraft/issues)

## What's Next?

Ready to use RouteCraft in a real project? Install it locally:

```bash
pnpm create routecraft@latest my-app
cd my-app
pnpm install
pnpm run build
pnpm run start
```

## License

Apache-2.0

---

**Happy routing!** 🎉 Edit the code, run it, and see what you can build with RouteCraft!
