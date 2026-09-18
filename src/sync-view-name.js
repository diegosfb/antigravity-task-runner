#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const VERSIONED_TITLE_PATTERN = /v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?/;

function formatVersionedTitle(baseTitle, version) {
  return `${baseTitle} v${version}`;
}

function syncViewMetadata(pkg) {
  const version = pkg.version;
  const views = pkg.contributes && pkg.contributes.views;
  if (!views) return pkg;

  for (const container of Object.values(views)) {
    if (!Array.isArray(container)) continue;
    for (const view of container) {
      if (!view || typeof view !== "object") continue;

      if (view.id === "antigravityView") {
        const versionedTitle = formatVersionedTitle("Task Runner", version);
        view.name = versionedTitle;
        view.contextualTitle = versionedTitle;
        continue;
      }

      if (typeof view.name === "string") {
        view.name = view.name.replace(VERSIONED_TITLE_PATTERN, `v${version}`);
      }
      if (typeof view.contextualTitle === "string") {
        view.contextualTitle = view.contextualTitle.replace(VERSIONED_TITLE_PATTERN, `v${version}`);
      }
    }
  }

  return pkg;
}

function syncPackageFile(pkgPath = path.join(__dirname, "..", "package.json")) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  syncViewMetadata(pkg);
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  return pkg.version;
}

if (require.main === module) {
  const version = syncPackageFile();
  console.log(`Synced view metadata to v${version}`);
}

module.exports = {
  formatVersionedTitle,
  syncPackageFile,
  syncViewMetadata
};
