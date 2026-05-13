# Init Interactive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TTY(交互终端) guided `br-rules init` flow with project detection, grouped multi-select, source asset selection, and zero regression for parameter, non-TTY, and `sync` paths.

**Architecture:** Add small focused modules under `src/core/interactive/`: `project-detector` for read-only recommendation, `selection-model` for deterministic config mapping, and `tty-prompts` for keyboard interaction. Keep `syncCommand` scriptable and route all init decisions through `src/commands/init.ts`.

**Tech Stack:** TypeScript, commander, Node.js `readline`, Node.js `fs/promises`, existing `yaml` and `zod`, Vitest.

---

## File Structure

- Create `src/core/interactive/project-detector.ts`  
  Read project files and return recommendation signals, default selected asset ids, targets, and evidence messages.
- Create `src/core/interactive/selection-model.ts`  
  Define prompt option/group types, group defaults, config mapping, parameter/default precedence, and summary rendering data.
- Create `src/core/interactive/tty-prompts.ts`  
  Implement reusable keyboard single-select, multi-select, text prompt, confirmation prompt, and grouped select helpers.
- Modify `src/commands/init.ts`  
  Add `interactive?: boolean`, trigger routing, existing config handling, source validation/selection, summary confirmation, and reuse the current parameter path.
- Modify `src/cli.ts`  
  Add `--interactive` to `init`.
- Test `tests/project-detector.test.ts`  
  Cover package, Java/Spring, middleware, state-management signals, and generic fallback.
- Test `tests/selection-model.test.ts`  
  Cover default precedence, full-select/clear semantics, required base asset, required target, and config mapping.
- Test `tests/tty-prompts.test.ts`  
  Cover keyboard semantics with mocked streams: arrow movement, space toggling, Enter, select all, clear all, and required target validation.
- Test `tests/init-interactive.test.ts`  
  Cover command routing: non-TTY default, parameter path, `--interactive` non-TTY error, existing config choices, and `sync` remaining non-interactive.
- Modify `README.md`  
  Document `br-rules init` interactive behavior, `--interactive`, and non-TTY/parameter compatibility.

## Task 1: Project Detector

**Files:**
- Create: `src/core/interactive/project-detector.ts`
- Test: `tests/project-detector.test.ts`

- [ ] **Step 1: Write failing detector tests**

Create `tests/project-detector.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectProject } from '../src/core/interactive/project-detector.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'br-rules-detector-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('detectProject', () => {
  it('detects Vue TypeScript with Pinia as a Vue signal', async () => {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        dependencies: { vue: '^3.0.0', pinia: '^2.0.0' },
        devDependencies: { typescript: '^5.0.0', vitest: '^2.0.0' },
      }),
      'utf8',
    );
    await writeFile(join(root, 'tsconfig.json'), '{}', 'utf8');

    const result = await detectProject(root);

    expect(result.assetIds).toEqual(expect.arrayContaining([
      'base.behavior-basic',
      'language.typescript',
      'framework.vue',
      'practice.testing-basic',
      'practice.dependency-control',
      'practice.security-basic',
    ]));
    expect(result.assetIds).not.toContain('framework.react');
    expect(result.signals).toContain('state.pinia');
    expect(result.evidence.some((item) => item.includes('Pinia'))).toBe(true);
  });

  it('detects React TypeScript with Redux as a React signal', async () => {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({
        dependencies: { react: '^18.0.0', '@reduxjs/toolkit': '^2.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      }),
      'utf8',
    );

    const result = await detectProject(root);

    expect(result.assetIds).toEqual(expect.arrayContaining([
      'language.typescript',
      'framework.react',
      'practice.dependency-control',
      'practice.security-basic',
    ]));
    expect(result.signals).toContain('state.redux');
    expect(result.evidence.some((item) => item.includes('Redux'))).toBe(true);
  });

  it('detects Spring Boot Java and backend API contract', async () => {
    await writeFile(
      join(root, 'pom.xml'),
      [
        '<project>',
        '<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>',
        '<dependency><groupId>mysql</groupId><artifactId>mysql-connector-java</artifactId></dependency>',
        '<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-redis</artifactId></dependency>',
        '</project>',
      ].join('\n'),
      'utf8',
    );

    const result = await detectProject(root);

    expect(result.assetIds).toEqual(expect.arrayContaining([
      'language.java',
      'framework.spring-boot',
      'middleware.mysql',
      'middleware.redis',
      'practice.api-contract',
    ]));
    expect(result.signals).toEqual(expect.arrayContaining(['language.java', 'framework.spring-boot']));
  });

  it('falls back to base rules and default targets when no stack files exist', async () => {
    const result = await detectProject(root);

    expect(result.assetIds).toEqual([
      'base.behavior-basic',
      'practice.testing-basic',
      'practice.dependency-control',
      'practice.security-basic',
    ]);
    expect(result.targets).toEqual(['generic', 'claude', 'cursor']);
    expect(result.evidence).toContain('未检测到明确技术栈，使用基础规则和保守默认实践规则。');
  });
});
```

- [ ] **Step 2: Run detector test and verify it fails**

Run:

```bash
pnpm vitest run tests/project-detector.test.ts
```

Expected: FAIL because `src/core/interactive/project-detector.ts` does not exist.

- [ ] **Step 3: Implement project detector**

Create `src/core/interactive/project-detector.ts`:

