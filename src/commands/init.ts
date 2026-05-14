import { defaultConfig, loadConfig, writeConfig, type RulesConfig, type SourceConfig } from '../core/config.js';
import { loadBuiltInAssets, resolveStacksToAssets } from '../core/assets.js';
import { auditSourcePath } from '../core/source.js';
import { detectProject } from '../core/interactive/project-detector.js';
import {
  buildInitConfigFromSelection,
  buildSelectionDefaults,
  type InteractiveInitSelection,
  type ParamDefaults,
  type TargetId,
} from '../core/interactive/selection-model.js';
import {
  promptMultiSelect,
  promptSingleSelect,
  promptText,
  type PromptOption,
} from '../core/interactive/tty-prompts.js';
import { syncCommand } from './sync.js';

export type InitOptions = {
  sync?: boolean;
  language?: string;
  targets?: string;
  stack?: string;
  source?: string;
  asset?: string;
  interactive?: boolean;
};

export type ExistingConfigAction = 'reconfigure' | 'sync-only' | 'exit';

export type InitRuntime = {
  isTTY?: boolean;
  prompts?: Partial<{
    existingConfigAction: () => Promise<ExistingConfigAction>;
    selectAssets: (defaults: string[]) => Promise<string[]>;
    selectTargets: (defaults: TargetId[]) => Promise<TargetId[]>;
    sourcePath: () => Promise<string | null>;
    selectSourceAssets: (assets: string[]) => Promise<string[]>;
    confirmSummary: (selection: InteractiveInitSelection) => Promise<boolean>;
  }>;
};

const TARGET_IDS: TargetId[] = ['generic', 'claude', 'cursor'];

export function shouldUseInteractiveInit(options: InitOptions, runtime: InitRuntime = {}): boolean {
  const isTTY = resolveIsTTY(runtime);
  if (options.interactive === true) return isTTY;
  if (hasSelectionParam(options)) return false;
  return isTTY;
}

export async function initCommand(
  options: InitOptions,
  root = process.cwd(),
  runtime: InitRuntime = {},
): Promise<void> {
  if (options.interactive === true && !resolveIsTTY(runtime)) {
    console.error('当前终端不支持交互，请使用参数模式，例如 br-rules init --stack vue,typescript。');
    process.exitCode = 1;
    return;
  }

  if (!shouldUseInteractiveInit(options, runtime)) {
    await initWithParams(options, root);
    return;
  }

  await initInteractive(options, root, runtime);
}

async function initWithParams(options: InitOptions, root: string): Promise<void> {
  const config = defaultConfig();
  if (options.language) config.language = options.language;
  if (options.targets) {
    const targets = new Set(options.targets.split(',').map((item) => item.trim()).filter(Boolean));
    config.targets.generic = targets.has('generic');
    config.targets.claude = targets.has('claude');
    config.targets.cursor.enabled = targets.has('cursor');
  }
  if (options.stack) {
    const stacks = options.stack.split(',').map((s) => s.trim()).filter(Boolean);
    config.assets.include = resolveStacksToAssets(stacks);
  }
  if (options.source) {
    config.sources.push({ type: 'local', path: options.source });
  }
  if (options.asset) {
    const assetIds = options.asset.split(',').map((a) => a.trim()).filter(Boolean);
    for (const id of assetIds) {
      if (!config.assets.include.includes(id)) config.assets.include.push(id);
    }
  }
  await writeConfig(root, config);
  console.log('Created .ai-rules/config.json');
  if (options.sync !== false) await syncCommand(root);
}

async function initInteractive(options: InitOptions, root: string, runtime: InitRuntime): Promise<void> {
  const existingConfig = await readExistingConfig(root);
  if (existingConfig) {
    const action = await promptExistingConfigAction(runtime);
    if (action === 'sync-only') {
      if (options.sync !== false) await syncCommand(root);
      return;
    }
    if (action === 'exit') return;
  }

  const detected = await detectProject(root);
  const defaults = buildSelectionDefaults({
    paramDefaults: parseParamDefaults(options),
    existingConfig,
    detected,
  });

  const assetIds = await promptAssets(defaults.assetIds, runtime);
  const targets = await promptTargets(defaults.targets, runtime);
  const promptedSourcePath = await promptSourcePath(defaults.sourcePath, runtime);
  let sources = defaults.sources;
  let sourcePath: string | null = null;
  let sourceAssetIds = defaults.sourceAssetIds;

  if (promptedSourcePath) {
    const audit = await auditSourcePath(root, promptedSourcePath);
    if (audit.errors.length > 0 || !audit.loaded) {
      for (const error of audit.errors) {
        console.error(`✗ ${error}`);
      }
      sources = [];
      sourceAssetIds = [];
    } else {
      sourcePath = promptedSourcePath;
      sources = [{ type: 'local', path: promptedSourcePath }];
      const availableSourceAssetIds = audit.loaded.assets.map((asset) => asset.id);
      sourceAssetIds = await promptSourceAssets(availableSourceAssetIds, runtime);
    }
  }

  const selection: InteractiveInitSelection = {
    language: defaults.language,
    assetIds,
    sources,
    sourcePath,
    sourceAssetIds,
    targets,
    sync: options.sync !== false,
    evidence: defaults.evidence,
  };

  if (!await promptConfirmSummary(selection, runtime)) return;

  const nextConfig = mergeInteractiveConfig(existingConfig, buildInitConfigFromSelection(selection));
  await writeConfig(root, nextConfig);
  console.log('Created .ai-rules/config.json');
  if (options.sync !== false) await syncCommand(root);
}

