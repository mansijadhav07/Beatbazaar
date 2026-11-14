#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";

const root = process.cwd();
const historyEnabled = !process.argv.includes("--worktree-only");
const rules = [
  {
    name: "Razorpay credential",
    expression: /\brzp_(?:test|live)_[A-Za-z0-9]{8,}\b/g,
  },
  {
    name: "AWS access key",
    expression: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  },
  {
    name: "GitHub token",
    expression: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g,
  },
  {
    name: "Private key",
    expression: /-----BEGIN(?: [A-Z0-9]+)* PRIVATE KEY-----/g,
  },
  {
    name: "Credential assignment",
    expression:
      /\b(?:api[_-]?key|secret|password|token)\b\s*[:=]\s*(?:"([^"]{24,})"|'([^']{24,})'|([A-Za-z0-9/+_=-]{24,})(?=[\s;]|$))/gi,
  },
];
const findings = new Set();

function isPlaceholder(value) {
  return /your|example|placeholder|replace|change[-_ ]?me|redacted|dummy/i.test(
    value
  );
}

function inspectLine(file, lineNumber, line) {
  for (const rule of rules) {
    rule.expression.lastIndex = 0;
    for (const match of line.matchAll(rule.expression)) {
      const value = match[1] || match[2] || match[3] || match[0];
      if (
        rule.name === "Credential assignment" &&
        /(^|[_-])test([_-]|$)/i.test(value)
      ) {
        continue;
      }
      if (!isPlaceholder(value)) {
        findings.add(`${file}:${lineNumber}: ${rule.name}`);
      }
    }
  }
}

function gitOutput(args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error("Git could not enumerate repository files.");
  }
  return result.stdout;
}

async function scanWorktree() {
  const files = gitOutput([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
  ])
    .split("\0")
    .filter(Boolean);

  for (const file of files) {
    const absolutePath = path.join(root, file);
    const contents = await readFile(absolutePath);
    if (contents.includes(0)) continue;
    const text = contents.toString("utf8");
    text.split(/\r?\n/).forEach((line, index) => {
      inspectLine(file, index + 1, line);
    });
  }
}

async function scanHistory() {
  const process = spawn("git", ["log", "--all", "--format=", "--patch"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let currentFile = "Git history";
  let lineNumber = 0;
  const stderrChunks = [];
  process.stderr.on("data", (chunk) => stderrChunks.push(chunk));

  for await (const line of createInterface({ input: process.stdout })) {
    if (line.startsWith("+++ b/")) {
      currentFile = line.slice(6);
      lineNumber = 0;
      continue;
    }
    if (line.startsWith("--- a/")) {
      currentFile = line.slice(6);
      lineNumber = 0;
      continue;
    }
    if (line.startsWith("+++ ")) continue;
    if (line.startsWith("+") || line.startsWith("-")) {
      lineNumber += 1;
      inspectLine(currentFile, lineNumber, line.slice(1));
    }
  }

  const [exitCode] = await once(process, "close");
  if (exitCode !== 0) {
    throw new Error(
      `Git history scan failed with exit code ${exitCode}: ${Buffer.concat(
        stderrChunks
      )
        .toString("utf8")
        .trim()}`
    );
  }
}

await scanWorktree();
if (historyEnabled) await scanHistory();

if (findings.size > 0) {
  console.error("Potential credentials found. Values are intentionally redacted:");
  for (const finding of [...findings].sort()) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log(
    historyEnabled
      ? "No recognized credentials found in repository files or Git history."
      : "No recognized credentials found in repository files."
  );
}
