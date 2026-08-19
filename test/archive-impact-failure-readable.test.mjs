/**
 * archive extract-module-impact 步 workflow 检查失败输出的可读性回归测试（ql-20260819-006-d2d7）。
 *
 * 锁住的对外行为：
 *   - module-impact.md 章节缺失（contains_sections fail）时，CLI 输出失败明细的人类可读 message
 *     （「缺少章节: …」），不再打印裸 [object Object]（failures 条目是对象，历史代码直接 ${f}）
 *   - 检查失败为 advisory：步骤仍推进（fail-open 不变，本测试只锁打印面）
 *   - 合规 module-impact.md → 「module-impact.md 检查通过」
 *
 * fixture：复刻 .sillyspec/workflows/archive-impact.yaml（makeRepo 裸仓无 workflows 目录，
 * loadWorkflow 无文件返回 null、handler 整段跳过——必须随测试落一份）。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const ARCHIVE_STEPS = [
  { name: '任务完成度检查', status: 'completed' },
  { name: 'extract-module-impact', status: 'pending' },
  { name: 'sync-module-docs', status: 'pending' },
  { name: '确认归档', status: 'pending' },
  { name: '更新路线图和提交', status: 'pending' },
]

// 与真实 .sillyspec/workflows/archive-impact.yaml 同构（impact-analyzer 角色三检查）
const WORKFLOW_YAML = `name: archive-impact
description: 分析变更影响的模块并同步模块文档
spec_version: 1

roles:
  - id: impact-analyzer
    name: "影响分析"
    task: "分析 git diff，提取变更影响模块"
    outputs:
      - path: ".sillyspec/changes/<change-name>/module-impact.md"
        required: true
        checks:
          - type: file_exists
          - type: min_lines
            min: 20
          - type: contains_sections
            sections: ["模块影响矩阵", "未匹配文件"]

orchestration:
  mode: sequential
  timeout_per_role: 180

checks:
  workflow_level:
    - type: file_exists
      path: ".sillyspec/changes/<change-name>/module-impact.md"

on_check_failure: prompt_retry
`

// 章节名不合规的 module-impact.md（plan 首版旧结构：影响矩阵/更新结果，≥20 行过 min_lines）
const NONCOMPLIANT = `# 模块影响分析（Module Impact）— 测试 fixture

## 影响矩阵

| 模块 | 影响类型 |
|------|------|
| demo | 修改 |

${Array.from({ length: 18 }, (_, i) => `占位行 ${i + 1}：凑满 min_lines=20 的正文行`).join('\n')}

## 更新结果

| 目标 | 状态 |
|------|------|
| demo | done |
`

// 合规版（含契约章节名）
const COMPLIANT = `# 模块影响分析（Module Impact）— 测试 fixture

## 模块影响矩阵

| 模块 | 影响类型 |
|------|------|
| demo | 修改 |

${Array.from({ length: 18 }, (_, i) => `占位行 ${i + 1}：凑满 min_lines=20 的正文行`).join('\n')}

## 未匹配文件

无。

## 更新结果

| 目标 | 状态 |
|------|------|
| demo | done |
`

async function seedToImpactStep(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  // 让 CLI 初始化 archive 步骤 schema，再 seed 覆盖为 extract-module-impact pending
  runStage('archive', cn, cwd, {})
  await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS)
}

console.log('=== archive impact 检查失败输出可读性 ===\n')

// ── Case 1: 章节缺失 → 明细可读，无 [object Object]，步骤仍推进（advisory）──
console.log('--- Case 1: 章节缺失 → 可读明细 + 无 [object Object] ---')
{
  const { cwd, specBase } = makeRepo('cli-arch-impact-readable-')
  const cn = '2026-07-25-impact-readable'
  await seedToImpactStep(cwd, specBase, cn)
  mkdirSync(join(specBase, 'workflows'), { recursive: true })
  writeFileSync(join(specBase, 'workflows', 'archive-impact.yaml'), WORKFLOW_YAML)
  writeFileSync(join(specBase, 'changes', cn, 'module-impact.md'), NONCOMPLIANT)

  const r = runStage('archive', cn, cwd, { done: true, output: 'module-impact 已确认' })

  assert(r.combined.includes('module-impact.md 检查失败'), '输出含「module-impact.md 检查失败」头部')
  assert(!r.combined.includes('[object Object]'), '输出不含裸 [object Object]')
  assert(r.combined.includes('缺少章节'), '输出含可读明细「缺少章节」')
  assert(r.combined.includes('模块影响矩阵') && r.combined.includes('未匹配文件'), '明细点名缺失的契约章节名')
}

// ── Case 2: 合规 module-impact.md → 检查通过 ──
console.log('\n--- Case 2: 合规文档 → 检查通过 ---')
{
  const { cwd, specBase } = makeRepo('cli-arch-impact-pass-')
  const cn = '2026-07-25-impact-pass'
  await seedToImpactStep(cwd, specBase, cn)
  mkdirSync(join(specBase, 'workflows'), { recursive: true })
  writeFileSync(join(specBase, 'workflows', 'archive-impact.yaml'), WORKFLOW_YAML)
  writeFileSync(join(specBase, 'changes', cn, 'module-impact.md'), COMPLIANT)

  const r = runStage('archive', cn, cwd, { done: true, output: 'module-impact 已确认' })

  assert(r.combined.includes('module-impact.md 检查通过'), '合规文档输出「module-impact.md 检查通过」')
  assert(!r.combined.includes('[object Object]'), '通过路径同样无 [object Object]')
}

cleanup()
report(count.passed, count.failed, count.failures)
