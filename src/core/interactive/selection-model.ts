import { defaultConfig, type RulesConfig, type SourceConfig } from '../config.js';
import type { ProjectDetectionResult } from './project-detector.js';

export type TargetId = 'generic' | 'claude' | 'cursor';

export type InteractiveInitSelection = {
  language: string;
  assetIds: string[];
  sources?: SourceConfig[];
  sourcePath: string | null;
  sourceAssetIds: string[];
  targets: TargetId[];
  sync: boolean;
  evidence: string[];
};

export type InitSelectionDefaults = {
  assetIds: string[];
  targets: TargetId[];
  language: string;
  sources: SourceConfig[];
  sourcePath: string | null;
  sourceAssetIds: string[];
  evidence: string[];
};

export type ParamDefaults = Partial<Omit<InitSelectionDefaults, 'evidence'>>;

type BuildSelectionDefaultsOptions = {
  paramDefaults?: ParamDefaults;
  existingConfig?: RulesConfig | null;
  detected?: ProjectDetectionResult | null;
};

type GroupActionOptions = {
  action: 'select-all' | 'clear';
  selectedIds: string[];
  optionIds: string[];
  lockedIds: string[];
};

type SourceDefaults = Pick<InitSelectionDefaults, 'sources' | 'sourcePath' | 'sourceAssetIds'>;

const BASE_ASSET_ID = 'base.behavior-basic';
const CONSERVATIVE_ASSET_IDS = [
  BASE_ASSET_ID,
  'practice.testing-basic',
  'practice.dependency-control',
  'practice.security-basic',
];
const CONSERVATIVE_TARGETS: TargetId[] = ['generic', 'claude', 'cursor'];
const DEFAULT_LANGUAGE = 'zh-CN';
const BUILT_IN_ASSET_IDS = new Set([
  'base.behavior-basic',
  'framework.react',
  'framework.spring-boot',
  'framework.vue',
  'language.java',
  'language.typescript',
  'middleware.message-queue',
  'middleware.mysql',
  'middleware.redis',
  'practice.api-contract',
  'practice.dependency-control',
  'practice.security-basic',
  'practice.testing-basic',
]);

export function buildInitConfigFromSelection(selection: InteractiveInitSelection): RulesConfig {
  if (selection.targets.length === 0) {
    throw new Error('至少选择一个输出目标');
  }

  const config = defaultConfig();
  const sources = selection.sources ?? sourcesFromSourcePath(selection.sourcePath);
  config.language = selection.language;
  config.assets.include = unique([BASE_ASSET_ID, ...selection.assetIds, ...selection.sourceAssetIds]);
  config.sources = sources;
  config.targets.generic = selection.targets.includes('generic');
  config.targets.claude = selection.targets.includes('claude');
  config.targets.cursor.enabled = selection.targets.includes('cursor');

  return config;
}

export function buildSelectionDefaults({
  paramDefaults,
  existingConfig,
  detected,
}: BuildSelectionDefaultsOptions): InitSelectionDefaults {
  const conservative = conservativeDefaults();
  const detectedDefaults = detected ? defaultsFromDetected(detected) : {};
  const existingDefaults = existingConfig ? defaultsFromConfig(existingConfig) : {};
  const sourceDefaults = resolveSourceDefaults({
    paramDefaults,
    existingDefaults,
    detectedDefaults,
    conservative,
  });

  return {
    assetIds: normalizeAssetIds(
      paramDefaults?.assetIds ?? existingDefaults.assetIds ?? detectedDefaults.assetIds ?? conservative.assetIds,
    ),
    targets: uniqueTargets(
      paramDefaults?.targets ?? existingDefaults.targets ?? detectedDefaults.targets ?? conservative.targets,
    ),
    language: paramDefaults?.language ?? existingDefaults.language ?? detectedDefaults.language ?? conservative.language,
    sources: sourceDefaults.sources,
    sourcePath: sourceDefaults.sourcePath,
    sourceAssetIds: sourceDefaults.sourceAssetIds,
    evidence: detected?.evidence ?? conservative.evidence,
  };
}

