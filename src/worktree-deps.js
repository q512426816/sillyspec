/**
 * worktree-deps.js — Worktree 依赖供给引擎
 *
 * 在 worktree.create() 的 baseline overlay 之后调用，让 worktree 立即可构建/测试。
 * 策略：junction/symlink 快路径（lockfile 一致）+ install 兜底；多语言按 local.yaml
 * project.type + lockfile 推断 install 命令。供给可失败，但状态写进 meta 供验证硬门读取。
 *
 * 见 change 2026-06-28-worktree-deps-provision / D-005@v1, D-007@v1。
 */

import { existsSync, readFileSync, realpathSync, lstatSync, readdirSync, unlinkSync } from 'fs';
import { join, isAbsolute, relative, resolve as resolvePath, sep as pathSep } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
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

/**
 * 读取 local.yaml 文本（specBase 优先，回退 worktreePath/.sillyspec；不读 process.cwd 避免环境配置泄漏）。
 * 返回 { text, source }——source 标记信任级（体检 SEC-01）：
 *   - 'specBase'：主仓配置，可信（其 commands.install 允许执行，仍过白名单+元字符门）
 *   - 'worktree'：worktree 内副本，agent/子代理可写区——只作 project.type / modules 等
 *     只读探测，其 commands.install 永不执行（否则绕过 worktree-guard 的危险命令拦截）
 */
function readLocalYamlSourced(specBase, worktreePath) {
  if (specBase) {
    const p = join(specBase, 'local.yaml');
    if (existsSync(p)) return { text: readFileSync(p, 'utf8'), source: 'specBase' };
  }
  if (worktreePath) {
    const p = join(worktreePath, '.sillyspec', 'local.yaml');
    if (existsSync(p)) return { text: readFileSync(p, 'utf8'), source: 'worktree' };
  }
  return { text: null, source: null };
}

