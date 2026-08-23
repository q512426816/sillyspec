/**
 * quicklog 根因块嵌套四子字段回归（change: 2026-08-23-adopt-harness-practices task-10，FR-07/08/09）
 *
 * 锁定 Wave 2 task-07/08/09 三项产出，防 R-03（quicklog 四子字段与严格标签边界冲突）回归：
 *   1. 四子字段解析：多行根因块含 - 现象：/- 根因：/- 护栏：/- 证据： 列表行 → 完整落盘（保序逐行）、
 *      payload 归属 body_sections[根因]（lastLabel 挂载），顶层 需求/根因/方案/结果 边界完好
 *   2. 单行压缩兼容（R-03）：`需求：…根因：…方案：…结果：…` 单行归一（含根因正文带嵌套子字段
 *      压缩字样 / 引用标签字样 / 弱标点前导）→ 边界切分与旧逻辑逐字一致（task-07 未动三个边界函数）
 *   3. 旧条目回退：纯文本根因（无嵌套）→ 渲染与 payload 解析不变；单句结果仍落单行
 *   4. 嵌套 bullet 不劫入 files：文件多行 bullet 后跟根因块嵌套行 → payload.files 只含真实文件，
 *      嵌套行留根因段、raw_block 完整（task-07 inFiles/inLinked 复位修复锁定）
 *   5. 文案一致性：quick step3 新警告含「合法形态」语义、不含旧「避免嵌套全角冒号」泛化警告、
 *      含四子字段可选提示；verify/doctor postmortem 提示段含四子字段 + 三类证据路径 + known-issues.md 指引
 *
 * fixture 全 tmp 目录（mkdtemp + afterEach 清理）；平台推送用 fetch stub 捕获 payload
 * （best-effort 静默跳过路径不依赖网络）。只经公开 API（allocate/complete/validateQuickResult/
 * setQuickFileNotes + 三个 stage definition）断言，不 import 未导出内部。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  allocateQuicklogEntry,
  completeQuicklogEntry,
  validateQuickResult,
  setQuickFileNotes,
} from '../src/quicklog.js'
import { definition as quickDef } from '../src/stages/quick.js'
import { definition as verifyDef } from '../src/stages/verify.js'
import { definition as doctorDef } from '../src/stages/doctor.js'

let root
let specBase
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'ql-pm-'))
  specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
})
afterEach(() => {
  setQuickFileNotes('') // per-process 旁路通道读后即清，异常中断防残留跨用例
  try { rmSync(root, { recursive: true, force: true }) } catch {}
})

// ── fixture helpers ─────────────────────────────────────────────────────────

function readQuicklog() {
  const dir = join(specBase, 'quicklog')
  const f = readdirSync(dir).find((x) => x === 'QUICKLOG-qinyi.md')
  return readFileSync(join(dir, f), 'utf8')
}

/** 分配 + 翻完成一条 quick 会话（QUICKLOG 落盘 + 平台推送走 stub） */
async function runQuick(resultText, opts = {}) {
  const { qlId } = await allocateQuicklogEntry(specBase, 'qinyi', { description: 'postmortem 字段回归' })
  await completeQuicklogEntry(specBase, 'qinyi', qlId, { resultText, ...opts })
  return qlId
}

/**
 * 开平台推送捕获（写 local.yaml platform 段 + fetch stub），不依赖网络。
 * 用法：const { bodies, restore } = withPushCapture(); try { … } finally { restore() }
 */
function withPushCapture() {
  writeFileSync(join(specBase, 'local.yaml'), 'platform:\n  url: http://hub.test\n  token: tok\n')
  const bodies = []
  const saved = globalThis.fetch
  globalThis.fetch = async (_url, options) => {
    bodies.push(JSON.parse(options.body))
    return { ok: true, status: 200, json: async () => ({}) }
  }
  return { bodies, restore: () => { globalThis.fetch = saved } }
}

/** 取指定 qlId 的最后一条推送 payload（complete 在 allocate 后，末条即落盘终态版） */
function lastPayload(bodies, qlId) {
  return bodies.filter((b) => b.ql_id === qlId).at(-1)
}

// 多行根因块嵌套四子字段（task-08 quick step3 可选提示的合法形态）
const NESTED_RESULT = [
  '需求：修限流——标题行语义化短句',
  '根因：',
  '- 现象：登录接口偶发 500',
  '- 根因：INCR 计数在异常分支未清零',
  '- 护栏：补一条并发场景集成断言',
  '- 证据：.runtime/agent-logs/s-abc123.jsonl',
  '方案：异常分支统一走 finally 清零',
  '结果：5 单测通过、lint 0 告警',
].join('\n')

const NESTED_LINES_JOINED = [
  '- 现象：登录接口偶发 500',
  '- 根因：INCR 计数在异常分支未清零',
  '- 护栏：补一条并发场景集成断言',
  '- 证据：.runtime/agent-logs/s-abc123.jsonl',
].join('\n')

