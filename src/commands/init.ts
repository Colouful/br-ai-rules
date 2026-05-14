import { defaultConfig, loadConfig, writeConfig, type RulesConfig, type SourceConfig } from '../core/config.js';
import { loadBuiltInAssets, resolveStacksToAssets, type Asset } from '../core/assets.js';
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
  sanitizeControlChars,
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
export type SourceRetryAction = 'retry' | 'skip' | 'exit';
type SourceSelection = Pick<InteractiveInitSelection, 'sources' | 'sourcePath' | 'sourceAssetIds'>;

export type InitRuntime = {
  isTTY?: boolean;
  prompts?: Partial<{
    existingConfigAction: () => Promise<ExistingConfigAction>;
    selectAssets: (defaults: string[]) => Promise<string[]>;
    selectTargets: (defaults: TargetId[]) => Promise<TargetId[]>;
    sourcePath: () => Promise<string | null>;
    sourceRetryAction: () => Promise<SourceRetryAction>;
    selectSourceAssets: (assets: string[], defaults: string[]) => Promise<string[]>;
    confirmSummary: (selection: InteractiveInitSelection) => Promise<boolean>;
  }>;
};

const TARGET_IDS: TargetId[] = ['generic', 'claude', 'cursor'];
const BASE_ASSET_ID = 'base.behavior-basic';
const BUILT_IN_ASSET_GROUPS = [
  { layer: 'language', label: '语言' },
  { layer: 'framework', label: '框架' },
  { layer: 'middleware', label: '中间件' },
  { layer: 'practice', label: '工程实践' },
] as const;

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
  await runInteractiveInit(options, root, runtime);
}

async function runInteractiveInit(options: InitOptions, root: string, runtime: InitRuntime): Promise<void> {
  try {
    await executeInteractiveInit(options, root, runtime);
  } catch (error) {
    if (isInteractiveInitCancelled(error)) {
      console.log('已取消，未写入配置');
      return;
    }
    throw error;
  }
}

