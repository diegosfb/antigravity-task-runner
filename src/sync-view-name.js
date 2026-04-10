#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = pkg.version;

const views = pkg.contributes && pkg.contributes.views;
if (views) {
  for (const container of Object.values(views)) {
    for (const view of container) {
      if (view.name) {
        view.name = view.name.replace(/v\d+\.\d+\.\d+/, `v${version}`);
      }
    }
  }
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`Synced view name to v${version}`);
