/**
 * 2026-10-06-verify-friction-fix — gate last 读取面回归
 *
 * 厚流程 postmortem（sess_4769fd5d）实证：gate-last-<change>.json 只有 writer（quick-D）没有
 * reader——看上轮 verify --done blocked 原因只能重跑全量 gate（实测超时转后台）或手翻两层 JSON
 * （gate-last → reconcile-result.json）。本文件钉 summarizeVerifyGatePointer 三态：
 *   ① 无指针 → found:false 不抛；
 *   ② blocked 指针 + 取证目录 → 摘要含 reconcile missing/undeclared 与 probe mismatches；
 *   ③ 指针损坏 → unreadable:true 不抛（fail-soft，与 writer 口径一致）。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { summarizeVerifyGatePointer } from '../src/machine-interface.js';

test('无指针 → found:false（不抛）', () => {
  const root = mkdtempSync(join(tmpdir(), 'gl-'));
  const r = summarizeVerifyGatePointer({ specBase: join(root, 'spec'), changeName: 'demo' });
  assert.equal(r.found, false);
  assert.ok(r.pointerPath.includes('gate-last-demo.json'), `指针路径回显：${r.pointerPath}`);
});

test('blocked 指针 + 取证目录 → 摘要含 reconcile missing/undeclared 与 probe mismatches', () => {
  const root = mkdtempSync(join(tmpdir(), 'gl2-'));
  const specBase = join(root, 'spec');
  const runsDir = join(specBase, '.runtime', 'verify-runs');
  const runDir = join(runsDir, '20261006120000');
  mkdirSync(runDir, { recursive: true });
  writeFileSync(
    join(runDir, 'reconcile-result.json'),
    JSON.stringify({ status: 'blocked', missing: ['src/a.js'], undeclared: ['src/b.js'], matched: ['src/c.js'] }),
    'utf8',
  );
  writeFileSync(
    join(runDir, 'probe-consistency-result.json'),
    JSON.stringify({ status: 'mismatch', severity: 'error', mismatches: [{ probe: 1, note: 'x' }] }),
    'utf8',
  );
  writeFileSync(
    join(runsDir, 'gate-last-demo.json'),
    JSON.stringify({ change: 'demo', blocked: true, note: 'target_files ②类（missing_declared）阻断', latest_run_dir: runDir, written_at: '2026-10-06T12:00:00Z' }),
    'utf8',
  );
  const r = summarizeVerifyGatePointer({ specBase, changeName: 'demo' });
  assert.equal(r.found, true);
  assert.equal(r.blocked, true);
  assert.equal(r.note, 'target_files ②类（missing_declared）阻断');
  assert.deepEqual(r.reconcile.missing, ['src/a.js']);
  assert.deepEqual(r.reconcile.undeclared, ['src/b.js']);
  assert.equal(r.probeConsistency.mismatches.length, 1);
});

test('指针 JSON 损坏 → unreadable 不抛', () => {
  const root = mkdtempSync(join(tmpdir(), 'gl3-'));
  const runsDir = join(root, 'spec', '.runtime', 'verify-runs');
  mkdirSync(runsDir, { recursive: true });
  writeFileSync(join(runsDir, 'gate-last-demo.json'), '{not json', 'utf8');
  const r = summarizeVerifyGatePointer({ specBase: join(root, 'spec'), changeName: 'demo' });
  assert.equal(r.found, true);
  assert.equal(r.unreadable, true);
});
