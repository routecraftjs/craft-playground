import { spawn } from "node:child_process";
import { connect } from "node:net";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

// Orchestrates the opt-in mail demo: download + start a local GreenMail test
// server (SMTP/IMAP), then run the mail capabilities against it. GreenMail is a
// Java tool, so this needs a JVM on PATH. The default `bun run start` does not
// require any of this; the mail demo is deliberately separate.

const GREENMAIL_VERSION = "2.1.6";
const JAR_PATH = ".greenmail/greenmail-standalone.jar";
const JAR_URL = `https://repo1.maven.org/maven2/com/icegreen/greenmail-standalone/${GREENMAIL_VERSION}/greenmail-standalone-${GREENMAIL_VERSION}.jar`;
const IMAP_PORT = Number(process.env["MAIL_IMAP_PORT"] ?? 3143);

async function ensureJar(): Promise<void> {
  if (existsSync(JAR_PATH)) return;
  mkdirSync(".greenmail", { recursive: true });
  process.stdout.write("Downloading GreenMail (one-time, ~10 MB)...\n");
  const response = await fetch(JAR_URL);
  if (!response.ok) {
    throw new Error(`GreenMail download failed: HTTP ${response.status}`);
  }
  writeFileSync(JAR_PATH, Buffer.from(await response.arrayBuffer()));
}

function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
}

async function waitForPort(port: number, attempts = 60): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    if (await isPortOpen(port)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for the mail server on port ${port}`);
}

await ensureJar();

process.stdout.write("Starting GreenMail (SMTP/IMAP on localhost)...\n");
const greenmail = spawn(
  "java",
  ["-Dgreenmail.setup.test.all", "-Dgreenmail.auth.disabled", "-jar", JAR_PATH],
  { stdio: "ignore" },
);
greenmail.on("error", (err) => {
  process.stderr.write(
    `Could not start GreenMail. A Java runtime is required for the mail demo.\n${String(err)}\n`,
  );
  process.exit(1);
});

const children = [greenmail];
let shuttingDown = false;
function shutdown(code = 0): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

await waitForPort(IMAP_PORT);
process.stdout.write(
  "GreenMail ready. Inbox web UI: http://localhost:8080\nRunning the mail demo (Ctrl+C to stop)...\n\n",
);

const craft = spawn(
  "bunx",
  ["@routecraft/cli", "--log-level", "info", "run", "mail-demo.ts"],
  { stdio: "inherit" },
);
children.push(craft);
craft.on("exit", (code) => shutdown(code ?? 0));
