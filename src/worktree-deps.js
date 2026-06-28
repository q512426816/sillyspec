/**
 * worktree-deps.js — Worktree 依赖供给引擎
 *
 * 在 worktree.create() 的 baseline overlay 之后调用，让 worktree 立即可构建/测试。
 * 策略：junction/symlink 快路径（lockfile 一致）+ install 兜底；多语言按 local.yaml
 * project.type + lockfile 推断 install 命令。供给可失败，但状态写进 meta 供验证硬门读取。
 *
 * 见 change 2026-06-28-worktree-deps-provision / D-005@v1, D-007@v1。
 */

import { existsSync, readFileSync, realpathSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

const LOCKFILES = ['pnpm-lock.yaml', 'package-lock.json', 'yarn.lock'];
const DEFAULT_TIMEOUT_MS = 300 * 1000;

/**
 * 取目录下首个命中的 lockfile 的 sha256 前 16 位；
 * 无 lockfile 则 hash package.json；都没有返回 null。
 */
export function lockfileHash(dir) {
  if (!dir || !existsSync(dir)) return null;
  for (const lf of LOCKFILES) {
    const p = join(dir, lf);
    if (existsSync(p)) {
      return createHash('sha256').update(readFileSync(p)).digest('hex').slice(0, 16);
    }
  }
  const pkg = join(dir, 'package.json');
  if (existsSync(pkg)) {
    return createHash('sha256').update(readFileSync(pkg)).digest('hex').slice(0, 16);
  }
  return null;
}

/** 命中目录下的 lockfile 文件名（用于判断 nodejs 子类）*/
function detectLockfile(dir) {
  if (!dir || !existsSync(dir)) return null;
  for (const lf of LOCKFILES) {
    if (existsSync(join(dir, lf))) return lf;
  }
  return null;
}

/** 读取 local.yaml 文本（specBase 优先，回退 worktreePath/.sillyspec；不读 process.cwd 避免环境配置泄漏）*/
function readLocalYaml(specBase, worktreePath) {
  const candidates = [
    specBase ? join(specBase, 'local.yaml') : null,
    worktreePath ? join(worktreePath, '.sillyspec', 'local.yaml') : null,
  ].filter(Boolean);
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, 'utf8');
  }
  return null;
}

/** 从 local.yaml 文本提取 commands.install（轻量正则，不引 yaml 依赖，与 scan-postcheck 一致）*/
function extractUserInstall(yamlText) {
  if (!yamlText) return null;
  // 匹配 commands: 段下的 install: "..." 或 install: '...'（unavailable 视为无）
  const m = yamlText.match(/install:\s*["']([^"']+)["']/);
  if (m && m[1] && m[1].toLowerCase() !== 'unavailable') return m[1];
  return null;
}

/** 从 local.yaml 提取 project.type；缺失时按文件特征推断 */
function detectProjectType(worktreePath, specBase) {
  const yamlText = readLocalYaml(specBase, worktreePath);
  if (yamlText) {
    const m = yamlText.match(/type:\s*(\S+)/);
    if (m && m[1]) return m[1];
  }
  if (existsSync(join(worktreePath, 'pom.xml'))) return 'maven';
  if (existsSync(join(worktreePath, 'build.gradle')) || existsSync(join(worktreePath, 'build.gradle.kts'))) return 'gradle';
  if (existsSync(join(worktreePath, 'package.json'))) return 'nodejs';
  return 'generic';
}

/** 按 project.type + lockfile 推断 install 命令（无 commands.install 时）*/
function inferInstallCommand(projectType, worktreePath, userInstall) {
  if (userInstall) return userInstall;
  switch (projectType) {
    case 'nodejs':
      if (existsSync(join(worktreePath, 'pnpm-lock.yaml'))) return 'pnpm install --frozen-lockfile';
      if (existsSync(join(worktreePath, 'package-lock.json'))) return 'npm ci';
      if (existsSync(join(worktreePath, 'yarn.lock'))) return 'yarn install --frozen-lockfile';
      return 'npm install'; // 无 lockfile 兜底（X-2）
    case 'maven':
      return 'mvn -o test';
    case 'gradle':
      return './gradlew test';
    default:
      return null; // generic → n/a
  }
}