function resolveIsTTY(runtime: InitRuntime): boolean {
  return runtime.isTTY ?? Boolean(process.stdin.isTTY);
}

function hasSelectionParam(options: InitOptions): boolean {
  return Boolean(options.language || options.targets || options.stack || options.source || options.asset);
}

function mergeInteractiveConfig(existingConfig: RulesConfig | null, selectedConfig: RulesConfig): RulesConfig {
  if (!existingConfig) return selectedConfig;

  return {
    ...existingConfig,
    language: selectedConfig.language,
    sources: selectedConfig.sources,
    assets: {
      ...existingConfig.assets,
      include: selectedConfig.assets.include,
    },
    targets: {
      ...existingConfig.targets,
      generic: selectedConfig.targets.generic,
      claude: selectedConfig.targets.claude,
      cursor: {
        ...existingConfig.targets.cursor,
        enabled: selectedConfig.targets.cursor.enabled,
      },
    },
  };
}

function parseParamDefaults(options: InitOptions): ParamDefaults {
  const paramDefaults: ParamDefaults = {};

  if (options.language) {
    paramDefaults.language = options.language;
  }
  if (options.targets) {
    paramDefaults.targets = parseTargets(options.targets);
  }
  if (options.stack) {
    paramDefaults.assetIds = resolveStacksToAssets(parseCommaList(options.stack));
  }
  if (options.source) {
    paramDefaults.sourcePath = options.source;
    paramDefaults.sources = [{ type: 'local', path: options.source }];
  }
  if (options.asset) {
    paramDefaults.sourceAssetIds = parseCommaList(options.asset);
  }

  return paramDefaults;
}

function parseTargets(targets: string): TargetId[] {
  const known = new Set<TargetId>(TARGET_IDS);
  return parseCommaList(targets).filter((target): target is TargetId => known.has(target as TargetId));
}

function parseCommaList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

async function readExistingConfig(root: string): Promise<RulesConfig | null> {
  try {
    return await loadConfig(root);
  } catch (error) {
    if (isMissingFileError(error)) return null;
    throw error;
  }
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

async function promptExistingConfigAction(runtime: InitRuntime): Promise<ExistingConfigAction> {
  if (runtime.prompts?.existingConfigAction) {
    return runtime.prompts.existingConfigAction();
  }

  const value = await promptSingleSelect({
    message: '检测到已有 .ai-rules/config.json，请选择处理方式',
    options: [
      { id: 'reconfigure', label: '重新配置' },
      { id: 'sync-only', label: '仅同步' },
      { id: 'exit', label: '退出' },
    ],
  });
  return value as ExistingConfigAction;
}

async function promptAssets(defaults: string[], runtime: InitRuntime): Promise<string[]> {
  if (runtime.prompts?.selectAssets) {
    return runtime.prompts.selectAssets(defaults);
  }

  const assets = await loadBuiltInAssets();
  const options: PromptOption[] = assets.map((asset) => ({
    id: asset.id,
    label: `${asset.name} (${asset.id})`,
    locked: asset.id === 'base.behavior-basic',
  }));

  return promptMultiSelect({
    message: '请选择内置规则资产',
    options,
    selectedIds: defaults,
    minSelection: 1,
  });
}

async function promptTargets(defaults: TargetId[], runtime: InitRuntime): Promise<TargetId[]> {
  if (runtime.prompts?.selectTargets) {
    return runtime.prompts.selectTargets(defaults);
  }

  const selected = await promptMultiSelect({
    message: '请选择输出目标',
    options: [
      { id: 'generic', label: 'AGENTS.md' },
      { id: 'claude', label: 'CLAUDE.md' },
      { id: 'cursor', label: 'Cursor Rules' },
    ],
    selectedIds: defaults,
    minSelection: 1,
  });

  return selected as TargetId[];
}

async function promptSourcePath(defaultSourcePath: string | null, runtime: InitRuntime): Promise<string | null> {
  if (runtime.prompts?.sourcePath) {
    return runtime.prompts.sourcePath();
  }

  const suffix = defaultSourcePath ? `（默认 ${defaultSourcePath}，留空保留）` : '（可留空）';
  const value = await promptText({ message: `请输入本地规则源路径 ${suffix}` });
  return value || null;
}

async function promptSourceAssets(assets: string[], runtime: InitRuntime): Promise<string[]> {
  if (runtime.prompts?.selectSourceAssets) {
    return runtime.prompts.selectSourceAssets(assets);
  }

  if (assets.length === 0) return [];
  return promptMultiSelect({
    message: '请选择外部规则源资产',
    options: assets.map((asset) => ({ id: asset, label: asset })),
    selectedIds: assets,
  });
}

async function promptConfirmSummary(selection: InteractiveInitSelection, runtime: InitRuntime): Promise<boolean> {
  if (runtime.prompts?.confirmSummary) {
    return runtime.prompts.confirmSummary(selection);
  }

  console.log(`语言：${selection.language}`);
  console.log(`规则资产：${selection.assetIds.join(', ')}`);
  console.log(`输出目标：${selection.targets.join(', ')}`);
  if (selection.sources?.length) {
    console.log(`规则源：${selection.sources.map(formatSource).join(', ')}`);
  }
  const value = await promptSingleSelect({
    message: '确认写入配置？',
    options: [
      { id: 'yes', label: '确认' },
      { id: 'no', label: '取消' },
    ],
  });
  return value === 'yes';
}

function formatSource(source: SourceConfig): string {
  return source.path;
}
