import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ProjectDetectionResult = {
  assetIds: string[];
  targets: Array<'generic' | 'claude' | 'cursor'>;
  signals: string[];
  evidence: string[];
};

const DEFAULT_TARGETS: ProjectDetectionResult['targets'] = ['generic', 'claude', 'cursor'];
const BASE_ASSETS = [
  'base.behavior-basic',
  'practice.testing-basic',
  'practice.dependency-control',
  'practice.security-basic',
];

type DetectionState = {
  assetIds: Set<string>;
  signals: Set<string>;
  evidence: string[];
};

export async function detectProject(root: string): Promise<ProjectDetectionResult> {
  const state: DetectionState = {
    assetIds: new Set(BASE_ASSETS),
    signals: new Set(),
    evidence: [],
  };

  await detectNodeProject(root, state);
  await detectJavaProject(root, state);

  if (state.signals.size === 0) {
    state.evidence.push('未检测到明确技术栈，使用基础规则和保守默认实践规则。');
  }

  return {
    assetIds: [...state.assetIds],
    targets: [...DEFAULT_TARGETS],
    signals: [...state.signals],
    evidence: state.evidence,
  };
}

async function detectNodeProject(root: string, state: DetectionState): Promise<void> {
  const packageJson = await readOptionalFile(join(root, 'package.json'), 'package.json', state);
  if (packageJson) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(packageJson);
    } catch {
      state.evidence.push('检测到 package.json，但 JSON 解析失败，已跳过 Node.js 依赖识别。');
    }

    if (isPackageJson(parsed)) {
      const dependencies = collectPackageNames(parsed);
      if (hasAny(dependencies, ['typescript'])) {
        addTypeScript(state, 'package.json 声明 TypeScript 依赖。');
      }
      if (hasAny(dependencies, ['vue'])) {
        addSignal(state, 'framework.vue', 'framework.vue', 'package.json 声明 Vue 依赖。');
      }
      if (hasAny(dependencies, ['pinia'])) {
        state.signals.add('state.pinia');
        state.evidence.push('package.json 声明 Pinia，作为 Vue 状态管理辅助信号。');
      }
      if (hasAny(dependencies, ['vuex'])) {
        state.signals.add('state.vuex');
        state.evidence.push('package.json 声明 Vuex，作为 Vue 状态管理辅助信号。');
      }
      if (hasAny(dependencies, ['react'])) {
        addSignal(state, 'framework.react', 'framework.react', 'package.json 声明 React 依赖。');
      }
      if (hasAny(dependencies, ['redux', '@reduxjs/toolkit'])) {
        state.signals.add('state.redux');
        state.evidence.push('package.json 声明 Redux，作为 React 状态管理辅助信号。');
      }
      if (hasAny(dependencies, ['mysql', 'mysql2'])) {
        addSignal(state, 'middleware.mysql', 'middleware.mysql', 'package.json 声明 MySQL 客户端依赖。');
      }
      if (hasAny(dependencies, ['redis', 'ioredis'])) {
        addSignal(state, 'middleware.redis', 'middleware.redis', 'package.json 声明 Redis 客户端依赖。');
      }
      if (hasAny(dependencies, ['amqplib', 'kafkajs', '@nestjs/microservices'])) {
        addSignal(state, 'middleware.message-queue', 'middleware.message-queue', 'package.json 声明消息队列相关依赖。');
      }
    }
  }

  if (await fileExists(join(root, 'tsconfig.json'), 'tsconfig.json', state)) {
    addTypeScript(state, '检测到 tsconfig.json，作为 TypeScript 辅助证据。');
  }
}

async function detectJavaProject(root: string, state: DetectionState): Promise<void> {
  const buildFiles = await readBuildFiles(root, state);
  if (buildFiles.length === 0) return;

  const content = buildFiles.map((file) => file.content).join('\n').toLowerCase();
  addSignal(state, 'language.java', 'language.java', `检测到 ${buildFiles.map((file) => file.name).join('/')}，识别为 Java 项目。`);

  if (content.includes('spring-boot')) {
    addSignal(state, 'framework.spring-boot', 'framework.spring-boot', '构建文件声明 Spring Boot 依赖。');
  }
  if (containsAny(content, ['mysql', 'mariadb', 'jdbc:mysql'])) {
    addSignal(state, 'middleware.mysql', 'middleware.mysql', '构建文件声明 MySQL/MariaDB 相关依赖。');
  }
  if (containsAny(content, ['redis', 'lettuce', 'jedis'])) {
    addSignal(state, 'middleware.redis', 'middleware.redis', '构建文件声明 Redis 相关依赖。');
  }
  if (containsAny(content, ['kafka', 'amqp', 'rabbitmq', 'rocketmq'])) {
    addSignal(state, 'middleware.message-queue', 'middleware.message-queue', '构建文件声明消息队列相关依赖。');
  }

  state.assetIds.add('practice.api-contract');
}

async function readBuildFiles(root: string, state: DetectionState): Promise<Array<{ name: string; content: string }>> {
  const files = ['pom.xml', 'build.gradle', 'build.gradle.kts'];
  const found: Array<{ name: string; content: string }> = [];
  for (const file of files) {
    const content = await readOptionalFile(join(root, file), file, state);
    if (content) found.push({ name: file, content });
  }
  return found;
}

function addTypeScript(state: DetectionState, evidence: string): void {
  addSignal(state, 'language.typescript', 'language.typescript', evidence);
}

function addSignal(state: DetectionState, signal: string, assetId: string, evidence: string): void {
  state.signals.add(signal);
  state.assetIds.add(assetId);
  if (!state.evidence.includes(evidence)) {
    state.evidence.push(evidence);
  }
}

function collectPackageNames(packageJson: PackageJsonLike): Set<string> {
  return new Set([
    ...Object.keys(packageJson.dependencies ?? {}),
    ...Object.keys(packageJson.devDependencies ?? {}),
    ...Object.keys(packageJson.peerDependencies ?? {}),
    ...Object.keys(packageJson.optionalDependencies ?? {}),
  ]);
}

function hasAny(values: Set<string>, candidates: string[]): boolean {
  return candidates.some((candidate) => values.has(candidate));
}

function containsAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

async function readOptionalFile(path: string, label: string, state: DetectionState): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    state.evidence.push(`无法读取 ${label}：${formatFileError(error)}，已跳过该文件识别。`);
    return null;
  }
}

async function fileExists(path: string, label: string, state: DetectionState): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (isMissingFileError(error)) {
      return false;
    }
    state.evidence.push(`无法访问 ${label}：${formatFileError(error)}，已跳过该文件识别。`);
    return false;
  }
}

function isMissingFileError(error: unknown): boolean {
  return isNodeFileError(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

function formatFileError(error: unknown): string {
  if (isNodeFileError(error)) {
    return error.code ? `${error.code} ${error.message}` : error.message;
  }
  return String(error);
}

function isNodeFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error;
}

type PackageJsonLike = {
  dependencies?: Record<string, unknown>;
  devDependencies?: Record<string, unknown>;
  peerDependencies?: Record<string, unknown>;
  optionalDependencies?: Record<string, unknown>;
};

function isPackageJson(value: unknown): value is PackageJsonLike {
  return value !== null && typeof value === 'object';
}
