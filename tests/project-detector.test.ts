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
