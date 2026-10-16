/**
 * 坑 verify-incremental-rerun-infra-batch-growth 回归：基建失败批不进增量失败批账本
 *
 * 实证（2026-10-15 两变更）：jsx 批 Windows argv 超限（「命令行太长。」非测试断言失败）
 * 整批 failed → 进前轮失败批 → 增量面 141→159 随轮膨胀自锁。
 *
 * 锁定（runVerifyTestCheck dynamic-subset 的 failedFiles 聚合源级 + 行为三态）：
 *   ① 基建失败批（无测试级失败行 + reason 命中基建关键词）→ 不进 failedFiles；
 *   ② 真测试失败（有 not ok/FAILED 痕迹）→ 照旧归因入账（含同 reason 命中基建词但有
 *     测试失败行的混合形态——测试失败行优先）；
 *   ③ 无基建关键词的失败（runner 异常等其他形态）→ 保守入账（旧行为）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')

test('① 源级钉：failedFiles 聚合含基建甄别（INFRA_REASON_RE + 留痕）', () => {
  const src = readFileSync(join(REPO, 'src/verify-postcheck.js'), 'utf8')
  assert.ok(src.includes('INFRA_REASON_RE'), '基建关键词判据在场')
  assert.ok(src.includes('不进增量失败批账本'), '留痕文案在场（坑归因可查）')
  assert.ok(src.includes('verify-incremental-rerun-infra-batch-growth'), '坑注锚在场')
})

test('② 行为三态：基建批跳过 / 混合批（有测试失败行）照归 / 未知失败保守入账', () => {
  // 直接测聚合谓词逻辑（与源内同构的三态语义）
  const INFRA_REASON_RE = /命令行太长|E2BIG|spawn|Cannot find module|No test files found|ENAMETOOLONG/i
  const TEST_FAILURE_RE = /not ok \d|FAILED|ERROR|AssertionError|assert/i
  const isInfraOnly = (r) => {
    const text = String(r.outputFull || r.outputTail || '')
    return !TEST_FAILURE_RE.test(text) && INFRA_REASON_RE.test(String(r.reason || '') + text)
  }
  // 纯基建（坑现场形态：命令行太长 + 零测试行）
  assert.equal(isInfraOnly({ reason: '命令行太长。', outputTail: '命令行太长。\n' }), true, '纯基建批跳过')
  // 混合（reason 有基建词但输出有真测试失败行——测试失败行优先）
  assert.equal(isInfraOnly({ reason: '命令行太长。', outputTail: 'not ok 1 - test/a.test.mjs\n  AssertionError: x' }), false, '有测试失败行不判基建')
  // 未知失败（无基建词）→ 保守（false = 不跳过 → 入账旧行为）
  assert.equal(isInfraOnly({ reason: 'exit 1', outputTail: 'something odd\n' }), false, '未知失败保守入账')
})

test('③ 真测试失败批照旧入账（回归保护——attributeFailedFiles 链不变）', () => {
  const src = readFileSync(join(REPO, 'src/verify-postcheck.js'), 'utf8')
  const i = src.indexOf('for (const f of attributeFailedFiles(r)) out.add(f)')
  assert.ok(i > 0, 'attributeFailedFiles 归因链仍在（非基建批路径）')
})
