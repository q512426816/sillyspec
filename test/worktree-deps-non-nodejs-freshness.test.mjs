/**
 * checkDepsFreshness 生态中立回归测试（坑 non-nodejs-missing-misjudge + deps-ecosystem-hardcode）。
 *
 * 实证：maven 项目 worktree depsStatus=installed（产物在 ~/.m2，worktree 内恒无 node_modules），
 * 旧实现的 missing 判定只看「installed/linked 且 node_modules 不存在」→ 每次 execute 入口都误判
 * missing → 重跑 mvn → 无工具链 PATH 的 shell 失败 → depsStatus 打回 failed → deps 门控阻断 --done
 * → 步骤被污染成 blocked（连锁见坑 deps-gate-blocked-invisible）。
 *
 * 修复（2026-08-27 二阶段 deps-ecosystem-hardcode）：判定基准收敛到 ECOSYSTEMS 清单表——
 *   1. missing 只对声明 marker 的生态生效（nodejs → node_modules；maven/gradle/python marker=null）
 *   2. stale/main-drift 的清单 hash 泛化到全生态（maven pom.xml 变化 = nodejs lockfile 变化同权）
 *   3. detectProjectType/inferInstallCommand 表驱动，新生态（go/rust/php/ruby）可探测可供给
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkDepsFreshness, detectProjectType, inferInstallCommand, lockfileHash, detectEcosystem } from '../src/worktree-deps.js';

const tempDirs = [];
function makeDir(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(d);
  return d;
}
test.after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows best-effort */ }
  }
});

test('maven：installed + 无 node_modules → fresh（不误判 missing）', () => {
  const wt = makeDir('mavenwt-');
  writeFileSync(join(wt, 'pom.xml'), '<project></project>\n');
  const r = checkDepsFreshness({ depsStatus: 'installed', depsLockHash: null }, wt, wt);
  assert.equal(r.status, 'fresh', `maven installed 应 fresh（实际 ${r.status}: ${r.detail}）`);
});

test('maven：linked + 无 node_modules → fresh（同理）', () => {
  const wt = makeDir('mavenwt2-');
  writeFileSync(join(wt, 'pom.xml'), '<project></project>\n');
  const r = checkDepsFreshness({ depsStatus: 'linked', depsLockHash: null }, wt, wt);
  assert.equal(r.status, 'fresh', `maven linked 应 fresh（实际 ${r.status}）`);
});

test('nodejs：installed + 无 node_modules → missing（护栏保留）', () => {
  const wt = makeDir('nodewt-');
  writeFileSync(join(wt, 'package.json'), JSON.stringify({ name: 'x', dependencies: { a: '1' } }));
  const r = checkDepsFreshness({ depsStatus: 'installed', depsLockHash: 'abc' }, wt, wt);
  assert.equal(r.status, 'missing', 'nodejs installed 但 node_modules 缺失仍应判 missing');
});

test('failed 优先级不变（任何项目类型）', () => {
  const wt = makeDir('failwt-');
  writeFileSync(join(wt, 'pom.xml'), '<project></project>\n');
  const r = checkDepsFreshness({ depsStatus: 'failed', depsError: 'boom' }, wt, wt);
  assert.equal(r.status, 'failed', 'failed 仍为最高优先级');
});

test('python（pyproject.toml）installed + 无 node_modules → fresh', () => {
  const wt = makeDir('pywt-');
  writeFileSync(join(wt, 'pyproject.toml'), '[project]\nname = "x"\n');
  const r = checkDepsFreshness({ depsStatus: 'installed', depsLockHash: null }, wt, wt);
  assert.equal(r.status, 'fresh', `python installed 应 fresh（实际 ${r.status}）`);
});

// ── 清单 hash 泛化：stale / main-drift 对全生态同权 ──

test('maven：pom.xml 供给后变化 → stale（与 nodejs lockfile 变化同语义）', () => {
  const wt = makeDir('mavenstale-');
  writeFileSync(join(wt, 'pom.xml'), '<project>v1</project>\n');
  const oldHash = lockfileHash(wt);
  writeFileSync(join(wt, 'pom.xml'), '<project>v2</project>\n'); // 加了个依赖
  const r = checkDepsFreshness({ depsStatus: 'installed', depsLockHash: oldHash }, wt, wt);
  assert.equal(r.status, 'stale', `pom.xml 变化应触发 stale（实际 ${r.status}）`);
});

