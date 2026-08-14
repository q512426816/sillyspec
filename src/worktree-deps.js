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
import { execSync, execFileSync } from 'child_process';
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
export function detectProjectType(worktreePath, specBase) {
  const yamlText = readLocalYaml(specBase, worktreePath);
  if (yamlText) {
    const m = yamlText.match(/type:\s*(\S+)/);
    if (m && m[1]) return m[1];
  }
  if (existsSync(join(worktreePath, 'pom.xml'))) return 'maven';
  if (existsSync(join(worktreePath, 'build.gradle')) || existsSync(join(worktreePath, 'build.gradle.kts'))) return 'gradle';
  if (existsSync(join(worktreePath, 'package.json'))) return 'nodejs';
  // Python：pyproject.toml（uv/poetry/pdm）或 requirements.txt（pip）——治 worktree 内 ruff/pre-commit 等
  // 二进制不供给（exec 复盘 3-②：detectProjectType 原无 python 分支，python 项目根被误判 generic → n/a）
  if (existsSync(join(worktreePath, 'pyproject.toml')) || existsSync(join(worktreePath, 'requirements.txt'))) return 'python';
  return 'generic';
}

/** 按 project.type + lockfile 推断 install 命令（无 commands.install 时）*/
export function inferInstallCommand(projectType, worktreePath, userInstall) {
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
    case 'python':
      // uv 优先（现代 Python 工具链，pyproject.toml/uv.lock 项目走 uv sync 建 .venv + 装依赖，
      // 与 execute worktree 环境预告一致）；纯 requirements.txt（无 pyproject）回退 pip
      if (existsSync(join(worktreePath, 'uv.lock')) || existsSync(join(worktreePath, 'pyproject.toml'))) return 'uv sync';
      return 'pip install -r requirements.txt';
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
      // execFileSync 数组形式不经 shell：POSIX 双引号内 `/$() 会执行、cmd.exe 双引号内 %VAR% 仍展开，
      // linkPath 含 local.yaml 模块 path，属项目内可配置值（安全收敛，与 git-helper 同范式）
      execFileSync('cmd.exe', ['/c', 'mklink', '/J', linkPath, mainNodeModules], { stdio: ['pipe', 'pipe', 'pipe'] });
      return { ok: true, method: 'junction' };
    }
    execFileSync('ln', ['-s', mainNodeModules, linkPath], { stdio: ['pipe', 'pipe', 'pipe'] });
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

/** 目录是否含 nodejs 标记（package.json 或任一 lockfile）——识别 monorepo 里的 nodejs 子模块 */
function hasNodeMarker(dir) {
  if (!dir || !existsSync(dir)) return false;
  if (existsSync(join(dir, 'package.json'))) return true;
  return LOCKFILES.some(lf => existsSync(join(dir, lf)));
}

/**
 * 从 local.yaml 提取 modules 块的 path 列表（generic monorepo 子模块路径）。
 * 兼容 inline flow（`frontend: { path: "frontend/" }`）与 block（`frontend:\n    path: frontend/`）。
 * 轻量正则，不引 yaml 依赖（与 extractUserInstall / scan-postcheck 风格一致）。
 * 坑 execute-worktree-pnpm-monorepo-no-node-modules：generic 项目 worktree 子模块无 node_modules。
 * @returns {string[]} 去重 + 去 trailing 斜杠的相对路径
 */
