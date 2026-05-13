import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSource, loadAllSources, validateSourceAssets } from '../src/core/source.js';
import { initCommand } from '../src/commands/init.js';
import { syncCommand } from '../src/commands/sync.js';
import { sourceListCommand } from '../src/commands/source-list.js';
import { assetListCommand } from '../src/commands/asset-list.js';
import { loadConfig } from '../src/core/config.js';
import { GENERATED_PATH } from '../src/core/config.js';

let tmpDir: string;
let sourceDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'br-rules-source-test-'));
  sourceDir = join(tmpDir, 'team-source');
  await mkdir(join(sourceDir, 'assets'), { recursive: true });
  await mkdir(join(sourceDir, 'rules'), { recursive: true });

  await writeFile(join(sourceDir, 'br-rules.source.json'), JSON.stringify({
    name: 'team-ai-rules',
    version: '0.1.0',
    description: 'Test team source',
    assets: ['team.backend-standard'],
  }));

  await writeFile(join(sourceDir, 'assets', 'team.backend-standard.yaml'), [
    'id: team.backend-standard',
    'name: Team Backend Standard',
    'version: 0.1.0',
    'layer: team',
    'category: team',
    'description: Team backend rules',
    'rules:',
    '  - team.no-raw-exception',
    '  - team.api-language',
  ].join('\n'));

  await writeFile(join(sourceDir, 'rules', 'team.no-raw-exception.yaml'), [
    'id: team.no-raw-exception',
    'name: No Raw RuntimeException',
    'category: backend',
    'severity: must',
    'appliesTo:',
    '  targets:',
    '    - generic',
    '    - claude',
    '    - cursor',
    '  stacks:',
    '    - spring-boot',
    '    - java',
    'content:',
    '  zh-CN: |',
    '    Do not throw raw RuntimeException.',
  ].join('\n'));

  await writeFile(join(sourceDir, 'rules', 'team.api-language.yaml'), [
    'id: team.api-language',
    'name: API Field Description in Chinese',
    'category: docs',
    'severity: should',
    'appliesTo:',
    '  targets:',
    '    - generic',
    '    - claude',
    '    - cursor',
    '  stacks:',
    '    - generic',
    'content:',
    '  zh-CN: |',
    '    All API field descriptions must be in Chinese.',
  ].join('\n'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('source loader', () => {
  it('loads a local source with manifest, assets, and rules', async () => {
    const source = await loadSource({ type: 'local', path: sourceDir }, tmpDir);
    expect(source.manifest.name).toBe('team-ai-rules');
    expect(source.manifest.version).toBe('0.1.0');
    expect(source.assets).toHaveLength(1);
    expect(source.assets[0].id).toBe('team.backend-standard');
    expect(source.rules).toHaveLength(2);
    expect(source.rules.map((r) => r.id).sort()).toEqual(['team.api-language', 'team.no-raw-exception']);
  });

  it('throws when source path does not exist', async () => {
    await expect(loadSource({ type: 'local', path: '/nonexistent' }, tmpDir))
      .rejects.toThrow('Local source not found');
  });

  it('throws when manifest is missing', async () => {
    const noManifestDir = join(tmpDir, 'no-manifest');
    await mkdir(noManifestDir);
    await expect(loadSource({ type: 'local', path: noManifestDir }, tmpDir))
      .rejects.toThrow('Missing source manifest');
  });

  it('loads multiple sources', async () => {
    const sources = await loadAllSources([{ type: 'local', path: sourceDir }], tmpDir);
    expect(sources).toHaveLength(1);
    expect(sources[0].manifest.name).toBe('team-ai-rules');
  });

  it('returns empty array for no sources', async () => {
    const sources = await loadAllSources([], tmpDir);
    expect(sources).toHaveLength(0);
  });
});

describe('source validation', () => {
  it('detects duplicate source asset ids', async () => {
    const source1 = await loadSource({ type: 'local', path: sourceDir }, tmpDir);
    const errors = validateSourceAssets([source1, source1]);
    expect(errors.some((e) => e.includes('Duplicate source asset id'))).toBe(true);
  });

  it('detects duplicate source rule ids', async () => {
    const source1 = await loadSource({ type: 'local', path: sourceDir }, tmpDir);
    const errors = validateSourceAssets([source1, source1]);
    expect(errors.some((e) => e.includes('Duplicate source rule id'))).toBe(true);
  });

  it('detects missing rule references in assets', async () => {
    const badSourceDir = join(tmpDir, 'bad-source');
    await mkdir(join(badSourceDir, 'assets'), { recursive: true });
    await mkdir(join(badSourceDir, 'rules'), { recursive: true });
    await writeFile(join(badSourceDir, 'br-rules.source.json'), JSON.stringify({
      name: 'bad-source',
      version: '0.1.0',
      assets: ['team.missing-rules'],
    }));
    await writeFile(join(badSourceDir, 'assets', 'team.missing-rules.yaml'), [
      'id: team.missing-rules',
      'name: Missing Rules',
      'version: 0.1.0',
      'layer: team',
      'category: team',
      'description: References nonexistent rules',
      'rules:',
      '  - team.does-not-exist',
    ].join('\n'));

    const source = await loadSource({ type: 'local', path: badSourceDir }, tmpDir);
    const errors = validateSourceAssets([source]);
    expect(errors.some((e) => e.includes('references missing rule'))).toBe(true);
  });
});

describe('init --source --asset', () => {
  it('adds source and asset to config', async () => {
    await initCommand({
      stack: 'spring-boot,java',
      source: sourceDir,
      asset: 'team.backend-standard',
      sync: false,
    }, tmpDir);

    const config = await loadConfig(tmpDir);
    expect(config.sources).toHaveLength(1);
    expect(config.sources[0].type).toBe('local');
    expect(config.sources[0].path).toBe(sourceDir);
    expect(config.assets.include).toContain('team.backend-standard');
    expect(config.assets.include).toContain('language.java');
    expect(config.assets.include).toContain('framework.spring-boot');
  });

  it('syncs with source rules', async () => {
    await initCommand({
      stack: 'spring-boot,java',
      source: sourceDir,
      asset: 'team.backend-standard',
      sync: true,
    }, tmpDir);

    const config = await loadConfig(tmpDir);
    expect(config.sources).toHaveLength(1);

    const generated = JSON.parse(await readFile(join(tmpDir, GENERATED_PATH), 'utf8'));
    expect(generated.sources).toHaveLength(1);
    expect(generated.sources[0].name).toBe('team-ai-rules');
    expect(generated.rules.some((r: { id: string; source: string }) => r.id === 'team.no-raw-exception' && r.source === 'source')).toBe(true);
    expect(generated.assets.some((a: { id: string; source: string }) => a.id === 'team.backend-standard' && a.source === 'source')).toBe(true);
  });
});

describe('source list command', () => {
  it('prints no sources message when none configured', async () => {
    await initCommand({ sync: false }, tmpDir);
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => { logs.push(msg); origLog(msg); };
    try {
      await sourceListCommand(tmpDir);
    } finally {
      console.log = origLog;
    }
    expect(logs.some((l) => l.includes('No external sources configured'))).toBe(true);
  });

  it('lists configured sources', async () => {
    await initCommand({ source: sourceDir, asset: 'team.backend-standard', sync: false }, tmpDir);
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => { logs.push(msg); origLog(msg); };
    try {
      await sourceListCommand(tmpDir);
    } finally {
      console.log = origLog;
    }
    expect(logs.some((l) => l.includes('team-ai-rules'))).toBe(true);
    expect(logs.some((l) => l.includes('team.backend-standard'))).toBe(true);
  });
});

describe('asset list command', () => {
  it('lists built-in and source assets', async () => {
    await initCommand({
      stack: 'spring-boot,java',
      source: sourceDir,
      asset: 'team.backend-standard',
      sync: false,
    }, tmpDir);
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (msg: string) => { logs.push(msg); origLog(msg); };
    try {
      await assetListCommand(tmpDir);
    } finally {
      console.log = origLog;
    }
    expect(logs.some((l) => l.includes('Built-in assets'))).toBe(true);
    expect(logs.some((l) => l.includes('language.java'))).toBe(true);
    expect(logs.some((l) => l.includes('Source assets'))).toBe(true);
    expect(logs.some((l) => l.includes('team.backend-standard'))).toBe(true);
  });
});

describe('generated.json source snapshots', () => {
  it('includes source info, source assets, and source rules', async () => {
    await initCommand({
      stack: 'spring-boot,java',
      source: sourceDir,
      asset: 'team.backend-standard',
    }, tmpDir);

    const generated = JSON.parse(await readFile(join(tmpDir, GENERATED_PATH), 'utf8'));

    expect(generated.version).toBe('0.3.0');
    expect(generated.sources).toHaveLength(1);
    expect(generated.sources[0]).toMatchObject({
      type: 'local',
      path: sourceDir,
      name: 'team-ai-rules',
      version: '0.1.0',
    });

    const sourceRules = generated.rules.filter((r: { source: string }) => r.source === 'source');
    expect(sourceRules.length).toBeGreaterThan(0);
    expect(sourceRules.some((r: { id: string }) => r.id === 'team.no-raw-exception')).toBe(true);

    const sourceAssets = generated.assets.filter((a: { source: string }) => a.source === 'source');
    expect(sourceAssets.length).toBeGreaterThan(0);
    expect(sourceAssets.some((a: { id: string }) => a.id === 'team.backend-standard')).toBe(true);
  });
});

describe('duplicate id detection across tiers', () => {
  it('rejects duplicate rule id between built-in and source', async () => {
    const dupSourceDir = join(tmpDir, 'dup-source');
    await mkdir(join(dupSourceDir, 'assets'), { recursive: true });
    await mkdir(join(dupSourceDir, 'rules'), { recursive: true });
    await writeFile(join(dupSourceDir, 'br-rules.source.json'), JSON.stringify({
      name: 'dup-source',
      version: '0.1.0',
      assets: ['team.dup-asset'],
    }));
    // Use a real built-in rule id that's included by base.behavior-basic
    await writeFile(join(dupSourceDir, 'rules', 'base.behavior.clarify-before-coding.yaml'), [
      'id: base.behavior.clarify-before-coding',
      'name: Duplicate Rule',
      'category: behavior',
      'severity: must',
      'content:',
      '  zh-CN: |',
      '    Duplicate.',
    ].join('\n'));
    await writeFile(join(dupSourceDir, 'assets', 'team.dup-asset.yaml'), [
      'id: team.dup-asset',
      'name: Dup Asset',
      'version: 0.1.0',
      'layer: team',
      'category: team',
      'description: Dup',
      'rules:',
      '  - base.behavior.clarify-before-coding',
    ].join('\n'));

    await initCommand({
      source: dupSourceDir,
      asset: 'team.dup-asset',
      sync: false,
    }, tmpDir);

    await expect(() => syncCommand(tmpDir)).rejects.toThrow('Duplicated rule id');
  });
});
