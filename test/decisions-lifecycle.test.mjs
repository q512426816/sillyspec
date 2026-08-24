/**
 * decisions-lifecycle 单测（change: 2026-08-23-adopt-harness-practices task-06，FR-01~06）
 *
 * 锁定 Wave 1 决策生命周期全链路回归：
 *   1. FR-02 入选规则：五类 type × confirmed/accepted → implemented；type=scope /
 *      status=superseded 不入选；任意 type（含 scope）× rejected → rejected 留痕
 *   2. FR-03 提炼幂等：同 decisions.md 两跑第二跑全 update、域文件与 INDEX 字节不变；
 *      @v2 整段替换 @v1 + supersedes 注记（同文件自动注记 / 跨域迁移旧段移除）
 *   3. FR-03 rejected 留痕与 needsWait：缺否决理由/复潮条件 → needsWait 非空且该条未写盘
 *   4. FR-01 旧格式容错：缺锚点 confirmed 条目 → 「锚点：未记录」不阻断；无 decisions.md 零输出
 *   5. FR-06 behind 阈值：computeModuleBehind 不可解析 ref → degraded 不抛；
 *      runDecisionRules 旧 hash 超阈 → behind finding / 新 hash 静默 / 锚点未记录 → anchor
 *      补录提示 / known_failures decisions.<id>.<kind> 键豁免 / local.yaml 阈值配置
 *   6. FR-05 decisionHits：有库命中 rejected 优先排序字段填充；无库 []；matchKnowledge
 *      旧四键 matched/entries/report/json 结构与语义不变
 *   7. FR-03 归档中途兼容：archive definition 六步名序列 + 新步骤位置与 conditionalWait +
 *      末步 git add 清单 + 存量步骤名未变（steps 按名匹配，新步骤为待执行增量）
 *
 * fixture 全 tmp 目录（mkdtemp + afterEach 清理）；git 用例在 tmp git 仓造提交序列，
 * 不依赖本仓真实 git 历史。只断言公开导出（parseDecisions/distillIntoKnowledge/
 * matchKnowledge/computeModuleBehind/runDecisionRules + archive definition）。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { parseDecisions, distillIntoKnowledge } from '../src/decision-distill.js'
import { matchKnowledge } from '../src/knowledge-match.js'
import { computeModuleBehind } from '../src/docs-debt.js'
import { runDecisionRules, DECISIONS_DEFAULT_BEHIND_THRESHOLD } from '../src/docs-check.js'

const HEAD = 'a1b2c3d' // 注入的确定性 headHash（「最近确认」落行用）

let root
beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'dlife-')) })
afterEach(() => { try { rmSync(root, { recursive: true, force: true }) } catch {} })

// ── fixture helpers ─────────────────────────────────────────────────────────

/** 建变更目录并写 decisions.md（content 为 null = 不写文件） */
function makeChange(decisionsMd) {
  const changeDir = join(root, 'changes', 'demo-change')
  mkdirSync(changeDir, { recursive: true })
  if (decisionsMd !== null) writeFileSync(join(changeDir, 'decisions.md'), decisionsMd)
  return changeDir
}

/** 单条决策条目 markdown（fields 形如 ['- type: architecture', '- status: confirmed']） */
function dEntry(id, title, fields) {
  return [`## ${id} ${title}`, ...fields.map(f => `- ${f}`)].join('\n')
}

/** knowledgeRoot 全树快照（路径 → 字节），幂等断言用 */
function snapshot(dir) {
  const out = new Map()
  const walk = (d, rel) => {
    let entries
    try { entries = readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const r = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) walk(join(d, e.name), r)
      else out.set(r, readFileSync(join(d, e.name), 'utf8'))
    }
  }
  walk(dir, '')
  return out
}

function assertSameSnapshot(a, b, label) {
  assert.deepEqual([...a.keys()].sort(), [...b.keys()].sort(), `${label}：文件集合应一致`)
  for (const [k, v] of a) assert.equal(b.get(k), v, `${label}：${k} 字节应不变`)
}

// ── 1. FR-02 入选规则 ───────────────────────────────────────────────────────

