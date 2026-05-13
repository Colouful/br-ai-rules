import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, access, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { auditSourcePath, collectPlaceholderWarningsForRules } from '../src/core/source.js';
import { sourceInitCommand } from '../src/commands/source-init.js';
import { sourceCheckCommand } from '../src/commands/source-check.js';
import { doctorCommand } from '../src/commands/doctor.js';
import { initCommand } from '../src/commands/init.js';
import { defaultConfig, writeConfig } from '../src/core/config.js';
import type { Rule } from '../src/core/rules.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'br-rules-v04-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('auditSourcePath', () => {
  it('warns on TODO placeholders in rule content', async () => {
    const src = join(tmpDir, 'ph-src');
    await sourceInitCommand({}, 'ph-src', tmpDir);
    await writeFile(
      join(src, 'rules', 'team.code-review-required.yaml'),
      [
        'id: team.code-review-required',
        'name: X',
        'category: team',
        'severity: must',
        'content:',
        '  zh-CN: |',
        '    TODO: fill me',
      ].join('\n'),
      'utf8',
    );
    const r = await auditSourcePath(tmpDir, 'ph-src');
    expect(r.errors).toHaveLength(0);
    expect(r.warnings.some((w) => w.includes('TODO'))).toBe(true);
  });

  it('collectPlaceholderWarningsForRules detects Chinese placeholder', () => {
    const rule: Rule = {
      id: 'r1',
      name: 'n',
      category: 'team',
      severity: 'must',
      appliesTo: { targets: ['generic'], stacks: ['generic'] },
      content: { 'zh-CN': '在这里写规则内容' },
    };
    expect(collectPlaceholderWarningsForRules([rule])).toHaveLength(1);
  });

  it('fails when asset references a missing rule', async () => {
    const rel = 'bad-ref-src';
    const src = join(tmpDir, rel);
    await mkdir(join(src, 'assets'), { recursive: true });
    await mkdir(join(src, 'rules'), { recursive: true });
    await writeFile(
      join(src, 'br-rules.source.json'),
      JSON.stringify({ name: 't', version: '1', assets: ['team.starter-pack'] }, null, 2),
      'utf8',
    );
    await writeFile(
      join(src, 'assets', 'team.starter-pack.yaml'),
      [
        'id: team.starter-pack',
        'name: P',
        'layer: team',
        'rules:',
        '  - team.never-defined',
      ].join('\n'),
      'utf8',
    );
    const r = await auditSourcePath(tmpDir, rel);
    expect(r.loaded).toBeNull();
    expect(r.errors.some((e) => e.includes('missing rule'))).toBe(true);
  });

  it('fails on duplicate rule id across rule files', async () => {
    const rel = 'dup-src';
    const src = join(tmpDir, rel);
    await mkdir(join(src, 'assets'), { recursive: true });
    await mkdir(join(src, 'rules'), { recursive: true });
    await writeFile(
      join(src, 'br-rules.source.json'),
      JSON.stringify({ name: 't', version: '1', assets: ['a1'] }, null, 2),
      'utf8',
    );
    const ruleBody = [
      'id: dup.rule',
      'name: A',
      'category: team',
      'severity: must',
      'content:',
      '  zh-CN: |',
      '    body one',
    ].join('\n');
    await writeFile(join(src, 'rules', 'one.yaml'), ruleBody, 'utf8');
    await writeFile(join(src, 'rules', 'two.yaml'), ruleBody, 'utf8');
    await writeFile(
      join(src, 'assets', 'a1.yaml'),
      ['id: a1', 'name: A1', 'layer: team', 'rules:', '  - dup.rule'].join('\n'),
      'utf8',
    );
    const r = await auditSourcePath(tmpDir, rel);
    expect(r.loaded).toBeNull();
    expect(r.errors.some((e) => e.includes('Duplicate source rule id'))).toBe(true);
  });

  it('fails on invalid manifest (schema)', async () => {
    const rel = 'bad-manifest';
    const src = join(tmpDir, rel);
    await mkdir(join(src, 'assets'), { recursive: true });
    await mkdir(join(src, 'rules'), { recursive: true });
    await writeFile(join(src, 'br-rules.source.json'), JSON.stringify({ name: 'ok', version: '' }, null, 2), 'utf8');
    const r = await auditSourcePath(tmpDir, rel);
    expect(r.loaded).toBeNull();
    expect(r.errors.some((e) => e.includes('Manifest:') || e.includes('version'))).toBe(true);
  });
});

