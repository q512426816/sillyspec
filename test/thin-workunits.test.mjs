/**
 * thin-workunits.test.mjs — 任务面归属（2026-09-26-thin-workunits 聚类方案 → thin-agent-tasks 回退覆写方案）
 *
 * 演化记录：thin-workunits 的域关键词聚类（WORK_UNIT_BUCKETS）被用户否决——开放世界任务形态
 * 不可穷举，枚举分类表是错误方向（本会话第三次同款错误）。本套件钉回退后的正确形态：
 *   ① 聚类器清零：groupCriteriaToUnits/WORK_UNIT_BUCKETS 不再存在（回退钉）；
 *   ② draftTasks 恢复逐条标准预填（≤任意条数都逐条，行经 clipTaskText）；
 *   ③ 简报/advisory 文案为「预填草稿可覆写」语义，旧聚类文案零残留；
 *   ④ tasks.md 头注释声明计划面归 agent。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('① 聚类器回退钉：groupCriteriaToUnits/WORK_UNIT_BUCKETS 零残留', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow-draft.js'), 'utf8')
  assert.ok(!/groupCriteriaToUnits|WORK_UNIT_BUCKETS/.test(src), '聚类器应整体移除（枚举开放世界被否决——design 决策留痕）')
})

test('② draftTasks 逐条预填恢复（任意条数逐条镜像，不再分单元）', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow-draft.js'), 'utf8')
  assert.ok(src.includes('crit.map((c, i) => `- [ ] task-'), '逐条渲染在场')
  assert.ok(!/覆盖标准 \$\{covers\}/.test(src), '单元行渲染（覆盖标准号）应已随聚类器移除')
})

test('③ 覆写语义文案钉：简报/advisory 三处 + 旧聚类文案零残留', () => {
  const flow = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  const hits = (flow.match(/任务面归你/g) || []).length
  assert.ok(hits >= 2, `fresh/adopt 简报应有覆写语义（实际 ${hits} 处）`)
  assert.ok(flow.includes('按真实实现路径改写') || flow.includes('增删改'), '覆写指引在场（2026-10-07-thin-tasks-v3 措辞：工作分解种子可增删改）')
  assert.ok(!/完成一个工作单元（该域实现\+测试绿）/.test(flow), '聚类语义文案零残留')
})

test('④ tasks.md 头注释：计划面归 agent 声明', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow-draft.js'), 'utf8')
  assert.ok(src.includes('任务面归 agent'), '头注释应声明覆写权')
})
