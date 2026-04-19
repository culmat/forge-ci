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
const maintainLatestVersion = process.env.MAINTAIN_LATEST_VERSION === "true";

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

// Optional post-deploy: update a `LATEST_VERSION` Forge environment variable
// with the version just deployed. This lets the installed app render an
// "upgrade available" hint in its UI by comparing its own runtime
// `getAppContext().appVersion` against this stored pointer.
//
// Backport guard: we only overwrite when the new version is strictly greater
// than the stored one. Deploying v8.5.0 after v9.2.0 already exists must not
// clobber the v9 pointer, otherwise admins on v8.4.0 would stop seeing the
// "upgrade to major 9" signal.
if (maintainLatestVersion && version) {
  maintainLatestVersionVar(envName, version);
}

/**
 * Parses "X.Y.Z" into a [major, minor, patch] tuple. Returns null for
 * anything that doesn't match the pattern exactly.
 */
function parseSemver(v) {
  const m = String(v)
    .trim()
    .match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/**
 * Compare two semver strings. Returns -1 if a < b, 0 if equal, 1 if a > b.
 * Returns null if either input is not parseable (callers treat as "can't
 * compare safely → don't overwrite").
 */
function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;
  for (let i = 0; i < 3; i += 1) {
    if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  }
  return 0;
}

/**
 * Read the current value of the `LATEST_VERSION` Forge variable. Returns:
 *   - the value string when found
 *   - `null` when the variable is absent
 *   - `undefined` when the CLI call failed (signal "unknown — don't overwrite")
 *
 * Uses `--json` so we never have to parse the CLI's human-formatted table.
 * Shape normalisation below accepts either `[{ key, value }]` or
 * `{ KEY: value }` layouts because the Forge CLI has historically returned
 * both for similar commands.
 */
function readStoredLatestVersion(env) {
  let raw;
  try {
    raw = execSync(`npx ${forgeCli} variables list -e "${env}" --json`, {
      encoding: "utf8",
    });
  } catch (error) {
    console.warn(
      `Failed to read current LATEST_VERSION: ${error.message}. Will skip update.`,
    );
    return undefined;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(
      `Could not parse 'variables list --json' output: ${error.message}. Will skip update.`,
    );
    return undefined;
  }

  if (Array.isArray(parsed)) {
    const entry = parsed.find(
      (e) => e && (e.key ?? e.name) === "LATEST_VERSION",
    );
    return entry?.value ?? null;
  }
  if (parsed && typeof parsed === "object") {
    return parsed.LATEST_VERSION ?? null;
  }
  return null;
}

function maintainLatestVersionVar(env, newVersion) {
  const stored = readStoredLatestVersion(env);
  let action;
  let before = stored ?? "";

  if (stored === undefined) {
    action = "skipped-read-error";
  } else if (!parseSemver(newVersion)) {
    action = "skipped-unparseable-new";
  } else if (stored === null) {
    action = "initialized";
  } else {
    const cmp = compareSemver(newVersion, stored);
    if (cmp === null) {
      // Stored value is not parseable — treat as corrupt and overwrite so the
      // var recovers on this deploy. (Intentionally different from the
      // read-error case: here we *did* read a value, it's just garbage.)
      action = "initialized-overwrite-corrupt";
    } else if (cmp <= 0) {
      action = "skipped-downgrade";
    } else {
      action = "updated";
    }
  }

  if (
    action === "initialized" ||
    action === "updated" ||
    action === "initialized-overwrite-corrupt"
  ) {
    try {
      execSync(
        `npx ${forgeCli} variables set -e "${env}" LATEST_VERSION "${newVersion}"`,
        { stdio: "inherit" },
      );
      console.log(
        `LATEST_VERSION ${action}: "${before}" -> "${newVersion}" (activates on next deploy).`,
      );
    } catch (error) {
      console.error(
        `Failed to set LATEST_VERSION: ${error.message}. Continuing.`,
      );
      action = "skipped-write-error";
    }
  } else {
    console.log(
      `LATEST_VERSION ${action}: stored "${stored ?? ""}", deployed "${newVersion}".`,
    );
  }

  appendFileSync(outputPath, `latest_version_before=${before}\n`);
  appendFileSync(outputPath, `latest_version_after=${newVersion}\n`);
  appendFileSync(outputPath, `latest_version_action=${action}\n`);
}