/** 在 worktreePath 创建 node_modules 链接到 mainNodeModules；失败回退 */
function tryLink(mainNodeModules, linkPath) {
  // 已存在：确认是否已指向 main（幂等）
  if (existsSync(linkPath)) {
    try {
      const resolved = realpathSync(linkPath);
      const resolvedTarget = realpathSync(mainNodeModules);
      if (resolved === resolvedTarget) return { ok: true, method: process.platform === 'win32' ? 'junction' : 'symlink' };
    } catch {}
    // 指向别处 → 不 clobber，视为已有依赖（installed 语义）
    return { ok: true, method: 'install', preexisting: true };
  }
  try {
    if (process.platform === 'win32') {
      execSync(`mklink /J "${linkPath}" "${mainNodeModules}"`, { shell: 'cmd.exe', stdio: ['pipe', 'pipe', 'pipe'] });
      return { ok: true, method: 'junction' };
    }
    execSync(`ln -s "${mainNodeModules}" "${linkPath}"`, { stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, method: 'symlink' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/** 执行 install 命令（带超时）*/
function tryInstall(cmd, cwd, timeout) {
  try {
    execSync(cmd, { cwd, timeout, stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true };
  } catch (e) {
    const msg = e.killed ? `timeout after ${timeout}ms` : ((e.stderr && e.stderr.toString()) || e.message);
    return { ok: false, error: `${cmd} failed: ${msg}` };
  }
}

/**
 * 供给依赖。返回 deps 状态对象（合并进 meta）。
 * @param {string} worktreePath - worktree 根目录
 * @param {string} mainCwd - 主 checkout 根目录（node_modules 来源）
 * @param {{ specBase?: string, timeout?: number }} opts
 * @returns {{ depsStatus, depsMethod, depsSource, depsLockHash, depsCheckedAt, depsError? }}
 */
export function provisionDeps(worktreePath, mainCwd, opts = {}) {
  const { specBase = null, timeout = DEFAULT_TIMEOUT_MS } = opts;
  const depsCheckedAt = new Date().toISOString();
  const wtHash = lockfileHash(worktreePath);

  const projectType = detectProjectType(worktreePath, specBase);
  const userInstall = extractUserInstall(readLocalYaml(specBase, worktreePath));
  const installCmd = inferInstallCommand(projectType, worktreePath, userInstall);

  // generic / 无可执行 install → n/a
  if (!installCmd) {
    return { depsStatus: 'n/a', depsMethod: null, depsSource: null, depsLockHash: wtHash, depsCheckedAt };
  }

  // 快路径：main 有 node_modules 且 lockfile hash 一致 → junction/symlink
  const mainNodeModules = mainCwd ? join(mainCwd, 'node_modules') : null;
  const mainHash = lockfileHash(mainCwd);
  if (mainNodeModules && existsSync(mainNodeModules) && mainHash && wtHash && mainHash === wtHash) {
    const linkResult = tryLink(mainNodeModules, join(worktreePath, 'node_modules'));
    if (linkResult.ok) {
      return {
        depsStatus: 'linked',
        depsMethod: linkResult.method,
        depsSource: linkResult.preexisting ? 'install' : 'main-checkout',
        depsLockHash: wtHash,
        depsCheckedAt,
      };
    }
    // link 失败 → 回退 install
  }

  // 兜底：install
  const installResult = tryInstall(installCmd, worktreePath, timeout);
  if (installResult.ok) {
    return { depsStatus: 'installed', depsMethod: 'install', depsSource: 'install', depsLockHash: wtHash, depsCheckedAt };
  }
  return {
    depsStatus: 'failed',
    depsMethod: null,
    depsSource: null,
    depsLockHash: wtHash,
    depsCheckedAt,
    depsError: installResult.error,
  };
}
