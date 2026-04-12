#!/usr/bin/env node

import { appendFileSync } from "node:fs";
import { execSync } from "node:child_process";

const forgeCli = process.env.FORGE_CLI ?? "@forge/cli@12";
const buildTag = process.env.BUILD_TAG;
const envName = process.env.DEPLOY_ENV;
const site = process.env.DEPLOY_SITE;
const buildAction = process.env.BUILD_ACTION ?? "unknown";
const buildMatchCount = process.env.BUILD_MATCH_COUNT ?? "0";
const outputPath = process.env.GITHUB_OUTPUT;

if (!buildTag) {
  throw new Error("BUILD_TAG environment variable is required.");
}

if (!envName) {
  throw new Error("DEPLOY_ENV environment variable is required.");
}

if (!site) {
  throw new Error("DEPLOY_SITE environment variable is required.");
}

if (!outputPath) {
  throw new Error("GITHUB_OUTPUT environment variable is required.");
}

console.log("Deploying Forge app");
console.log(`Environment: ${envName}`);
console.log(`Site: ${site}`);
console.log(`Commit: ${process.env.GITHUB_SHA ?? "unknown"}`);
console.log(`Build tag: ${buildTag}`);
console.log(`Build action: ${buildAction}`);
console.log(`Build check match count: ${buildMatchCount}`);

const command = `npx ${forgeCli} deploy -t "${buildTag}" --non-interactive -e "${envName}"`;
let deployOutput;
try {
  deployOutput = execSync(command, { encoding: "utf8" });
} catch (error) {
  if (error.stdout) {
    console.log(error.stdout.toString());
  }
  if (error.stderr) {
    console.error(error.stderr.toString());
  }
  throw error;
}
console.log(deployOutput);

const versionMatch = deployOutput.match(/\[(\d+\.\d+\.\d+)/);
const version = versionMatch ? versionMatch[1] : "";

appendFileSync(outputPath, `env=${envName}\n`);
appendFileSync(outputPath, `site=${site}\n`);
appendFileSync(outputPath, `version=${version}\n`);