```ts
import { readFile, access } from 'node:fs/promises';
import { join } from 'node:path';

export type ProjectDetectionResult = {
  assetIds: string[];
  targets: Array<'generic' | 'claude' | 'cursor'>;
  signals: string[];
  evidence: string[];
};

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const DEFAULT_PRACTICE_ASSETS = [
  'practice.testing-basic',
  'practice.dependency-control',
  'practice.security-basic',
];

export async function detectProject(root: string): Promise<ProjectDetectionResult> {
  const assets = new Set<string>(['base.behavior-basic']);
  const signals = new Set<string>();
  const evidence: string[] = [];
  const targets: Array<'generic' | 'claude' | 'cursor'> = ['generic', 'claude', 'cursor'];

  const pkg = await readPackageJson(root);
  if (pkg) detectPackage(pkg, assets, signals, evidence);

  if (await exists(join(root, 'tsconfig.json'))) {
    assets.add('language.typescript');
    signals.add('language.typescript');
    evidence.push('检测到 tsconfig.json，推荐 TypeScript 规则。');
  }

  const pom = await readOptional(join(root, 'pom.xml'));
  const gradle = await readFirstExisting([join(root, 'build.gradle'), join(root, 'build.gradle.kts')]);
  detectJavaBuild([pom, gradle].filter(Boolean).join('\n'), assets, signals, evidence);

  const hasBackend = assets.has('framework.spring-boot') || assets.has('language.java');
  for (const id of DEFAULT_PRACTICE_ASSETS) assets.add(id);
  if (hasBackend) assets.add('practice.api-contract');

  if (signals.size === 0) {
    evidence.push('未检测到明确技术栈，使用基础规则和保守默认实践规则。');
  }

  return { assetIds: [...assets], targets, signals: [...signals], evidence };
}

function detectPackage(
  pkg: PackageJson,
  assets: Set<string>,
  signals: Set<string>,
  evidence: string[],
): void {
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const has = (name: string) => Object.prototype.hasOwnProperty.call(deps, name);

  if (has('typescript')) {
    assets.add('language.typescript');
    signals.add('language.typescript');
    evidence.push('检测到 TypeScript 依赖，推荐 TypeScript 规则。');
  }
  if (has('vue') || has('pinia') || has('vuex')) {
    assets.add('language.typescript');
    assets.add('framework.vue');
    signals.add('framework.vue');
    evidence.push('检测到 Vue 相关依赖，推荐 Vue + TypeScript 规则。');
  }
  if (has('pinia')) {
    signals.add('state.pinia');
    evidence.push('检测到 Pinia，作为 Vue 框架推荐辅助信号。');
  }
  if (has('vuex')) {
    signals.add('state.vuex');
    evidence.push('检测到 Vuex，作为 Vue 框架推荐辅助信号。');
  }
  if (has('react') || has('redux') || has('@reduxjs/toolkit')) {
    assets.add('language.typescript');
    assets.add('framework.react');
    signals.add('framework.react');
    evidence.push('检测到 React 相关依赖，推荐 React + TypeScript 规则。');
  }
  if (has('redux') || has('@reduxjs/toolkit')) {
    signals.add('state.redux');
    evidence.push('检测到 Redux，作为 React 框架推荐辅助信号。');
  }
  if (has('mysql') || has('mysql2')) assets.add('middleware.mysql');
  if (has('redis') || has('ioredis')) assets.add('middleware.redis');
  if (has('amqplib') || has('kafkajs') || has('@nestjs/microservices')) assets.add('middleware.message-queue');
}

function detectJavaBuild(
  content: string,
  assets: Set<string>,
  signals: Set<string>,
  evidence: string[],
): void {
  if (!content) return;
  assets.add('language.java');
  signals.add('language.java');
  evidence.push('检测到 Java 构建文件，推荐 Java 规则。');
  if (/spring-boot|org\.springframework\.boot/.test(content)) {
    assets.add('framework.spring-boot');
    signals.add('framework.spring-boot');
    evidence.push('检测到 Spring Boot 依赖，推荐 Spring Boot 规则。');
  }
  if (/mysql|mariadb|jdbc:mysql/.test(content)) assets.add('middleware.mysql');
  if (/redis|lettuce|jedis/.test(content)) assets.add('middleware.redis');
  if (/kafka|amqp|rabbitmq|rocketmq/.test(content)) assets.add('middleware.message-queue');
}

async function readPackageJson(root: string): Promise<PackageJson | null> {
  const raw = await readOptional(join(root, 'package.json'));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

async function readFirstExisting(paths: string[]): Promise<string | null> {
  for (const path of paths) {
    const raw = await readOptional(path);
    if (raw) return raw;
  }
  return null;
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run detector tests**

Run:

```bash
pnpm vitest run tests/project-detector.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit detector**

```bash
git add src/core/interactive/project-detector.ts tests/project-detector.test.ts
git commit -m "feat: detect project defaults for interactive init"
```

## Task 2: Selection Model

**Files:**
- Create: `src/core/interactive/selection-model.ts`
- Test: `tests/selection-model.test.ts`

- [ ] **Step 1: Write failing selection model tests**

Create `tests/selection-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config.js';
import {
  applyGroupAction,
  buildInitConfigFromSelection,
  buildSelectionDefaults,
  type InteractiveInitSelection,
} from '../src/core/interactive/selection-model.js';

describe('selection model', () => {
  it('keeps base asset locked and maps selected assets to config', () => {
    const selection: InteractiveInitSelection = {
      language: 'zh-CN',
      assetIds: ['framework.vue', 'language.typescript'],
      sourcePath: null,
      sourceAssetIds: [],
      targets: ['generic', 'cursor'],
      sync: true,
      evidence: ['检测到 Vue'],
    };

    const config = buildInitConfigFromSelection(selection);

    expect(config.assets.include).toEqual([
      'base.behavior-basic',
      'framework.vue',
      'language.typescript',
    ]);
    expect(config.targets.generic).toBe(true);
    expect(config.targets.claude).toBe(false);
    expect(config.targets.cursor.enabled).toBe(true);
  });

  it('adds source config and selected source assets', () => {
    const config = buildInitConfigFromSelection({
      language: 'zh-CN',
      assetIds: ['language.java'],
      sourcePath: './team-rules-source',
      sourceAssetIds: ['team.starter-pack'],
      targets: ['generic'],
      sync: false,
      evidence: [],
    });

    expect(config.sources).toEqual([{ type: 'local', path: './team-rules-source' }]);
    expect(config.assets.include).toEqual([
      'base.behavior-basic',
      'language.java',
      'team.starter-pack',
    ]);
  });

  it('applies default precedence params over existing over detected over conservative', () => {
    const existing = defaultConfig();
    existing.assets.include = ['base.behavior-basic', 'framework.react'];
    existing.targets.claude = false;
    const defaults = buildSelectionDefaults({
      paramDefaults: { assetIds: ['framework.vue'], targets: ['cursor'] },
      existingConfig: existing,
      detected: {
        assetIds: ['framework.react', 'language.typescript'],
        targets: ['generic', 'claude', 'cursor'],
        signals: [],
        evidence: ['detected'],
      },
    });

    expect(defaults.assetIds).toEqual(['base.behavior-basic', 'framework.vue']);
    expect(defaults.targets).toEqual(['cursor']);
  });

  it('select all and clear only affect selectable items', () => {
    const all = applyGroupAction({
      action: 'select-all',
      selectedIds: ['base.behavior-basic'],
      optionIds: ['base.behavior-basic', 'language.typescript', 'language.java'],
      lockedIds: ['base.behavior-basic'],
    });
    expect(all).toEqual(['base.behavior-basic', 'language.typescript', 'language.java']);

    const cleared = applyGroupAction({
      action: 'clear',
      selectedIds: all,
      optionIds: ['base.behavior-basic', 'language.typescript', 'language.java'],
      lockedIds: ['base.behavior-basic'],
    });
    expect(cleared).toEqual(['base.behavior-basic']);
  });

  it('throws when output targets are empty', () => {
    expect(() => buildInitConfigFromSelection({
      language: 'zh-CN',
      assetIds: [],
      sourcePath: null,
      sourceAssetIds: [],
      targets: [],
      sync: true,
      evidence: [],
    })).toThrow('至少选择一个输出目标');
  });
});
```