describe('FR-02 入选规则（parseDecisions 裁决）', () => {
  it('五类 type × confirmed/accepted → implemented', () => {
    const md = [
      dEntry('D-001@v1', '架构决策', ['type: architecture', 'status: confirmed']),
      dEntry('D-002@v1', '兼容决策', ['type: compatibility', 'status: accepted']),
      dEntry('D-003@v1', '边界决策', ['type: boundary', 'status: confirmed']),
      dEntry('D-004@v1', '定义决策', ['type: definition', 'status: accepted']),
      dEntry('D-005@v1', '过程决策', ['type: process', 'status: confirmed']),
    ].join('\n\n')
    const { entries, missing } = parseDecisions(makeChange(md))
    assert.equal(missing, false)
    assert.equal(entries.length, 5)
    for (const e of entries) assert.equal(e.selected, 'implemented', `${e.id} 应入选 implemented`)
  })

  it('type=scope 不入选；status=superseded 不入选（其余组合截断）', () => {
    const md = [
      dEntry('D-010@v1', '范围取舍', ['type: scope', 'status: confirmed']),
      dEntry('D-011@v1', '已取代', ['type: architecture', 'status: superseded（被 D-012@v2 取代）']),
      dEntry('D-012@v1', '未知 type', ['type: tooling', 'status: confirmed']),
    ].join('\n\n')
    const { entries } = parseDecisions(makeChange(md))
    const byId = Object.fromEntries(entries.map(e => [e.id, e.selected]))
    assert.equal(byId['D-010@v1'], null, 'scope 不入选')
    assert.equal(byId['D-011@v1'], null, 'superseded 不入选')
    assert.equal(byId['D-012@v1'], null, '非五类 type 不入选')
    assert.equal(entries.length, 3, '解析保留在 entries 里（不入选 ≠ 解析丢弃）')
  })

  it('任意 type（含 scope）× rejected → rejected（留痕防复潮优先）', () => {
    const md = [
      dEntry('D-020@v1', '范围否决', ['type: scope', 'status: rejected', '否决理由：超出本变更', '复潮条件：单独立项后']),
      dEntry('D-021@v1', '架构否决', ['type: architecture', 'status: rejected', '否决理由：复杂度过高', '复潮条件：性能瓶颈实证后']),
    ].join('\n\n')
    const { entries } = parseDecisions(makeChange(md))
    for (const e of entries) assert.equal(e.selected, 'rejected', `${e.id} 应留痕 rejected`)
  })

  it('提炼入口：全部不入选 → skipped 非空零输出（不建任何文件）', () => {
    const changeDir = makeChange(dEntry('D-030@v1', '范围取舍', ['type: scope', 'status: confirmed']))
    const knowledgeRoot = join(root, 'knowledge')
    const r = distillIntoKnowledge(changeDir, knowledgeRoot, HEAD)
    assert.equal(r.written.length, 0)
    assert.ok(r.skipped, 'skipped 应带原因')
    assert.equal(r.needsWait, null)
    assert.equal(snapshot(knowledgeRoot).size, 0, '零输出：不创建 knowledge/decisions 也不动 INDEX')
  })
})

// ── 2. FR-03 提炼幂等与版本前进 ─────────────────────────────────────────────

