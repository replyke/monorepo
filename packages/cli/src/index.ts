#!/usr/bin/env node

import { Command } from 'commander';
import { init } from './commands/init.js';
import { add } from './commands/add.js';

const program = new Command();

program
  .name('sublay')
  .description('CLI for installing Sublay UI components')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize Sublay configuration in your project')
  .action(init);

program
  .command('add <component>')
  .description('Add a component to your project')
  .action(add);

program.parse();
