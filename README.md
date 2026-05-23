<div align="center">

  <img src="https://raw.githubusercontent.com/routecraftjs/routecraft/main/routecraft-sticker.svg" alt="Routecraft" width="300" />

  <p><strong>Give AI access, not control</strong></p>

[![License](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/routecraftjs/craft-playground/pulls)

</div>

# RouteCraft Playground 🚀

Welcome to the **RouteCraft Playground**! This is a ready-to-run RouteCraft project where you can experiment with building integration capabilities directly in your browser, no installation required.

> **Runtime:** RouteCraft 0.5.0 ships a Bun-only `craft` CLI and uses `bun test` as the test runner. This playground targets [Bun](https://bun.sh) >= 1.1.0.

## What is RouteCraft?

RouteCraft is a TypeScript-first integration framework inspired by Apache Camel. It provides a fluent DSL for building data integration pipelines with:

- 🔌 **Adapters** - Connect to external systems (HTTP, databases, message queues, etc.)
- 🔄 **Operations** - Transform, filter, enrich, and route data
- 📦 **Type Safety** - Full TypeScript support with intelligent type inference
- 🎯 **Declarative Capabilities** - Express complex integrations as readable code

## Getting Started in CodeSandbox

### 1. Install Dependencies

CodeSandbox should automatically install dependencies. If not, click the **Install** button or run:

```bash
bun install
```

### 2. Run Your Capabilities

Execute your capabilities with the `craft` CLI:

```bash
bun run start
```

You should see output in the terminal showing your capability execution!

### 3. Run Tests

Test your capabilities to ensure they work correctly:

```bash
bun test
```

Or run tests in watch mode during development:

```bash
bun test --watch
```

## Example Capability Explained

Check out `capabilities/hello-world.ts` - it demonstrates a complete integration flow:

```typescript
import { log, craft, simple, http } from "@routecraft/routecraft";

export default craft()
  .id("hello-world") // Give your capability a name
  .from(simple({ userId: 1 })) // Start with simple data
  .enrich(
    // Enrich with an external API call (typed input -> output)
    http<{ userId: number }, { name: string }>({
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

Edit the `simple()` adapter in `hello-world.ts`:

```typescript
.from(simple({ userId: 3 }))  // Try different user IDs (1-10)
```

### Experiment 2: Add Multiple Users

Create a batch capability (new file: `capabilities/batch-users.ts`):

```typescript
import { log, craft, simple, http } from "@routecraft/routecraft";

export default craft()
  .id("batch-users")
  .from(simple([{ userId: 1 }, { userId: 2 }, { userId: 3 }]))
  .enrich(
    http<{ userId: number }, { name: string; email: string }>({
      method: "GET",
      url: (ex) =>
        `https://jsonplaceholder.typicode.com/users/${ex.body.userId}`,
    }),
  )
  .transform((result) => ({
    name: result.body.name,
    email: result.body.email,
  }))
  .to(log());
```

Don't forget to export it in `index.ts`:

```typescript
import helloWorld from "./capabilities/hello-world.js";
import batchUsers from "./capabilities/batch-users.js";

export default [helloWorld, batchUsers];
```

### Experiment 3: Filter Data

Add filtering to only show certain users:

```typescript
import { log, craft, simple, http } from "@routecraft/routecraft";

export default craft()
  .id("filtered-users")
  .from(simple([{ userId: 1 }, { userId: 2 }, { userId: 3 }]))
  .enrich(
    http<{ userId: number }, { id: number; name: string }>({
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
├── capabilities/                   # Your integration capabilities
│   ├── hello-world.ts              # Example capability
│   └── hello-world.bun.test.ts     # Example capability tests (bun:test)
├── adapters/                       # Custom adapters (optional)
├── plugins/                        # Custom plugins (optional)
├── craft.config.ts                 # RouteCraft configuration (defineConfig)
├── index.ts                        # RouteCraft main entry
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript configuration
└── .prettierrc                     # Formatting configuration
```

## Available Scripts

- `bun run start` - Run your capabilities with the `craft` CLI
- `bun test` - Run tests with `bun:test`
- `bun test --watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with coverage report
- `bun run lint` - Check code quality with ESLint
- `bun run format` - Check code formatting with Prettier
- `bun run format:write` - Auto-fix code formatting
- `bun run typecheck` - Type-check without emitting files

## Key Concepts

### Adapters

Adapters connect your capabilities to external systems:

- **`simple(data)`** - Start with static data
- **`http(options)`** - Make HTTP requests
- **`timer(options)`** - Trigger on a schedule
- **`cron(options)`** - Trigger on a cron expression
- **`direct()`** - Receive data from other capabilities

### Operations

Operations transform and control data flow:

- **`transform(fn)`** - Modify the message body
- **`filter(predicate)`** - Skip messages that don't match
- **`enrich(adapter)`** - Add data from external sources
- **`choice()`** - Route based on conditions
- **`split(fn)`** - Break one message into many
- **`aggregate(options)`** - Combine many messages into one
- **`error(handler)`** - Recover from failures (route-level or step-level)

### Type Safety

RouteCraft infers types as you build your capability:

```typescript
craft()
  .from(simple({ count: 1 })) // Body type: { count: number }
  .transform((ex) => ex.body.count * 2) // Body type: number
  .transform((n) => `Count: ${n}`) // Body type: string
  .to(log());
```

### Route-level metadata and validation

In 0.5.0, discovery metadata and schema validation live on the route builder, so any source adapter inherits them:

```typescript
import { craft, direct, log } from "@routecraft/routecraft";
import { z } from "zod";

const Input = z.object({ userId: z.number() });

export default craft()
  .id("greet")
  .title("Greet user")
  .description("Look up a user by id and return a greeting")
  .input({ body: Input }) // framework-enforced before the pipeline runs
  .from(direct())
  .to(log());
```

## Testing Your Capabilities

RouteCraft capabilities are tested with `bun:test` and the `@routecraft/testing` package. Check out `capabilities/hello-world.bun.test.ts` for a complete example.

### Writing Tests

To test a capability:

1. **Import the capability** and build a test context with `testContext()`
2. **Mock external dependencies** (like HTTP calls)
3. **Run the capability** with `t.test()`
4. **Verify the behavior** with assertions against `t.logger`

```typescript
import { describe, test, expect, mock, afterEach } from "bun:test";
import { testContext, type TestContext } from "@routecraft/testing";
import capability from "./my-capability.js";

describe("My Capability", () => {
  let t: TestContext;

  afterEach(async () => {
    if (t) await t.stop();
  });

  test("processes data correctly", async () => {
    t = await testContext().routes(capability).build();
    await t.test();

    expect(t.logger.info).toHaveBeenCalled();
  });
});
```

### Running Tests

```bash
# Run all tests once
bun test

# Watch mode for development
bun test --watch

# Generate coverage report
bun run test:coverage
```

## Learn More

- 📚 **Documentation**: [routecraft.dev](https://routecraft.dev)
- 🧭 **Migration guide**: [0.4.x to 0.5.0](https://routecraft.dev/docs/migrating/0.4-to-0.5)
- 🐙 **GitHub**: [github.com/routecraftjs/routecraft](https://github.com/routecraftjs/routecraft)
- 💬 **Issues**: [Report bugs or request features](https://github.com/routecraftjs/routecraft/issues)

## What's Next?

Ready to use RouteCraft in a real project? Scaffold one with Bun:

```bash
bun create routecraft@latest my-app
cd my-app
bun install
bun run start
```

## License

Apache-2.0

---

**Happy routing!** 🎉 Edit the code, run it, and see what you can build with RouteCraft!