export function applyGroupAction({ action, selectedIds, optionIds, lockedIds }: GroupActionOptions): string[] {
  if (action === 'select-all') {
    return unique([...lockedIds, ...optionIds]);
  }

  const locked = new Set(lockedIds);
  const options = new Set(optionIds);
  return unique(selectedIds.filter((id) => locked.has(id) || !options.has(id)));
}

function defaultsFromConfig(config: RulesConfig): Partial<InitSelectionDefaults> {
  return {
    assetIds: config.assets.include.filter((id) => BUILT_IN_ASSET_IDS.has(id)),
    targets: targetsFromConfig(config),
    language: config.language,
    sources: config.sources,
    sourcePath: config.sources[0]?.type === 'local' ? config.sources[0].path : null,
    sourceAssetIds: config.assets.include.filter((id) => !BUILT_IN_ASSET_IDS.has(id)),
    evidence: [],
  };
}

function defaultsFromDetected(detected: ProjectDetectionResult): Partial<InitSelectionDefaults> {
  return {
    assetIds: detected.assetIds,
    targets: detected.targets,
    language: DEFAULT_LANGUAGE,
    sources: [],
    sourcePath: null,
    sourceAssetIds: [],
    evidence: detected.evidence,
  };
}

function conservativeDefaults(): InitSelectionDefaults {
  return {
    assetIds: CONSERVATIVE_ASSET_IDS,
    targets: CONSERVATIVE_TARGETS,
    language: DEFAULT_LANGUAGE,
    sources: [],
    sourcePath: null,
    sourceAssetIds: [],
    evidence: [],
  };
}

function targetsFromConfig(config: RulesConfig): TargetId[] {
  const targets: TargetId[] = [];
  if (config.targets.generic) targets.push('generic');
  if (config.targets.claude) targets.push('claude');
  if (config.targets.cursor.enabled) targets.push('cursor');
  return targets;
}

function normalizeAssetIds(assetIds: string[]): string[] {
  return unique([BASE_ASSET_ID, ...assetIds]);
}

function resolveSourceDefaults({
  paramDefaults,
  existingDefaults,
  detectedDefaults,
  conservative,
}: {
  paramDefaults?: ParamDefaults;
  existingDefaults: Partial<InitSelectionDefaults>;
  detectedDefaults: Partial<InitSelectionDefaults>;
  conservative: InitSelectionDefaults;
}): SourceDefaults {
  if (paramDefaults && hasSourceOverride(paramDefaults)) {
    return sourceDefaultsFromParam(paramDefaults);
  }
  return sourceDefaultsFromPartial(existingDefaults)
    ?? sourceDefaultsFromPartial(detectedDefaults)
    ?? sourceDefaultsFromPartial(conservative)
    ?? { sources: [], sourcePath: null, sourceAssetIds: [] };
}

function hasSourceOverride(paramDefaults: ParamDefaults): boolean {
  return hasOwn(paramDefaults, 'sources') || hasOwn(paramDefaults, 'sourcePath') || hasOwn(paramDefaults, 'sourceAssetIds');
}

function sourceDefaultsFromParam(paramDefaults: ParamDefaults): SourceDefaults {
  const sources = paramDefaults.sources ?? sourcesFromSourcePath(paramDefaults.sourcePath ?? null);
  return {
    sources,
    sourcePath: firstSourcePath(sources),
    sourceAssetIds: paramDefaults.sourceAssetIds ?? [],
  };
}

function sourceDefaultsFromPartial(defaults: Partial<InitSelectionDefaults>): SourceDefaults | null {
  if (!defaults.sources && defaults.sourcePath === undefined && !defaults.sourceAssetIds) {
    return null;
  }

  const sources = defaults.sources ?? sourcesFromSourcePath(defaults.sourcePath ?? null);
  return {
    sources,
    sourcePath: firstSourcePath(sources),
    sourceAssetIds: defaults.sourceAssetIds ?? [],
  };
}

function sourcesFromSourcePath(sourcePath: string | null): SourceConfig[] {
  return sourcePath ? [{ type: 'local', path: sourcePath }] : [];
}

function firstSourcePath(sources: SourceConfig[]): string | null {
  return sources[0]?.type === 'local' ? sources[0].path : null;
}

function hasOwn<T extends object>(value: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function uniqueTargets(targets: TargetId[]): TargetId[] {
  return unique(targets);
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