describe('sourceInitCommand', () => {
  it('creates manifest, asset, and rule files', async () => {
    await sourceInitCommand({}, 'my-src', tmpDir);
    const manifest = JSON.parse(await readFile(join(tmpDir, 'my-src', 'br-rules.source.json'), 'utf8'));
    expect(manifest.assets).toContain('team.starter-pack');
    const audit = await auditSourcePath(tmpDir, 'my-src');
    expect(audit.errors).toHaveLength(0);
    expect(audit.loaded?.rules).toHaveLength(1);
  });

  it('refuses overwrite without --force', async () => {
    const prev = process.exitCode;
    process.exitCode = 0;
    await sourceInitCommand({}, 'x', tmpDir);
    await sourceInitCommand({}, 'x', tmpDir);
    expect(process.exitCode).toBe(1);
    process.exitCode = prev;
  });

  it('writes absolute target path (not <root>/tmp/...)', async () => {
    const stamp = Date.now();
    const abs = `/tmp/br-rules-abs-init-${stamp}`;
    await rm(abs, { recursive: true, force: true });
    await sourceInitCommand({}, abs, tmpDir);
    const manifest = JSON.parse(await readFile(join(abs, 'br-rules.source.json'), 'utf8'));
    expect(manifest.name).toBe('team-rules');
    const legacyWrong = join(tmpDir, 'tmp', `br-rules-abs-init-${stamp}`);
    await expect(access(join(legacyWrong, 'br-rules.source.json')).then(() => true).catch(() => false)).resolves.toBe(
      false,
    );
    await rm(abs, { recursive: true, force: true });
  });

  it('generated source can be wired with init --source --asset', async () => {
    await sourceInitCommand({}, 'wire-src', tmpDir);
    const srcPath = join(tmpDir, 'wire-src');
    process.exitCode = 0;
    await initCommand({ source: srcPath, asset: 'team.starter-pack', sync: true }, tmpDir);
    const gen = JSON.parse(await readFile(join(tmpDir, '.ai-rules', 'generated.json'), 'utf8'));
    expect(Array.isArray(gen.sources)).toBe(true);
    expect(gen.sources.length).toBeGreaterThan(0);
  });
});

describe('sourceCheckCommand', () => {
  it('checks explicit path', async () => {
    await sourceInitCommand({}, 's1', tmpDir);
    const logs: string[] = [];
    const errs: string[] = [];
    const oLog = console.log;
    const oErr = console.error;
    const oWarn = console.warn;
    console.log = (m: string) => { logs.push(m); oLog(m); };
    console.error = (m: string) => { errs.push(m); oErr(m); };
    console.warn = (m: string) => { oWarn(m); };
    process.exitCode = 0;
    try {
      await sourceCheckCommand('s1', tmpDir);
    } finally {
      console.log = oLog;
      console.error = oErr;
      console.warn = oWarn;
    }
    expect(errs).toHaveLength(0);
    expect(logs.some((l) => l.includes('Source OK'))).toBe(true);
  });

  it('exits 1 when explicit path has missing rule reference', async () => {
    const rel = 'bad-check';
    const src = join(tmpDir, rel);
    await mkdir(join(src, 'assets'), { recursive: true });
    await mkdir(join(src, 'rules'), { recursive: true });
    await writeFile(
      join(src, 'br-rules.source.json'),
      JSON.stringify({ name: 't', version: '1', assets: ['x'] }, null, 2),
      'utf8',
    );
    await writeFile(
      join(src, 'assets', 'x.yaml'),
      ['id: x', 'name: X', 'layer: team', 'rules:', '  - missing.ref'].join('\n'),
      'utf8',
    );
    const errs: string[] = [];
    const oErr = console.error;
    console.error = (m: string) => { errs.push(m); oErr(m); };
    process.exitCode = 0;
    try {
      await sourceCheckCommand(rel, tmpDir);
    } finally {
      console.error = oErr;
    }
    expect(process.exitCode).toBe(1);
    expect(errs.some((e) => e.includes('missing rule'))).toBe(true);
  });
});

