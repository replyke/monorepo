#!/usr/bin/env node
// Registry integrity check for the cli group (see .github/workflows/cli.yml).
//
// The registry is served straight off this repo's default branch — no version
// gate, no publish step — so a broken registry/**/registry.json reaches every
// `sublay add` user the moment it merges. Building @sublay/cli proves nothing
// about it: the CLI reads this metadata at runtime.
//
// Six invariants are enforced here, all of which fail at runtime rather than
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
//   5. REMOTE_REGISTRY_BASE names the same org/repo as @sublay/cli's own
//      package.json `repository.url`. Those are the only two places in the
//      repo that hardcode where this code lives, they are edited by different
//      people for different reasons (a URL constant vs. npm page metadata),
//      and invariants 1-4 are all self-consistent under a wrong repo — an org
//      rename that updates one and not the other passes every other check
//      here while every `sublay add` 404s.
//   6. REMOTE_REGISTRY_BASE's ref segment is literally `main`. Invariant 5
//      only compares org/repo and throws the ref away, so a rewrite of `main`
//      to any other branch name — applied consistently across registry.ts and
//      all nine registry.json files, which is exactly what a careless
//      find-and-replace produces — stays internally consistent and passes
//      every check above. It would also break the served URL for every user:
//      the registry is fetched off the default branch with no version gate,
//      so a base pointing at a feature branch either 404s or silently serves
//      unreviewed component source to everyone running `sublay add`.
//
// A seventh check runs only on a push to main in CI: it actually fetches one
// real registry.json over the network and requires a 200. Everything above is
// internal consistency; only main is actually served to users, and only there
// is a live URL meaningful (on this branch, before merge, the raw URL 404s by
// definition because registry/ does not exist on main yet). It is skipped
// entirely for local and pull_request runs so it can never fail spuriously.
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
const cliPackageFile = path.join(repoRoot, 'packages', 'cli', 'package.json');

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

/**
 * Pull "<org>/<repo>" out of any GitHub URL we care about.
 *
 * Handles both shapes in play here:
 *   https://raw.githubusercontent.com/<org>/<repo>/<ref>/<path...>
 *   https://github.com/<org>/<repo>.git   (also git+https://, git://, ssh)
 *
 * Returns null rather than guessing if it does not look like GitHub at all —
 * the caller turns that into a hard failure, because a non-GitHub value in
 * either place means the assumption this whole check rests on (the registry
 * is served off raw.githubusercontent.com from the repo that ships the CLI)
 * has stopped holding.
 */
function parseGitHubSlug(url) {
  if (typeof url !== 'string') return null;

  const normalized = url
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/^git@([^:]+):/, 'https://$1/');

  const match = normalized.match(
    /^https?:\/\/(?:raw\.githubusercontent\.com|github\.com)\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/
  );
  if (!match) return null;

  // GitHub org and repo names are case-insensitive; compare them that way so
  // a capitalisation difference is not reported as drift.
  return `${match[1].toLowerCase()}/${match[2].toLowerCase()}`;
}

/**
 * Invariant 5: the CLI's registry URL and the CLI's own published
 * `repository.url` must name the same GitHub repo.
 */
