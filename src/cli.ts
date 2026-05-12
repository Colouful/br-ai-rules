#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { diffCommand } from './commands/diff.js';
import { checkCommand } from './commands/check.js';
import { listCommand } from './commands/list.js';

const program = new Command();

program
  .name('br-rules')
  .description('BR AI Rules - AI Coding rules installer for teams')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize BR AI Rules config and generate rule files')
  .option('--no-sync', 'Only create .ai-rules/config.json')
  .option('--language <language>', 'Rule language, default zh-CN')
  .option('--targets <targets>', 'Comma-separated targets: generic,claude,cursor')
  .option('--rulesets <rulesets>', 'Comma-separated rulesets')
  .action((options) => initCommand(options));

program.command('sync').description('Sync generated rule files').action(() => syncCommand());
program.command('diff').description('Preview generated rule file changes').action(() => diffCommand());
program.command('check').description('Check whether generated rule files are up to date').action(() => checkCommand());
program.command('list').description('List built-in rulesets and rules').action(() => listCommand());

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
