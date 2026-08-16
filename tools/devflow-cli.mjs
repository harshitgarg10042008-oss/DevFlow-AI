#!/usr/bin/env node

const [command = "help", ...args] = process.argv.slice(2);
const baseUrl = (process.env.DEVFLOW_URL || "http://localhost:4000").replace(/\/$/, "");

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, { headers: process.env.DEVFLOW_SESSION_COOKIE ? { cookie: process.env.DEVFLOW_SESSION_COOKIE } : undefined });
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status} ${text || response.statusText}`);
  return text;
}

function usage() {
  console.log(`DevFlow CLI\n\nUsage:\n  node tools/devflow-cli.mjs health [url]\n  node tools/devflow-cli.mjs open [dashboard|controls]\n\nEnvironment:\n  DEVFLOW_URL                 Service URL (default: http://localhost:4000)\n  DEVFLOW_SESSION_COOKIE      Optional authenticated browser session cookie\n`);
}

if (command === "help" || command === "--help") {
  usage();
} else if (command === "health") {
  const target = args[0] || "/api/health";
  try {
    console.log(await request(target));
  } catch (error) {
    console.error(`DevFlow health check failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
} else if (command === "open") {
  const page = args[0] === "controls" ? "/controls" : "/";
  console.log(`${baseUrl}${page}`);
} else {
  usage();
  process.exitCode = 1;
}