function assertRegistryBaseMatchesCliRepository() {
  let cliPackage;
  try {
    cliPackage = JSON.parse(fs.readFileSync(cliPackageFile, 'utf8'));
  } catch (err) {
    console.error(
      `Registry integrity check: cannot read ${path.relative(
        repoRoot,
        cliPackageFile
      )} (${err.message}). This script cross-checks REMOTE_REGISTRY_BASE ` +
        'against that file\'s repository.url.'
    );
    process.exit(1);
  }

  const repositoryUrl =
    cliPackage.repository && typeof cliPackage.repository === 'object'
      ? cliPackage.repository.url
      : cliPackage.repository;

  const packageSlug = parseGitHubSlug(repositoryUrl);
  const registrySlug = parseGitHubSlug(REMOTE_REGISTRY_BASE);

  if (packageSlug === null) {
    console.error(
      'Registry integrity check: could not read a GitHub "<org>/<repo>" out ' +
        `of ${path.relative(repoRoot, cliPackageFile)}'s repository.url ` +
        `(${JSON.stringify(repositoryUrl)}).`
    );
    process.exit(1);
  }

  if (registrySlug === null) {
    console.error(
      'Registry integrity check: could not read a GitHub "<org>/<repo>" out ' +
        `of REMOTE_REGISTRY_BASE (${JSON.stringify(REMOTE_REGISTRY_BASE)}) in ` +
        `${path.relative(repoRoot, registrySourceFile)}. The registry is ` +
        'expected to be served from raw.githubusercontent.com.'
    );
    process.exit(1);
  }

  if (packageSlug !== registrySlug) {
    console.error(
      'Registry integrity check FAILED: the CLI downloads the registry from ' +
        'one repo but publishes itself as living in another.\n\n' +
        `  REMOTE_REGISTRY_BASE (${path.relative(
          repoRoot,
          registrySourceFile
        )}): ${registrySlug}\n` +
        `  repository.url (${path.relative(
          repoRoot,
          cliPackageFile
        )}):        ${packageSlug}\n\n` +
        'These are the only two places that hardcode where this code lives. ' +
        'If the repo moved, both have to move — every registry.json is ' +
        'self-consistent with a wrong base, so nothing else here catches it, ' +
        'and `sublay add` 404s for every user.'
    );
    process.exit(1);
  }

  return packageSlug;
}

const REPO_SLUG = assertRegistryBaseMatchesCliRepository();

// The branch the registry is served from. Not configurable on purpose: the
// CLI has no version gate and no ref option, so whatever ref this URL names
// is what every `sublay add` on every published CLI version downloads. That
// has to be the repo's default branch.
const EXPECTED_REGISTRY_REF = 'main';

/**
 * Invariant 6: REMOTE_REGISTRY_BASE must be served off `main`.
 *
 * Invariant 5 compares only "<org>/<repo>" and discards everything after it,
 * so it is blind to the ref. A consistent rename of `main` across
 * registry.ts and every registry.json keeps invariants 1-5 all green while
 * pointing the whole registry at a branch users' CLIs will never be able to
 * read from (or, worse, one that resolves and serves unreviewed source).
 */
function assertRegistryBaseUsesDefaultBranch() {
  const match = REMOTE_REGISTRY_BASE.match(
    /^https?:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/([^/]+)(?:\/|$)/
  );

  if (!match) {
    console.error(
      'Registry integrity check FAILED: could not read a ref segment out of ' +
        `REMOTE_REGISTRY_BASE (${JSON.stringify(REMOTE_REGISTRY_BASE)}) in ` +
        `${path.relative(repoRoot, registrySourceFile)}. It is expected to ` +
        'look like https://raw.githubusercontent.com/<org>/<repo>/' +
        `${EXPECTED_REGISTRY_REF}/<path...>.`
    );
    process.exit(1);
  }

  const ref = match[1];
  if (ref !== EXPECTED_REGISTRY_REF) {
    console.error(
      'Registry integrity check FAILED: the registry base points at a ref ' +
        'other than the default branch.\n\n' +
        `  REMOTE_REGISTRY_BASE (${path.relative(
          repoRoot,
          registrySourceFile
        )}): ${REMOTE_REGISTRY_BASE}\n` +
        `  ref segment: ${ref}\n` +
        `  expected:    ${EXPECTED_REGISTRY_REF}\n\n` +
        'The CLI fetches the registry off the default branch with no version ' +
        'gate and no way to override the ref, so every published CLI version ' +
        'reads whatever this names. Every registry.json is self-consistent ' +
        'with a wrong ref — the org/repo cross-check above discards the ref ' +
        'entirely — so nothing else here catches it, and `sublay add` breaks ' +
        'for every user.'
    );
    process.exit(1);
  }

  return ref;
}