// ── 1. 四子字段多行解析（task-07 / D-004@v1）──────────────────────────────

describe('四子字段多行解析', () => {
  it('根因块四子字段完整落盘（保序连续）+ payload 归属根因段 + 顶层四字段边界完好', async () => {
    const cap = withPushCapture()
    let qlId
    try {
      qlId = await runQuick(NESTED_RESULT)
    } finally { cap.restore() }
    const content = readQuicklog()

    // 落盘：四子字段列表行随多行结果逐行原样落盘（带「- 」前缀、保序）
    assert.ok(content.includes(`根因：\n${NESTED_LINES_JOINED}`), '根因行后紧跟四子字段列表行（保序连续）')
    assert.ok(content.includes('需求：修限流——标题行语义化短句\n根因：'), '顶层需求行在前')
    assert.ok(content.includes(`${NESTED_LINES_JOINED}\n方案：异常分支统一走 finally 清零\n结果：5 单测通过、lint 0 告警`),
      '嵌套行之后顶层方案/结果行完整')
    assert.ok(content.includes('状态：已完成'), '状态正常翻转（嵌套形态不影响既有流程）')

    // payload：嵌套行经 lastLabel 挂进 body_sections[根因]，不进 files、不误挂其他段
    const payload = lastPayload(cap.bodies, qlId)
    assert.deepEqual(Object.keys(payload.body_sections), ['需求', '根因', '方案', '结果'],
      'body_sections 恰为顶层四字段（不新增 key、不缺字段）')
    assert.equal(payload.body_sections['需求'], '修限流——标题行语义化短句')
    assert.equal(payload.body_sections['方案'], '异常分支统一走 finally 清零')
    assert.equal(payload.body_sections['结果'], '5 单测通过、lint 0 告警')
    assert.equal(payload.body_sections['根因'], `\n${NESTED_LINES_JOINED}`,
      '嵌套四子字段整体归属根因段（首值为根因行空正文，列表行逐行续挂）')
    // 无声明文件 → 文件行保持占位符（既有行为），嵌套子字段行不劫入 files
    assert.deepEqual(payload.files, [{ path: '（见实际改动）', note: null }],
      'files 只含文件行占位符，无嵌套子字段行')
    assert.equal(payload.status, 'completed')
  })

  it('根因行带正文 + 嵌套四子字段：正文与列表行同入根因段（首值非空形态）', async () => {
    const cap = withPushCapture()
    let qlId
    try {
      qlId = await runQuick([
        '需求：修标题提取',
        '根因：踩坑复盘（postmortem 场景）',
        '- 现象：标题被截成语义残句',
        '- 根因：需求字段写成了完整需求长句',
        '- 护栏：step3 模板置顶短标题指引',
        '- 证据：QUICKLOG-qinyi.md 同条目正文',
        '方案：标题截到首个标点',
        '结果：4 单测绿',
      ].join('\n'))
    } finally { cap.restore() }
    const content = readQuicklog()
    assert.ok(content.includes('根因：踩坑复盘（postmortem 场景）\n- 现象：标题被截成语义残句'), '正文后接列表行落盘')

    const payload = lastPayload(cap.bodies, qlId)
    assert.equal(payload.body_sections['根因'],
      '踩坑复盘（postmortem 场景）\n- 现象：标题被截成语义残句\n- 根因：需求字段写成了完整需求长句\n- 护栏：step3 模板置顶短标题指引\n- 证据：QUICKLOG-qinyi.md 同条目正文',
      '根因正文 + 四子字段列表行同段')
  })

  it('validateQuickResult：嵌套形态顶层四标签仍齐备 ok=true；缺顶层字段照拦', () => {
    assert.deepEqual(validateQuickResult(NESTED_RESULT), { ok: true, missing: [] },
      '嵌套四子字段不影响必填标签判定（「- 」前缀不构成顶层标签，亦不缺字段）')
    const missingTop = NESTED_RESULT.split('\n').filter((l) => !l.startsWith('结果：')).join('\n')
    assert.deepEqual(validateQuickResult(missingTop), { ok: false, missing: ['结果：'] },
      '缺顶层「结果：」仍被拦（模板契约不因嵌套形态放宽）')
  })
})

// ── 2. 单行压缩兼容（R-03：边界切分与旧逻辑逐字一致）───────────────────────

