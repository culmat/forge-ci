#!/usr/bin/env node

import { appendFileSync } from "node:fs";

const targetEnvironment = process.env.TARGET_ENVIRONMENT;
const outputPath = process.env.GITHUB_OUTPUT;

if (!targetEnvironment) {
  throw new Error("TARGET_ENVIRONMENT environment variable is required.");
}

if (!outputPath) {
  throw new Error("GITHUB_OUTPUT environment variable is required.");
}

const siteByEnvironment = {
  development: process.env.SITE_DEVELOPMENT,
  staging: process.env.SITE_STAGING,
  production: process.env.SITE_PRODUCTION,
};

const site = siteByEnvironment[targetEnvironment];
if (!site) {
  throw new Error(
    `Unsupported environment '${targetEnvironment}' or missing matching site input.`,
  );
}

console.log(`Resolved environment ${targetEnvironment} to site ${site}`);

appendFileSync(outputPath, `env=${targetEnvironment}\n`);
appendFileSync(outputPath, `site=${site}\n`);
