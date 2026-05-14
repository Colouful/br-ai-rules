import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { syncCommand } from './commands/sync.js';
import { diffCommand } from './commands/diff.js';
import { checkCommand } from './commands/check.js';
import { listCommand } from './commands/list.js';
import { addCommand } from './commands/add.js';
import { sourceListCommand } from './commands/source-list.js';
import { sourceInitCommand } from './commands/source-init.js';
import { sourceCheckCommand } from './commands/source-check.js';
import { assetListCommand } from './commands/asset-list.js';
import { doctorCommand } from './commands/doctor.js';

declare const __PKG_VERSION__: string;
const PKG_VERSION: string = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '0.0.0-dev';

const program = new Command();

program
  .name('br-rules')
  .description('BR AI Rules - AI Coding rules installer for teams')
  .version(PKG_VERSION);

program
  .command('init')
  .description('Initialize BR AI Rules config and generate rule files')
  .option('--no-sync', 'Only create .ai-rules/config.json without syncing')
  .option('--interactive', 'Force interactive setup wizard')
  .option('--language <language>', 'Rule language, default zh-CN')
  .option('--targets <targets>', 'Comma-separated targets: generic,claude,cursor')
  .option('--stack <stack>', 'Comma-separated tech stacks, e.g., react,typescript')
  .option('--source <path>', 'Local team source path')
  .option('--asset <ids>', 'Comma-separated source asset ids to include')
  .action((options) => initCommand(options));

program
  .command('add <rule-id>')
  .description('Create a custom rule YAML template')
  .option('--category <category>', 'Rule category, default team')
  .option('--severity <severity>', 'Rule severity: must/should/may, default must')
  .option('--targets <targets>', 'Comma-separated targets, default generic,claude,cursor')
  .action((ruleId, options) => addCommand(ruleId, options));

program.command('sync').description('Sync generated rule files').action(() => syncCommand());
program.command('diff').description('Preview generated rule file changes').action(() => diffCommand());
program.command('check').description('Check whether generated rule files are up to date').action(() => checkCommand());

program.command('doctor').description('Diagnose BR AI Rules setup (config, sources, sync drift)').action(() => doctorCommand());

program
  .command('list')
  .description('List built-in rulesets and rules')
  .option('--assets', 'Show built-in assets')
  .option('--custom', 'Show custom rules')
  .option('--enabled', 'Show enabled rules')
  .option('--disabled', 'Show disabled rules')
  .option('--all', 'Show everything')
  .action((options) => listCommand(options));

const sourceCmd = program.command('source').description('Manage team rule sources');
sourceCmd.command('list').description('List configured sources').action(() => sourceListCommand());
sourceCmd
  .command('init')
  .description('Create a scaffold team rules source (manifest + sample asset/rule)')
  .argument('[directory]', 'Target directory', 'team-rules-source')
  .option('--force', 'Overwrite starter files if manifest already exists')
  .action((directory: string, options: { force?: boolean }) => sourceInitCommand(options, directory));
sourceCmd
  .command('check')
  .description('Validate local rule source (manifest, YAML, ids, placeholders)')
  .argument('[path]', 'Source directory; omit to check all configured sources')
  .action((path?: string) => sourceCheckCommand(path));

const assetCmd = program.command('asset').description('Manage rule assets');
assetCmd.command('list').description('List all available assets').action(() => assetListCommand());

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
