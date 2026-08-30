#!/usr/bin/env node

import { createRequire } from 'module';
import { Command } from 'commander';
import { init } from './commands/init.js';
import { add } from './commands/add.js';

// dist/index.js sits one level below the package root, so '../package.json'
// resolves to the published package manifest at runtime.
const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

const program = new Command();

program
  .name('sublay')
  .description('CLI for installing Sublay UI components')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize Sublay configuration in your project')
  .action(init);

program
  .command('add <component>')
  .description('Add a component to your project')
  .action(add);

program.parse();