describe('FR-03 提炼幂等与版本前进', () => {
  const v1Md = dEntry('D-007@v1', '决策提炼步骤插在 sync-module-docs 后', [
    'type: architecture',
    'status: confirmed',
    'question: 决策提炼步骤插在哪',
    'answer: sync-module-docs 后、确认归档前，锚点与文档同基线',
    '锚点：src/stages/archive.js:45',
    '模块域：core',
  ])

  it('同 decisions.md 两跑 → 第二跑 action 全 update、域文件与 INDEX 字节不变', () => {
    const changeDir = makeChange(v1Md)
    const knowledgeRoot = join(root, 'knowledge')
    const r1 = distillIntoKnowledge(changeDir, knowledgeRoot, HEAD)
    assert.deepEqual(r1.written, [{ file: 'decisions/core.md', id: 'D-007@v1', action: 'append' }], JSON.stringify(r1.written))
    const snap1 = snapshot(knowledgeRoot)
    assert.ok(snap1.has('INDEX.md'), 'INDEX 路由行随首次写入创建')
    assert.ok(snap1.get('INDEX.md').includes('- core|decision|决策 → [decisions/core.md](decisions/core.md)'), '路由行格式契约')

    const r2 = distillIntoKnowledge(changeDir, knowledgeRoot, HEAD)
    assert.equal(r2.written.length, 1)
    assert.equal(r2.written[0].action, 'update', '同 ID 同版本重跑不重复追加（action=update）')
    assert.equal(r2.skipped, null)
    assertSameSnapshot(snap1, snapshot(knowledgeRoot), '幂等重跑')
  })

  it('条目格式契约：implemented 八字段逐字落行（状态/锚点/最近确认/理由）', () => {
    const knowledgeRoot = join(root, 'knowledge')
    distillIntoKnowledge(makeChange(v1Md), knowledgeRoot, HEAD)
    const content = readFileSync(join(knowledgeRoot, 'decisions', 'core.md'), 'utf8')
    assert.ok(content.includes('## D-007@v1 决策提炼步骤插在 sync-module-docs 后'), '条目头')
    assert.ok(content.includes('状态：implemented'))
    assert.ok(content.includes('锚点：src/stages/archive.js:45'))
    assert.ok(content.includes('最近确认：a1b2c3d'))
    assert.ok(content.includes('理由：sync-module-docs 后、确认归档前，锚点与文档同基线'))
  })

  it('@v2 → 同文件整段替换 @v1 + 自动 supersedes 注记，同号只留一段', () => {
    const knowledgeRoot = join(root, 'knowledge')
    distillIntoKnowledge(makeChange(v1Md), knowledgeRoot, HEAD)
    // decisions.md 前进到 v2（无显式 supersedes 字段 → 注记取自被替换旧版）
    const v2Md = dEntry('D-007@v2', '决策提炼步骤插在 sync-module-docs 后（修订）', [
      'type: architecture',
      'status: confirmed',
      'answer: 修订后的理由',
      '锚点：src/stages/archive.js:50',
      '模块域：core',
    ])
    const r2 = distillIntoKnowledge(makeChange(v2Md), knowledgeRoot, HEAD)
    assert.ok(r2.written.some(w => w.id === 'D-007@v2' && w.action === 'supersede'), JSON.stringify(r2.written))
    const content = readFileSync(join(knowledgeRoot, 'decisions', 'core.md'), 'utf8')
    assert.ok(content.includes('## D-007@v2'), '新版本段落存在')
    assert.ok(!content.includes('## D-007@v1'), '旧版本段整段替换（不残留旧头）')
    assert.ok(content.includes('supersedes：D-007@v1'), '自动 supersedes 注记')
    assert.equal(content.match(/^## D-007/gm).length, 1, '同号全局只留一个段')
  })

  it('@v2 跨域迁移 → 旧域文件旧版段同步移除（written 记 supersede）', () => {
    const knowledgeRoot = join(root, 'knowledge')
    distillIntoKnowledge(makeChange(v1Md), knowledgeRoot, HEAD) // 落 decisions/core.md
    const v2Md = dEntry('D-007@v2', '迁移到 util 域', [
      'type: architecture',
      'status: confirmed',
      'answer: 域修正',
      '锚点：src/util.js:1',
      '模块域：util',
      'supersedes: D-007@v1',
    ])
    const r2 = distillIntoKnowledge(makeChange(v2Md), knowledgeRoot, HEAD)
    const actions = r2.written.map(w => `${w.file}:${w.id}:${w.action}`).sort()
    assert.deepEqual(actions, [
      'decisions/core.md:D-007@v1:supersede', // 旧域文件旧段移除
      'decisions/util.md:D-007@v2:append',    // 新域文件新段
    ], JSON.stringify(r2.written))
    const core = readFileSync(join(knowledgeRoot, 'decisions', 'core.md'), 'utf8')
    const util = readFileSync(join(knowledgeRoot, 'decisions', 'util.md'), 'utf8')
    assert.ok(!core.includes('## D-007'), 'core 域旧段已清')
    assert.ok(util.includes('## D-007@v2') && util.includes('supersedes：D-007@v1'), 'util 域新段 + 显式注记')
  })
})

// ── 3. FR-03 rejected 留痕与 needsWait ───────────────────────────────────────

describe('FR-03 rejected 留痕与 needsWait', () => {
  it('字段齐全 → rejected 条目落行（否决理由/复潮条件）', () => {
    const md = dEntry('D-040@v1', '拒绝重量级依赖', [
      'type: architecture',
      'status: rejected',
      '否决理由：包体过大拖慢启动',
      '复潮条件：启动耗时优化到位后',
      '模块域：core',
    ])
    const knowledgeRoot = join(root, 'knowledge')
    const r = distillIntoKnowledge(makeChange(md), knowledgeRoot, HEAD)
    assert.equal(r.needsWait, null)
    assert.equal(r.written[0].action, 'append')
    const content = readFileSync(join(knowledgeRoot, 'decisions', 'core.md'), 'utf8')
    assert.ok(content.includes('状态：rejected'))
    assert.ok(content.includes('否决理由：包体过大拖慢启动'))
    assert.ok(content.includes('复潮条件：启动耗时优化到位后'))
  })

  it('缺否决理由/复潮条件 → needsWait 非空且未写盘（无目录零输出）', () => {
    const md = dEntry('D-041@v1', '缺字段的否决', ['type: architecture', 'status: rejected'])
    const knowledgeRoot = join(root, 'knowledge')
    const r = distillIntoKnowledge(makeChange(md), knowledgeRoot, HEAD)
    assert.ok(r.needsWait, 'needsWait 应非空')
    assert.ok(r.needsWait.includes('D-041@v1'), `needsWait 应含条目 id（实际 ${r.needsWait}）`)
    assert.ok(r.needsWait.includes('否决理由') && r.needsWait.includes('复潮条件'), '缺失字段点名')
    assert.equal(r.written.length, 0)
    assert.ok(!existsSync(join(knowledgeRoot, 'decisions')), '该条目未写盘（不建目录）')
  })

  it('混合批次：implemented 照常提炼，rejected 缺字段单条拦下', () => {
    const md = [
      dEntry('D-050@v1', '正常决策', ['type: process', 'status: confirmed', 'answer: 正常理由', '模块域：core']),
      dEntry('D-051@v1', '缺字段否决', ['type: boundary', 'status: rejected', '否决理由：只有理由缺条件']),
    ].join('\n\n')
    const knowledgeRoot = join(root, 'knowledge')
    const r = distillIntoKnowledge(makeChange(md), knowledgeRoot, HEAD)
    assert.ok(r.needsWait.includes('D-051@v1') && r.needsWait.includes('复潮条件'))
    assert.deepEqual(r.written.map(w => w.id), ['D-050@v1'], '其余条目照常提炼')
    const content = readFileSync(join(knowledgeRoot, 'decisions', 'core.md'), 'utf8')
    assert.ok(content.includes('## D-050@v1'))
    assert.ok(!content.includes('D-051'), '被拦条目不入库')
  })
})

// ── 4. FR-01 旧格式容错 ─────────────────────────────────────────────────────

describe('FR-01 旧格式容错（无新四字段的旧 decisions.md）', () => {
  it('缺锚点 confirmed 条目 → 「锚点：未记录」不阻断（归 unmapped 域）', () => {
    const oldMd = dEntry('D-060@v1', '旧格式决策', [
      'type: architecture',
      'status: confirmed',
      'question: 旧决策',
      'answer: 旧答案',
      'impacts: src/legacy/x.js',
    ])
    const { entries, missing } = parseDecisions(makeChange(oldMd))
    assert.equal(missing, false, '旧格式解析不失败')
    assert.equal(entries[0].selected, 'implemented')
    const knowledgeRoot = join(root, 'knowledge')
    const r = distillIntoKnowledge(makeChange(oldMd), knowledgeRoot, HEAD)
    assert.equal(r.written[0].file, 'decisions/unmapped.md', '无模块域无 moduleIndex → 三级兜底终点')
    const content = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    assert.ok(content.includes('锚点：未记录'), '缺锚点占位不阻断')
    assert.ok(content.includes('最近确认：a1b2c3d'))
  })

  it('headHash 空 → 「最近确认：未记录」容错', () => {
    const md = dEntry('D-061@v1', '无 head 场景', ['type: process', 'status: confirmed', 'answer: 理由', '模块域：core'])
    const knowledgeRoot = join(root, 'knowledge')
    distillIntoKnowledge(makeChange(md), knowledgeRoot, '')
    const content = readFileSync(join(knowledgeRoot, 'decisions', 'core.md'), 'utf8')
    assert.ok(content.includes('最近确认：未记录'), '空 headHash 容错为未记录')
  })

  it('无 decisions.md → skipped 带原因零输出（不建目录不动 INDEX）', () => {
    const knowledgeRoot = join(root, 'knowledge')
    const r = distillIntoKnowledge(makeChange(null), knowledgeRoot, HEAD)
    assert.equal(r.written.length, 0)
    assert.ok(r.skipped && r.skipped.includes('decisions.md'), `skipped 原因（实际 ${r.skipped}）`)
    assert.equal(snapshot(knowledgeRoot).size, 0)
  })
})

// ── 4b. FR-03 域三级兜底 ────────────────────────────────────────────────────

describe('FR-03 域三级兜底', () => {
  it('「模块域」字段优先，多域扇出到多个域文件', () => {
    const md = dEntry('D-070@v1', '多域决策', ['type: architecture', 'status: confirmed', 'answer: 理由', '模块域：a、b'])
    const knowledgeRoot = join(root, 'knowledge')
    const r = distillIntoKnowledge(makeChange(md), knowledgeRoot, HEAD)
    assert.deepEqual(r.written.map(w => w.file).sort(), ['decisions/a.md', 'decisions/b.md'])
    const index = readFileSync(join(knowledgeRoot, 'INDEX.md'), 'utf8')
    assert.ok(index.includes('decisions/a.md') && index.includes('decisions/b.md'), 'INDEX 路由行随扇出补齐')
  })

  it('缺模块域 → impacts 路径 × moduleIndex paths/core_files 前缀匹配兜底', () => {
    const md = dEntry('D-071@v1', '按影响面归属', [
      'type: boundary', 'status: confirmed', 'answer: 理由',
      'impacts: 改动涉及 src/core/foo.js 与 lib/util.js',
    ])
    const moduleIndex = { modules: { core: { paths: ['src/core/'] }, util: { core_files: ['lib/util.js'] } } }
    const knowledgeRoot = join(root, 'knowledge')
    const r = distillIntoKnowledge(makeChange(md), knowledgeRoot, HEAD, moduleIndex)
    assert.deepEqual(r.written.map(w => w.file).sort(), ['decisions/core.md', 'decisions/util.md'],
      JSON.stringify(r.written))
  })
})

// ── 5. FR-06 behind 阈值（computeModuleBehind + runDecisionRules）───────────

/** git 用例共享 fixture：每 it 独立 tmp git 仓 */
function gitRepo(t) {
  execSync('git init -q', { cwd: root, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: root, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: root, stdio: 'pipe' })
  return root
}
function commitFile(rel, content, msg) {
  mkdirSync(join(root, rel.split('/').slice(0, -1).join('/')), { recursive: true })
  writeFileSync(join(root, rel), content)
  execSync(`git add "${rel}" && git commit -q -m "${msg}"`, { cwd: root, stdio: 'pipe' })
}
function shortHead() {
  return execSync('git rev-parse --short HEAD', { cwd: root, stdio: 'pipe' }).toString().trim()
}

describe('FR-06 computeModuleBehind（degraded 语义）', () => {
  it('不可解析 ref（非 hash 串 / 未记录 / 仓中无此 commit）→ behind=null + degraded 不抛', () => {
    gitRepo()
    commitFile('src/a.js', 'x\n', 'c1')
    for (const bad of ['not-a-commit', '未记录', 'deadbeef']) {
      const r = computeModuleBehind('core', bad, { projectRoot: root, srcPaths: ['src/a.js'] })
      assert.deepEqual(r, { behind: null, degraded: true }, `ref=${bad} 应降级不抛`)
    }
  })

  it('路径集为空（无 srcPaths 且 moduleIndex 无该模块）→ degraded', () => {
    gitRepo()
    commitFile('src/a.js', 'x\n', 'c1')
    assert.deepEqual(computeModuleBehind('ghost', shortHead(), { projectRoot: root, moduleIndex: { modules: { core: { paths: ['src/'] } } } }),
      { behind: null, degraded: true })
    assert.deepEqual(computeModuleBehind('core', shortHead(), { projectRoot: root, srcPaths: [] }),
      { behind: null, degraded: true })
  })

  it('真实提交序列 → behind = ref..src 前进数', () => {
    gitRepo()
    commitFile('src/a.js', 'v1\n', 'c1')
    const ref = shortHead()
    commitFile('src/a.js', 'v2\n', 'c2')
    commitFile('src/a.js', 'v3\n', 'c3')
    const r = computeModuleBehind('core', ref, { projectRoot: root, srcPaths: ['src/a.js'] })
    assert.deepEqual(r, { behind: 2, degraded: false }, 'c1..c3 = 2（rev-list --count 口径）')
  })
})

describe('FR-06 runDecisionRules（advisory 决策规则族）', () => {
  const specBase = () => join(root, '.sillyspec')
  function writeDomainFile(domain, entries) {
    const dir = join(specBase(), 'knowledge', 'decisions')
    mkdirSync(dir, { recursive: true })
    const blocks = entries.map(([id, title, fields]) =>
      [`## ${id} ${title}`, ...fields.map(([k, v]) => `${k}：${v}`)].join('\n'))
    writeFileSync(join(dir, `${domain}.md`), `# 决策知识 — ${domain}\n\n${blocks.join('\n\n')}\n`)
  }

  it('无 decisions 库 → empty=true 零 findings（默认阈值 10）', async () => {
    gitRepo()
    const r = await runDecisionRules({ projectRoot: root, specBase: specBase() })
    assert.equal(r.empty, true)
    assert.deepEqual(r.findings, [])
    assert.equal(r.threshold, DECISIONS_DEFAULT_BEHIND_THRESHOLD)
    assert.equal(DECISIONS_DEFAULT_BEHIND_THRESHOLD, 10, 'design 缺省阈值契约')
  })

  it('旧 hash 超阈 → behind finding（behind/threshold 字段）；新 hash 静默', async () => {
    gitRepo()
    commitFile('src/core.js', 'v1\n', 'c1')
    const oldHash = shortHead()
    commitFile('src/core.js', 'v2\n', 'c2')
    commitFile('src/core.js', 'v3\n', 'c3')
    const newHash = shortHead()
    writeDomainFile('core', [['D-100@v1', '分层设计', [
      ['状态', 'implemented'], ['锚点', 'src/core.js:1'], ['最近确认', oldHash], ['理由', '分层'],
    ]]])
    const r = await runDecisionRules({ projectRoot: root, specBase: specBase(), behindThreshold: 1 })
    assert.equal(r.findings.length, 1, JSON.stringify(r.findings))
    assert.equal(r.findings[0].kind, 'behind')
    assert.equal(r.findings[0].id, 'D-100@v1')
    assert.equal(r.findings[0].behind, 2)
    assert.equal(r.findings[0].threshold, 1)
    assert.ok(r.findings[0].message.includes('待复核'), '决策待复核提示')
    // 新 hash（源码无前进）→ 静默
    writeDomainFile('core', [['D-100@v1', '分层设计', [
      ['状态', 'implemented'], ['锚点', 'src/core.js:1'], ['最近确认', newHash], ['理由', '分层'],
    ]]])
    const r2 = await runDecisionRules({ projectRoot: root, specBase: specBase(), behindThreshold: 1 })
    assert.deepEqual(r2.findings, [], 'behind=0 不产噪声')
  })

  it('锚点未记录 → anchor 补录提示；锚点文件不存在 → anchor 失效提示', async () => {
    gitRepo()
    commitFile('src/core.js', 'x\n', 'c1')
    const h = shortHead()
    writeDomainFile('core', [
      ['D-101@v1', '旧格式条目', [['状态', 'implemented'], ['锚点', '未记录'], ['最近确认', h], ['理由', 'r']]],
      ['D-102@v1', '锚点漂移', [['状态', 'implemented'], ['锚点', 'src/gone.js:1'], ['最近确认', h], ['理由', 'r']]],
    ])
    const r = await runDecisionRules({ projectRoot: root, specBase: specBase() })
    assert.equal(r.findings.length, 2, JSON.stringify(r.findings))
    const byId = Object.fromEntries(r.findings.map(f => [f.id, f]))
    assert.equal(byId['D-101@v1'].kind, 'anchor')
    assert.ok(byId['D-101@v1'].message.includes('未记录') && byId['D-101@v1'].message.includes('补「锚点'), 'advisory 补录提示')
    assert.equal(byId['D-102@v1'].kind, 'anchor')
    assert.ok(byId['D-102@v1'].message.includes('不存在'), '锚点失效提示')
  })

  it('known_failures decisions.<id>.<kind> 键豁免 → exempted 披露不隐藏；错 kind 不豁免', async () => {
    gitRepo()
    commitFile('src/core.js', 'v1\n', 'c1')
    const oldHash = shortHead()
    commitFile('src/core.js', 'v2\n', 'c2')
    commitFile('src/core.js', 'v3\n', 'c3')
    writeDomainFile('core', [['D-100@v1', '分层设计', [
      ['状态', 'implemented'], ['锚点', 'src/core.js:1'], ['最近确认', oldHash], ['理由', '分层'],
    ]]])
    const exempt = await runDecisionRules({
      projectRoot: root, specBase: specBase(), behindThreshold: 1,
      knownFailures: ['decisions.D-100@v1.behind'],
    })
    assert.deepEqual(exempt.findings, [])
    assert.deepEqual(exempt.exempted, [{ key: 'decisions.D-100@v1.behind', id: 'D-100@v1', kind: 'behind' }])
    // 规则级键精确匹配 kind：anchor 键不豁免 behind finding
    const wrongKind = await runDecisionRules({
      projectRoot: root, specBase: specBase(), behindThreshold: 1,
      knownFailures: ['decisions.D-100@v1.anchor'],
    })
    assert.equal(wrongKind.findings.length, 1)
    assert.equal(wrongKind.exempted.length, 0)
  })

  it('local.yaml decisions.behind_threshold 配置生效；严格超阈（behind=2 > 1 触发、= 2 不触发）', async () => {
    gitRepo()
    commitFile('src/core.js', 'v1\n', 'c1')
    const oldHash = shortHead()
    commitFile('src/core.js', 'v2\n', 'c2')
    commitFile('src/core.js', 'v3\n', 'c3')
    writeDomainFile('core', [['D-100@v1', '分层设计', [
      ['状态', 'implemented'], ['锚点', 'src/core.js:1'], ['最近确认', oldHash], ['理由', '分层'],
    ]]])
    mkdirSync(join(root, '.sillyspec'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'local.yaml'), 'decisions:\n  behind_threshold: 1\n')
    const strict = await runDecisionRules({ projectRoot: root, specBase: specBase() })
    assert.equal(strict.threshold, 1, 'local.yaml 阈值覆盖缺省 10')
    assert.equal(strict.findings.filter(f => f.kind === 'behind').length, 1, 'behind=2 > 1 触发')
    writeFileSync(join(root, '.sillyspec', 'local.yaml'), 'decisions:\n  behind_threshold: 2\n')
    const boundary = await runDecisionRules({ projectRoot: root, specBase: specBase() })
    assert.equal(boundary.threshold, 2)
    assert.equal(boundary.findings.filter(f => f.kind === 'behind').length, 0, 'behind=2 = 阈值 2 不触发（严格大于）')
  })
})

// ── 6. FR-05 decisionHits（matchKnowledge 扩展）────────────────────────────

describe('FR-05 decisionHits（matchKnowledge 旧四键不变 + rejected 优先）', () => {
  function writeLib(withDecisions) {
    const lines = ['# Knowledge Index', '', '## Conventions', '- ESM|module → [ESM Only](conventions.md#esm-only)']
    if (withDecisions) {
      lines.push('', '## Decisions', '- core|decision|决策 → [decisions/core.md](decisions/core.md)')
      mkdirSync(join(root, 'knowledge', 'decisions'), { recursive: true })
      writeFileSync(join(root, 'knowledge', 'decisions', 'core.md'), [
        '# 决策知识 — core', '',
        '## D-200@v1 拒绝重量级依赖',
        '状态：rejected',
        '锚点：src/core.js:1',
        '最近确认：abc1234',
        '理由：曾考虑引入',
        '否决理由：包体过大拖慢启动',
        '复潮条件：启动耗时优化到位后',
        '',
        '## D-201@v1 采纳分层设计',
        '状态：implemented',
        '锚点：src/core.js:2',
        '最近确认：abc1234',
        '理由：分层便于测试',
        '',
      ].join('\n'))
    }
    mkdirSync(join(root, 'knowledge'), { recursive: true })
    writeFileSync(join(root, 'knowledge', 'INDEX.md'), lines.join('\n') + '\n')
    return join(root, 'knowledge')
  }

  it('有库命中：rejected 优先排序 + 否决理由/复潮条件字段填充', () => {
    const dir = writeLib(true)
    const r = matchKnowledge(dir, '本次任务涉及 ESM 模块与决策知识')
    assert.equal(r.matched, true)
    assert.equal(r.decisionHits.length, 2)
    assert.equal(r.decisionHits[0].id, 'D-200@v1', 'rejected 优先排在首位')
    assert.equal(r.decisionHits[0].status, 'rejected')
    assert.equal(r.decisionHits[0].reason, '包体过大拖慢启动', 'reason = 否决理由')
    assert.equal(r.decisionHits[0].revisitWhen, '启动耗时优化到位后', 'revisitWhen = 复潮条件')
    assert.equal(r.decisionHits[0].file, 'decisions/core.md')
    assert.ok(r.decisionHits[0].title.length > 0)
    assert.equal(r.decisionHits[1].id, 'D-201@v1')
    assert.equal(r.decisionHits[1].status, 'implemented')
    assert.equal(r.decisionHits[1].reason, '分层便于测试', '非 rejected 回退「理由」行')
  })

  it('无 decisions 库 → decisionHits=[] 且旧四键结构与语义不变', () => {
    const dir = writeLib(false)
    const r = matchKnowledge(dir, 'setup ESM module imports')
    assert.deepEqual(Object.keys(r).sort(), ['decisionHits', 'entries', 'json', 'matched', 'report'],
      '只增 decisionHits，不引入新顶层键')
    assert.equal(r.matched, true)
    assert.equal(r.entries.length, 1)
    assert.deepEqual(r.decisionHits, [])
    assert.ok(r.report.includes('Knowledge Context') && r.report.includes('Status: matched'))
    assert.equal(r.json.entry_count, 1)
  })

  it('INDEX.md 不存在 → 旧 not found 语义 + decisionHits=[]', () => {
    const r = matchKnowledge(join(root, 'knowledge'), 'any context')
    assert.equal(r.matched, false)
    assert.ok(r.report.includes('not found'))
    assert.deepEqual(r.decisionHits, [])
  })
})

// ── 7. FR-03 归档中途兼容（archive definition 结构契约）────────────────────

describe('FR-03 归档中途兼容（archive steps 按名匹配，新步骤为待执行增量）', () => {
  it('六个步骤名序列，新步骤插在 sync-module-docs 与确认归档之间且 conditionalWait', async () => {
    const { definition } = await import('../src/stages/archive.js')
    const names = definition.steps.map(s => s.name)
    assert.deepEqual(names, [
      '任务完成度检查',
      'extract-module-impact',
      'sync-module-docs',
      'decision-distill 决策提炼',
      '确认归档',
      '更新路线图和提交',
    ], '六步名序列（存量五步 + decision-distill 插入）')
    const i = names.indexOf('decision-distill 决策提炼')
    assert.ok(i > 0)
    assert.equal(names[i - 1], 'sync-module-docs', '前驱 = sync-module-docs')
    assert.equal(names[i + 1], '确认归档', '后继 = 确认归档')
    assert.equal(definition.steps[i].conditionalWait, true, 'conditionalWait 先例（非 requiresWait 硬门）')
  })

  it('末步 git add 清单含 knowledge/decisions/；存量五步名未变', async () => {
    const { definition } = await import('../src/stages/archive.js')
    const names = definition.steps.map(s => s.name)
    const last = definition.steps[definition.steps.length - 1]
    assert.equal(last.name, '更新路线图和提交')
    assert.ok(last.prompt.includes('git add .sillyspec/knowledge/decisions/'),
      '末步 prompt 补决策库 git add 清单（C-20）')
    assert.deepEqual(names.filter(n => n !== 'decision-distill 决策提炼'),
      ['任务完成度检查', 'extract-module-impact', 'sync-module-docs', '确认归档', '更新路线图和提交'],
      '存量五步名与顺序未变（按名匹配兼容已过 sync-module-docs 的在途变更）')
  })
})

describe('discoverModuleIndex 多子项目合并（dogfood 实证回归：2026-08-24 unmapped 误落）', () => {
  it('docs/ 下多个项目各有 _module-map.yaml 时合并全部模块（不取首个命中）', () => {
    // aaa 项目（字母序在前——旧实现只取首个命中即败因）与 zzz 项目各一份 map；不注入 moduleIndex 走 discoverModuleIndex
    const kb = join(root, '.sillyspec')
    mkdirSync(join(kb, 'docs', 'aaa', 'modules'), { recursive: true })
    mkdirSync(join(kb, 'docs', 'zzz', 'modules'), { recursive: true })
    writeFileSync(join(kb, 'docs', 'aaa', 'modules', '_module-map.yaml'),
      'modules:\n  aaa-only:\n    paths:\n      - packages/aaa/x.js\n')
    writeFileSync(join(kb, 'docs', 'zzz', 'modules', '_module-map.yaml'),
      'modules:\n  target-mod:\n    paths:\n      - src/target.js\n')
    const knowledgeRoot = join(kb, 'knowledge')
    const md = dEntry('D-300@v1', '多项目域解析', ['type: architecture', 'status: confirmed', 'answer: 理由', 'impacts: [src/target.js]'])
    const r = distillIntoKnowledge(makeChange(md), knowledgeRoot, HEAD)
    assert.ok(r.written.some(w => w.file === 'decisions/target-mod.md' && w.action === 'append'),
      `D-300 应落 zzz 项目的 target-mod 域（合并后可见），实落 ${JSON.stringify(r.written)}`)
  })
})
