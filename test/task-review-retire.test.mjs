/**
 * task-review-retire.test.mjs — Task Review 层退役钉（2026-09-26-task-review-retire）
 *
 * 依据：R18 对撞实验实证（docs/analysis/R18-*）execute 每任务 review.json 评审层在无嵌套
 * 派发环境全降自审表演（15 次拦截 5 次形式合规、实质拦截为零）。本变更把该层从「可豁免」
 * 推进到「退役」；Stage Review 层（阶段粒度）保留。锁定：
 *   ① gates.js 三处消费门退役：enforceReviewJsonGate 删导出、Execute Task Review Gate 活块删
 *      （仅存墓碑注释）、align 门无 Task Review 校验段；
 *   ② complete.js 生成侧停写：无 autoCheckPlanFromReviews 调用、无 generateTaskReviewDrafts
 *      兜底；detectExecuteBatchFinish（checkExecuteCodeEvidence 假勾防线）保留；
 *   ③ 勾选迁移文案钉：execute/verify 指引含手动勾选语义（完成=实现+测试绿+wt-commit 即勾），
 *      旧「CLI 自动勾选/禁止手动勾选」条款退役；旧「降级自审」句删除（豁免声明句在场）；
 *   ④ 保留面钉：task-review.js / stage-review.js 模块导出在场（历史归档 doctor/回放兼容读侧）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')

test('① gates.js 三处消费门退役', () => {
  const src = read('src/run/gates.js')
  // 消费门 ②：enforceReviewJsonGate 整函数删除（连导出一起）
  assert.ok(!src.includes('export async function enforceReviewJsonGate'), 'enforceReviewJsonGate 导出已退役')
  assert.ok(!src.includes('validateCheckedTaskReviews({'), 'gates.js 不再调用 validateCheckedTaskReviews（仅注释提及兼容读侧）')
  // 消费门 ①：Execute Task Review Gate 活块删除，仅存墓碑注释
  assert.ok(!/── Execute Task Review Gate：所有 task 必须有 review.json 且 verdict 通过 ──/.test(src), '活块头已删')
  assert.ok(!src.includes('validateTaskReviews({ planContent'), 'validateTaskReviews 调用已删')
  assert.ok(src.includes('Execute Task Review Gate 已退役'), '墓碑注释在场（退役可追溯）')
  // 消费门 ③：align 门只剩 Stage Review 段 + 豁免头
  const fnStart = src.indexOf('export async function enforceAlignExecuteReviewGate')
  const fnBody = src.slice(fnStart, src.indexOf('\n}', fnStart))
  assert.ok(fnStart >= 0, 'enforceAlignExecuteReviewGate 保留（Stage Review 段仍硬拦）')
  assert.ok(!fnBody.includes('validateTaskReviews'), 'align 门无 Task Review 校验段')
  assert.ok(fnBody.includes('validateStageReview'), 'align 门保留 Stage Review 校验')
  // Stage Review Gate 保留面：豁免分支与 tier 分级仍在
  assert.ok(/tier\.tier === 'self'/.test(src), 'Stage Review tier 分级保留')
  assert.ok(src.includes('readReviewUnsupervisedWaiver'), 'review-unsupervised 豁免凭据保留（Stage Review/align 消费）')
})

test('② complete.js 生成侧停写（批量完成与代码证据核验保留；批量路径草稿重接线 2026-10-15）', () => {
  const src = read('src/run/complete.js')
  assert.ok(!src.includes('await autoCheckPlanFromReviews('), '无 autoCheckPlanFromReviews 调用（--done/完成提示两处均删）')
  assert.ok(src.includes('detectExecuteBatchFinish'), 'detectExecuteBatchFinish 保留（批量完成）')
  // 2026-10-15-pitfall-batch-clearance FR-07（坑 task-review-retired-archive-mismatch）：退役时
  // 「生成侧停写」钉已过时——archive step2 真相源仍要 review.json，正常五阶段变更到归档门口
  // 全量缺失。新契约：generateTaskReviewDrafts 只允许在 detectExecuteBatchFinish 函数体内
  // （批量完成路径幂等补缺失草稿）；completeStep 主体/单步完成提示仍零草稿兜底。
  const fnStart = src.indexOf('export async function detectExecuteBatchFinish')
  assert.ok(fnStart >= 0, 'detectExecuteBatchFinish 函数体定位')
  const callIdx = src.indexOf('generateTaskReviewDrafts({ changeName, cwd, platformOpts })')
  assert.ok(callIdx > fnStart, '草稿生成调用在 detectExecuteBatchFinish 函数体内（批量路径限定）')
  // completeStep 主体（detectExecuteBatchFinish 定义之前的区域）不得出现草稿兜底调用
  // （注释里的「与 generateTaskReviewDrafts 同源」提及不算调用——只匹配调用形态）
  assert.ok(!/generateTaskReviewDrafts\(/.test(src.slice(0, fnStart)), 'completeStep/单步路径无草稿兜底调用')
  // 模块内 autoCheckPlanFromReviews 定义保留（兼容读侧：index.js review-write 钩子 / task-done 消费）
  assert.ok(src.includes('export async function autoCheckPlanFromReviews'), 'autoCheckPlanFromReviews 定义保留（兼容导出）')
})

test('③ 勾选迁移文案钉（手动勾选语义在场，旧自动勾选条款退役）', () => {
  const exec = read('src/stages/execute.js')
  const verify = read('src/stages/verify.js')
  // 新语义
  assert.ok(exec.includes('手动勾选 tasks.md 对应 checkbox'), 'execute 指引：手动勾选在位')
  assert.ok(exec.includes('完成=实现+测试绿+wt-commit 即勾'), 'execute 指引：完成判定三要素（实现+测试绿+wt-commit）')
  assert.ok(verify.includes('勾选由 agent 在任务完成（实现+测试绿+wt-commit）时手动写入'), 'verify 逐项检查步：手动勾选口径句')
  // 旧条款退役
  assert.ok(!exec.includes('禁止手动勾选 tasks.md 的 checkbox'), '旧「禁止手动勾选」退役')
  assert.ok(!exec.includes('checkbox 由 CLI 自动勾选'), '旧「CLI 自动勾选」句退役')
  assert.ok(!exec.includes('写 review.json 即可'), '旧「写 review.json 即可」句退役')
  assert.ok(!exec.includes('### Task Review Gate'), 'Task Review Gate 指引段已删')
  // 降级自审句收敛（豁免声明句在场）
  for (const f of ['src/stages/brainstorm.js', 'src/stages/plan.js', 'src/stages/execute.js']) {
    const t = read(f)
    assert.ok(!t.includes('主代理切换为审查者角色自审替代'), `${f} 旧降级自审句已删`)
    assert.ok(t.includes('review-unsupervised.md'), `${f} 豁免声明句在场`)
  }
  // 跨仓回收段
  assert.ok(exec.includes('手动勾选 tasks.md 对应 checkbox（完成=实现+测试绿+wt-commit 即勾，同 thin 工作单元语义）'), '跨仓回收段手动勾选句在位')
})

test('④ 保留面钉：task-review.js / stage-review.js 模块兼容读侧在场', async () => {
  const tr = await import(pathToFileURL(join(ROOT, 'src/task-review.js')).href)
  for (const name of ['validateTaskReviews', 'validateCheckedTaskReviews', 'generateTaskReviewDrafts', 'resolveLatestExecuteRunIdWithTasks', 'isValidExecuteRunId']) {
    assert.equal(typeof tr[name], 'function', `task-review.js 导出 ${name}（历史变更 doctor/回放兼容读侧）`)
  }
  const sr = await import(pathToFileURL(join(ROOT, 'src/stage-review.js')).href)
  for (const name of ['validateStageReview', 'classifyReviewerChannel']) {
    assert.equal(typeof sr[name], 'function', `stage-review.js 导出 ${name}（Stage Review 层保留）`)
  }
})