describe('doctorCommand', () => {
  it('reports healthy project after init+sync', async () => {
    process.exitCode = 0;
    await initCommand({ sync: true }, tmpDir);
    const errs: string[] = [];
    const oErr = console.error;
    console.error = (m: string) => { errs.push(m); oErr(m); };
    process.exitCode = 0;
    try {
      await doctorCommand(tmpDir);
    } finally {
      console.error = oErr;
    }
    expect(errs).toHaveLength(0);
    expect(process.exitCode).toBe(0);
  });

  it('fails when config missing', async () => {
    const errs: string[] = [];
    const oErr = console.error;
    console.error = (...args: unknown[]) => { errs.push(String(args[0])); oErr(...args); };
    process.exitCode = 0;
    try {
      await doctorCommand(tmpDir);
    } finally {
      console.error = oErr;
    }
    expect(process.exitCode).toBe(1);
    expect(errs.some((e) => e.includes('.ai-rules'))).toBe(true);
  });

  it('fails when a generated target file is missing', async () => {
    process.exitCode = 0;
    await initCommand({ sync: true }, tmpDir);
    await unlink(join(tmpDir, 'AGENTS.md'));
    const errs: string[] = [];
    const oErr = console.error;
    console.error = (m: string) => { errs.push(m); oErr(m); };
    process.exitCode = 0;
    try {
      await doctorCommand(tmpDir);
    } finally {
      console.error = oErr;
    }
    expect(process.exitCode).toBe(1);
    expect(errs.some((e) => e.includes('缺少生成目标文件') && e.includes('AGENTS.md'))).toBe(true);
  });

  it('fails when configured source path does not exist', async () => {
    const cfg = defaultConfig();
    cfg.sources = [{ type: 'local', path: 'no-such-source-dir' }];
    await writeConfig(tmpDir, cfg);
    const errs: string[] = [];
    const oErr = console.error;
    console.error = (m: string) => { errs.push(m); oErr(m); };
    process.exitCode = 0;
    try {
      await doctorCommand(tmpDir);
    } finally {
      console.error = oErr;
    }
    expect(process.exitCode).toBe(1);
    expect(errs.some((e) => e.includes('Source path not found') || e.includes('no-such-source-dir'))).toBe(true);
  });

  it('warns when managed block drifts from config (suggests sync)', async () => {
    process.exitCode = 0;
    await initCommand({ sync: true }, tmpDir);
    await writeFile(join(tmpDir, 'CLAUDE.md'), '<!-- BR-AI-RULES:START -->\nold\n<!-- BR-AI-RULES:END -->', 'utf8');
    const logs: string[] = [];
    const warns: string[] = [];
    const oLog = console.log;
    const oWarn = console.warn;
    console.log = (m: string) => { logs.push(m); oLog(m); };
    console.warn = (m: string) => { warns.push(m); oWarn(m); };
    process.exitCode = 0;
    try {
      await doctorCommand(tmpDir);
    } finally {
      console.log = oLog;
      console.warn = oWarn;
    }
    expect(process.exitCode).toBe(0);
    expect(warns.some((w) => w.includes('不同步') && w.includes('sync'))).toBe(true);
  });
});
