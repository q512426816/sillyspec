/**
 * thin-docs-v2.test.mjs — 轻量道纯 markdown 起草 v2（2026-10-04-thin-docs-v2）
 *
 * 聚焦面（与 flow-draft.test.mjs 的分工：那边管起草形态/摘录/绑定/v1 轨回归/e2e 断点门，
 * 本文件管锚对比的边界行为）：
 *   ① 四问单一源：起草文本含 DESIGN_QUESTIONS 常量逐字；问题被改写 → 拒收（FR-04）；
 *   ② 门柱漂移 advisory：锚内成功标准从 requirements 消失 → advisory 不拒收（FR-05）；
 *      tasks 镜像行被删 → advisory；agent 合法改写 FR 标题时 advisory 交人核；
 *   ③ tasks 镜像+细化行：追加 task-NN 细化行不违规；镜像行全删 → advisory（FR-08）；
 *   ④ 结构破坏拒收面：design 节整删/requirements 整删/绑定节缺失（FR-01 的验收侧牙齿）；
 *   ⑤ adopted 豁免：skipDesign 时 design 缺失不拒收（brainstorm 预段设计以 brainstorm 版为准）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { draftAll, verifyThinDocsV2, DESIGN_QUESTIONS, DRAFT_SCHEMA_V2 } from '../src/flow-draft.js'

function fixture(input) {
  const root = mkdtempSync(join(tmpdir(), 'tdv2-'))
  const changeDir = join(root, 'changes', 'c1')
  const runtimeRoot = join(root, '.runtime')
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  const r = draftAll({ changeDir, change: 'c1', input, withTasks: false, runtimeRoot })
  assert.equal(r.schema, DRAFT_SCHEMA_V2)
  const ledger = JSON.parse(readFileSync(join(runtimeRoot, 'draft-ledger-c1.json'), 'utf8'))
  const fill = (f, fn) => writeFileSync(join(changeDir, f), fn(readFileSync(join(changeDir, f), 'utf8')))
  // 例行作答（design 四节 + FR 行为句 + 绑定行）——各用例在其上做破坏
  const fillAll = () => {
    fill('design.md', (t) => t.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n答：一行作答'))
    fill('requirements.md', (t) => t
      .replace(/^- （待撰写.*$/gm, '- 系统 MUST 实现该条标准行为')
      .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': test/x.test.mjs「用例」'))
  }
  return { root, changeDir, runtimeRoot, ledger, fill, fillAll }
}

const INPUT = '动机：x\n成功标准：\n- 标准甲\n- 标准乙'

test('① 四问单一源：起草含常量逐字；问题被改写 → 拒收', () => {
  const { root, changeDir, ledger, fill, fillAll } = fixture(INPUT)
  fillAll()
  const design = readFileSync(join(changeDir, 'design.md'), 'utf8')
  for (const sec of DESIGN_QUESTIONS.sections) for (const q of sec.lines) assert.ok(design.includes(q), `起草含问题原文：${q.slice(0, 12)}…`)
  // 软化四问之一（agent 抄近路形态）→ 拒收
  fill('design.md', (t) => t.replace('2. 并发写：两个执行体同时操作同一数据/文件会发生什么？', '2. 并发写：无并发场景。'))
  const v = verifyThinDocsV2({ changeDir, ledger })
  assert.ok(v.violations.some((x) => /问题文本被改写/.test(x)), `改写问题应拒: ${JSON.stringify(v.violations)}`)
  rmSync(root, { recursive: true, force: true })
})

test('② 门柱漂移 advisory：FR 标题锚被整段改写（锚文本消失）→ advisory 不拒收；含原文的轻改写零 advisory', () => {
  const { root, changeDir, ledger, fill, fillAll } = fixture(INPUT)
  fillAll()
  // 轻改写（标题仍含标准原文）→ 不算漂移（子串包含语义：锚文本仍在场，低误报）
  fill('requirements.md', (t) => t.replace('### FR-01: 标准甲', '### FR-01: 标准甲（补充说明）'))
  let v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.advisories.length, 0, '锚文本在场零 advisory')
  // 整段改写（锚文本消失——语义可能失真）→ advisory 交人核，不拒收（合法书写面）
  fill('requirements.md', (t) => t.replace('### FR-01: 标准甲（补充说明）', '### FR-01: 完全不同的标题'))
  v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.violations.length, 0, '整段改写不拒收（合法书写面）')
  assert.ok(v.advisories.some((a) => /标准甲/.test(a) && /requirements/.test(a)), `锚失踪出 advisory: ${JSON.stringify(v.advisories)}`)
  rmSync(root, { recursive: true, force: true })
})

test('③ tasks 镜像+细化行：追加细化行零违规；镜像行整删 → advisory', () => {
  const { root, changeDir, ledger, fill, fillAll } = fixture(INPUT)
  fillAll()
  // agent 追加细化行（FR-08：镜像行勿删、细化行可追加）
  fill('tasks.md', (t) => t.replace(/^- \[ \] task-02: 标准乙$/m, '- [ ] task-02: 标准乙\n- [ ] task-03: 细化——先写测试再实现\n- [ ] task-04: 细化——回归跑绿'))
  let v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.violations.length, 0, `细化行追加零违规: ${JSON.stringify(v.violations)}`)
  assert.equal(v.advisories.length, 0, '镜像行全在场零漂移')
  // 镜像行 task-01 整删（仅留细化行）→ advisory（任务锚漂移）
  fill('tasks.md', (t) => t.replace('### ', '### ').replace(/^- \[ \] task-01: 标准甲$/m, ''))
  v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.violations.length, 0, 'tasks 仍有行——不拒收（漂移属 advisory 面）')
  assert.ok(v.advisories.some((a) => /标准甲.*tasks/.test(a) || /镜像行/.test(a)), `镜像行删除出 advisory: ${JSON.stringify(v.advisories)}`)
  rmSync(root, { recursive: true, force: true })
})

test('④ 结构破坏拒收面：design 节整删 / requirements 整删 / 绑定节缺失', () => {
  const { root, changeDir, ledger, fill, fillAll } = fixture(INPUT)
  fillAll()
  fill('design.md', (t) => t.replace(/## 边界与并发（盲维四问——每问必答，答不了即设计缺口）[\s\S]*?(?=## 风险与死路)/, ''))
  let v = verifyThinDocsV2({ changeDir, ledger })
  assert.ok(v.violations.some((x) => /边界与并发.*被删/.test(x)), `节整删应拒: ${JSON.stringify(v.violations)}`)
  // 还原后删 requirements（文件级缺失）
  fill('design.md', (t) => t.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&'))
  rmSync(join(changeDir, 'requirements.md'))
  v = verifyThinDocsV2({ changeDir, ledger })
  assert.ok(v.violations.some((x) => /requirements\.md 缺失/.test(x)), '整删拒收')
  rmSync(root, { recursive: true, force: true })
})

test('⑥ 强度词表含 SHOULD/SHOULD NOT 且中英位置同构（评审 P2 + wordpos 清偿）：句中英文强度句放行；占位句自带词表字样仍拒收', () => {
  const { root, changeDir, runtimeRoot, ledger, fill, fillAll } = fixture(INPUT)
  fillAll() // design 四节 + 绑定行就位；两 FR 正文=「- 系统 MUST …」（行首英文形态）
  const body = '- 系统 MUST 实现该条标准行为'
  // 位置同构（2026-10-05-wordpos）：句中英文强度词放行——旧实现行首锚定在此误拒收
  fill('requirements.md', (t) => t.split(body).join('- 本变更 MUST 在句中间出现也命中（wordpos 夹具）'))
  let v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.violations.length, 0, `句中 MUST 应放行: ${JSON.stringify(v.violations)}`)
  fill('requirements.md', (t) => t.split('- 本变更 MUST 在句中间出现也命中（wordpos 夹具）').join('- 边界场景 SHOULD 附偏离理由（wordpos 夹具）'))
  v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.violations.length, 0, `句中 SHOULD 唯一强度句应放行（P2 词表）: ${JSON.stringify(v.violations)}`)
  fill('requirements.md', (t) => t.split('- 边界场景 SHOULD 附偏离理由（wordpos 夹具）').join('- 系统 SHOULD NOT 在收口前静默改写锚文本（wordpos 夹具）'))
  v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.violations.length, 0, `SHOULD NOT 红线形态应放行（SHOULD\\b 前缀覆盖）: ${JSON.stringify(v.violations)}`)
  // 占位句自带词表字样（必须/禁止/SHOULD/可以）不算已撰写——pending 检查独立拦截（仅换 FR-01，
  // FR-02 保持有效句 → 精确一处违规）
  fill('requirements.md', (t) => t.replace('- 系统 SHOULD NOT 在收口前静默改写锚文本（wordpos 夹具）',
    '- （待撰写：把本条成功标准改写为一句可判定的行为规定并标约束强度——必须/禁止/SHOULD/可以）'))
  v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.violations.length, 1, `占位句自带词表字样仍拒收且只拒一处: ${JSON.stringify(v.violations)}`)
  assert.match(v.violations[0], /行为句未撰写/)
  rmSync(root, { recursive: true, force: true })
})

test('⑤ adopted 豁免：skipDesign=true 时 design 缺失/未作答不拒收', () => {
  const { root, changeDir, ledger, fill, fillAll } = fixture(INPUT)
  fillAll()
  rmSync(join(changeDir, 'design.md'))
  const plain = verifyThinDocsV2({ changeDir, ledger })
  assert.ok(plain.violations.some((x) => /design\.md 缺失/.test(x)), '非 adopted：design 缺失拒收')
  const adopted = verifyThinDocsV2({ changeDir, ledger, skipDesign: true })
  assert.ok(!adopted.violations.some((x) => /design/.test(x)), `adopted 豁免 design 门: ${JSON.stringify(adopted.violations)}`)
  rmSync(root, { recursive: true, force: true })
})
