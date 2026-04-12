#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import { execSync } from "node:child_process";

const buildTag = process.env.BUILD_TAG;
const forgeCli = process.env.FORGE_CLI ?? "@forge/cli@12";
const outputPath = process.env.GITHUB_OUTPUT;

if (!buildTag) {
  throw new Error("BUILD_TAG environment variable is required.");
}

if (!outputPath) {
  throw new Error("GITHUB_OUTPUT environment variable is required.");
}

console.log("Checking for existing Forge build package");
console.log(`Build tag: ${buildTag}`);

const command = `npx ${forgeCli} build list --json`;
let rawOutput;
try {
  rawOutput = execSync(command, { encoding: "utf8" });
} catch (error) {
  if (error.stdout) {
    console.log(error.stdout.toString());
  }
  if (error.stderr) {
    console.error(error.stderr.toString());
  }
  throw error;
}

let parsed;
try {
  parsed = JSON.parse(rawOutput);
} catch (error) {
  console.error("Unable to parse forge build list JSON output.");
  throw error;
}

const builds = Array.isArray(parsed)
  ? parsed
  : Array.isArray(parsed.builds)
    ? parsed.builds
    : [];

const matches = builds.filter((build) => build && build.tag === buildTag);

console.log(`Forge build list returned ${builds.length} build(s).`);
console.log(`Matching builds for tag ${buildTag}: ${matches.length}`);

for (const [index, build] of matches.entries()) {
  const createdAt =
    build.createdAt ?? build.created ?? build.createdDate ?? "unknown";
  console.log(
    `Matched build ${index + 1}: tag=${build.tag}, createdAt=${createdAt}`,
  );
}

appendFileSync(outputPath, `build_exists=${matches.length > 0}\n`);
appendFileSync(outputPath, `match_count=${matches.length}\n`);
