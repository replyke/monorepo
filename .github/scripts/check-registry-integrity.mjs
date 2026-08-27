#!/usr/bin/env node
// Registry integrity check for the cli group (see .github/workflows/cli.yml).
//
// The registry is served straight off this repo's default branch — no version
// gate, no publish step — so a broken registry/**/registry.json reaches every
// `sublay add` user the moment it merges. Building @sublay/cli proves nothing
// about it: the CLI reads this metadata at runtime.
//
// Two invariants are enforced here, both of which fail at runtime rather than
// build time and are therefore invisible to every other step in the job:
//
//   1. registryUrl points at the component's own directory under
//      REMOTE_REGISTRY_BASE. fetchFile() joins this with each files[].path, so
//      a stale or mistyped value 404s on download.
//   2. Every files[].path resolves to a real file next to the registry.json
//      that lists it — the local dev path reads these off disk and the remote
//      path fetches the same relative path from GitHub.
//
// Node built-ins only, so it can run before (or without) an install.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Must stay in sync with REMOTE_REGISTRY_BASE in
// packages/cli/src/utils/registry.ts — fetchRegistry() and fetchFile() both
// have to name the same repo.
const REMOTE_REGISTRY_BASE =
  'https://raw.githubusercontent.com/sublay-io/monorepo/main/registry';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const registryRoot = path.join(repoRoot, 'registry');

/** Recursively collect every registry.json under registry/, skipping node_modules. */
function findRegistryFiles(dir) {
  const found = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...findRegistryFiles(full));
    } else if (entry.name === 'registry.json') {
      found.push(full);
    }
  }
  return found;
}

const errors = [];
/** @param {string} file @param {string} message */
function fail(file, message) {
  errors.push(`${path.relative(repoRoot, file)}: ${message}`);
}

if (!fs.existsSync(registryRoot)) {
  console.error(`Registry integrity check: ${registryRoot} does not exist.`);
  process.exit(1);
}

const registryFiles = findRegistryFiles(registryRoot).sort();

// A zero-result walk means the layout moved and this check silently stopped
// covering anything — treat it as a failure, not a pass.
if (registryFiles.length === 0) {
  console.error(
    'Registry integrity check: no registry/**/registry.json files found. ' +
      'Either the registry moved or this script is looking in the wrong place.'
  );
  process.exit(1);
}

let checkedFileEntries = 0;

for (const registryFile of registryFiles) {
  const dir = path.dirname(registryFile);

  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
  } catch (err) {
    fail(registryFile, `is not valid JSON (${err.message})`);
    continue;
  }

  // 1. registryUrl must name this component's own directory.
  const relativeDir = path.relative(registryRoot, dir).split(path.sep).join('/');
  const expectedUrl = `${REMOTE_REGISTRY_BASE}/${relativeDir}`;
  if (manifest.registryUrl !== expectedUrl) {
    fail(
      registryFile,
      `registryUrl mismatch\n    expected: ${expectedUrl}\n    actual:   ${
        manifest.registryUrl === undefined
          ? '(missing)'
          : JSON.stringify(manifest.registryUrl)
      }`
    );
  }

  // 2. Every files[].path must resolve to a real file in this directory.
  if (!Array.isArray(manifest.files)) {
    fail(
      registryFile,
      `"files" must be an array, got ${
        manifest.files === undefined ? '(missing)' : typeof manifest.files
      }`
    );
    continue;
  }

  manifest.files.forEach((entry, index) => {
    if (!entry || typeof entry.path !== 'string' || entry.path.length === 0) {
      fail(registryFile, `files[${index}] has no usable "path" string`);
      return;
    }
    checkedFileEntries += 1;
    const target = path.join(dir, entry.path);
    if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
      fail(
        registryFile,
        `files[${index}].path "${entry.path}" does not resolve to a file ` +
          `(looked for ${path.relative(repoRoot, target)})`
      );
    }
  });
}

if (errors.length > 0) {
  console.error(
    `Registry integrity check FAILED with ${errors.length} problem(s):\n`
  );
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  console.error(
    '\nEvery registry.json must set registryUrl to its own directory under\n' +
      `${REMOTE_REGISTRY_BASE}, and every files[].path must exist on disk\n` +
      'relative to that registry.json. The registry is served off the default\n' +
      'branch, so these break `sublay add` for every user as soon as they merge.'
  );
  process.exit(1);
}

console.log(
  `Registry integrity check passed: ${registryFiles.length} registry.json ` +
    `file(s), ${checkedFileEntries} file entr(ies) verified.`
);
