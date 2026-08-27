#!/usr/bin/env node
// Registry integrity check for the cli group (see .github/workflows/cli.yml).
//
// The registry is served straight off this repo's default branch — no version
// gate, no publish step — so a broken registry/**/registry.json reaches every
// `sublay add` user the moment it merges. Building @sublay/cli proves nothing
// about it: the CLI reads this metadata at runtime.
//
// Four invariants are enforced here, all of which fail at runtime rather than
// build time and are therefore invisible to every other step in the job:
//
//   1. registryUrl points at the component's own directory under
//      REMOTE_REGISTRY_BASE. fetchFile() joins this with each files[].path, so
//      a stale or mistyped value 404s on download.
//   2. exports.mainComponent is a non-empty string. `sublay add` writes it
//      verbatim into the generated barrel's export statement.
//   3. Every files[].path resolves to a real file next to the registry.json
//      that lists it — the local dev path reads these off disk and the remote
//      path fetches the same relative path from GitHub.
//   4. exports.mainFile names a file that files[] actually installs. The
//      generated barrel imports './components/<mainFile>' — an extension-less
//      path that only resolves because some files[] entry put
//      'files/<mainFile>.<ext>' there (add.ts strips the 'files/' prefix and
//      re-roots the rest under 'components/'). A typo here ships a barrel
//      that cannot resolve, to every user of that component.
//
// Node built-ins only, so it can run before (or without) an install.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const registryRoot = path.join(repoRoot, 'registry');
const registrySourceFile = path.join(
  repoRoot,
  'packages',
  'cli',
  'src',
  'utils',
  'registry.ts'
);

// Extensions a mainFile may resolve through. Mirrors what the registry
// actually ships and what a bundler would resolve for an extension-less
// './components/<mainFile>' import.
const MAIN_FILE_EXTENSIONS = ['.tsx', '.ts', '.jsx', '.js'];

/**
 * Read REMOTE_REGISTRY_BASE out of the CLI source rather than duplicating it.
 *
 * The CLI is the only consumer of these registryUrl values: fetchRegistry()
 * looks a component up under REMOTE_REGISTRY_BASE, then fetchFile() downloads
 * that component's files from the registryUrl baked into the metadata it just
 * read. The two have to name the same repo, so the check has to compare the
 * JSON against the constant that actually ships — a hardcoded copy here would
 * happily agree with the JSON while both disagreed with the CLI (an org
 * rename being the obvious way in).
 *
 * A regex is enough: this is a build-time check, not production code, and the
 * constant is a plain string literal. If it ever stops being one, this throws
 * rather than silently falling back to a guess.
 */
function readRemoteRegistryBase() {
  let source;
  try {
    source = fs.readFileSync(registrySourceFile, 'utf8');
  } catch (err) {
    console.error(
      `Registry integrity check: cannot read ${path.relative(
        repoRoot,
        registrySourceFile
      )} (${err.message}). This script reads REMOTE_REGISTRY_BASE from there ` +
        'rather than keeping its own copy.'
    );
    process.exit(1);
  }

  const match = source.match(
    /const\s+REMOTE_REGISTRY_BASE\s*=\s*(['"`])([^'"`]+)\1/
  );
  if (!match) {
    console.error(
      'Registry integrity check: could not find a `const REMOTE_REGISTRY_BASE = "<url>"` ' +
        `string literal in ${path.relative(repoRoot, registrySourceFile)}. ` +
        'Either it was renamed or it is no longer a plain literal — update ' +
        'this script to match, do not re-hardcode the URL here.'
    );
    process.exit(1);
  }

  return match[2].replace(/\/+$/, '');
}

const REMOTE_REGISTRY_BASE = readRemoteRegistryBase();

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
let checkedMainFiles = 0;

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

  // 2. exports.mainComponent must be a usable identifier for the barrel.
  const exportsBlock =
    manifest.exports && typeof manifest.exports === 'object'
      ? manifest.exports
      : undefined;
  if (!exportsBlock) {
    fail(
      registryFile,
      `"exports" must be an object, got ${
        manifest.exports === undefined ? '(missing)' : typeof manifest.exports
      }`
    );
  } else if (
    typeof exportsBlock.mainComponent !== 'string' ||
    exportsBlock.mainComponent.trim().length === 0
  ) {
    fail(
      registryFile,
      `exports.mainComponent must be a non-empty string, got ${
        exportsBlock.mainComponent === undefined
          ? '(missing)'
          : JSON.stringify(exportsBlock.mainComponent)
      }`
    );
  }

  // 3. Every files[].path must resolve to a real file in this directory.
  //    (Also feeds invariant 4 below, which needs the file list.)
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

  // 4. exports.mainFile must name one of those files[] entries.
  if (exportsBlock) {
    const { mainFile } = exportsBlock;
    if (typeof mainFile !== 'string' || mainFile.trim().length === 0) {
      fail(
        registryFile,
        `exports.mainFile must be a non-empty string, got ${
          mainFile === undefined ? '(missing)' : JSON.stringify(mainFile)
        }`
      );
    } else {
      const candidates = MAIN_FILE_EXTENSIONS.map(
        (ext) => `files/${mainFile}${ext}`
      );
      const declaredPaths = new Set(
        manifest.files
          .filter((entry) => entry && typeof entry.path === 'string')
          .map((entry) => entry.path)
      );
      const matched = candidates.find((candidate) =>
        declaredPaths.has(candidate)
      );
      if (matched === undefined) {
        fail(
          registryFile,
          `exports.mainFile "${mainFile}" has no matching files[] entry\n` +
            `    looked for: ${candidates.join(', ')}\n` +
            '    `sublay add` generates a barrel importing ' +
            `'./components/${mainFile}', which only resolves if one of those ` +
            'is installed'
        );
      } else {
        checkedMainFiles += 1;
      }
    }
  }
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
      `${REMOTE_REGISTRY_BASE} (read from packages/cli/src/utils/registry.ts),\n` +
      'every files[].path must exist on disk relative to that registry.json,\n' +
      'and exports.mainComponent/mainFile must name something files[] installs.\n' +
      'The registry is served off the default branch, so these break\n' +
      '`sublay add` for every user as soon as they merge.'
  );
  process.exit(1);
}

console.log(
  `Registry integrity check passed: ${registryFiles.length} registry.json ` +
    `file(s), ${checkedFileEntries} file entr(ies), ${checkedMainFiles} ` +
    `main file(s) verified against REMOTE_REGISTRY_BASE ${REMOTE_REGISTRY_BASE}.`
);