const REGISTRY_REF = assertRegistryBaseUsesDefaultBranch();

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
/** @type {{registryUrl: string, mainFilePath: string}[]} */
const remoteProbes = [];

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
        // Remembered for the on-main network check below, which needs a real
        // files[] path to prove the registryUrl + path join actually
        // downloads — not just that the metadata is reachable.
        remoteProbes.push({
          registryUrl: manifest.registryUrl,
          mainFilePath: matched,
        });
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
    `main file(s) verified against REMOTE_REGISTRY_BASE ${REMOTE_REGISTRY_BASE} ` +
    `(repo ${REPO_SLUG}, cross-checked against packages/cli/package.json; ` +
    `ref ${REGISTRY_REF}).`
);

// ---------------------------------------------------------------------------
// Live reachability — only on a push to main in CI.
//
// Everything above is internal consistency: it proves the metadata agrees with
// the files on disk and with the CLI source. It cannot prove the URLs actually
// serve anything, because REMOTE_REGISTRY_BASE points at main and only main is
// ever served. Running this anywhere else would fail for reasons that are not
// defects: on a feature branch the registry may not exist on main yet (it does
// not, until the consolidation branch merges), a PR's changes are by
// definition not on main, and local runs may have no network at all.
//
// So: skipped unless GitHub Actions says this is a push build of main. Those
// three variables are standard GitHub Actions defaults, set on every run.
// ---------------------------------------------------------------------------

const isCI = process.env.GITHUB_ACTIONS === 'true';
const isPushToMain =
  process.env.GITHUB_EVENT_NAME === 'push' &&
  process.env.GITHUB_REF === 'refs/heads/main';

if (!isCI || !isPushToMain) {
  console.log(
    'Skipping live registry reachability check (runs only on a GitHub Actions ' +
      'push build of main; the registry is served from main, so the URLs are ' +
      'not expected to resolve from anywhere else).'
  );
} else {
  // One metadata URL and one component-file URL. The first proves
  // fetchRegistry() can find a component; the second proves fetchFile()'s
  // registryUrl + files[].path join resolves to a real download. Checking one
  // of each is the point — a base URL that serves registry.json but not the
  // files beside it is the failure shape a single probe would miss.
  const probe = remoteProbes[0];
  const targets = [
    { label: 'registry metadata', url: `${probe.registryUrl}/registry.json` },
    {
      label: 'component file',
      url: `${probe.registryUrl}/${probe.mainFilePath}`,
    },
  ];

  // Retried, because this job's most common trigger is the push that just
  // merged the change — and raw.githubusercontent.com is CDN-fronted, so it
  // can briefly still serve the pre-merge state (a 404 for a newly added
  // path). Without a retry this check's whole purpose would make it flaky on
  // exactly the runs it exists for. Three attempts over ~30s is well past
  // that window; a genuinely wrong URL stays wrong through all of them.
  const ATTEMPTS = 3;
  const RETRY_DELAY_MS = 15_000;
  const failures = [];

  for (const target of targets) {
    let lastProblem;

    for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
      if (attempt > 1) {
        console.log(
          `  retrying in ${RETRY_DELAY_MS / 1000}s (attempt ${attempt}/${ATTEMPTS}): ${target.url}`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }

      let response;
      try {
        response = await fetch(target.url, {
          method: 'GET',
          redirect: 'follow',
          cache: 'no-store',
          signal: AbortSignal.timeout(20_000),
        });
      } catch (err) {
        lastProblem = `request failed: ${err.message}`;
        continue;
      }

      if (!response.ok) {
        lastProblem = `HTTP ${response.status} ${response.statusText}`;
        continue;
      }

      // Drain the body so the socket closes cleanly rather than leaving the
      // process holding an unconsumed stream.
      await response.arrayBuffer();
      console.log(`  reachable (${response.status}): ${target.url}`);
      lastProblem = undefined;
      break;
    }

    if (lastProblem !== undefined) {
      failures.push(
        `${target.label} ${target.url} — ${lastProblem} (after ${ATTEMPTS} attempts)`
      );
    }
  }

  if (failures.length > 0) {
    console.error(
      `\nLive registry reachability check FAILED with ${failures.length} problem(s):\n`
    );
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    console.error(
      '\nThese URLs are what `sublay add` fetches at runtime. main is now\n' +
        'serving a registry that a published CLI cannot download from.'
    );
    process.exit(1);
  }

  console.log('Live registry reachability check passed.');
}