describe('单行压缩兼容（R-03 锁定）', () => {
  it('纯文本单行四字段 → 归一四行，逐字一致', async () => {
    await runQuick('需求：修侧栏 根因：flex 塌陷 方案：min-width 结果：3 测试绿')
    const content = readQuicklog()
    assert.ok(content.includes('需求：修侧栏\n根因：flex 塌陷\n方案：min-width\n结果：3 测试绿'),
      '单行压缩归一为四行字段块（旧逻辑输出锁定）')
  })

  it('根因正文含「- 现象：/- 根因：」压缩字样 → 不构成新边界，四段逐字一致', async () => {
    await runQuick('需求：修限流 根因：复盘记录 - 根因：INCR 计数误清 - 现象：偶发限流失效 方案：重置窗口逻辑 结果：3 单测绿')
    const content = readQuicklog()
    // 按序扫描先命中顶层「根因：」，其后的嵌套字样落在根因正文内不切新边界（task-07 Grill C-15 声明）
    assert.ok(content.includes('需求：修限流\n根因：复盘记录 - 根因：INCR 计数误清 - 现象：偶发限流失效\n方案：重置窗口逻辑\n结果：3 单测绿'),
      '嵌套字样整体保留在根因段正文，顶层四段切分不变')
  })

  it('正文引用「结果：」字样且前导非边界字符 → 严格扫描跳过不错切（2026-08-04 行为锁定）', async () => {
    await runQuick('需求：双层前缀 根因：正文引用「结果：」字样 方案：修归一切分 结果：绿')
    const content = readQuicklog()
    assert.ok(content.includes('需求：双层前缀\n根因：正文引用「结果：」字样\n方案：修归一切分\n结果：绿'),
      '引用字样前导是「（」等非边界字符 → 不误当真实字段边界')
  })

  it('真实标签前导为弱标点（，）→ 严格失败退回宽松顺序扫描，四段逐字一致', async () => {
    await runQuick('需求：修A，根因：修B 方案：修C 结果：绿')
    const content = readQuicklog()
    assert.ok(content.includes('需求：修A，\n根因：修B\n方案：修C\n结果：绿'),
      '严格边界扫描失败 → 宽松回退按序扫描（旧逻辑兜底路径锁定）')
  })
})

// ── 3. 旧条目回退（纯文本根因渲染不变）─────────────────────────────────────

describe('旧条目回退（纯文本根因）', () => {
  it('多行纯文本四字段 → 逐行落盘 + payload 单行值（无续挂）', async () => {
    const cap = withPushCapture()
    let qlId
    try {
      qlId = await runQuick('需求：修侧栏。\n根因：flex 塌陷。\n方案：min-width。\n结果：3 测试绿。', {
        changedFiles: ['frontend/src/x.tsx'],
      })
    } finally { cap.restore() }
    const content = readQuicklog()
    assert.ok(content.includes('需求：修侧栏。\n根因：flex 塌陷。\n方案：min-width。\n结果：3 测试绿。'),
      '纯文本四字段逐行原样落盘（渲染不变）')
    assert.ok(content.includes('文件：frontend/src/x.tsx'), '文件行单行回填（无 fileNotes 旧路径）')

    const payload = lastPayload(cap.bodies, qlId)
    assert.deepEqual(payload.body_sections, {
      需求: '修侧栏。', 根因: 'flex 塌陷。', 方案: 'min-width。', 结果: '3 测试绿。',
    }, '纯文本根因解析为单行值（无 \n 续挂，与改造前一致）')
    assert.deepEqual(payload.files, [{ path: 'frontend/src/x.tsx', note: null }])
  })

  it('单句结果（无四字段）→ 仍落单行「结果：<一句话>」', async () => {
    await runQuick('只修了一处小样式')
    const content = readQuicklog()
    assert.ok(content.includes('结果：只修了一处小样式'), '单句结果单行兜底（向后兼容简单用例）')
    assert.ok(!content.includes('需求：'), '不凭空造出其余字段行')
  })
})

// ── 4. 嵌套 bullet 不劫入 files（buildPushPayloadFromRaw 修复锁定）──────────

describe('嵌套 bullet 不劫入 files', () => {
  it('文件多行 bullet 后跟根因块嵌套行：files 只含真实文件，嵌套行留根因段，raw_block 完整', async () => {
    setQuickFileNotes('src/a.js::登录端点串限流 || src/b.js::新建 INCR 计数')
    const cap = withPushCapture()
    let qlId
    try {
      qlId = await runQuick(NESTED_RESULT)
    } finally { cap.restore() }
    const content = readQuicklog()
    // 落盘：文件 bullet 与根因块嵌套行同条目共存（这是改造前必然劫持的形态——bullet 行都是「- 」开头）
    assert.ok(content.includes('文件：\n- src/a.js（登录端点串限流）\n- src/b.js（新建 INCR 计数）'),
      'fileNotes 多行 bullet 落盘')
    assert.ok(content.includes(NESTED_LINES_JOINED), '嵌套四子字段完整落盘')

    const payload = lastPayload(cap.bodies, qlId)
    // files 恰含两个真实文件 bullet，嵌套行不被劫入（进入 需求/根因/方案/结果 字段块须关闭 inFiles）
    assert.deepEqual(payload.files.map((f) => f.path), ['src/a.js（登录端点串限流）', 'src/b.js（新建 INCR 计数）'],
      'files 只含文件 bullet，无「现象：/根因：/护栏：/证据：」行')
    assert.ok(payload.files.every((f) => f.path.startsWith('src/')), 'files 无嵌套子字段行混入')
    // 嵌套行留在根因段（不被从根因正文截断丢失）
    assert.equal(payload.body_sections['根因'], `\n${NESTED_LINES_JOINED}`)
    // raw_block 完整可追溯（嵌套行不丢）
    assert.ok(payload.raw_block.includes('- 现象：登录接口偶发 500') && payload.raw_block.includes('- 证据：.runtime/agent-logs/s-abc123.jsonl'),
      'raw_block 含全部嵌套行')
  })
})