/** 兼容旧签名：只要文本 */
function readLocalYaml(specBase, worktreePath) {
  return readLocalYamlSourced(specBase, worktreePath).text;
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
      // win32 cmd.exe 跑不了 ./gradlew（体检 BUG-08 同型）：优先 gradlew.bat，否则全局 gradle
      if (process.platform === 'win32') {
        return existsSync(join(worktreePath, 'gradlew.bat')) ? 'gradlew.bat test' : 'gradle test';
      }
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
    // 真实目录 ≠ 已有依赖（坑 provision-preexisting-dir-fake-linked，2026-08-23 实证：doctor --fix
    // 报 re-provisioned 但链接没建——worktree node_modules 是 install 半途中断残留的真实目录时，
    // realpath 不等 main → 被 preexisting 短路标 ok，根快路径据此写 depsStatus=linked，一个链接
    // 都没建且后验证 existsSync 对空/残目录照样过）。真实目录 → ok:false + preexistingDir 标记，
    // 交调用方决策：根快路径降级 tryInstall 真重建（宁可重装不说谎）；linkOneDir 视为本地安装
    // 保留（installed 语义，合法状态）。指向别处的 link 仍是「他者安装」，尊重不 clobber。
    try {
      if (!lstatSync(linkPath).isSymbolicLink()) {
        return { ok: false, preexistingDir: true, error: `node_modules 已存在且为真实目录（非链接，疑似 install 残留）: ${linkPath}` };
      }
    } catch {}
    // 指向别处 → 不 clobber，视为已有依赖（installed 语义）
    return { ok: true, method: 'install', preexisting: true };
  }
  // broken junction 清理（existsSync 对目标丢失的 junction/symlink 返回 false，但目录项占位会使
  // mklink/ln 撞名失败 → 根：落 install 慢路径；子模块：linkOneDir failed。此坑在 _doctorReprovision
  // 的解链段同样存在——它也用 existsSync 前置判断，broken junction 永远解不掉）：lstat 是 link 而
  // existsSync false → 删目录项后重建（rmdir 删 junction 不跟随 reparse，与 worktree.js 解链同款）。
  try {
    if (lstatSync(linkPath).isSymbolicLink()) {
      if (process.platform === 'win32') {
        execFileSync('cmd.exe', ['/c', 'rmdir', linkPath], { stdio: ['pipe', 'pipe', 'pipe'] });
      } else {
        unlinkSync(linkPath);
      }
    }
  } catch { /* lstat 抛 = 目录项真不存在，直接建 */ }
  try {
    if (process.platform === 'win32') {
      // execFileSync 数组形式不经 shell：POSIX 双引号内 `/$() 会执行、cmd.exe 双引号内 %VAR% 仍展开，
      // linkPath 含 local.yaml 模块 path，属项目内可配置值（安全收敛，与 git-helper 同范式）
      execFileSync('cmd.exe', ['/c', 'mklink', '/J', linkPath, mainNodeModules], { stdio: ['pipe', 'pipe', 'pipe'] });
    } else {
      execFileSync('ln', ['-s', mainNodeModules, linkPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    }
    // 创建后实物复核（坑 provision-silent-fake-installed 第②层，2026-08-21 实证：doctor 报
    // re-provisioned 成功但 junction 实际没建）——mklink/ln 退出码 0 不等于链接落盘（cmd.exe
    // 垫片链存在静默失败面），lstat+existsSync 复核不存在即判失败，交由调用方走 install 兜底
    //（junction（reparse point）与 symlink 的 lstat 均报 isSymbolicLink=true）
    try {
      const st = lstatSync(linkPath);
      if (!st.isSymbolicLink() || !existsSync(linkPath)) {
        return { ok: false, error: 'link 创建后复核失败：lstat 非 link 或路径不可达' };
      }
    } catch (e) {
      return { ok: false, error: `link 创建后复核失败（lstat ${e.message}）` };
    }
    return { ok: true, method: process.platform === 'win32' ? 'junction' : 'symlink' };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

/**
 * 执行 install 命令（带超时）。
 *
 * 安全收口（体检 SEC-01）：commands.install 来自 local.yaml 配置，若经 execSync(shell)
 * 原样执行，yaml 里的 `$(...)`/反引号/`;` 必然被解释——且 worktree 副本属 agent 可写区。
 * 三道门：
 *   1. 调用方保证来源可信（provisionDeps 只对 source==='specBase' 的 userInstall 走到这里）
 *   2. 可执行前缀白名单（包管理器家族）
 *   3. shell 元字符黑名单（win32 额外拦 %，cmd.exe 会展开 %VAR%），通过后拆 argv 数组执行不经 shell
 *
 * 链式命令支持（坑 worktree-install-whitelist-monorepo-chain，2026-08-20 实证）：monorepo 的
 * commands.install 常为链式写法（`cd web && pnpm install` / `npm install && npm run build:pkg`），
 * 旧实现整条过白名单 + 元字符门，`&&` 必拒 → depsStatus=failed → execute deps 门控卡死且无自愈
 * 路径（改 local.yaml 成单命令对需要 post-install build 的 monorepo 不可行）。现按 `&&` 拆段
 * 逐段校验执行：每段独立过白名单 + 元字符门（拆分后残余的单 `&`/`|`/`;` 仍被元字符门拦），
 * 段内允许 `cd <相对子路径>`（resolve 后必须仍在 worktree 根内，防越界建产物/读外部），
 * 全程 argv 数组执行不经 shell、任一段失败即停（&& 语义）。安全面不变：每个执行段仍是
 * 白名单包管理器命令，`||`/管道/`;`/后台均不支持。
 */
const INSTALL_BINARY_WHITELIST = /^(?:\.\/)?(?:pnpm|npm|yarn|bun|mvn|gradle|gradlew|uv|pip|pip3|python|python3|poetry|make)(?:\.cmd|\.bat|\.exe)?(?:\s|$)/;
const SHELL_METACHARS = /[;&|<>$`\n]/;
const WIN_SHELL_METACHARS = /[;&|<>$`\n%]/;
const CD_SEGMENT_RE = /^cd\s+([^\s]+)$/;

function tryInstall(cmd, cwd, timeout) {
  const trimmed = String(cmd || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'install 命令为空' };
  }
  const metaRe = process.platform === 'win32' ? WIN_SHELL_METACHARS : SHELL_METACHARS;
  // && 拆段（单段命令与原路径完全一致，零回归）；空段（`a &&`/`&& b`）视为畸形命令拒绝
  const segments = trimmed.split('&&').map(s => s.trim());
  if (segments.some(s => s === '')) {
    return { ok: false, error: `install 链式命令含空段，拒绝执行: ${trimmed}` };
  }
  let curCwd = cwd;
  const root = resolvePath(cwd);
  const planned = [];
  for (const seg of segments) {
    // 白名单先于元字符（保持原判定顺序）：`curl … | sh` 报非白名单而非元字符，
    // `npm install; rm …` 过白名单后被元字符门拦——两类拒绝语义与原实现一致
    const cd = seg.match(CD_SEGMENT_RE);
    if (!cd && !INSTALL_BINARY_WHITELIST.test(seg)) {
      return { ok: false, error: `install 命令不在包管理器白名单内，拒绝执行: ${seg}（支持 && 链式与 cd <子目录> 段，各执行段仍须为白名单包管理器命令）` };
    }
    if (metaRe.test(seg)) {
      return { ok: false, error: `install 命令段含 shell 元字符，拒绝执行: ${seg}（链式仅支持 &&；|| / 管道 / ; / 后台不支持）` };
    }
    if (cd) {
      const target = resolvePath(curCwd, cd[1]);
      if (target !== root && !target.startsWith(root + pathSep)) {
        return { ok: false, error: `install 命令的 cd 段越出 worktree 根，拒绝执行: ${seg}（cwd ${cwd}）` };
      }
      curCwd = target;
      continue;
    }
    planned.push(seg);
  }
  for (const seg of planned) {
    const argv = seg.split(/\s+/);
    try {
      if (process.platform === 'win32') {
        // Windows 包管理器是 .cmd 垫片，无 shell 的 spawn 无法解析——经 cmd.exe /c 传参；
        // 元字符（含 %）已拦，残余风险与 tryLink 的 mklink 同款
        execFileSync('cmd.exe', ['/c', ...argv], { cwd: curCwd, timeout, stdio: ['pipe', 'pipe', 'pipe'] });
      } else {
        execFileSync(argv[0], argv.slice(1), { cwd: curCwd, timeout, stdio: ['pipe', 'pipe', 'pipe'] });
      }
    } catch (e) {
      const msg = e.killed ? `timeout after ${timeout}ms` : ((e.stderr && e.stderr.toString()) || e.message);
      return { ok: false, error: `${seg} failed (cwd ${curCwd}): ${msg}` };
    }
  }
  return { ok: true };
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
 * modules 块 path 安全校验（体检 SEC-07）：只允许 worktree 内的相对子路径——
 * 拒绝绝对路径与 `..` 段，防止 local.yaml 配置把 junction/symlink 建到 worktree 之外。
 */
function isSafeModulePath(p) {
  if (!p || isAbsolute(p)) return false;
  const segs = p.split(/[\\/]+/);
  return !segs.includes('..');
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
  // 真实目录 = 子模块本地安装过（合法状态，如 mismatch 后用户手动 pnpm install）：保留为
  // installed 真话，不假 linked 也不误报 failed（tryLink 的 preexistingDir 细分见其注释）
  if (r.preexistingDir) return { status: 'installed', reason: '子模块 node_modules 为真实目录（本地安装），保留' };
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
  const { text: yamlText, source: yamlSource } = readLocalYamlSourced(specBase, worktreePath);
  const wtHash = lockfileHash(worktreePath);

  // ── 1. 根目录供给 ──
  const projectType = detectProjectType(worktreePath, specBase);
  // SEC-01：commands.install 只信主仓 specBase 的 local.yaml——worktree 副本是 agent 可写区，
  // 其 install 命令若执行等于绕过 worktree-guard 的危险命令拦截
  const userInstall = yamlSource === 'specBase' ? extractUserInstall(yamlText) : null;
  if (yamlSource === 'worktree' && extractUserInstall(yamlText)) {
    console.warn('⚠️ worktree 内 local.yaml 的 commands.install 被忽略（agent 可写区，只信主仓 .sillyspec/local.yaml）');
  }
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
    // ── 结果后验证（坑 provision-silent-fake-installed，2026-08-21 Windows 实证；
    //    坑 provision-monorepo-subpackage-fake-installed，2026-08-22 复发：pnpm monorepo
    //    workspace 根 package.json 的 dependencies 常为空（依赖在 frontend/daemon 子包），
    //    只查根会把 installed 状态整体跳过——doctor 标 installed 但子包 node_modules 全缺，
    //    Wave 1 测试才挂）。分层校验：
    //   linked：根 junction 实存硬校验（link 声称成功必留痕）；
    //   installed：校验目标集 = 根 + local.yaml modules 块声明的含 package.json 子模块，
    //     其中【声明了依赖】的目录逐一要求 node_modules 存在（pnpm/npm/yarn workspace
    //     安装都会给子包建 node_modules；无依赖声明的空壳目录合法地不建，不校验）。
    //   python/.venv、jvm 本地仓库本就不适用（整体仅 nodejs）。
    if (projectType === 'nodejs') {
      const pkgHasDeps = (dir) => {
        try {
          const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
          return ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
            .some(k => pkg[k] && Object.keys(pkg[k]).length > 0)
        } catch { return false }
      }
      // 目标集：根 + modules 块内含 package.json 的安全子模块（monorepo 子包）
      const verifyDirs = [worktreePath]
      for (const mp of extractModulePaths(yamlText)) {
        if (!isSafeModulePath(mp)) continue
        const sub = join(worktreePath, mp)
        if (existsSync(join(sub, 'package.json'))) verifyDirs.push(sub)
      }
      const depsDeclaredDirs = verifyDirs.filter(pkgHasDeps)
      const needVerify = result.depsStatus === 'linked'
        || (result.depsStatus === 'installed' && depsDeclaredDirs.length > 0)
      if (needVerify) {
        // linked 只验根（junction 语义）；installed 验全部声明依赖的目标目录
        const targets = result.depsStatus === 'linked' ? [worktreePath] : depsDeclaredDirs
        const missing = targets.filter(dir => !existsSync(join(dir, 'node_modules')))
        if (missing.length > 0) {
          const missingRel = missing.map(dir => relative(worktreePath, dir) || '(根)')
          result = {
            depsStatus: 'failed', depsMethod: null, depsSource: null, depsLockHash: wtHash,
            depsError: `${result.depsStatus} 后验证失败：${missingRel.join('、')} 的 node_modules 不存在（报成功但实际未落盘——Windows 静默失败面：cmd.exe 垫片解析/杀毒拦截/frozen-lockfile 快退）。` +
              `手动兜底：进 worktree 手动跑 ${installCmd}（子包随 workspace 一起装），或对 lockfile 一致的目录用 junction：New-Item -ItemType Junction -Path "<目标>/node_modules" -Target "<主仓对应目录>/node_modules"，然后重试 doctor --fix`,
          }
        }
      }
    }
  }
  result.depsCheckedAt = depsCheckedAt;

  // ── 2. modules 块的 nodejs 子模块 link（坑 execute-worktree-pnpm-monorepo-no-node-modules）──
  // generic monorepo（如 multi-agent-platform）worktree 子模块 frontend/sillyhub-daemon 无 node_modules，
  // 跑 pnpm test 失败。读 local.yaml modules 块，对 nodejs 子模块 tryLink main 的 node_modules。
  const modulePaths = extractModulePaths(yamlText);
  const moduleResults = [];
  for (const mp of modulePaths) {
    if (!isSafeModulePath(mp)) {
      moduleResults.push({ path: mp, status: 'skipped', reason: 'path 越界（绝对路径或 .. 段），拒绝 link' });
      continue;
    }
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
    // 子模块 link 后验证（坑 modules-submodule-link-verify，2026-08-23 实证：Windows 下漏链
    // frontend node_modules——linkOneDir 报 linked 但 junction 实际未建或 main 侧本就没有）。
    // linked 状态的子模块逐一核验 wt/<mp>/node_modules 实存：缺失降 failed 并给兜底指引
    //（不静默放行——跑测试时才发现就晚了）。
    for (const m of moduleResults) {
      if (m.status !== 'linked') continue
      const nmPath = join(worktreePath, m.path, 'node_modules')
      if (!existsSync(nmPath)) {
        m.status = 'failed'
        m.error = `linked 后验证失败：${m.path}/node_modules 不存在（报成功但实际未落盘）。兜底：New-Item -ItemType Junction -Path "<wt>/${m.path}/node_modules" -Target "<主仓>/${m.path}/node_modules"`
      }
    }
    const failedModules = moduleResults.filter(m => m.status === 'failed');
    if (failedModules.length > 0) {
      const fmsg = failedModules.map(m => `${m.path}: ${m.error}`).join('; ');
      result.depsError = result.depsError ? `${result.depsError}; ${fmsg}` : fmsg;
    }
    // mismatch 可见性（坑 modules-mismatch-invisible，2026-08-23 实证：mismatch/skipped 只写
    // depsModules 而 src 内零消费——doctor 报 re-provisioned 成功、子模块实际无链接且无任何
    // 提示）。mismatch（worktree 与主仓 lockfile 不一致，link 不适用）摘要进 depsError：可见、
    // 落 meta、doctor msg 带出（_doctorReprovision 不再抹）；但不降级 depsStatus——mismatch 是
    // 配置分叉态不是供给失败，降级会经 deps gate 卡死 execute（正确动作是用户在 worktree 跑
    // pnpm install 或对齐 lockfile， doctor --fix 的 force 重装路径也会覆盖此场景）。
    const mismatchModules = moduleResults.filter(m => m.status === 'mismatch');
    if (mismatchModules.length > 0) {
      const mmsg = `子模块 lockfile 与主仓不一致（未链接，本地 install 或对齐 lockfile）: ${mismatchModules.map(m => m.path).join('、')}`;
      result.depsError = result.depsError ? `${result.depsError}; ${mmsg}` : mmsg;
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

  // 2b. 子模块 missing（坑 modules-submodule-missing-no-selfheal）：meta.depsModules 中 linked
  // 状态的子模块逐一核验 wt/<mp>/node_modules 实存。provisionDeps 内的同款核验（坑
  // modules-submodule-link-verify）只管供给时刻，此后 junction 被删（杀毒/手工误删/半途清理）
  // 时本函数只查根（上方）→ 永远 fresh → doctor 不再报 → 漏链永不自愈。此处补 doctor 侧
  // 闭环：缺失 → missing → doctor --fix 走 relinkFirst 重链（provisionDeps 非 force 路径
  // 的 linkOneDir 对缺失目录直接重建 junction）。
  if (Array.isArray(meta && meta.depsModules)) {
    const missingMods = meta.depsModules.filter(m =>
      m && m.status === 'linked' && typeof m.path === 'string'
      && !existsSync(join(wtPath, m.path, 'node_modules')));
    if (missingMods.length > 0) {
      return {
        status: 'missing',
        detail: `${missingMods.length} 个 linked 子模块 node_modules 缺失: ${missingMods.map(m => m.path).join('、')}`,
        wtHash, mainHash, metaLockHash,
      };
    }
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

/**
 * editable install 越界探测（坑 worktree-editable-install-escape，2026-08-25 用户实证
 * gen:types 坑）：worktree 内 Python venv 的 editable install 指向 worktree 外（典型：
 * 主仓 checkout 路径）时，gen:types / 后端命令 / pytest 静默加载 worktree 外的旧代码——
 * 改动不生效且无任何报错，此前靠模块文档注意事项人工记忆，本函数把它 CLI 检查化
 * （worktree doctor 调用）。
 *
 * 覆盖三种 editable 痕迹：
 *   1. 路径型 .pth（setuptools 旧式）：.pth 内容行即绝对路径
 *   2. PEP 660 __editable__.<pkg>-*.pth + __editable___<pkg>_*_finder.py（MAPPING 表绝对路径）
 *   3. *.dist-info/direct_url.json { dir_info.editable: true, url: file:///... }
 * 判定统一为「目标路径 resolve 后不在 worktree 内」；venv/文件读取失败按无越界处理
 * （doctor 体检语义，不阻断）。
 *
 * @param {string} wtPath worktree 根目录
 * @returns {Array<{ pkg: string, target: string, via: string }>} 越界清单（空 = 干净或无 venv）
 */
export function detectEditableInstallEscape(wtPath) {
  const offenders = [];
  if (!wtPath || !existsSync(wtPath)) return offenders;
  const wtRoot = resolvePath(wtPath);
  const isEscape = (target) => {
    if (!target || !isAbsolute(target)) return false;
    const rel = relative(wtRoot, resolvePath(target));
    return rel.startsWith('..') || isAbsolute(rel);
  };
  const seen = new Set();
  const push = (pkg, target, via) => {
    const key = `${pkg}|${target}`;
    if (seen.has(key)) return;
    seen.add(key);
    offenders.push({ pkg, target, via });
  };

  for (const venvName of ['.venv', 'venv']) {
    const venvDir = join(wtPath, venvName);
    if (!existsSync(venvDir)) continue;
    // site-packages 候选：Windows Lib/site-packages + POSIX lib/python*/site-packages
    const spCandidates = [join(venvDir, 'Lib', 'site-packages')];
    try {
      for (const e of readdirSync(join(venvDir, 'lib'), { withFileTypes: true })) {
        if (e.isDirectory() && e.name.toLowerCase().startsWith('python')) {
          spCandidates.push(join(venvDir, 'lib', e.name, 'site-packages'));
        }
      }
    } catch { /* 无 lib 目录（Windows 布局）跳过 */ }
    for (const sp of spCandidates) {
      if (!existsSync(sp)) continue;
      let entries = [];
      try { entries = readdirSync(sp, { withFileTypes: true }); } catch { continue; }
      for (const e of entries) {
        if (!e.isFile()) continue;
        const fp = join(sp, e.name);
        if (e.name.endsWith('.pth')) {
          let lines = [];
          try { lines = readFileSync(fp, 'utf8').split('\n'); } catch { continue; }
          for (const raw of lines) {
            const line = raw.trim();
            if (!line || line.startsWith('#') || line.startsWith('import ')) continue;
            if (isEscape(line)) push(e.name.replace(/\.pth$/, ''), line, '.pth');
          }
        } else if (/^__editable___.+_finder\.py$/.test(e.name)) {
          let src = '';
          try { src = readFileSync(fp, 'utf8'); } catch { continue; }
          const mm = /MAPPING\s*=\s*\{([\s\S]*?)\}/.exec(src);
          if (!mm) continue;
          const pkg = e.name.replace(/^__editable___/, '').replace(/_finder\.py$/, '');
          for (const pm of mm[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)) {
            const target = pm[1].replace(/\\\\/g, '\\');
            if (isEscape(target)) push(pkg, target, 'pep660-finder');
          }
        }
      }
      // direct_url.json（pip/uv 现代 editable 标记）
      for (const e of entries) {
        if (!e.isDirectory() || !e.name.endsWith('.dist-info')) continue;
        const du = join(sp, e.name, 'direct_url.json');
        if (!existsSync(du)) continue;
        try {
          const meta = JSON.parse(readFileSync(du, 'utf8'));
          if (meta?.dir_info?.editable && typeof meta.url === 'string' && meta.url.startsWith('file://')) {
            const target = fileURLToPath(meta.url);
            if (isEscape(target)) push(e.name.replace(/\.dist-info$/, ''), target, 'direct_url');
          }
        } catch { /* 解析失败跳过 */ }
      }
    }
  }
  return offenders;
}
