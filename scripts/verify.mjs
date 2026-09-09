#!/usr/bin/env node
// Builds the application, serves it on a free port, asserts that the routes
// below respond as expected, and shuts the server down cleanly.
//
// Later phases extend ASSERTIONS (application spec §54.1) with the blog and
// learn routes, 404 behaviour, draft gating, the sitemap and the RSS feed.
//
// Never run `next start` in the foreground from an agent session; use this.

import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";

/** @type {{ path: string; status: number; description: string }[]} */
const ASSERTIONS = [{ path: "/", status: 200, description: "homepage" }];

const SKIP_BUILD = process.env.VERIFY_SKIP_BUILD === "true";
const STARTUP_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 250;

async function findFreePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Could not determine a free port");
  }
  const { port } = address;
  server.close();
  await once(server, "close");
  return port;
}

function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }
    try {
      await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  throw new Error(`Server did not start within ${STARTUP_TIMEOUT_MS}ms`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
  await once(child, "exit").catch(() => {});
  clearTimeout(timer);
}

async function main() {
  if (SKIP_BUILD) {
    console.log("verify: VERIFY_SKIP_BUILD=true, reusing the existing build\n");
  } else {
    console.log("verify: building\n");
    await run("node_modules/.bin/next", ["build"]);
  }

  const port = await findFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`\nverify: starting the production server on ${baseUrl}\n`);

  const server = spawn("node_modules/.bin/next", ["start", "--port", String(port)], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(port) },
  });

  /** @type {string[]} */
  const failures = [];
  try {
    await waitForServer(baseUrl, server);

    for (const { path, status, description } of ASSERTIONS) {
      const response = await fetch(`${baseUrl}${path}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(15_000),
      });
      const ok = response.status === status;
      console.log(
        `${ok ? "PASS" : "FAIL"}  ${path}  ${response.status} (expected ${status})  ${description}`,
      );
      if (!ok) {
        failures.push(`${path}: expected ${status}, received ${response.status}`);
      }
    }
  } finally {
    await stopServer(server);
  }

  if (failures.length > 0) {
    console.error(`\nverify: ${failures.length} assertion(s) failed`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
    return;
  }

  console.log(`\nverify: ${ASSERTIONS.length} assertion(s) passed`);
}

main().catch((error) => {
  console.error(`\nverify: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