- [ ] **Step 2: Run selection tests and verify they fail**

Run:

```bash
pnpm vitest run tests/selection-model.test.ts
```

Expected: FAIL because `selection-model.ts` does not exist.

- [ ] **Step 3: Implement selection model**

Create `src/core/interactive/selection-model.ts`:

```ts
import { defaultConfig, type RulesConfig } from '../config.js';
import type { ProjectDetectionResult } from './project-detector.js';

export type TargetId = 'generic' | 'claude' | 'cursor';

export type InteractiveInitSelection = {
  language: string;
  assetIds: string[];
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
  sourcePath: string | null;
  sourceAssetIds: string[];
  evidence: string[];
};

export type ParamDefaults = Partial<Omit<InitSelectionDefaults, 'evidence'>>;

const BASE_ASSET = 'base.behavior-basic';
const CONSERVATIVE_ASSETS = [
  BASE_ASSET,
  'practice.testing-basic',
  'practice.dependency-control',
  'practice.security-basic',
];
const DEFAULT_TARGETS: TargetId[] = ['generic', 'claude', 'cursor'];

export function buildSelectionDefaults(input: {
  paramDefaults?: ParamDefaults;
  existingConfig?: RulesConfig | null;
  detected?: ProjectDetectionResult | null;
}): InitSelectionDefaults {
  const existing = input.existingConfig ? defaultsFromConfig(input.existingConfig) : null;
  const detected = input.detected
    ? {
        assetIds: input.detected.assetIds,
        targets: input.detected.targets,
        language: 'zh-CN',
        sourcePath: null,
        sourceAssetIds: [],
      }
    : null;
  const conservative = {
    assetIds: CONSERVATIVE_ASSETS,
    targets: DEFAULT_TARGETS,
    language: 'zh-CN',
    sourcePath: null,
    sourceAssetIds: [],
  };

  const merged = {
    ...conservative,
    ...(detected ?? {}),
    ...(existing ?? {}),
    ...(input.paramDefaults ?? {}),
  };

  return {
    assetIds: withBase(merged.assetIds),
    targets: uniqueTargets(merged.targets),
    language: merged.language,
    sourcePath: merged.sourcePath,
    sourceAssetIds: unique(merged.sourceAssetIds),
    evidence: input.detected?.evidence ?? [],
  };
}

export function buildInitConfigFromSelection(selection: InteractiveInitSelection): RulesConfig {
  if (selection.targets.length === 0) throw new Error('至少选择一个输出目标');
  const config = defaultConfig();
  config.language = selection.language || 'zh-CN';
  config.assets.include = unique([...withBase(selection.assetIds), ...selection.sourceAssetIds]);
  config.targets.generic = selection.targets.includes('generic');
  config.targets.claude = selection.targets.includes('claude');
  config.targets.cursor.enabled = selection.targets.includes('cursor');
  if (selection.sourcePath) config.sources = [{ type: 'local', path: selection.sourcePath }];
  return config;
}

export function applyGroupAction(input: {
  action: 'select-all' | 'clear';
  selectedIds: string[];
  optionIds: string[];
  lockedIds?: string[];
}): string[] {
  const locked = new Set(input.lockedIds ?? []);
  if (input.action === 'select-all') return unique([...input.selectedIds, ...input.optionIds]);
  return input.selectedIds.filter((id) => locked.has(id) || !input.optionIds.includes(id));
}

function defaultsFromConfig(config: RulesConfig): Omit<InitSelectionDefaults, 'evidence'> {
  const targets: TargetId[] = [];
  if (config.targets.generic) targets.push('generic');
  if (config.targets.claude) targets.push('claude');
  if (config.targets.cursor.enabled) targets.push('cursor');
  return {
    assetIds: config.assets.include.filter((id) => !id.startsWith('team.')),
    targets,
    language: config.language,
    sourcePath: config.sources[0]?.path ?? null,
    sourceAssetIds: config.assets.include.filter((id) => id.startsWith('team.')),
  };
}

function withBase(assetIds: string[]): string[] {
  return unique([BASE_ASSET, ...assetIds]);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function uniqueTargets(values: TargetId[]): TargetId[] {
  return [...new Set(values.filter((item): item is TargetId => ['generic', 'claude', 'cursor'].includes(item)))];
}
```

- [ ] **Step 4: Run selection tests**

Run:

```bash
pnpm vitest run tests/selection-model.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit selection model**

```bash
git add src/core/interactive/selection-model.ts tests/selection-model.test.ts
git commit -m "feat: add interactive init selection model"
```

## Task 3: TTY Prompt Helpers

**Files:**
- Create: `src/core/interactive/tty-prompts.ts`
- Test: `tests/tty-prompts.test.ts`

- [ ] **Step 1: Write failing prompt tests**

Create `tests/tty-prompts.test.ts`:

```ts
import { PassThrough, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { promptMultiSelect, promptSingleSelect } from '../src/core/interactive/tty-prompts.js';

class MemoryWritable extends Writable {
  chunks: string[] = [];
  _write(chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.chunks.push(chunk.toString('utf8'));
    callback();
  }
}

function ttyInput(): PassThrough & { isTTY: true; setRawMode: (value: boolean) => void; rawModeValues: boolean[] } {
  const input = new PassThrough() as PassThrough & {
    isTTY: true;
    setRawMode: (value: boolean) => void;
    rawModeValues: boolean[];
  };
  input.isTTY = true;
  input.rawModeValues = [];
  input.setRawMode = (value: boolean) => { input.rawModeValues.push(value); };
  return input;
}

describe('tty prompts', () => {
  it('moves, toggles, and confirms multi select', async () => {
    const input = ttyInput();
    const output = new MemoryWritable();

    const resultPromise = promptMultiSelect({
      message: '选择语言',
      options: [
        { id: 'select-all', label: '全选当前分组', kind: 'action', action: 'select-all' },
        { id: 'clear', label: '清空当前分组', kind: 'action', action: 'clear' },
        { id: 'typescript', label: 'TypeScript' },
        { id: 'java', label: 'Java' },
      ],
      selectedIds: [],
      input,
      output,
    });

    input.write('\x1b[B');
    input.write('\x1b[B');
    input.write(' ');
    input.write('\r');

    await expect(resultPromise).resolves.toEqual(['typescript']);
    expect(input.rawModeValues).toEqual([true, false]);
  });

  it('select all and clear keep locked item', async () => {
    const input = ttyInput();
    const output = new MemoryWritable();

    const resultPromise = promptMultiSelect({
      message: '基础规则',
      options: [
        { id: 'select-all', label: '全选当前分组', kind: 'action', action: 'select-all' },
        { id: 'clear', label: '清空当前分组', kind: 'action', action: 'clear' },
        { id: 'base.behavior-basic', label: '基础规则', locked: true },
        { id: 'language.typescript', label: 'TypeScript' },
      ],
      selectedIds: ['base.behavior-basic'],
      input,
      output,
    });

    input.write(' ');
    input.write('\x1b[B');
    input.write(' ');
    input.write('\r');

    await expect(resultPromise).resolves.toEqual(['base.behavior-basic']);
  });

  it('requires at least one item when minSelection is 1', async () => {
    const input = ttyInput();
    const output = new MemoryWritable();

    const resultPromise = promptMultiSelect({
      message: '输出目标',
      options: [
        { id: 'generic', label: 'AGENTS.md' },
      ],
      selectedIds: [],
      minSelection: 1,
      input,
      output,
    });

    input.write('\r');
    input.write(' ');
    input.write('\r');

    await expect(resultPromise).resolves.toEqual(['generic']);
    expect(output.chunks.join('')).toContain('至少选择 1 项');
  });

  it('confirms single select with enter', async () => {
    const input = ttyInput();
    const output = new MemoryWritable();

    const resultPromise = promptSingleSelect({
      message: '已有配置',
      options: [
        { id: 'reconfigure', label: '重新选择' },
        { id: 'sync-only', label: '只同步' },
      ],
      input,
      output,
    });

    input.write('\x1b[B');
    input.write('\r');

    await expect(resultPromise).resolves.toBe('sync-only');
  });
});
```

- [ ] **Step 2: Run prompt tests and verify they fail**

Run:

```bash
pnpm vitest run tests/tty-prompts.test.ts
```

Expected: FAIL because `tty-prompts.ts` does not exist.

- [ ] **Step 3: Implement prompt helpers**

Create `src/core/interactive/tty-prompts.ts`:

```ts
import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type PromptInput = Readable & { isTTY?: boolean; setRawMode?: (mode: boolean) => void };
export type PromptOutput = Writable;

export type PromptOption = {
  id: string;
  label: string;
  locked?: boolean;
  kind?: 'item' | 'action';
  action?: 'select-all' | 'clear';
};

export async function promptSingleSelect(input: {
  message: string;
  options: Array<{ id: string; label: string }>;
  input?: PromptInput;
  output?: PromptOutput;
}): Promise<string> {
  const stdin = input.input ?? process.stdin;
  const stdout = input.output ?? process.stdout;
  return withKeypress(stdin, stdout, async () => {
    let cursor = 0;
    renderSingle(stdout, input.message, input.options, cursor);
    return await new Promise<string>((resolve) => {
      const onKey = (_str: string, key: readline.Key) => {
        if (key.name === 'up') cursor = Math.max(0, cursor - 1);
        else if (key.name === 'down') cursor = Math.min(input.options.length - 1, cursor + 1);
        else if (key.name === 'return') {
          stdin.off('keypress', onKey);
          stdout.write('\n');
          resolve(input.options[cursor].id);
          return;
        }
        renderSingle(stdout, input.message, input.options, cursor);
      };
      stdin.on('keypress', onKey);
    });
  });
}

export async function promptMultiSelect(input: {
  message: string;
  options: PromptOption[];
  selectedIds: string[];
  minSelection?: number;
  input?: PromptInput;
  output?: PromptOutput;
}): Promise<string[]> {
  const stdin = input.input ?? process.stdin;
  const stdout = input.output ?? process.stdout;
  return withKeypress(stdin, stdout, async () => {
    let cursor = 0;
    let selected = new Set(input.selectedIds);
    const locked = new Set(input.options.filter((o) => o.locked).map((o) => o.id));
    for (const id of locked) selected.add(id);
    renderMulti(stdout, input.message, input.options, cursor, selected);
    return await new Promise<string[]>((resolve) => {
      const onKey = (_str: string, key: readline.Key) => {
        if (key.name === 'up') cursor = Math.max(0, cursor - 1);
        else if (key.name === 'down') cursor = Math.min(input.options.length - 1, cursor + 1);
        else if (key.name === 'space') selected = toggle(input.options[cursor], input.options, selected, locked);
        else if (key.name === 'return') {
          const selectedItems = [...selected].filter((id) => input.options.some((o) => o.id === id && o.kind !== 'action'));
          if ((input.minSelection ?? 0) > selectedItems.length) {
            stdout.write(`\n至少选择 ${input.minSelection} 项\n`);
          } else {
            stdin.off('keypress', onKey);
            stdout.write('\n');
            resolve(selectedItems);
            return;
          }
        }
        renderMulti(stdout, input.message, input.options, cursor, selected);
      };
      stdin.on('keypress', onKey);
    });
  });
}

export async function promptText(input: {
  message: string;
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}): Promise<string> {
  const rl = readline.createInterface({
    input: input.input ?? process.stdin,
    output: input.output ?? process.stdout,
  });
  return await new Promise<string>((resolve) => {
    rl.question(`${input.message}\n> `, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function toggle(option: PromptOption, options: PromptOption[], selected: Set<string>, locked: Set<string>): Set<string> {
  const next = new Set(selected);
  if (option.kind === 'action' && option.action === 'select-all') {
    for (const item of options) if (item.kind !== 'action') next.add(item.id);
    return next;
  }
  if (option.kind === 'action' && option.action === 'clear') {
    for (const item of options) if (item.kind !== 'action' && !locked.has(item.id)) next.delete(item.id);
    return next;
  }
  if (option.locked) return next;
  if (next.has(option.id)) next.delete(option.id);
  else next.add(option.id);
  return next;
}

async function withKeypress<T>(stdin: PromptInput, stdout: PromptOutput, run: () => Promise<T>): Promise<T> {
  readline.emitKeypressEvents(stdin);
  if (stdin.isTTY && stdin.setRawMode) stdin.setRawMode(true);
  try {
    return await run();
  } finally {
    if (stdin.isTTY && stdin.setRawMode) stdin.setRawMode(false);
    stdin.pause();
    stdout.write('\u001b[?25h');
  }
}

function renderSingle(stdout: PromptOutput, message: string, options: Array<{ id: string; label: string }>, cursor: number): void {
  stdout.write('\u001b[2J\u001b[0f');
  stdout.write(`${message}\n`);
  options.forEach((option, index) => {
    stdout.write(`${index === cursor ? '>' : ' '} ${option.label}\n`);
  });
}

function renderMulti(stdout: PromptOutput, message: string, options: PromptOption[], cursor: number, selected: Set<string>): void {
  stdout.write('\u001b[2J\u001b[0f');
  stdout.write(`${message}\n`);
  options.forEach((option, index) => {
    const prefix = index === cursor ? '>' : ' ';
    const marker = option.kind === 'action' ? ' ' : selected.has(option.id) ? '●' : '○';
    const lock = option.locked ? ' [必选]' : '';
    stdout.write(`${prefix} ${marker} ${option.label}${lock}\n`);
  });
}
```

- [ ] **Step 4: Run prompt tests**

Run:

```bash
pnpm vitest run tests/tty-prompts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit prompt helpers**

```bash
git add src/core/interactive/tty-prompts.ts tests/tty-prompts.test.ts
git commit -m "feat: add TTY prompts for interactive init"
```

## Task 4: Interactive Init Orchestrator

**Files:**
- Modify: `src/commands/init.ts`
- Test: `tests/init-interactive.test.ts`

- [ ] **Step 1: Write failing init routing tests**

Create `tests/init-interactive.test.ts`:

```ts
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { initCommand, shouldUseInteractiveInit } from '../src/commands/init.js';
import { defaultConfig, writeConfig } from '../src/core/config.js';

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'br-rules-init-interactive-'));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe('shouldUseInteractiveInit', () => {
  it('uses interactive for TTY with no selection options', () => {
    expect(shouldUseInteractiveInit({}, { isTTY: true })).toBe(true);
  });

  it('does not use interactive for non-TTY without --interactive', () => {
    expect(shouldUseInteractiveInit({}, { isTTY: false })).toBe(false);
  });

  it('does not use interactive when selection parameters exist', () => {
    expect(shouldUseInteractiveInit({ stack: 'vue,typescript' }, { isTTY: true })).toBe(false);
  });

  it('uses interactive when --interactive is explicit even with params', () => {
    expect(shouldUseInteractiveInit({ interactive: true, stack: 'vue,typescript' }, { isTTY: true })).toBe(true);
  });
});

describe('initCommand routing', () => {
  it('keeps non-TTY default behavior', async () => {
    await initCommand({ sync: false }, root, { isTTY: false });
    const config = JSON.parse(await readFile(join(root, '.ai-rules', 'config.json'), 'utf8'));
    expect(config.assets.include).toEqual(['base.behavior-basic']);
  });

  it('keeps parameter path non-interactive', async () => {
    await initCommand({ stack: 'vue,typescript', sync: false }, root, { isTTY: true });
    const config = JSON.parse(await readFile(join(root, '.ai-rules', 'config.json'), 'utf8'));
    expect(config.assets.include).toEqual(expect.arrayContaining(['framework.vue', 'language.typescript']));
  });

  it('errors clearly for --interactive in non-TTY', async () => {
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((msg: string) => { errors.push(msg); });
    process.exitCode = 0;

    await initCommand({ interactive: true, sync: false }, root, { isTTY: false });

    expect(process.exitCode).toBe(1);
    expect(errors.some((msg) => msg.includes('当前终端不支持交互'))).toBe(true);
  });

  it('sync-only choice for existing config does not overwrite config', async () => {
    const config = defaultConfig();
    config.assets.include = ['base.behavior-basic', 'framework.react'];
    await writeConfig(root, config);

    await initCommand(
      { interactive: true, sync: false },
      root,
      {
        isTTY: true,
        prompts: {
          existingConfigAction: async () => 'sync-only',
        },
      },
    );

    const saved = JSON.parse(await readFile(join(root, '.ai-rules', 'config.json'), 'utf8'));
    expect(saved.assets.include).toEqual(['base.behavior-basic', 'framework.react']);
  });

  it('interactive writes config from prompt selection after summary confirmation', async () => {
    await writeFile(
      join(root, 'package.json'),
      JSON.stringify({ dependencies: { vue: '^3.0.0', pinia: '^2.0.0' }, devDependencies: { typescript: '^5.0.0' } }),
      'utf8',
    );

    await initCommand(
      { interactive: true, sync: false },
      root,
      {
        isTTY: true,
        prompts: {
          existingConfigAction: async () => 'reconfigure',
          selectAssets: async () => ['base.behavior-basic', 'framework.vue', 'language.typescript'],
          selectTargets: async () => ['generic', 'cursor'],
          sourcePath: async () => null,
          confirmSummary: async () => true,
        },
      },
    );

    const saved = JSON.parse(await readFile(join(root, '.ai-rules', 'config.json'), 'utf8'));
    expect(saved.assets.include).toEqual(['base.behavior-basic', 'framework.vue', 'language.typescript']);
    expect(saved.targets.claude).toBe(false);
  });
});
```

- [ ] **Step 2: Run init interactive tests and verify they fail**

Run:

```bash
pnpm vitest run tests/init-interactive.test.ts
```

Expected: FAIL because `shouldUseInteractiveInit` and the injectable interactive options do not exist.

- [ ] **Step 3: Refactor init command with injectable prompt API**

Modify `src/commands/init.ts` so its public shape is:

```ts
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { defaultConfig, loadConfig, writeConfig, type RulesConfig } from '../core/config.js';
import { resolveStacksToAssets } from '../core/assets.js';
import { auditSourcePath } from '../core/source.js';
import { detectProject } from '../core/interactive/project-detector.js';
import {
  buildInitConfigFromSelection,
  buildSelectionDefaults,
  type InteractiveInitSelection,
  type TargetId,
} from '../core/interactive/selection-model.js';
import { promptMultiSelect, promptSingleSelect, promptText } from '../core/interactive/tty-prompts.js';
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

export function shouldUseInteractiveInit(options: InitOptions, runtime: InitRuntime = {}): boolean {
  if (options.interactive) return runtime.isTTY ?? Boolean(process.stdin.isTTY);
  if (hasSelectionOptions(options)) return false;
  return runtime.isTTY ?? Boolean(process.stdin.isTTY);
}
```

Then keep the current parameter behavior in a helper:

```ts
async function runParameterInit(options: InitOptions, root: string): Promise<void> {
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
  if (options.source) config.sources.push({ type: 'local', path: options.source });
  if (options.asset) {
    const assetIds = options.asset.split(',').map((a) => a.trim()).filter(Boolean);
    for (const id of assetIds) if (!config.assets.include.includes(id)) config.assets.include.push(id);
  }
  await writeConfig(root, config);
  console.log('Created .ai-rules/config.json');
  if (options.sync !== false) await syncCommand(root);
}
```

Implement `initCommand` routing:

```ts
export async function initCommand(options: InitOptions, root = process.cwd(), runtime: InitRuntime = {}): Promise<void> {
  const isTTY = runtime.isTTY ?? Boolean(process.stdin.isTTY);
  if (options.interactive && !isTTY) {
    console.error('当前终端不支持交互，请使用参数模式，例如 br-rules init --stack vue,typescript。');
    process.exitCode = 1;
    return;
  }
  if (!shouldUseInteractiveInit(options, { ...runtime, isTTY })) {
    await runParameterInit(options, root);
    return;
  }
  await runInteractiveInit(options, root, runtime);
}
```

Add `hasSelectionOptions`, existing config check, defaults, source validation, and summary:

```ts
function hasSelectionOptions(options: InitOptions): boolean {
  return Boolean(options.language || options.targets || options.stack || options.source || options.asset || options.sync === false);
}

async function configExists(root: string): Promise<boolean> {
  try {
    await access(join(root, '.ai-rules/config.json'));
    return true;
  } catch {
    return false;
  }
}

async function runInteractiveInit(options: InitOptions, root: string, runtime: InitRuntime): Promise<void> {
  let existingConfig: RulesConfig | null = null;
  if (await configExists(root)) {
    existingConfig = await loadConfig(root);
    const action = runtime.prompts?.existingConfigAction
      ? await runtime.prompts.existingConfigAction()
      : await promptExistingConfigAction();
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

  const assetIds = runtime.prompts?.selectAssets
    ? await runtime.prompts.selectAssets(defaults.assetIds)
    : await promptBuiltInAssets(defaults.assetIds);
  const targets = runtime.prompts?.selectTargets
    ? await runtime.prompts.selectTargets(defaults.targets)
    : await promptTargets(defaults.targets);
  const sourcePath = runtime.prompts?.sourcePath ? await runtime.prompts.sourcePath() : null;
  const sourceAssetIds = sourcePath ? await chooseSourceAssets(root, sourcePath, runtime) : [];
  const selection: InteractiveInitSelection = {
    language: defaults.language,
    assetIds,
    sourcePath,
    sourceAssetIds,
    targets,
    sync: options.sync !== false,
    evidence: defaults.evidence,
  };
  const confirmed = runtime.prompts?.confirmSummary
    ? await runtime.prompts.confirmSummary(selection)
    : await confirmSummary(selection);
  if (!confirmed) return;
  await writeConfig(root, buildInitConfigFromSelection(selection));
  console.log('Created .ai-rules/config.json');
  if (selection.sync) await syncCommand(root);
}
```

Use these supporting helpers in the same file:

```ts
function parseParamDefaults(options: InitOptions) {
  return {
    assetIds: options.stack ? resolveStacksToAssets(options.stack.split(',').map((s) => s.trim()).filter(Boolean)) : undefined,
    targets: options.targets ? options.targets.split(',').map((t) => t.trim()).filter((t): t is TargetId => ['generic', 'claude', 'cursor'].includes(t)) : undefined,
    language: options.language,
    sourcePath: options.source ?? undefined,
    sourceAssetIds: options.asset ? options.asset.split(',').map((a) => a.trim()).filter(Boolean) : undefined,
  };
}

async function chooseSourceAssets(root: string, sourcePath: string, runtime: InitRuntime): Promise<string[]> {
  const audit = await auditSourcePath(root, sourcePath);
  if (audit.errors.length > 0 || !audit.loaded) {
    for (const error of audit.errors) console.error(`✗ ${error}`);
    return [];
  }
  const ids = audit.loaded.assets.map((asset) => asset.id);
  if (ids.length === 0) {
    console.warn('该规则源没有可选资产，已跳过。');
    return [];
  }
  return runtime.prompts?.selectSourceAssets ? await runtime.prompts.selectSourceAssets(ids) : ids;
}
```

For real prompts, start with a simple grouped implementation in this task; Task 5 can polish labels:

```ts
async function promptExistingConfigAction(): Promise<ExistingConfigAction> {
  return await promptSingleSelect({
    message: '检测到已有 .ai-rules/config.json，请选择操作',
    options: [
      { id: 'reconfigure', label: '基于现有配置重新选择并覆盖配置' },
      { id: 'sync-only', label: '保持现有配置，只执行同步' },
      { id: 'exit', label: '退出，不做任何修改' },
    ],
  }) as ExistingConfigAction;
}

async function confirmSummary(selection: InteractiveInitSelection): Promise<boolean> {
  console.log('即将写入配置摘要：');
  console.log(`语言: ${selection.language}`);
  console.log(`内置资产: ${selection.assetIds.join(', ') || '无'}`);
  console.log(`规则源: ${selection.sourcePath ?? '无'}`);
  console.log(`规则源资产: ${selection.sourceAssetIds.join(', ') || '无'}`);
  console.log(`输出目标: ${selection.targets.join(', ')}`);
  console.log(`执行同步: ${selection.sync ? '是' : '否'}`);
  if (selection.evidence.length > 0) {
    console.log('识别证据:');
    for (const item of selection.evidence) console.log(`- ${item}`);
  }
  const answer = await promptSingleSelect({
    message: '确认写入配置吗？',
    options: [
      { id: 'yes', label: '确认写入' },
      { id: 'no', label: '取消，不写文件' },
    ],
  });
  return answer === 'yes';
}
```

- [ ] **Step 4: Run init interactive tests**

Run:

```bash
pnpm vitest run tests/init-interactive.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run existing init/source regression tests**

Run:

```bash
pnpm vitest run tests/config-version.test.ts tests/source.test.ts tests/source-v04.test.ts tests/sync-target-cleanup.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit init orchestrator**

```bash
git add src/commands/init.ts tests/init-interactive.test.ts
git commit -m "feat: route init through interactive orchestrator"
```

## Task 5: CLI Wiring, Real Group Labels, Source Retry, Docs

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/commands/init.ts`
- Modify: `README.md`
- Test: update `tests/init-interactive.test.ts`

- [ ] **Step 1: Add failing CLI option and source retry tests**

Append to `tests/init-interactive.test.ts`:

```ts
it('retries invalid source path then accepts skip in interactive mode', async () => {
  const errors: string[] = [];
  vi.spyOn(console, 'error').mockImplementation((msg: string) => { errors.push(msg); });

  await initCommand(
    { interactive: true, sync: false },
    root,
    {
      isTTY: true,
      prompts: {
        existingConfigAction: async () => 'reconfigure',
        selectAssets: async () => ['base.behavior-basic'],
        selectTargets: async () => ['generic'],
        sourcePath: vi.fn()
          .mockResolvedValueOnce('./missing-source')
          .mockResolvedValueOnce(null),
        confirmSummary: async () => true,
      },
    },
  );

  const saved = JSON.parse(await readFile(join(root, '.ai-rules', 'config.json'), 'utf8'));
  expect(saved.sources).toEqual([]);
  expect(errors.some((msg) => msg.includes('Source path not found'))).toBe(true);
});
```

Add a CLI check with `--help` in a new test if this repo already tests CLI help; otherwise verify manually in Step 4.

- [ ] **Step 2: Run the new retry test and verify it fails**

Run:

```bash
pnpm vitest run tests/init-interactive.test.ts
```

Expected: FAIL because source retry currently returns empty assets without asking again.

- [ ] **Step 3: Implement source retry loop and grouped prompt labels**

In `src/commands/init.ts`, replace the single `sourcePath` read with:

```ts
const sourceSelection = await chooseSourceWithRetry(root, runtime);
```

Add:

```ts
async function chooseSourceWithRetry(root: string, runtime: InitRuntime): Promise<{ sourcePath: string | null; sourceAssetIds: string[] }> {
  while (true) {
    const sourcePath = runtime.prompts?.sourcePath ? await runtime.prompts.sourcePath() : await promptSourcePath();
    if (!sourcePath) return { sourcePath: null, sourceAssetIds: [] };
    const audit = await auditSourcePath(root, sourcePath);
    if (audit.errors.length > 0 || !audit.loaded) {
      for (const error of audit.errors) console.error(`✗ ${error}`);
      if (runtime.prompts?.sourcePath) continue;
      const action = await promptSingleSelect({
        message: '规则源无效，请选择下一步',
        options: [
          { id: 'retry', label: '重新输入' },
          { id: 'skip', label: '跳过团队规则源' },
          { id: 'exit', label: '退出向导' },
        ],
      });
      if (action === 'retry') continue;
      if (action === 'skip') return { sourcePath: null, sourceAssetIds: [] };
      throw new Error('用户退出向导');
    }
    const ids = audit.loaded.assets.map((asset) => asset.id);
    if (ids.length === 0) {
      console.warn('该规则源没有可选资产，已跳过。');
      return { sourcePath: null, sourceAssetIds: [] };
    }
    const sourceAssetIds = runtime.prompts?.selectSourceAssets
      ? await runtime.prompts.selectSourceAssets(ids)
      : await promptMultiSelect({
          message: '选择团队规则源资产',
          selectedIds: ids,
          options: [
            { id: 'select-all', label: '全选当前分组', kind: 'action', action: 'select-all' },
            { id: 'clear', label: '清空当前分组', kind: 'action', action: 'clear' },
            ...ids.map((id) => ({ id, label: id })),
          ],
        });
    return { sourcePath, sourceAssetIds };
  }
}
```

Add the source path text prompt:

```ts
async function promptSourcePath(): Promise<string | null> {
  const action = await promptSingleSelect({
    message: '是否添加团队规则源？',
    options: [
      { id: 'skip', label: '跳过团队规则源' },
      { id: 'input', label: '输入 source(规则源) 路径' },
    ],
  });
  if (action === 'skip') return null;
  const value = await promptText({ message: '请输入 source(规则源) 路径' });
  return value || null;
}
```

Implement real built-in asset group labels in `promptBuiltInAssets`:

```ts
async function promptBuiltInAssets(defaults: string[]): Promise<string[]> {
  let selected = new Set(defaults);
  selected = new Set(await promptMultiSelect({
    message: '选择语言规则',
    selectedIds: [...selected],
    options: groupOptions([
      ['language.typescript', 'TypeScript'],
      ['language.java', 'Java'],
    ]),
  }));
  for (const id of await promptMultiSelect({
    message: '选择框架规则',
    selectedIds: [...selected],
    options: groupOptions([
      ['framework.react', 'React'],
      ['framework.vue', 'Vue'],
      ['framework.spring-boot', 'Spring Boot'],
    ]),
  })) selected.add(id);
  for (const id of await promptMultiSelect({
    message: '选择中间件规则',
    selectedIds: [...selected],
    options: groupOptions([
      ['middleware.mysql', 'MySQL'],
      ['middleware.redis', 'Redis'],
      ['middleware.message-queue', 'MQ(消息队列)'],
    ]),
  })) selected.add(id);
  for (const id of await promptMultiSelect({
    message: '选择工程实践规则',
    selectedIds: [...selected],
    options: groupOptions([
      ['practice.testing-basic', '测试'],
      ['practice.dependency-control', '依赖控制'],
      ['practice.security-basic', '安全'],
      ['practice.api-contract', 'API 契约'],
    ]),
  })) selected.add(id);
  selected.add('base.behavior-basic');
  return [...selected];
}

function groupOptions(items: Array<[string, string]>) {
  return [
    { id: 'select-all', label: '全选当前分组', kind: 'action' as const, action: 'select-all' as const },
    { id: 'clear', label: '清空当前分组', kind: 'action' as const, action: 'clear' as const },
    ...items.map(([id, label]) => ({ id, label })),
  ];
}
```

Update `promptTargets`:

```ts
async function promptTargets(defaults: TargetId[]): Promise<TargetId[]> {
  return await promptMultiSelect({
    message: '选择输出目标',
    selectedIds: defaults,
    minSelection: 1,
    options: groupOptions([
      ['generic', 'AGENTS.md'],
      ['claude', 'CLAUDE.md'],
      ['cursor', 'Cursor Rules'],
    ]),
  }) as TargetId[];
}
```

Update `src/cli.ts`:

```ts
.option('--interactive', 'Force interactive setup wizard')
```

Update `README.md` command list:

```md
br-rules init [--interactive] [--stack <stacks>] [--no-sync] [--language <lang>] [--targets <targets>]
```

Add a short section:

```md
### Interactive Init

在真实 TTY(交互终端) 中执行不带选择类参数的 `br-rules init` 会进入分组向导：

- 上下箭头移动
- 空格选择/取消
- Enter 确认
- 每个可调整分组支持“全选当前分组”和“清空当前分组”

非 TTY(非交互终端) 和带 `--stack`、`--targets`、`--source`、`--asset` 等参数的用法保持脚本兼容。需要强制进入向导时使用 `br-rules init --interactive`。
```

- [ ] **Step 4: Run focused tests and CLI help**

Run:

```bash
pnpm vitest run tests/init-interactive.test.ts
pnpm tsx src/cli.ts init --help
```

Expected: tests PASS, help includes `--interactive`.

- [ ] **Step 5: Commit wiring and docs**

```bash
git add src/cli.ts src/commands/init.ts tests/init-interactive.test.ts README.md
git commit -m "feat: wire interactive init CLI"
```

## Task 6: Full Regression and Manual TTY Smoke

**Files:**
- Modify if needed: tests changed by failures from this task only.

- [ ] **Step 1: Run all tests**

Run:

```bash
pnpm test
```

Expected: PASS.

- [ ] **Step 2: Run typecheck**

Run:

```bash
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 3: Run build**

Run:

```bash
pnpm build
```

Expected: PASS and `dist/cli.js` exists.

- [ ] **Step 4: Smoke non-TTY default behavior**

Run:

```bash
tmp="$(mktemp -d)"
node dist/cli.js init --no-sync --stack vue,typescript --targets generic --source "" 2>/tmp/br-rules-noninteractive.err || true
rm -rf "$tmp"
```

If this command is awkward because `--source ""` is parsed as an empty parameter, instead run the existing tested path:

```bash
tmp="$(mktemp -d)"
(cd "$tmp" && node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js init --no-sync --stack vue,typescript --targets generic)
cat "$tmp/.ai-rules/config.json"
rm -rf "$tmp"
```

Expected: config contains `framework.vue`, `language.typescript`, and only `generic` target enabled.

- [ ] **Step 5: Manual TTY smoke**

Run in a real terminal:

```bash
tmp="$(mktemp -d)"
cd "$tmp"
printf '{"dependencies":{"vue":"^3.0.0","pinia":"^2.0.0"},"devDependencies":{"typescript":"^5.0.0"}}\n' > package.json
node /Users/lizhenwei/workspace/vueworkspace/bairong/br-ai-rules/dist/cli.js init --no-sync --interactive
```

Expected:

- Language/framework defaults include TypeScript and Vue.
- Evidence mentions Pinia.
- Each adjustable group shows `全选当前分组` and `清空当前分组`.
- Output target group refuses empty selection.
- Final config matches summary.

- [ ] **Step 6: Run git status and commit final fixes if needed**

Run:

```bash
git status --short
```

Expected: only intentional files changed. If Task 6 required fixes:

```bash
git add src/commands/init.ts src/cli.ts src/core/interactive/project-detector.ts src/core/interactive/selection-model.ts src/core/interactive/tty-prompts.ts tests/project-detector.test.ts tests/selection-model.test.ts tests/tty-prompts.test.ts tests/init-interactive.test.ts README.md
git commit -m "test: verify interactive init flow"
```

## Self-Review Checklist

- Spec coverage:
  - TTY interactive init: Tasks 3, 4, 5.
  - Non-TTY default behavior: Tasks 4, 6.
  - Parameter compatibility: Tasks 4, 6.
  - `--interactive` forced mode: Tasks 4, 5.
  - `sync` remains non-interactive: Tasks 4, 6 through unchanged `syncCommand`.
  - Grouped selection with full-select/clear: Tasks 2, 3, 5.
  - Project detection and state-management signals: Task 1.
  - Source path and source asset selection: Tasks 4, 5.
- Placeholder scan: no unresolved placeholder markers should remain in this plan.
- Type consistency:
  - `InitOptions`, `InitRuntime`, `ExistingConfigAction`, `TargetId`, and `InteractiveInitSelection` are defined before use.
  - `buildSelectionDefaults`, `buildInitConfigFromSelection`, `promptMultiSelect`, and `promptSingleSelect` signatures are used consistently.
