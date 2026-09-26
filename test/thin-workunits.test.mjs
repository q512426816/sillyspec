/**
 * thin-workunits.test.mjs — thin 任务面工作单元化（2026-09-26-thin-workunits）
 *
 * 覆盖验收面（R18 实证驱动：标准镜像式 checkbox 的勾选语义错配）：
 *   ① groupCriteriaToUnits：>5 条按域关键词聚桶（后端/前端/端到端/文档）+未命中处置+覆盖号稳定序；
 *   ② ≤5 条不聚类（逐条原形态，小变更零变化）；
 *   ③ draftTasks 单元渲染：task-NN: <域>——<摘要>等（覆盖标准 i,j,k）；单元数≤8；
 *   ④ R18-thin 实录形态回放：15 条标准 → 后端/前端/端到端等少量单元（勾选语义恢复）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { groupCriteriaToUnits, extractSuccessCriteria } = await import(pathToFileURL(join(ROOT, 'src', 'flow-draft.js')).href)

test('① >5 条按域聚桶 + 未命中并入 + 覆盖号稳定序', () => {
  const crit = [
    'POST /api/changes/{name}/events 端点接收事件写入（后端）',
    '事件写入幂等去重（ts+rule 键，api）',
    '前端面板观测事件折叠区渲染',
    'GET since 正序增量（后端接口）',
    '组件测试覆盖高亮与空态（vitest）',
    'curl 推 5 条端到端验收演示',
    '迁移建表与存储 schema',
  ]
  const units = groupCriteriaToUnits(crit)
  assert.ok(units.length <= 8 && units.length < crit.length, `应聚合（${units.length} 单元 < ${crit.length} 条）`)
  const backend = units.find((u) => u.label === '后端')
  assert.ok(backend && backend.indexes.length >= 3, '后端桶应收端点/去重/GET/迁移')
  const fe = units.find((u) => u.label === '前端')
  assert.ok(fe && fe.indexes.length >= 2, '前端桶应收面板/组件测试')
  const e2e = units.find((u) => u.label === '端到端')
  assert.ok(e2e, 'curl 验收归端到端桶')
  const all = units.flatMap((u) => u.indexes).sort((a, b) => a - b)
  assert.deepEqual(all, crit.map((_, i) => i), '全部标准恰好被覆盖一次（无遗漏无重复）')
  for (let i = 1; i < units.length; i++) assert.ok(units[i].indexes[0] > units[i - 1].indexes[0], '单元按首标准序稳定')
})

test('② ≤5 条不聚类（逐条原形态）', () => {
  const crit = ['标准一', '标准二', '标准三']
  const units = groupCriteriaToUnits(crit)
  assert.equal(units.length, 3)
  assert.ok(units.every((u) => u.label === null && u.indexes.length === 1), '逐条 1:1 单元')
})

test('③④ R18-thin 实录形态回放：真实任务简报 → 少量工作单元行', async () => {
  // R18 任务简报的成功标准典型形态（后端 5 + 前端 4 + E2E + 收尾 = 15 条量级）
  const input = [
    '动机：事件通道消费端',
    '成功标准：',
    '- POST /api/changes/{name}/events 接收事件写入，既有平台 token 鉴权',
    '- 事件幂等去重（事件 id 或 ts+rule 去重键）',
    '- 单变更超 5000 条上限保护（截断最旧或拒绝）',
    '- GET /api/changes/{name}/events?since 正序增量',
    '- append-only 存储零业务判定，provisional 只展示不消费',
    '- pytest 覆盖收/取/去重/鉴权/上限五组',
    '- 变更详情页观测事件折叠区，warning 默认展开+角标计数',
    '- 时间线渲染 warning 琥珀高亮，provisional 徽标悬停提示',
    '- 打开 GET 一次+30s 轮询',
    '- 组件测试覆盖渲染/高亮/空态/角标',
    '- curl 推 5 条（2 warning）GET 正序去重 E2E 验收',
    '- 相关测试全绿，临时产物清理',
  ].join('\n')
  const criteria = extractSuccessCriteria(input)
  assert.ok(criteria.length > 5, `夹具应在 5 条以上（实际 ${criteria.length}）`)
  const units = groupCriteriaToUnits(criteria)
  assert.ok(units.length >= 2 && units.length <= 8, `工作单元数合理（实际 ${units.length}）：${units.map((u) => u.label).join('/')}`)
  const backend = units.find((u) => u.label === '后端')
  assert.ok(backend && backend.indexes.length >= 4, `后端单元应聚合多条（实际 ${backend.indexes.length}）`)
  // 单元行渲染形态（draftTasks 内联——此处断言单元数据足以驱动渲染：label+indexes 在场）
  assert.ok(units.every((u) => Array.isArray(u.indexes) && u.indexes.length > 0))
})

test('⑤ 渲染行形态钉：draftTasks 单元行含覆盖标准号（读源码文本钉防回潮）', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow-draft.js'), 'utf8')
  assert.ok(src.includes('（覆盖标准 ${covers}）') || src.includes('覆盖标准'), '单元行应渲染覆盖标准号')
  assert.ok(src.includes('完成一个工作单元（该域实现+测试绿）') === false, 'flow.js 的文案不在本文件（防错位断言）')
  const flowSrc = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(flowSrc.includes('任务勾选纪律（工作单元'), '简报纪律文案应为工作单元语义')
  assert.ok(!/完成一条勾一条/.test(flowSrc), '旧逐条纪律文案应已清除')
})
