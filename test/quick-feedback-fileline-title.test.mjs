// 2026-09-08 用户反馈批次①②的行为锁定：
//   ① QUICKLOG「文件：」行回填保留模块卡 + changelog sidecar（此前被 isQuickMetadata 一并
//      滤掉，收尾必改项每回手工补录）——审计豁免面（isQuickMetadata）与记录面
//      （isQuicklogFileLineNoise）分叉后的两侧口径都要锁。
//   ② --req 标题不再截到首个标点（旧口径迫使 agent 避开标点写标题）；超 80 字才在就近
//      标点/空格处截断。
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { isQuickMetadata, isQuicklogFileLineNoise } from '../src/run/shared.js'
import { extractTitleFromResult } from '../src/quicklog.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

console.log('\n[quick-feedback-①②] QUICKLOG 文件行保留模块卡 + --req 标点')

// ─────────────────────────────────────────
console.log('\n--- ① isQuicklogFileLineNoise（记录面）与 isQuickMetadata（审计面）分叉 ---')
{
  const cases = [
    // [路径, 记录面应滤?, 审计面应滤?, 说明]
    ['.sillyspec/docs/sillyspec/modules/progress.md', false, true, '模块卡：审计放行、文件行保留'],
    ['.sillyspec\\docs\\sillyspec\\modules\\progress.md', false, true, '模块卡（反斜杠容错）'],
    ['.sillyspec/docs/sillyspec/modules/progress.changelog.md', false, true, 'changelog sidecar：审计放行、文件行保留'],
    ['.sillyspec/docs/sillyspec/modules/_module-map.yaml', true, true, '_module-map 索引：两侧都滤（CLI 维护非手工改动）'],
    ['.sillyspec/quicklog/QUICKLOG-qinyi.md', true, true, 'QUICKLOG 自身：两侧都滤'],
    ['.sillyspec/.runtime/spec-sync-base.json', true, true, '.runtime：两侧都滤'],
    ['.sillyspec/changes/2026-09-08-x/proposal.md', false, false, '关联变更目录：两侧都留（真实改动）'],
    ['.sillyspec/changes/2026-09-08-other/proposal.md', true, true, '非关联变更目录：两侧都滤（并发他者会话）'],
    ['src/progress.js', false, false, '业务源码：两侧都留'],
  ]
  const linked = ['2026-09-08-x']
  for (const [p, lineNoise, meta, label] of cases) {
    assert(isQuicklogFileLineNoise(p, linked) === lineNoise, `记录面 ${label}: ${p}`)
    assert(isQuickMetadata(p, linked) === meta, `审计面 ${label}: ${p}`)
  }
}

// ─────────────────────────────────────────
console.log('\n--- ② extractTitleFromResult：标点保留 + 超长就近断句 ---')
{
  // 标点不再截断（旧口径「A，B」→「A」）
  assert(extractTitleFromResult('需求：门禁实测：test 5.5s，lint 25.5s 全过 根因：无 方案：跑门禁 结果：绿')
    === '门禁实测：test 5.5s，lint 25.5s 全过', '含标点标题原样保留（逗号/冒号不截）')
  assert(extractTitleFromResult('需求：修侧栏 根因：flex 塌陷 方案：min-width 结果：绿') === '修侧栏',
    '常规短标题不受影响（根因前截断）')
  assert(extractTitleFromResult('') === '', '空输入返回空串')

  // 超长：优先在标点处断
  const longTailPunct = '需求：' + '甲'.repeat(70) + '，' + '乙'.repeat(30) + ' 根因：x 方案：y 结果：z'
  const t1 = extractTitleFromResult(longTailPunct)
  assert(t1.endsWith('…') && t1.includes('甲'.repeat(10)) && !t1.includes('乙'),
    `超长标题在标点处断句（长度 ${t1.length}，末尾省略号）`)
  assert(t1.length <= 82, '断句后不超 80 字 + 省略号')

  // 超长且前 80 字无标点 → 硬截
  const longNoPunct = '需求：' + '丙'.repeat(120) + ' 根因：x 方案：y 结果：z'
  const t2 = extractTitleFromResult(longNoPunct)
  assert(t2 === '丙'.repeat(80) + '…', `无标点超长标题硬截 80（实际 ${t2.length} 字符）`)

  // 恰好 80 字：不截
  const exact80 = '需求：' + '丁'.repeat(80) + ' 根因：x 方案：y 结果：z'
  assert(extractTitleFromResult(exact80) === '丁'.repeat(80), '恰 80 字不加省略号')
}

if (failures > 0) {
  console.error(`\n[quick-feedback-①②] ❌ ${failures} 项失败`)
  process.exit(1)
}
console.log('\n[quick-feedback-①②] ✅ 全部通过')