async function executeInteractiveInit(options: InitOptions, root: string, runtime: InitRuntime): Promise<void> {
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
  const sourceSelection = await promptSourceSelection(root, defaults, runtime);

  const selection: InteractiveInitSelection = {
    language: defaults.language,
    assetIds,
    sources: sourceSelection.sources,
    sourcePath: sourceSelection.sourcePath,
    sourceAssetIds: sourceSelection.sourceAssetIds,
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

async function promptSourceSelection(
  root: string,
  defaults: SourceSelection,
  runtime: InitRuntime,
): Promise<SourceSelection> {
  let defaultSourcePath = defaults.sourcePath;

  while (true) {
    const promptedSourcePath = await promptSourcePath(defaultSourcePath, runtime);
    if (!promptedSourcePath) {
      if (defaults.sources && defaults.sources.length > 1 && defaults.sourcePath) {
        return removeDefaultSource(root, defaults);
      }
      return { sources: [], sourcePath: null, sourceAssetIds: [] };
    }

    if (promptedSourcePath === defaults.sourcePath && defaults.sources && defaults.sources.length > 1) {
      return defaults;
    }

    const audit = await auditSourcePath(root, promptedSourcePath);
    if (audit.errors.length === 0 && audit.loaded) {
      for (const warning of audit.warnings) {
        console.warn(`! ${sanitizeControlChars(warning)}`);
      }
      const availableSourceAssetIds = audit.loaded.assets.map((asset) => asset.id);
      if (availableSourceAssetIds.length === 0) {
        console.error(`✗ 规则源没有可用资产: ${sanitizeControlChars(promptedSourcePath)}`);
        defaultSourcePath = promptedSourcePath;
        const action = await promptSourceRetry(runtime);
        if (action === 'skip') {
          return { sources: [], sourcePath: null, sourceAssetIds: [] };
        }
        if (action === 'exit') {
          throw new InteractiveInitCancelledError();
        }
        continue;
      }

      // Trust boundary: confirm before accepting external source rules
      const isExistingSource = promptedSourcePath === defaults.sourcePath && defaults.sources?.length;
      if (!isExistingSource) {
        const resolvedPath = audit.loaded.resolvedPath;
        console.warn(`! 规则源内容将写入 AGENTS.md / CLAUDE.md / Cursor Rules，来源: ${sanitizeControlChars(resolvedPath)}`);
        const trustConfirm = await promptSingleSelect({
          message: '是否信任该规则源？',
          options: [
            { id: 'trust', label: '信任并继续' },
            { id: 'skip', label: '跳过该规则源' },
          ],
        });
        if (trustConfirm === 'skip') {
          return { sources: [], sourcePath: null, sourceAssetIds: [] };
        }
      }

      const defaultSourceAssetIds = promptedSourcePath === defaults.sourcePath && defaults.sources?.length
        ? defaults.sourceAssetIds.filter((assetId) => availableSourceAssetIds.includes(assetId))
        : availableSourceAssetIds;
      const sourceAssetIds = await promptSourceAssets(availableSourceAssetIds, defaultSourceAssetIds, runtime);
      return {
        sources: [{ type: 'local', path: promptedSourcePath }],
        sourcePath: promptedSourcePath,
        sourceAssetIds,
      };
    }

    for (const error of audit.errors) {
      console.error(`✗ ${sanitizeControlChars(error)}`);
    }

    defaultSourcePath = promptedSourcePath;
    const action = await promptSourceRetry(runtime);
    if (action === 'skip') {
      return { sources: [], sourcePath: null, sourceAssetIds: [] };
    }
    if (action === 'exit') {
      throw new InteractiveInitCancelledError();
    }
  }
}

async function removeDefaultSource(root: string, defaults: SourceSelection): Promise<SourceSelection> {
  const removedPath = defaults.sourcePath;
  const remainingSources = (defaults.sources ?? []).filter((source) => source.path !== removedPath);
  const remainingSourceAssetIds = new Set<string>();
  const failedSources: string[] = [];

  for (const source of remainingSources) {
    const audit = await auditSourcePath(root, source.path);
    if (audit.loaded) {
      for (const asset of audit.loaded.assets) {
        remainingSourceAssetIds.add(asset.id);
      }
      continue;
    }
    failedSources.push(source.path);
  }

  if (failedSources.length > 0) {
    console.warn(`! 无法校验剩余规则源，已保留原规则源配置: ${failedSources.join(', ')}`);
    return defaults;
  }

  return {
    sources: remainingSources,
    sourcePath: remainingSources[0]?.type === 'local' ? remainingSources[0].path : null,
    sourceAssetIds: defaults.sourceAssetIds.filter((assetId) => remainingSourceAssetIds.has(assetId)),
  };
}

async function promptSourceRetry(runtime: InitRuntime): Promise<SourceRetryAction> {
  if (runtime.prompts?.sourceRetryAction) {
    return runtime.prompts.sourceRetryAction();
  }

  return promptSourceRetryAction();
}

function resolveIsTTY(runtime: InitRuntime): boolean {
  return runtime.isTTY ?? Boolean(process.stdin.isTTY);
}

function hasSelectionParam(options: InitOptions): boolean {
  return Boolean(options.language || options.targets || options.stack || options.source || options.asset || options.sync === false);
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
  const selected = new Set<string>(defaults);
  selected.add(BASE_ASSET_ID);

  for (const group of BUILT_IN_ASSET_GROUPS) {
    const groupAssets = assets.filter((asset) => asset.layer === group.layer);
    if (groupAssets.length === 0) continue;

    const groupSelected = await promptMultiSelect({
      message: `请选择${group.label}规则资产`,
      options: groupedAssetOptions(groupAssets, group.label),
      selectedIds: groupAssets.filter((asset) => selected.has(asset.id)).map((asset) => asset.id),
    });

    for (const asset of groupAssets) {
      selected.delete(asset.id);
    }
    for (const assetId of groupSelected) {
      selected.add(assetId);
    }
  }

  return unique([BASE_ASSET_ID, ...assets.filter((asset) => selected.has(asset.id)).map((asset) => asset.id)]);
}

async function promptTargets(defaults: TargetId[], runtime: InitRuntime): Promise<TargetId[]> {
  if (runtime.prompts?.selectTargets) {
    return runtime.prompts.selectTargets(defaults);
  }

  const selected = await promptMultiSelect({
    message: '请选择输出目标',
    options: [
      { id: 'targets:select-all', label: '全选当前分组', kind: 'action', action: 'select-all' },
      { id: 'targets:clear', label: '清空当前分组', kind: 'action', action: 'clear' },
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

  if (defaultSourcePath) {
    const action = await promptSingleSelect({
      message: '是否接入团队规则源？',
      options: [
        { id: 'keep', label: '保留当前团队规则源' },
        { id: 'remove', label: '移除/不接入团队规则源' },
        { id: 'input', label: '输入新的 source(规则源) 路径' },
      ],
    });
    if (action === 'keep') return defaultSourcePath;
    if (action === 'remove') return null;
    // action === 'input': fall through to promptText directly
  } else {
    const action = await promptSingleSelect({
      message: '是否接入团队规则源？',
      options: [
        { id: 'skip', label: '不接入团队规则源' },
        { id: 'input', label: '输入 source(规则源) 路径' },
      ],
    });
    if (action === 'skip') return null;
  }

  const suffix = defaultSourcePath ? `（默认 ${defaultSourcePath}，留空使用默认）` : '';
  const value = await promptText({ message: `请输入 source(规则源) 路径${suffix}` });
  return value || defaultSourcePath;
}

async function promptSourceAssets(assets: string[], defaults: string[], runtime: InitRuntime): Promise<string[]> {
  if (runtime.prompts?.selectSourceAssets) {
    return runtime.prompts.selectSourceAssets(assets, defaults);
  }

  if (assets.length === 0) return [];
  return promptMultiSelect({
    message: '请选择外部规则源资产',
    options: assets.map((asset) => ({ id: asset, label: sanitizeControlChars(asset) })),
    selectedIds: defaults,
    minSelection: 1,
  });
}

async function promptConfirmSummary(selection: InteractiveInitSelection, runtime: InitRuntime): Promise<boolean> {
  if (runtime.prompts?.confirmSummary) {
    return runtime.prompts.confirmSummary(selection);
  }

  console.log(`language: ${sanitizeControlChars(selection.language)}`);
  console.log(`assetIds: ${formatList(selection.assetIds.map(sanitizeControlChars))}`);
  console.log(`sourcePath: ${selection.sourcePath ? sanitizeControlChars(selection.sourcePath) : '无'}`);
  console.log(`sourceAssetIds: ${formatList(selection.sourceAssetIds.map(sanitizeControlChars))}`);
  console.log(`targets: ${formatList(selection.targets)}`);
  console.log(`sync: ${selection.sync ? 'true' : 'false'}`);
  console.log(`evidence: ${formatList(selection.evidence.map(sanitizeControlChars))}`);
  console.log(`sources: ${selection.sources?.length ? selection.sources.map((s) => sanitizeControlChars(formatSource(s))).join(', ') : '无'}`);
  const value = await promptSingleSelect({
    message: '确认写入配置？',
    options: [
      { id: 'yes', label: '确认写入' },
      { id: 'no', label: '取消' },
    ],
  });
  return value === 'yes';
}

function formatSource(source: SourceConfig): string {
  return source.path;
}

function groupedAssetOptions(assets: Asset[], groupLabel: string): PromptOption[] {
  return [
    { id: `${groupLabel}:select-all`, label: '全选当前分组', kind: 'action', action: 'select-all' },
    { id: `${groupLabel}:clear`, label: '清空当前分组', kind: 'action', action: 'clear' },
    ...assets.map((asset) => ({
      id: asset.id,
      label: sanitizeControlChars(`${asset.name} (${asset.id})`),
    })),
  ];
}

async function promptSourceRetryAction(): Promise<SourceRetryAction> {
  const value = await promptSingleSelect({
    message: '规则源校验失败，请选择下一步',
    options: [
      { id: 'retry', label: '重新输入' },
      { id: 'skip', label: '跳过团队规则源' },
      { id: 'exit', label: '退出向导' },
    ],
  });
  return value as SourceRetryAction;
}

function formatList(values: string[]): string {
  return values.length > 0 ? values.join(', ') : '无';
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

class InteractiveInitCancelledError extends Error {
  constructor() {
    super('交互式初始化已取消');
  }
}

function isInteractiveInitCancelled(error: unknown): boolean {
  return error instanceof InteractiveInitCancelledError;
}
