/**
 * 2026-10-15-pitfall-batch-clearance FR-03 — verify 收口三门并入 docGateFailures 一次性全列
 *
 * 坑 verify-close-gate-staggered-exposure（消费仓四轮 --done 实证）：探针一致性/draft 篡改/
 * ceremony 双跑三门原排在实测门之后逐个 fail-fast——每轮先付 195s 实测再见一个新文档问题。
 * 锁死契约：三门与既有文档校验器同轮收集，检查点 A 聚合输出（`N 道纯文档门拦截` + label 清单）
 * 后统一回滚；多门不满足时一轮全部列出。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { completeStageGates } from '../src/run/gates.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup } from './_complete-step-harness.mjs'

const VERIFY_STEPS = ['加载规范并锚定', '对照设计检查', '测试与质量扫描', '验证结果记录', '风险标记与收尾建议', '交叉验证（独立视角）', '汇总验证结论']

async function verifyFixture(prefix, changeName, { deadLetter, dropProbeSections, strict = true }) {
  const { cwd, specBase } = makeRepo(prefix)
  const pm = await initChange(cwd, specBase, changeName)
  // 严格档显式构造（harness 默认回填 2026-01-01 存量豁免档，照 ir-strict-mode 用例先例覆写）
  if (strict) {
    try {
      pm._ensureDB(cwd).getDb()
        .prepare("UPDATE changes SET created_at = '2026-10-15T00:00:00.000Z' WHERE name = ?")
        .run(changeName)
    } catch { /* 覆写失败 → 存量档（isStrictChange fail-open 同向） */ }
  }
  const changeDir = join(specBase, 'changes', changeName)
  writeFileSync(join(changeDir, 'design.md'), '# Design\n\n## 目标\n\n测试\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  // 严格档变更（created_at=now ≥ IR_STRICT_SINCE）+ 无 #### 探针 子节 → probe error
  const probeSection = dropProbeSections ? '' : '\n#### 探针 1 未实现标记\n\n（预填子节在场占位）\n'
  writeFileSync(join(changeDir, 'verify-result.md'),
    `---\nauthor: test\ncreated_at: 2026-08-15 00:00:00\n---\n# 验证报告\n\n## 结论\n\nPASS\n\n全部通过。${probeSection}`)
  const impactStatus = deadLetter ? '| （execute 完成后由 archive 阶段同步） | 待办 | pending |' : '| modules/x.md | 契约更新 | done |'
  writeFileSync(join(changeDir, 'module-impact.md'),
    `---\nauthor: test\ncreated_at: 2026-08-15 00:00:00\n---\n\n# 模块影响分析（Module Impact）— ${changeName}\n\n## 更新结果\n\n| 模块文档 | 操作 | 状态 |\n|----------|------|------|\n${impactStatus}\n`)
  const steps = VERIFY_STEPS.map(name => ({ name, status: 'completed' }))
  const progress = await seedStage(pm, cwd, changeName, 'verify', steps, 'completed')
  return { cwd, specBase, pm, progress, steps, changeName }
}

test.after(() => { cleanup() })

test('FR-03：死信 + 探针一致性两门同轮全列后统一回滚（不再逐门连撞）', async () => {
  const f = await verifyFixture('pgc-collect-', 'pgc-collect-x', { deadLetter: true, dropProbeSections: true })
  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'verify', cwd: f.cwd, changeName: f.changeName, platformOpts: {}, specBase: f.specBase, progress: f.progress, pm: f.pm, stageData: f.progress.stages.verify, steps: f.steps, currentIdx: 6, outputText: null }))

  assert.equal(r.result && r.result.stageCompleted, false, `stageCompleted:false（文档门回滚），result: ${JSON.stringify(r.result)}`)
  // 聚合签名：检查点 A 的「N 道纯文档门拦截」一次列出两门 label
  assert.ok(r.stdout.includes('纯文档门拦截'), `stdout 含检查点 A 聚合头（尾 500：${r.stdout.slice(-500)}）`)
  assert.ok(r.stdout.includes('pending/待办死信'), '死信门 label 在列')
  assert.ok(r.stdout.includes('探针一致性抽查 error 阻断'), '探针门 label 在列（前移收集生效）')
  const m = r.stdout.match(/被 (\d+) 道纯文档门拦截/)
  assert.ok(m && Number(m[1]) >= 2, `至少 2 道门同轮列出（got ${m && m[1]}）`)
  const after = await f.pm.read(f.cwd, f.changeName)
  assert.notEqual(after.stages.verify.status, 'completed', 'DB: verify 状态已回滚')
})

test('FR-03：三门全清时零新增噪音（存量档无 facts → 探针 skipped 不拦）', async () => {
  const f = await verifyFixture('pgc-clean-', 'pgc-clean-x', { deadLetter: false, dropProbeSections: true, strict: false })
  const r = await runCapturing(() =>
    completeStageGates({ stageName: 'verify', cwd: f.cwd, changeName: f.changeName, platformOpts: {}, specBase: f.specBase, progress: f.progress, pm: f.pm, stageData: f.progress.stages.verify, steps: f.steps, currentIdx: 6, outputText: null }))
  assert.ok(!r.stdout.includes('探针一致性抽查 error 阻断'), '探针门不误拦（子节在场）')
  assert.ok(!r.stdout.includes('纯文档门拦截'), '文档面全清不出现聚合头')
})
