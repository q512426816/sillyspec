/**
 * 跨仓主副本直写检测测试（FR-06/07，D-003@v1——坑 cross-wt-toolchain-split 2026-10-10
 * 用户实证：D-007 决策下 agent 绕开 worktree 直写 urgent master，5 commit 落主干、空
 * worktree 被静默清理，零提示）。
 *
 * 覆盖 detectCrossMainCopyBypass（纯函数）：
 *   1. 命中：base 后有推进且文件与声明面相交 → { commits, files }
 *   2. 未命中：无推进 / 推进但与声明面无交集（并行会话合法态）
 *   3. 声明面缺失（空 Set）/ 参数缺失 → null
 *   4. fail-open：非 git 目录 / baseHash 悬空 → null 零抛错
 *
 * 风格：node:test + 真实 git fixture（对齐 cross-repo-worktree-isolation.test.mjs 范式）。
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execSync, execFileSync } from 'node:child_process';
import { detectCrossMainCopyBypass } from '../src/worktree-apply.js';

const tempDirs = [];
function makeRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(d);
  execSync('git init -q', { cwd: d, stdio: 'pipe' });
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' });
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' });
  execSync('git config commit.gpgsign false', { cwd: d, stdio: 'pipe' });
  writeFileSync(join(d, 'README.md'), 'init\n');
  execSync('git add .', { cwd: d, stdio: 'pipe' });
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' });
  return d;
}
function git(d, args) {
  return execFileSync('git', args, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function commitFile(repo, rel, content) {
  const abs = join(repo, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
  execSync(`git add "${rel}"`, { cwd: repo, stdio: 'pipe' });
  execSync('git commit -q -m wip', { cwd: repo, stdio: 'pipe' });
}

after(() => {
  for (const d of tempDirs) {
    try { rmSync(d, { recursive: true, force: true }); } catch { /* Windows 句柄延迟 */ }
  }
});

test('命中：base 后推进且与声明面相交（FR-06 / D-007 签名）', () => {
  const repo = makeRepo('cbyp-hit-');
  const base = git(repo, ['rev-parse', 'HEAD']);
  commitFile(repo, 'src/fire/Unit.java', 'class Unit {}\n');           // 声明面内
  commitFile(repo, 'src/other/Noise.java', 'class Noise {}\n');        // 声明面外（不掩蔽交集）
  const bypass = detectCrossMainCopyBypass(repo, base, new Set(['src/fire/*.java']));
  assert.ok(bypass, '有交集 → 检出');
  assert.equal(bypass.commits, 2, 'commit 计数');
  assert.deepEqual(bypass.files, ['src/fire/Unit.java'], '交集文件（pathMatches 容差命中通配）');
});

test('未命中：无推进 / 推进但交集为空（FR-06 不误报并行会话）', () => {
  const repo = makeRepo('cbyp-miss-');
  const base = git(repo, ['rev-parse', 'HEAD']);
  assert.equal(detectCrossMainCopyBypass(repo, base, new Set(['src/fire/*.java'])), null, '无推进 → null');

  commitFile(repo, 'src/parallel/Other.java', 'x\n'); // 推进但全在声明面外
  assert.equal(
    detectCrossMainCopyBypass(repo, base, new Set(['src/fire/*.java'])),
    null,
    '推进但交集空（并行会话无关推进）→ null',
  );
});

test('声明面缺失 / 参数缺失 → null（FR-06 不告警条件）', () => {
  const repo = makeRepo('cbyp-args-');
  const base = git(repo, ['rev-parse', 'HEAD']);
  commitFile(repo, 'src/fire/Unit.java', 'x\n');
  assert.equal(detectCrossMainCopyBypass(repo, base, new Set()), null, '空声明面（缺失）→ null');
  assert.equal(detectCrossMainCopyBypass(repo, '', new Set(['src/'])), null, 'baseHash 缺失 → null');
  assert.equal(detectCrossMainCopyBypass('', base, new Set(['src/'])), null, 'crossRoot 缺失 → null');
  assert.equal(detectCrossMainCopyBypass(repo, base, 'not-a-set'), null, 'allowSet 非 Set → null');
});

test('fail-open：非 git 目录 / baseHash 悬空零抛错（FR-07）', () => {
  const plain = mkdtempSync(join(tmpdir(), 'cbyp-plain-'));
  tempDirs.push(plain);
  assert.equal(detectCrossMainCopyBypass(plain, 'deadbeef', new Set(['src/'])), null, '非 git 目录 fail-open');

  const repo = makeRepo('cbyp-dangle-');
  assert.equal(detectCrossMainCopyBypass(repo, '0000000000000000000000000000000000000000', new Set(['src/'])), null, 'baseHash 悬空 fail-open');
});
