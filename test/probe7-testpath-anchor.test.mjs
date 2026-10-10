/**
 * isProbe7TestPath 锚定口径直测（2026-10-10-dyn-subset-nontest-runner-face FR-01）。
 *
 * 坑 verify-dynamic-subset-node-test-ts-source（平台侧 multi-agent-platform 实证）：
 * 旧口径 /spec/i 裸子串把文件名含 spec 字样的源码（sillyhub-daemon/src/spec-sync.ts）
 * 误判为测试路径 → 探针 7 归属矩阵计入 testFiles → trace 落盘进 FR 机器绑定行 →
 * 后续变更经 FR 回归面并入实测 → node --test 直跑源码 ERR_MODULE_NOT_FOUND 假败阻断收口。
 *
 * 新口径与执行侧 isTestFilePath 同源锚定：后缀（.test./.spec. js 系）∪ 目录
 * （tests?/、__tests__/）∪ python 形态（test_*.py、*_test.py）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isProbe7TestPath } from '../src/verify-probes.js'

test('源码文件名含 spec 字样不误判（坑 spec-sync 复现样本）', () => {
  assert.equal(isProbe7TestPath('sillyhub-daemon/src/spec-sync.ts'), false,
    'spec-sync.ts=源码（2026-10-10 平台侧 node --test 假败实锤样本）')
  assert.equal(isProbe7TestPath('src/respec.ts'), false, 'respec 前缀非锚定')
  assert.equal(isProbe7TestPath('src/spec.ts'), false, '裸 spec.ts 无点锚')
  assert.equal(isProbe7TestPath('src/spec_sync-utils.ts'), false, '下划线连字非锚定')
  assert.equal(isProbe7TestPath('src/contest.ts'), false, 'contest 子串不含锚')
  assert.equal(isProbe7TestPath('sillyhub-daemon/src/config.js'), false, '普通源码')
  assert.equal(isProbe7TestPath('docs/x.md'), false, '文档')
})

test('合法测试形态照常命中', () => {
  assert.equal(isProbe7TestPath('sillyhub-daemon/tests/run-sillyspec-init.test.ts'), true,
    '坑样本同卡测试文件（tests/ 目录 + .test. 双锚）')
  assert.equal(isProbe7TestPath('frontend/src/components/card.test.tsx'), true)
  assert.equal(isProbe7TestPath('pkg/util.spec.mjs'), true)
  assert.equal(isProbe7TestPath('a.b.test.cjs'), true)
  assert.equal(isProbe7TestPath('backend/app/tests/test_claim.py'), true)
  assert.equal(isProbe7TestPath('pkg/x_test.py'), true)
  assert.equal(isProbe7TestPath('test/root.ts'), true, '根级 test/ 目录（原口径保留）')
  assert.equal(isProbe7TestPath('deep/__tests__/foo.ts'), true, '__tests__ 惯例目录')
})

test('Windows 反斜杠路径同口径', () => {
  assert.equal(isProbe7TestPath('sillyhub-daemon\\src\\spec-sync.ts'), false)
  assert.equal(isProbe7TestPath('sillyhub-daemon\\tests\\run.test.ts'), true)
})
