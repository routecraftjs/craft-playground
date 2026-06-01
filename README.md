<div align="center">

  <img src="https://raw.githubusercontent.com/routecraftjs/routecraft/main/routecraft.svg" alt="Routecraft" width="120" />

  <p><strong>Tools for agents. Or the agent harness itself.</strong></p>

[![License](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/routecraftjs/craft-playground/pulls)

</div>

# Routecraft Playground 🚀

A ready-to-run [Routecraft](https://routecraft.dev) project you can open in your browser, with no installation required. It ships with a small tour of real capabilities, including an authenticated MCP server you can call from any MCP client.

> **Runtime:** Routecraft 0.5.0 ships a Bun-only `craft` CLI and uses `bun test` as the test runner. This playground targets [Bun](https://bun.sh) >= 1.1.0.

## What is Routecraft?

Routecraft is a type-safe framework for AI automation. Build the tools an agent uses, or the agent itself, with the same fluent DSL. Compose capabilities from:

- 🔌 **Adapters** - Connect to external systems (HTTP, databases, MCP, mail, etc.)
- 🔄 **Operations** - Transform, filter, route, split, and aggregate data
- 📦 **Type Safety** - Full TypeScript support with intelligent type inference
- 🎯 **Declarative Capabilities** - Express automations as readable code

## Quick start

```bash
bun install
bun run start
```

`bun run start` boots the engine and runs everything in `index.ts`. You will see:

1. An **MCP server banner** with a ready-to-use bearer token and the Inspector command (more below).
2. The **demo capabilities** running once and logging their output: a priced order summary, routed support tickets, and a greeting fetched from a public API.

Then run the tests:

```bash
bun test
```

## What's in the box

Each capability lives in `capabilities/` and has its own test. Open them in order; they build on each other.

| Capability            | File                 | Shows                                                                                                               |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Hello world**       | `hello-world.ts`     | A source, an HTTP `enrich`, a `transform`, and a `log` destination.                                                 |
| **Split / aggregate** | `split-aggregate.ts` | Fan one order out into items, price each via a second capability, then aggregate the results into an order summary. |
| **Choice router**     | `choice-router.ts`   | Content-based routing: send each support ticket down a different branch based on its severity.                      |
| **MCP tools**         | `mcp-tools.ts`       | Three tools (`greet`, `notes_create`, `notes_list`) exposed over an authenticated HTTP MCP server.                  |

## The MCP server

`mcp-tools.ts` turns three capabilities into MCP tools. A capability becomes a tool the moment its source is `mcp()`: the tool name is the route `.id()`, and the `.title()`, `.description()`, and `.input()` schema are surfaced to the client and validated on every call.

The server is configured in `craft.config.ts`:

- **Transport:** streamable HTTP, bound to `0.0.0.0:3001` by default (so a cloud dev box can expose it).
- **Auth:** a JWT bearer token is required on every request (`jwt()` with HS256).

### Getting a token

There is no external identity provider to set up. The playground mints a valid, self-signed token for you and prints it in the startup banner. You can also reprint one at any time:

```bash
bun run token
```

The token is signed with `JWT_SECRET` and carries the issuer and audience the server expects (see `.env.example`). It is valid for 7 days. A fresh one is minted on every startup.

> ⚠️ With no `.env`, the playground uses a built-in demo secret so it works out of the box. **Set `JWT_SECRET` to a real random value before exposing the server to anyone you do not trust.**

### Calling it with the MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

In the Inspector UI:

1. Set **Transport Type** to `Streamable HTTP`.
2. Set **URL** to `http://localhost:3001/mcp` (or your dev box's public URL, see below).
3. Under **Authentication**, add a header `Authorization` with the value `Bearer <your-token>`.
4. Click **Connect**, then **List Tools**. You will see `greet`, `notes_create`, and `notes_list`.

### Calling it with curl

```bash
TOKEN=$(bun run --silent token)

# 1. Initialize and capture the session id from the response headers.
SID=$(curl -sD - -o /dev/null -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}' \
  | awk -F': ' 'tolower($1)=="mcp-session-id"{print $2}' | tr -d '\r')

# 2. Send the initialized notification.
curl -s -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer $TOKEN" -H "mcp-session-id: $SID" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'

# 3. Call a tool.
curl -s -X POST http://localhost:3001/mcp \
  -H "Authorization: Bearer $TOKEN" -H "mcp-session-id: $SID" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"greet","arguments":{"user":"Jaco"}}}'
```

Requests with no token, or a bad token, get a `401`.

### Exposing it from a cloud dev box

The server binds to `0.0.0.0` and reads `PORT`, so cloud dev environments can expose it automatically:

- **CodeSandbox** publishes a preview URL for port `3001` (configured in `.codesandbox/tasks.json`).
- **GitHub Codespaces / devcontainers** forward port `3001` (configured in `.devcontainer/devcontainer.json`).

Use that public `https://...` URL with `/mcp` appended in place of `http://localhost:3001/mcp`. The same bearer token applies.

## Project structure

```
.
├── capabilities/             # Your capabilities, each with a test
│   ├── hello-world.ts
│   ├── split-aggregate.ts
│   ├── choice-router.ts
│   └── mcp-tools.ts
├── lib/                      # Shared helpers
│   ├── env.ts                # Config with safe dev defaults
│   ├── dev-token.ts          # Mints + prints the demo JWT
│   └── notes-store.ts        # In-memory store for the notes tools
├── scripts/
│   └── print-token.ts        # `bun run token`
├── craft.config.ts           # Engine + MCP server configuration
├── index.ts                  # Registers every capability
└── .env.example              # Copy to .env to override defaults
```

## Available scripts

- `bun run start` - Run every capability and the MCP server
- `bun run token` - Print a fresh bearer token for the MCP server
- `bun test` - Run tests with `bun:test`
- `bun test --watch` - Run tests in watch mode
- `bun run test:coverage` - Run tests with a coverage report
- `bun run lint` - Check code quality with ESLint
- `bun run format` / `bun run format:write` - Check / fix formatting
- `bun run typecheck` - Type-check without emitting files

## Key concepts

### Adapters

Adapters connect capabilities to the outside world:

- **`simple(data)`** - Start with static data
- **`http(options)`** - Make HTTP requests (as a source, destination, or `enrich`)
- **`direct()`** - Send to / receive from other capabilities (request/reply)
- **`mcp()`** - Expose a capability as an MCP tool (or call a remote MCP server)
- **`log()` / `noop()`** - Log the body, or discard it

### Operations

Operations transform and control flow:

- **`transform(fn)`** - Replace the message body
- **`filter(predicate)`** - Drop messages that do not match
- **`enrich(adapter)`** - Merge data from an external call into the body
- **`choice(c => ...)`** - Route down a branch with `when()` / `otherwise()`
- **`split()`** - Fan an array body into one message per item
- **`aggregate()`** - Collect split messages back into one
- **`tap(adapter)`** - Fire-and-forget side effect (logging, metrics)

### Type safety

Routecraft infers types as you build a capability:

```typescript
craft()
  .from(simple({ count: 1 })) // body: { count: number }
  .transform((ex) => ex.body.count * 2) // body: number
  .transform((n) => `Count: ${n}`) // body: string
  .to(log());
```

### Capability metadata and validation

Discovery metadata and schema validation live on the capability builder, so any source adapter (including `mcp()`) inherits them:

```typescript
import { craft, direct, log } from "@routecraft/routecraft";
import { z } from "zod";

const Input = z.object({ userId: z.number() });

export default craft()
  .id("greet")
  .title("Greet user")
  .description("Look up a user by id and return a greeting")
  .input({ body: Input }) // enforced before the pipeline runs
  .from(direct())
  .to(log());
```

## Testing

Capabilities are tested with `bun:test` and the `@routecraft/testing` package. Each capability in `capabilities/` has a matching `.bun.test.ts` file. The pattern: mock the source (and any external adapters) with `mockAdapter`, build a `testContext()`, run `t.test()`, then assert against `t.logger`.

```typescript
import { describe, test, expect, afterEach } from "bun:test";
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

## Learn more

- 📚 **Documentation**: [routecraft.dev](https://routecraft.dev)
- 🔌 **Expose capabilities as MCP**: [routecraft.dev/docs/advanced/expose-as-mcp](https://routecraft.dev/docs/advanced/expose-as-mcp)
- 🔐 **Securing capabilities**: [routecraft.dev/docs/advanced/securing-capabilities](https://routecraft.dev/docs/advanced/securing-capabilities)
- 🐙 **GitHub**: [github.com/routecraftjs/routecraft](https://github.com/routecraftjs/routecraft)

## What's next?

Ready to use Routecraft in a real project? Scaffold one with Bun:

```bash
bun create routecraft@latest my-app
cd my-app
bun install
bun run start
```

## License

Apache-2.0

---

**Happy routing!** 🎉
