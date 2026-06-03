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

1. An **MCP server banner** with the server URL (the public dev-box URL when one is detected), a ready-to-use bearer token, and the Inspector command (more below).
2. The **demo capabilities** running once and logging their output: a greeting fetched from a public API, and a batch of records synced to an API (with one deliberately bad record dead-lettered to `errors.jsonl`).

Then run the tests:

```bash
bun run test
```

## What's in the box

Each capability lives in `capabilities/` and has its own test.

| Capability          | File                       | Shows                                                                                                     |
| ------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Hello world**     | `hello-world/route.ts`     | A source, an HTTP `enrich`, a `transform`, and a `log` destination.                                       |
| **MCP tools**       | `mcp-tools/route.ts`       | Four tools (`greet`, `notes_create`, `notes_list`, `notes_search`) over an authenticated HTTP MCP server. |
| **API sync**        | `api-sync/route.ts`        | Resilient batch sync: POST each record to an API, dead-letter the bad ones with an `.error()` boundary.   |
| **Error collector** | `error-collector/route.ts` | A capability whose source is the event bus: it listens for failures and appends them to a JSONL log.      |

## The MCP server

`mcp-tools/route.ts` turns four capabilities into MCP tools. A capability becomes a tool the moment its source is `mcp()`: the tool name is the route `.id()`, and the `.title()`, `.description()`, and `.input()` schema are surfaced to the client and validated on every call.

The notes tools demonstrate **semantic search**. `notes_create` embeds each note with an in-process model (`enrich(embedding(...))`), and `notes_search` embeds your query and ranks notes by cosine similarity, so "household animals" finds a note about cats and dogs. The embeddings run locally via transformers.js with no API key; the model (a small MiniLM, ~25 MB) downloads on first use and is then cached. Set `EMBEDDING_MODEL=mock:fast` for a zero-download deterministic stub.

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
4. Click **Connect**, then **List Tools**. You will see `greet`, `notes_create`, `notes_list`, and `notes_search`.

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

On both, the startup banner detects the public URL (from `CODESANDBOX_HOST` or the Codespaces forwarding domain) and prints it directly, so you can copy it straight into the Inspector. Behind a custom proxy, set `MCP_PUBLIC_URL` to override. The same bearer token applies.

## Resilience and the event bus

`api-sync/route.ts` POSTs a batch of records to an API one at a time. One record is deliberately invalid. A route-level `.error()` boundary catches the failure, turns it into a dead-letter result, and lets the rest of the batch finish, so a single bad record never sinks the run.

`error-collector/route.ts` is a capability whose **source is the event bus** (`event([...])`). It subscribes to failure events from every capability and appends each one to `errors.jsonl`. Start the playground and the bad `api-sync` record shows up there as a structured line. It subscribes only to failure events (and filters out its own) to avoid a feedback loop.

> Routecraft 0.5.0 ships `.error()` as the resilience primitive; `.retry()` and `.timeout()` wrappers are on the roadmap.

## Project structure

This follows the [recommended Routecraft layout](https://routecraft.dev/docs/introduction/project-structure/): each capability is a folder with a `route.ts` public surface, a colocated test, and a short README. Helpers private to one capability live inside its folder.

```
.
├── capabilities/                 # One folder per capability
│   ├── hello-world/
│   │   ├── route.ts              # The capability
│   │   ├── route.bun.test.ts
│   │   └── README.md
│   ├── mcp-tools/                # greet, notes_create, notes_list, notes_search
│   │   ├── route.ts
│   │   ├── route.bun.test.ts
│   │   ├── notes-store.ts        # private helper: in-memory notes + cosine search
│   │   └── README.md
│   ├── api-sync/                 # resilient batch sync with .error()
│   │   └── route.ts (+ test, README)
│   └── error-collector/          # event() source -> errors.jsonl
│       └── route.ts (+ test, README)
├── env.ts                        # Shared config with safe dev defaults
├── dev-token.ts                  # Mints + prints the demo JWT and public URL
├── scripts/
│   └── print-token.ts            # `bun run token`
├── craft.config.ts               # Engine + MCP server configuration
├── index.ts                      # Registers every capability
└── .env.example                  # Copy to .env to override defaults
```

## Available scripts

- `bun run start` - Run every capability and the MCP server
- `bun run token` - Print a fresh bearer token for the MCP server
- `bun run test` - Run tests (uses the mock embedding provider, no downloads)
- `bun run test --watch` - Run tests in watch mode
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
- **`embedding(model, opts)`** - Turn text into a vector (in-process, no API key)
- **`event(filter)`** - Source that listens to the engine's own event bus
- **`jsonl(opts)` / `log()` / `noop()`** - Append JSONL, log the body, or discard it

### Operations

Operations transform and control flow:

- **`transform(fn)`** - Replace the message body
- **`filter(predicate)`** - Drop messages that do not match
- **`enrich(adapter)`** - Merge data from an external call into the body
- **`choice(c => ...)`** - Route down a branch with `when()` / `otherwise()`
- **`split()`** - Fan an array body into one message per item
- **`aggregate()`** - Collect split messages back into one
- **`tap(adapter)`** - Fire-and-forget side effect (logging, metrics)
- **`error(handler)`** - Catch a failure and recover (the resilience primitive)

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
