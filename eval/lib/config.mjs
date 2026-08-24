// eval 配置加载 + 实验指纹（config hash）：改动任务内容/臂定义/适配器/版本都会换新分组，
// 旧缓存不再命中，报告也不会把两轮不同实验混在一起。
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256, stableStringify } from './util.mjs';

export const EVAL_ROOT = dirname(dirname(fileURLToPath(import.meta.url))); // eval/
export const EVAL_SCHEMA_VERSION = 1;

// 与 eval/eval.config.json 保持同构；文件缺失/部分字段缺失时以此兜底
const DEFAULTS = {
  tasksDir: './tasks',
  resultsDir: './results',
  defaultSample: 20,
  verifyTimeoutMs: 120_000,
  regressionThresholdPp: 5,
  arms: {
    A: {
      label: '裸agent',
      setup: [],
      promptTemplate: '你在当前目录工作，直接完成以下需求（不要提问，直接实现，确保代码可运行）：\n\n{instruction}',
    },
    B: {
      label: 'SillySpec',
      setup: ['npx sillyspec init --dir {workdir} --tool {tool}'],
      promptTemplate: '当前项目已安装 SillySpec 工作流。请按 SillySpec 流程完成以下需求（小任务走 quick 模式），完成后确保代码可运行：\n\n{instruction}',
    },
  },
  adapter: {
    type: 'cli',
    tool: 'claude',
    command: ['claude', '-p', '--output-format', 'json', '--max-turns', '{maxTurns}'],
    stdin: 'prompt',
    timeoutMs: 900_000,
    maxTurns: 60,
    parseStdoutJson: true,
  },
};

function deepMerge(target, src) {
  for (const key of Object.keys(src)) {
    const sv = src[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv) && target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])) {
      deepMerge(target[key], sv);
    } else {
      target[key] = sv;
    }
  }
  return target;
}

export function loadConfig(configPath = resolve(EVAL_ROOT, 'eval.config.json')) {
  let file = {};
  if (existsSync(configPath)) file = JSON.parse(readFileSync(configPath, 'utf8'));
  const config = deepMerge(structuredClone(DEFAULTS), file);
  config.tasksDir = resolve(EVAL_ROOT, config.tasksDir);
  config.resultsDir = resolve(EVAL_ROOT, config.resultsDir);
  config._path = configPath;
  return config;
}

export function sillyspecVersion() {
  const pkg = JSON.parse(readFileSync(resolve(EVAL_ROOT, '..', 'package.json'), 'utf8'));
  return pkg.version;
}

/**
 * 实验分组哈希：臂定义（prompt/setup）+ 适配器 + 任务指纹 + SillySpec 版本 + schema 版本。
 * 注意 tasksDir/resultsDir 不参与——目录挪位置不该让实验换组。
 */
export function computeConfigHash(config, adapterType, tasksFingerprint) {
  const payload = {
    schema: EVAL_SCHEMA_VERSION,
    adapterType,
    arms: config.arms,
    adapter: config.adapter,
    tasksFingerprint,
    sillyspecVersion: sillyspecVersion(),
  };
  return sha256(stableStringify(payload)).slice(0, 12);
}
