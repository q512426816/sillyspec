/**
 * execute 派发契约单测（2026-09-21-r5-efficiency-batch1 task-03，FR-03 / D-001@v1 + D-002@v1）
 *
 * 背景：验靶实证 execute 实现子代理新鲜内容仅 3.2%——「轮数 × 上下文」里轮数是另一半杠杆
 * （逐处小 Edit / TodoWrite 连发 / 逐文件跑测是轮数膨胀三大源头）。buildWavePrompt
 * 「子代理 prompt 要点」追加轮数纪律三行（B-⑥）+ 子代理返回契约（C-1 B1：≤25 行结构化
 * 摘要）；Task Review Gate 回收约定段补回收瘦身行（C-1 B2：verdict + blockers +
 * review.json 路径，细节不转述）。git diff 对账逻辑零改动（对账真相源红线）。
 *
 * 锁死契约（文本钉 = 子串/正则断言，非全文快照——文案微调不碎，语义漂移即红）：
 * 1. 轮数纪律三要素：同文件改动合并一次 Edit / TodoWrite 只在阶段边界 / 测试合并单次 Bash
 * 2. 返回契约：≤25 行 + verdict（done|blocked）+ 触碰文件数 + 偏差说明，细节不贴正文
 * 3. 回收瘦身：blockers 与 review.json 路径同现一行 + git diff 仍是回收真相源
 * 4. 编号单调：全局硬约束恒 9 → 材料包顺延 10 → 轮数纪律/返回契约再顺延，缺位前移不撞车
 *    （四种 gc×材料包组合全覆盖）
 * 5. task-02 回归钉：材料包行有映射渲染、无映射零注入（本 task 追加不得破坏）
 * 6. 红线钉：Task Review Gate 的 diff 对账步骤原样在位（本 task 只加 prompt 渲染文本）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildWavePrompt } from '../src/stages/execute.js'

const GC_PLAN = '# 计划\n\n## Wave 1\n- task-01\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n- 约束甲：不得新增依赖\n'
const WAVE = { index: 0, tasks: [{ name: 'task-01 测试任务', file: 'tasks/task-01.md' }] }

/** 建 fixture change 目录（tasks/task-01.md + 可选 plan.md）；planMd=null 表示不写 plan.md。 */
function makeChangeDir(planMd = null) {
  const cd = mkdtempSync(join(tmpdir(), 'dispatch-contract-'))
  mkdirSync(join(cd, 'tasks'), { recursive: true })
  writeFileSync(join(cd, 'tasks', 'task-01.md'), '# task-01 测试任务\n\n实现示例功能。\n')
  if (planMd !== null) writeFileSync(join(cd, 'plan.md'), planMd)
  return cd
}

/** 渲染便捷封装：worktree 指向临时目录（不存在也可——模板只拼路径不落盘）。 */
function render(cd, options = {}) {
  return buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), options)
}

test('轮数纪律三要素注入 buildWavePrompt 渲染输出（B-⑥）', () => {
  const cd = makeChangeDir()
  const wp = render(cd)
  assert.ok(/合并.*Edit 批量提交/.test(wp), '要素一：相邻同文件改动合并一次 Edit 批量提交（合并.*Edit）')
  assert.ok(/TodoWrite 只在阶段边界用/.test(wp), '要素二：TodoWrite 只在阶段边界用（TodoWrite.*阶段边界）')
  assert.ok(wp.includes('实现中途不连发'), '要素二补：实现中途不连发')
  assert.ok(/(合并单次 Bash|单次 Bash)/.test(wp), '要素三：测试验证合并单次 Bash 跑完（合并单次|单次 Bash）')
  assert.ok(wp.includes('不逐文件逐轮跑'), '要素三补：不逐文件逐轮跑')
  assert.ok(wp.includes('省 token 铁律'), '标题「省 token 铁律」在位')
  rmSync(cd, { recursive: true, force: true })
})

test('子代理返回契约注入（C-1 B1：≤25 行结构化摘要）', () => {
  const cd = makeChangeDir()
  const wp = render(cd)
  assert.ok(/(≤25 行|25 行)/.test(wp), '「≤25 行」上限在位（≤25 行|25 行）')
  assert.ok(wp.includes('verdict（done|blocked）'), 'verdict 取值 done|blocked 在位')
  assert.ok(wp.includes('触碰文件数') && wp.includes('测试一行结果') && wp.includes('偏差说明'), '摘要四要素（verdict/文件数/测试一行/偏差）在位')
  assert.ok(wp.includes('实现细节不贴正文') && wp.includes('落盘文件按需 Read'), '细节不贴正文、落盘按需 Read 在位')
  rmSync(cd, { recursive: true, force: true })
})

