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

## Example Route Explained

Check out `routes/hello-world.route.ts` - it demonstrates a complete integration flow:

```typescript
import { log, craft, simple, fetch } from "@routecraft/routecraft";

export default craft()
  .id("hello-world") // Give your route a name
  .from(simple({ userId: 1 })) // Start with simple data
  .enrich(
    // Enrich with external API call
    fetch({
      method: "GET",
      url: (ex) =>
        `https://jsonplaceholder.typicode.com/users/${ex.body.userId}`,
    })
  )
  .transform((res) => JSON.parse(res.body)) // Parse the response
  .transform((user) => `Hello, ${user.name}!`) // Format the message
  .to(log()); // Log the result
```

**What's happening?**

1. 📥 **Input**: Starts with `{ userId: 1 }`
2. 🌐 **Enrich**: Fetches user data from JSONPlaceholder API
3. 🔄 **Transform**: Parses JSON response
4. ✨ **Transform**: Formats greeting message
5. 📝 **Output**: Logs "Hello, [User's Name]!"

## Try These Experiments

### Experiment 1: Change the User ID

Edit the `simple()` adapter in `hello-world.route.ts`:

```typescript
.from(simple({ userId: 3 }))  // Try different user IDs (1-10)
```

### Experiment 2: Add Multiple Users

Create a batch route (new file: `routes/batch-users.route.ts`):

```typescript
import { log, craft, simple, fetch } from "@routecraft/routecraft";

export default craft()
  .id("batch-users")
  .from(simple([{ userId: 1 }, { userId: 2 }, { userId: 3 }]))
  .enrich(
    fetch({
      method: "GET",
      url: (ex) =>
        `https://jsonplaceholder.typicode.com/users/${ex.body.userId}`,
    })
  )
  .transform((res) => JSON.parse(res.body))
  .transform((user) => ({ name: user.name, email: user.email }))
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
import { log, craft, simple, fetch, filter } from "@routecraft/routecraft";

export default craft()
  .id("filtered-users")
  .from(simple([{ userId: 1 }, { userId: 2 }, { userId: 3 }]))
  .enrich(
    fetch({
      method: "GET",
      url: (ex) =>
        `https://jsonplaceholder.typicode.com/users/${ex.body.userId}`,
    })
  )
  .transform((res) => JSON.parse(res.body))
  .filter((user) => user.id <= 2) // Only users with ID 1 or 2
  .transform((user) => `User: ${user.name}`)
  .to(log());
```

## Project Structure

```
.
├── routes/                    # Your integration routes
│   └── hello-world.route.ts  # Example route
├── adapters/                  # Custom adapters (optional)
├── plugins/                   # Custom plugins (optional)
├── craft.config.ts           # RouteCraft configuration
├── index.ts                  # Route registry
├── package.json              # Dependencies & scripts
└── tsconfig.json             # TypeScript configuration
```

## Available Scripts

- `pnpm run build` - Compile TypeScript to JavaScript
- `pnpm run start` - Run your compiled routes
- `pnpm run lint` - Check code quality with ESLint

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
