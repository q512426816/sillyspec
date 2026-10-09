/**
 * verify 收口纯事实门前移回归锁（2026-10-09-verify-reuse-friction FR-05 / D-004@v1）。
 *
 * 2026-10-09 取证：target_files 对账（纯 git 事实、秒级）原先排在 test/lint 实测门之后
 * ——每处声明偏差先付 3.5 分钟实测再被拦（14:00-14:10 每轮先测后拦）。修复后：required-
 * evidence 与 target_files 对账前移到实测门之前并入 R16 文档面聚合——②类「声明未做」
 * 秒级失败且零测试执行。
 *
 * oracle：flip.test.mjs（在变更 diff 面内，动态子集必发现）真跑会落 marker 文件——
 * 被对账门拦下时 marker 必不存在（零测试执行）。
 */
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const VERIFY_STEPS = [
  '状态检查', '加载规范并锚定', '逐项检查任务', '对照设计检查',
  '任务蓝图验收', '运行测试和质量扫描', '输出验证报告',
]

async function seedVerifyToLast(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  // 存量变更回填（对齐 run-complete-step-verify 先例：规避 IR 严格档探面子节的无关拦截面）
  try {
    const db = pm._ensureDB(cwd)
    db.getDb().prepare("UPDATE changes SET created_at = '2026-01-01T00:00:00.000Z' WHERE name = ?").run(cn)
  } catch { /* 回填失败不阻断 */ }
  runCLI(['--dir', cwd, 'run', 'verify', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'verify', VERIFY_STEPS.map((name, i) => ({
    name, status: i < VERIFY_STEPS.length - 1 ? 'completed' : 'pending',
  })))
}

console.log('=== 纯事实门前移：②类声明缺失 → 秒级拦截 + 零测试执行 ===\n')
{
  const { cwd, specBase } = makeRepo('cheap-first-')
  const cn = '2026-07-25-cheap-first'
  try {
    await seedVerifyToLast(cwd, specBase, cn)
    const changeDir = join(specBase, 'changes', cn)
    // 核心文档（过 runValidators）
    writeFileSync(join(changeDir, 'design.md'), '# Design: x\n\n## 背景\nb\n\n## 总体方案\ns\n\n## 决策\nD-001@v1: d\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | flip.test.mjs | t |\n')
    writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [ ] task-01: a\n')
    writeFileSync(join(changeDir, 'verify-result.md'), '# 验证报告\n\n## 结论\n\nPASS\n\n所有任务通过。\n')
    // task 卡：声明一个真实在场面文件 + 一个不存在文件（②类 missing_declared）
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
      '---',
      'id: task-01',
      'title: t',
      'title_zh: t',
      'status: draft',
      'depends_on: []',
      'goal: g',
      'implementation: i',
      'verify: node flip.test.mjs',
      'constraints: c',
      'acceptance:',
      '  - a1',
      'target_files:',
      '  - flip.test.mjs',
      '  - src/declared-but-missing.js',
      '---',
      '',
    ].join('\n'))
    // flip.test.mjs：真跑则落 marker（oracle）；在 diff 面内（未提交新增）
    writeFileSync(join(cwd, 'flip.test.mjs'), [
      "import { test } from 'node:test'",
      "import assert from 'node:assert/strict'",
      "import { writeFileSync } from 'node:fs'",
      "test('marker', () => { writeFileSync('test-ran.marker', 'ran'); assert.ok(true) })",
      '',
    ].join('\n'))
    // local.yaml：test/lint 裸值命令在场（若实测门被执行则有迹可循）
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: node flip.test.mjs\n  lint: node flip.test.mjs\n')

    const r = runStage('verify', cn, cwd, { done: true, output: '报告已输出' })

    assert(r.combined.includes('target_files') && r.combined.includes('声明未做'), `stdout 含 target_files ②类拦截（尾 200：${r.combined.slice(-200)}）`)
    assert(!existsSync(join(cwd, 'test-ran.marker')), '零测试执行：marker 不存在（对账门先于实测门）')
    const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
    assert(after.stages.verify.status !== 'completed', 'DB: stage 未 completed（被纯事实门拦下）')
  } finally {
    try { rmSync(cwd, { recursive: true, force: true }) } catch {}
  }
}

cleanup()
report(count.passed, count.failed, count.failures)