test('回收瘦身行注入 Task Review Gate（C-1 B2：blockers 与 review.json 路径同现）', () => {
  const cd = makeChangeDir()
  const wp = render(cd)
  assert.ok(wp.includes('回收瘦身'), '「回收瘦身」标题在位')
  const line = wp.split('\n').find(l => l.includes('回收瘦身'))
  assert.ok(line !== undefined && line.includes('blockers') && line.includes('review.json 路径'), 'blockers 与 review.json 路径同现一行')
  assert.ok(wp.includes('git diff 对账仍是回收真相源'), 'git diff 仍是回收真相源（红线语义钉）')
  assert.ok(wp.includes('主代理按需 Read 工件'), '细节不转述、主代理按需 Read 工件在位')
  rmSync(cd, { recursive: true, force: true })
})

test('红线钉：Task Review Gate 的 diff 对账步骤原样在位（本 task 只加 prompt 文本）', () => {
  const cd = makeChangeDir()
  const wp = render(cd)
  assert.ok(wp.includes('每个子代理完成后，你必须创建 task review'), 'Task Review Gate 段头在位')
  assert.ok(wp.includes('1. 读取当前 task 的 git diff'), '操作步骤 1（读 git diff）原样在位')
  assert.ok(wp.includes('3. 写入 review.json 文件'), '操作步骤 3（写 review.json）原样在位')
  assert.ok(wp.includes('不信任 implementer 自报结果，对照 diff 和 task brief 验证'), '评审铁律首条原样在位')
  rmSync(cd, { recursive: true, force: true })
})

test('编号单调：gc + 材料包并存 → 9 硬约束 / 10 材料包 / 11 轮数纪律 / 12 返回契约', () => {
  const cd = makeChangeDir(GC_PLAN)
  const matPath = join(cd, 'materials', 'task-01.md')
  const wp = render(cd, { materials: { 'task-01': matPath } })
  assert.ok(wp.includes('9. **全局硬约束'), '全局硬约束恒为第 9 条（既有钉）')
  assert.ok(wp.includes('10. **任务材料包'), '材料包顺延第 10 条（task-02 钉）')
  assert.ok(wp.includes('11. **轮数纪律'), '轮数纪律顺延第 11 条（编号单调）')
  assert.ok(wp.includes('12. **返回契约'), '返回契约顺延第 12 条（编号单调）')
  rmSync(cd, { recursive: true, force: true })
})

test('编号单调：有 gc 无材料包 → 9 硬约束 / 10 轮数纪律 / 11 返回契约', () => {
  const cd = makeChangeDir(GC_PLAN)
  const wp = render(cd)
  assert.ok(wp.includes('9. **全局硬约束'), '全局硬约束第 9 条')
  assert.ok(!wp.includes('任务材料包'), '无映射材料包零注入（task-02 钉）')
  assert.ok(wp.includes('10. **轮数纪律'), '轮数纪律前移第 10 条')
  assert.ok(wp.includes('11. **返回契约'), '返回契约前移第 11 条')
  rmSync(cd, { recursive: true, force: true })
})

test('编号单调：无 gc 有材料包 → 9 材料包 / 10 轮数纪律 / 11 返回契约', () => {
  const cd = makeChangeDir()
  const matPath = join(cd, 'materials', 'task-01.md')
  const wp = render(cd, { materials: { 'task-01': matPath } })
  assert.ok(!wp.includes('全局硬约束（plan.md 逐字下发'), '无 gc 段零注入（既有钉）')
  assert.ok(wp.includes('9. **任务材料包'), '材料包占第 9 条（task-02 钉）')
  assert.ok(wp.includes('10. **轮数纪律'), '轮数纪律顺延第 10 条')
  assert.ok(wp.includes('11. **返回契约'), '返回契约顺延第 11 条')
  rmSync(cd, { recursive: true, force: true })
})

test('编号单调：无 gc 无材料包 → 9 轮数纪律 / 10 返回契约（紧跟既有 1-8 条）', () => {
  const cd = makeChangeDir()
  const wp = render(cd)
  assert.ok(!wp.includes('全局硬约束（plan.md 逐字下发'), '无 gc 段零注入')
  assert.ok(!wp.includes('任务材料包'), '无材料包零注入')
  assert.ok(wp.includes('9. **轮数纪律'), '轮数纪律占第 9 条')
  assert.ok(wp.includes('10. **返回契约'), '返回契约占第 10 条')
  rmSync(cd, { recursive: true, force: true })
})

test('task-02 回归钉：材料包行渲染语义完整（先读/回源/只摘不译）', () => {
  const cd = makeChangeDir()
  const matPath = join(cd, 'materials', 'task-01.md')
  const wp = render(cd, { materials: { 'task-01': matPath } })
  assert.ok(wp.includes(matPath), '材料包路径行在位')
  assert.ok(wp.includes('先读材料包') && wp.includes('按锚点回源核对'), '「先读材料包/按锚点回源核对」在位')
  assert.ok(wp.includes('材料包只摘不译，冲突以源文件为准'), '「只摘不译，冲突以源文件为准」在位')
  rmSync(cd, { recursive: true, force: true })
})