test('maven：主仓 pom.xml 漂移 → main-drift（泛化后同样生效）', () => {
  const wt = makeDir('mavenwt3-');
  const main = makeDir('mavenmain3-');
  writeFileSync(join(wt, 'pom.xml'), '<project>wt</project>\n');
  writeFileSync(join(main, 'pom.xml'), '<project>main-advanced</project>\n');
  const r = checkDepsFreshness({ depsStatus: 'installed', depsLockHash: lockfileHash(wt) }, wt, main);
  assert.equal(r.status, 'main-drift', `主仓清单漂移应触发 main-drift（实际 ${r.status}）`);
});

test('lockfileHash：全生态清单可哈希（maven/go），无清单返 null', () => {
  const maven = makeDir('hashmaven-');
  writeFileSync(join(maven, 'pom.xml'), '<project></project>\n');
  assert.ok(lockfileHash(maven), 'pom.xml 可作 hash 基准');
  const go = makeDir('hashgo-');
  writeFileSync(join(go, 'go.mod'), 'module x\n');
  assert.ok(lockfileHash(go), 'go.mod 可作 hash 基准');
  const empty = makeDir('hashempty-');
  assert.equal(lockfileHash(empty), null, '无任何清单 → null（freshness 优雅降级）');
});

// ── 探测/供给表驱动：新生态 + polyglot 优先级 ──

test('detectProjectType：表驱动探测（go/rust/php/ruby/gradle）', () => {
  const cases = [
    ['go.mod', 'go'],
    ['Cargo.toml', 'rust'],
    ['composer.json', 'php'],
    ['Gemfile', 'ruby'],
    ['build.gradle', 'gradle'],
    ['build.gradle.kts', 'gradle'],
  ];
  for (const [file, expected] of cases) {
    const d = makeDir(`detect-${expected}-`);
    writeFileSync(join(d, file), 'x\n');
    assert.equal(detectProjectType(d, null), expected, `${file} → ${expected}`);
  }
  const plain = makeDir('detect-generic-');
  writeFileSync(join(plain, 'notes.txt'), 'x\n');
  assert.equal(detectProjectType(plain, null), 'generic', '无生态特征 → generic');
});

test('detectProjectType：polyglot 目录按表序定性（pom.xml + package.json → maven）', () => {
  const d = makeDir('detect-poly-');
  writeFileSync(join(d, 'pom.xml'), '<project></project>\n');
  writeFileSync(join(d, 'package.json'), '{"name":"x"}\n');
  assert.equal(detectProjectType(d, null), 'maven', 'polyglot 按表序先命中 maven');
  assert.equal(lockfileHash(d), lockfileHash(d), 'hash 基准确定（同一生态清单）');
});

test('inferInstallCommand：表内默认命令 + 表外类型 → null（n/a 降级）', () => {
  const go = makeDir('instgo-');
  writeFileSync(join(go, 'go.mod'), 'module x\n');
  assert.equal(inferInstallCommand('go', go, null), 'go mod download', 'go 默认供给命令');
  const rust = makeDir('instrust-');
  writeFileSync(join(rust, 'Cargo.toml'), '[package]\nname = "x"\n');
  assert.equal(inferInstallCommand('rust', rust, null), 'cargo fetch --locked', 'rust 默认供给命令');
  assert.equal(inferInstallCommand('custom-type', go, null), null, '表外 project.type → null → 根供给 n/a');
  assert.equal(inferInstallCommand('go', go, 'go mod tidy'), 'go mod tidy', 'commands.install 显式声明仍最高优先');
});

test('detectEcosystem：marker 只有 nodejs 声明（其余生态 null）', () => {
  const node = makeDir('econode-');
  writeFileSync(join(node, 'package.json'), '{"name":"x"}');
  assert.equal(detectEcosystem(node).marker, 'node_modules', 'nodejs marker = node_modules');
  const maven = makeDir('ecomaven-');
  writeFileSync(join(maven, 'pom.xml'), '<project></project>');
  assert.equal(detectEcosystem(maven).marker, null, 'maven marker = null（产物在 ~/.m2）');
  assert.equal(detectEcosystem(maven).type, 'maven', '表项可寻址');
});

