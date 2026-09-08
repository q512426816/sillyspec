/**
 * verify 结论枚举槽（刀③，ql-20260908-012-31e5）。
 *
 * 结论判定从「标题关键词 + 400 字符窗口」改为固定槽行 `结论枚举：`<枚举>`` 优先
 * （extractVerifyConclusionSlot），窗口扫描降级为无槽存量文件的 legacy 回退。
 * 顺带修掉旧骨架占位符 `<待填：PASS 或 FAIL>` 含 PASS 字样被窗口正则误读成
 * 已填 PASS 的自通过缺陷——新占位符 `<待填：三选一>` 不含枚举词，双解析下 fail-closed。
 *
 * 覆盖：
 *   槽解析：填 PASS / PASS WITH NOTES（防裸 PASS 截断）/ FAIL / 未填 fail-closed / 无槽 → null
 *   骨架：含槽行、占位符不含枚举词（旧自通过缺陷回归锁）、整骨架喂解析器得 ''
 *   劫持回归：槽 FAIL + 诱饵「## 结论：PASS」标题 → 槽赢
 *   legacy 兼容：无槽自由格式不再本测试直接测（test/stage-contract.test.mjs 集成 4/5 全走 legacy 路径回归）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { extractVerifyConclusionSlot } from '../src/stage-contract.js'
import { generateVerifyResultSkeleton } from '../src/verify-probes.js'

test('槽解析：填 PASS', () => {
  assert.equal(extractVerifyConclusionSlot('## 结论 [层：人工判断]\n\n结论枚举：`PASS`——全绿'), 'PASS')
})

test('槽解析：PASS WITH NOTES 不被裸 PASS 截断（交替序）', () => {
  assert.equal(extractVerifyConclusionSlot('结论枚举：`PASS WITH NOTES`（遗留告警见风险章节）'), 'PASS WITH NOTES')
  assert.equal(extractVerifyConclusionSlot('结论枚举：PASS WITH NOTES'), 'PASS WITH NOTES')
})

test('槽解析：FAIL', () => {
  assert.equal(extractVerifyConclusionSlot('结论枚举：`FAIL`——探针5 有 contract gap'), 'FAIL')
})

test('槽解析：占位未填 → fail-closed 空串（正文其他枚举词不参与）', () => {
  const doc = [
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`<待填：三选一>`（把尖括号占位整体替换为 PASS / PASS WITH NOTES / FAIL 之一；一句话理由写在枚举后同行或下一行）',
  ].join('\n')
  assert.equal(extractVerifyConclusionSlot(doc), '')
})

test('槽解析：无槽行 → null（调用方走 legacy 窗口扫描）', () => {
  assert.equal(extractVerifyConclusionSlot('## 验收结论：✅ PASS\n\n一切正常'), null)
})

test('劫持回归：槽 FAIL + 诱饵「## 结论：PASS」标题在前 → 槽赢', () => {
  const doc = [
    '# 验证报告',
    '',
    '## 测试结果：PASS（ CLI 实测 42 个全过）',
    '',
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`FAIL`——探针5 存在 missing backend',
  ].join('\n')
  assert.equal(extractVerifyConclusionSlot(doc), 'FAIL')
})

test('骨架：含槽行且占位符不含枚举词（旧 `<待填：PASS 或 FAIL>` 自通过缺陷回归锁）', () => {
  const R = {
    probe1: { matches: [], globEntries: [], worktreeHits: 0, skippedFiles: [] },
    probe3: { tasks: [], note: 'tasks.md 无 checkbox 任务' },
    probe5: { summary: 'backend 0 端点 / frontend 0 调用' },
    probe6: { unavailable: true, deletions: [], note: 'git 不可用，删除对账跳过' },
  }
  const sk = generateVerifyResultSkeleton(R)

  assert.ok(sk.includes('## 结论 [层：人工判断]'), '骨架结论章节标题保留（claims 层标注不变）')
  assert.ok(/^结论枚举：`<待填：三选一>`/m.test(sk), '骨架含固定槽行（行首锚定）')
  assert.ok(!sk.includes('<待填：PASS'), '旧占位符形态已消灭（不再被窗口正则误读成 PASS）')
  // 整骨架喂槽解析器：槽存在未填 → ''（fail-closed，骨架不能直接过结论门）
  assert.equal(extractVerifyConclusionSlot(sk), '')
})
