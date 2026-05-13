import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { auditSourcePath, collectPlaceholderWarningsForRules } from '../src/core/source.js';
import { sourceInitCommand } from '../src/commands/source-init.js';
import { sourceCheckCommand } from '../src/commands/source-check.js';
import { doctorCommand } from '../src/commands/doctor.js';
import { initCommand } from '../src/commands/init.js';
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
});