// ── 5. 文案一致性（grep 级断言，task-08/09 产出锁定）────────────────────────

describe('文案一致性（stage prompt）', () => {
  it('quick step3：嵌套列表行「合法形态」表述 + 不含旧「避免嵌套全角冒号」泛化警告 + 四子字段可选提示', () => {
    const step3 = quickDef.steps.find((s) => s.name === '暂存和更新记录')
    assert.ok(step3, 'step3 存在')
    const p = step3.prompt
    // 新警告（103 行附近）：嵌套列表行合法语义 + 「- 」前缀不参与顶层拆分判定
    assert.ok(p.includes('合法形态'), '含「合法形态」语义（嵌套列表行合法）')
    for (const sub of ['- 现象：', '- 根因：', '- 护栏：', '- 证据：']) {
      assert.ok(p.includes(sub), `四子字段字样 ${sub} 应出现在 step3 模板`)
    }
    assert.ok(p.includes('顶层四字段边界不受影响') || p.includes('顶层标签边界不受影响'), '声明顶层边界不受影响')
    // 旧泛化警告必须移除（与嵌套合法形态矛盾）
    assert.ok(!p.includes('避免嵌套全角冒号'), '不含旧「避免嵌套全角冒号」泛化警告')
    // step3 四子字段可选提示（105 行附近）
    assert.ok(p.includes('可选（非必填）'), '含四子字段可选（非必填）提示')
    assert.ok(p.includes('postmortem'), '含 postmortem 用法指引')
  })

  it('verify「对照设计检查」：实现偏差 postmortem 提示含四子字段 + 三类证据路径 + known-issues.md 指引', () => {
    const step = verifyDef.steps.find((s) => s.name === '对照设计检查')
    assert.ok(step, '「对照设计检查」步骤存在')
    const p = step.prompt
    assert.ok(p.includes('实现偏差 postmortem 提示'), '实现偏差 postmortem 提示段存在')
    for (const sub of ['- 现象：', '- 根因：', '- 护栏：', '- 证据：']) {
      assert.ok(p.includes(sub), `四子字段字样 ${sub} 应出现在提示段`)
    }
    // 三类证据路径指引：会话日志 jsonl / review.json / verify-result.md
    assert.ok(p.includes('agent-log --json'), '证据指引：agent-log --json 会话日志路径')
    assert.ok(p.includes('review.json'), '证据指引：review.json')
    assert.ok(p.includes('verify-result.md'), '证据指引：verify-result.md')
    // 护栏归档指引：known-issues.md 走既有 knowledge 链路（不新建链路不新建命令）
    assert.ok(p.includes('known-issues.md'), '护栏结论归入 known-issues.md 指引')
    assert.ok(p.includes('knowledge/uncategorized.md'), '走既有 knowledge/uncategorized.md 追加链路')
  })

  it('doctor「汇总报告」：状态错乱 postmortem 提示含四子字段 + 三类证据路径 + known-issues.md 指引', () => {
    const step = doctorDef.steps.find((s) => s.name === '汇总报告')
    assert.ok(step, '「汇总报告」步骤存在')
    const p = step.prompt
    assert.ok(p.includes('状态错乱补 postmortem'), '状态错乱补 postmortem 提示段存在')
    for (const sub of ['- 现象：', '- 根因：', '- 护栏：', '- 证据：']) {
      assert.ok(p.includes(sub), `四子字段字样 ${sub} 应出现在提示段`)
    }
    assert.ok(p.includes('agent-log --json'), '证据指引：agent-log --json 会话日志路径')
    assert.ok(p.includes('review.json'), '证据指引：review.json')
    assert.ok(p.includes('verify-result.md'), '证据指引：verify-result.md')
    assert.ok(p.includes('known-issues.md'), '护栏结论归入 known-issues.md 指引')
    assert.ok(p.includes('knowledge/uncategorized.md'), '走既有 knowledge/uncategorized.md 追加链路')
  })
})
