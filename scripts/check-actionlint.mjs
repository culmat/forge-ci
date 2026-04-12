#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const result = spawnSync("actionlint", ["-version"], { stdio: "ignore" });

if (result.status === 0) {
  process.exit(0);
}

const installMessageByPlatform = {
  darwin: "brew install actionlint",
  linux: "see https://github.com/rhysd/actionlint#installation",
  win32: "choco install actionlint or scoop install actionlint",
};

const installMessage =
  installMessageByPlatform[process.platform] ??
  "see https://github.com/rhysd/actionlint#installation";

console.error(`actionlint missing. to install it run: ${installMessage}`);
process.exit(1);