function extractModulePaths(yamlText) {
  if (!yamlText) return [];
  const idx = yamlText.search(/^modules:\s*$/m);
  if (idx < 0) return [];
  const nlIdx = yamlText.indexOf('\n', idx);
  if (nlIdx < 0) return [];
  let rest = yamlText.slice(nlIdx + 1);
  const nextTop = rest.search(/^\S/m); // 下一个顶层 key（行首非空白）
  const block = nextTop >= 0 ? rest.slice(0, nextTop) : rest;
  const paths = [];
  const re = /path:\s*["']?([^"'\s,}]+)/g;
  let pm;
  while ((pm = re.exec(block)) !== null) {
    const p = pm[1].replace(/\/+$/, '').trim();
    if (p && p !== '.') paths.push(p);
  }
  return [...new Set(paths)];
}

/**
 * 对单个子模块目录 tryLink main 的 node_modules → wt 的 node_modules（modules 子模块专用）。
 * 仅走 link 快路径（不 install——子模块 install 慢且易失败；lockfile 不一致时交给用户 pnpm install）。
 * lockfile 一致才 link，避免误链不匹配的 deps。
 */
function linkOneDir(wtDir, mainDir) {
  const mainNodeModules = join(mainDir, 'node_modules');
  if (!existsSync(mainNodeModules)) return { status: 'skipped', reason: 'main 无 node_modules' };
  const wtHash = lockfileHash(wtDir);
  const mainHash = lockfileHash(mainDir);
  if (wtHash && mainHash && wtHash !== mainHash) {
    return { status: 'mismatch', reason: `lockfile 不一致 main=${mainHash} wt=${wtHash}` };
  }
  const r = tryLink(mainNodeModules, join(wtDir, 'node_modules'));
  if (r.ok) return { status: 'linked', method: r.method };
  return { status: 'failed', error: r.error };
}

/**
 * 供给依赖。返回 deps 状态对象（合并进 meta）。两段：
 *   1. 根目录供给（原有逻辑：lockfile 一致 link / 不一致 install / generic→根 n/a）
 *   2. modules 块的 nodejs 子模块 link（generic monorepo：根无 deps 但 frontend/daemon 等子模块需要）
 * generic + 子模块 link 成功时，整体 depsStatus 从 n/a 升级为 linked（deps gate 不再误判 unknown 阻断）。
 *
 * @param {string} worktreePath - worktree 根目录
 * @param {string} mainCwd - 主 checkout 根目录（node_modules 来源）
 * @param {{ specBase?: string, timeout?: number, force?: boolean }} opts
 *   - force=true（doctor --fix 强制重装）：绕过根目录 lockfile 一致快路径（下方 line 216 区块），
 *     强制走 install 分支重装。该快路径是 tryLink 的唯一根调用点，绕过它即同时绕过 tryLink
 *     的 preexisting 幂等短路（101-110），实现"强制重装"语义。配合调用方先解 junction
 *     （worktree.js _doctorReprovision），避免 install 经 junction 误改主仓 node_modules。
 *     modules 子模块 link 不受 force 影响（仅根 install）。
 * @returns {{ depsStatus, depsMethod, depsSource, depsLockHash, depsCheckedAt, depsError?, depsModules? }}
 */
export function provisionDeps(worktreePath, mainCwd, opts = {}) {
  const { specBase = null, timeout = DEFAULT_TIMEOUT_MS, force = false } = opts;
  const depsCheckedAt = new Date().toISOString();
  const yamlText = readLocalYaml(specBase, worktreePath);
  const wtHash = lockfileHash(worktreePath);

  // ── 1. 根目录供给 ──
  const projectType = detectProjectType(worktreePath, specBase);
  const userInstall = extractUserInstall(yamlText);
  const installCmd = inferInstallCommand(projectType, worktreePath, userInstall);

  let result;
  if (!installCmd) {
    // generic / 无可执行 install → 根无 deps 动作（n/a）；但下方 modules 子模块仍可能 link 升级
    result = { depsStatus: 'n/a', depsMethod: null, depsSource: null, depsLockHash: wtHash };
  } else {
    // 快路径：main 有 node_modules 且 lockfile hash 一致 → junction/symlink
    // force=true 时绕过（doctor --fix 强制重装；绕过此块即同时绕过 tryLink 101-110 幂等短路）
    const mainNodeModules = mainCwd ? join(mainCwd, 'node_modules') : null;
    const mainHash = lockfileHash(mainCwd);
    let linked = false;
    if (!force && mainNodeModules && existsSync(mainNodeModules) && mainHash && wtHash && mainHash === wtHash) {
      const linkResult = tryLink(mainNodeModules, join(worktreePath, 'node_modules'));
      if (linkResult.ok) {
        result = {
          depsStatus: 'linked',
          depsMethod: linkResult.method,
          depsSource: linkResult.preexisting ? 'install' : 'main-checkout',
          depsLockHash: wtHash,
        };
        linked = true;
      }
    }
    if (!linked) {
      // 兜底：install
      const installResult = tryInstall(installCmd, worktreePath, timeout);
      result = installResult.ok
        ? { depsStatus: 'installed', depsMethod: 'install', depsSource: 'install', depsLockHash: wtHash }
        : { depsStatus: 'failed', depsMethod: null, depsSource: null, depsLockHash: wtHash, depsError: installResult.error };
    }
  }
  result.depsCheckedAt = depsCheckedAt;

  // ── 2. modules 块的 nodejs 子模块 link（坑 execute-worktree-pnpm-monorepo-no-node-modules）──
  // generic monorepo（如 multi-agent-platform）worktree 子模块 frontend/sillyhub-daemon 无 node_modules，
  // 跑 pnpm test 失败。读 local.yaml modules 块，对 nodejs 子模块 tryLink main 的 node_modules。
  const modulePaths = extractModulePaths(yamlText);
  const moduleResults = [];
  for (const mp of modulePaths) {
    const wtDir = join(worktreePath, mp);
    const mainDir = mainCwd ? join(mainCwd, mp) : null;
    if (!existsSync(wtDir) || !mainDir || !hasNodeMarker(wtDir)) continue;
    moduleResults.push({ path: mp, ...linkOneDir(wtDir, mainDir) });
  }

  if (moduleResults.length > 0) {
    result.depsModules = moduleResults;
    const linkedModules = moduleResults.filter(m => m.status === 'linked');
    if (linkedModules.length > 0 && result.depsStatus === 'n/a') {
      // 标 generic 但子模块 link 成功 → 升级为 linked（deps gate 不再误判 unknown 阻断 execute）
      result.depsStatus = 'linked';
      result.depsMethod = linkedModules[0].method;
      result.depsSource = 'main-checkout';
    }
    const failedModules = moduleResults.filter(m => m.status === 'failed');
    if (failedModules.length > 0) {
      const fmsg = failedModules.map(m => `${m.path}: ${m.error}`).join('; ');
      result.depsError = result.depsError ? `${result.depsError}; ${fmsg}` : fmsg;
    }
  }

  return result;
}

/**
 * 统一的 worktree deps 新鲜度判定（H1，change 2026-08-05-tooling-feedback-fixes）。
 * 供 doctor（worktree.js）与 ensureDepsFreshness（run/stage.js）共用，消除两处双写漂移。
 *
 * 判定优先级：failed → missing → stale → main-drift → fresh
 *   - failed: meta.depsStatus==='failed'（上次供给失败，占最高优先级）
 *   - missing: depsStatus ∈ {linked, installed} 且 node_modules 不存在
 *   - stale: wtHash 与 meta.depsLockHash 不一致（worktree 自身 lockfile 在上次供给后变化）
 *   - main-drift: wtHash 与主仓 mainHash 不一致（主仓 lockfile 漂移；复用 linkOneDir 177-178 的 mismatch 判据）
 *   - fresh: 其余情况
 *
 * lockfileHash 返回 null（无 lockfile/package.json）时相关比较优雅降级——不报 stale / main-drift，
 * 避免无 lockfile 项目（如纯 generic / 非 nodejs）误判漂移。
 *
 * @param {object} [meta] - worktree meta（读 depsStatus / depsLockHash / depsError）
 * @param {string} wtPath - worktree 根目录
 * @param {string} mainCwd - 主 checkout 根目录
 * @returns {{ status: 'fresh'|'missing'|'stale'|'main-drift'|'failed', detail: string, wtHash: (string|null), mainHash: (string|null), metaLockHash: (string|null) }}
 */
export function checkDepsFreshness(meta, wtPath, mainCwd) {
  const depsStatus = meta && meta.depsStatus ? meta.depsStatus : null;
  const metaLockHash = meta && meta.depsLockHash ? meta.depsLockHash : null;
  const wtHash = lockfileHash(wtPath);
  const mainHash = lockfileHash(mainCwd);

  // 1. failed 最高优先级（对齐 task-01 蓝图：failed → missing → stale → main-drift → fresh）
  if (depsStatus === 'failed') {
    return {
      status: 'failed',
      detail: '上次依赖供给失败' + (meta && meta.depsError ? ': ' + meta.depsError : ''),
      wtHash, mainHash, metaLockHash,
    };
  }

  // 2. missing：曾 link/install 但 node_modules 已丢失（对齐 doctor 914-915 / ensure 403）
  const nmExists = wtPath ? existsSync(join(wtPath, 'node_modules')) : false;
  if (['linked', 'installed'].includes(depsStatus) && !nmExists) {
    return {
      status: 'missing',
      detail: `meta.depsStatus=${depsStatus} 但 node_modules 缺失`,
      wtHash, mainHash, metaLockHash,
    };
  }

  // 3. stale：worktree 自身 lockfile 与 meta 快照不一致（对齐 doctor 916-917 / ensure 404）
  if (metaLockHash && wtHash && wtHash !== metaLockHash) {
    return {
      status: 'stale',
      detail: `lockfile 变化 (${metaLockHash} -> ${wtHash})`,
      wtHash, mainHash, metaLockHash,
    };
  }

  // 4. main-drift（新增）：wtHash 与主仓 mainHash 不一致——主仓 lockfile 更新过、worktree 未跟
  if (wtHash && mainHash && wtHash !== mainHash) {
    return {
      status: 'main-drift',
      detail: `worktree lockfile 与主仓不一致 (wt=${wtHash} main=${mainHash})`,
      wtHash, mainHash, metaLockHash,
    };
  }

  // 5. fresh
  return {
    status: 'fresh',
    detail: '依赖新鲜',
    wtHash, mainHash, metaLockHash,
  };
}
