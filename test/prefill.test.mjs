/**
 * prefill 测试套件（change: 2026-09-18-artifact-prefill，task-04，FR-01/FR-02/FR-03，
 * D-001@v1 / D-002@v1 / D-003@v1 / D-005@v1）
 *
 * 被测对象（task-01 引擎 + task-02 接线 + task-03 门禁的全语义收口）：
 *   - src/prefill.js 六导出：PREFILL_NOTE / prefillFileChangeList / prefillDecisionTable /
 *     prefillCardIds / hasUnconfirmedPrefill / runPrefillRefresh（本文件消费全部导出——
 *     消 check-syntax 的 prefillFileChangeList 死导出项，prefill.js 自身调用不计引用）。
 *   - src/verify-probes.js 探针 10（runProbe10PrefillNoteClearance + runVerifyProbes/
 *     renderVerifyProbesReport 的探针 10 输出形态——gates advisory/error 门同源检测面）。
 *   - src/run/gates.js 门禁梯度双态（CLI 子进程层）：brainstorm --done advisory 不阻断 /
 *     verify --done 注清零 error 阻断（task-03 接线）。
 *   - src/index.js 定向生成器回归：design-init 决策追踪表注行 + taskcard ids 直填
 *     （task-02 接线；test/design-facts.test.mjs L552/L576 同步更新为新格式，此处独立钉住）。
 *
 * fixture 全部用临时目录（mkdtempSync / makeRepo），断言兼容 Windows/Linux/macOS：
 * 行比较在 CRLF 归一后进行（readAll 统一 \r\n → \n），路径断言用正斜杠字面量。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  PREFILL_NOTE,
  prefillFileChangeList,
  prefillDecisionTable,
  prefillCardIds,
  hasUnconfirmedPrefill,
  runPrefillRefresh,
} from '../src/prefill.js'
import {
  runProbe10PrefillNoteClearance,
  runVerifyProbes,
  renderVerifyProbesReport,
} from '../src/verify-probes.js'
import { ProgressManager } from '../src/progress.js'
import { makeRepo, initChange, seedStage, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** CRLF 归一读文件（断言侧行比较统一在 \n 形态做，跨平台行尾不炸）。 */
function readAll(p) { return readFileSync(p, 'utf8').replace(/\r\n/g, '\n') }

/** 建一个三槽全源的 change fixture（tasks/ + decisions.md + requirements.md 均在场）。 */
function makeChangeFixture(prefix, { decisions, requirements, design, tasks = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(root)
  const specBase = join(root, '.sillyspec')
  const changeName = 'demo-change'
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  if (decisions != null) writeFileSync(join(changeDir, 'decisions.md'), decisions)
  if (requirements != null) writeFileSync(join(changeDir, 'requirements.md'), requirements)
  if (design != null) writeFileSync(join(changeDir, 'design.md'), design)
  for (const [name, text] of Object.entries(tasks)) {
    writeFileSync(join(changeDir, 'tasks', name), text)
  }
  return { root, specBase, changeName, changeDir, tasksDir: join(changeDir, 'tasks') }
}

/** 骨架态 design.md：文件变更清单 + 决策追踪两节均只有表头/分隔行（待预填的空槽）。 */
const EMPTY_SLOT_DESIGN = [
  '# 设计文档（Design）— demo-change', '',
  '## 文件变更清单', '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '',
  '## 决策追踪', '| 决策 | 覆盖点 | 状态 |', '|---|---|---|', '',
  '## 风险登记', '',
].join('\n')

// ═══════════════════════════════════════════════════════════════════════════
// 1-3 组·三槽直测（纯函数：形态 / NEW: 保形 / 非法跳过 / 排序 / 缺源空）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 1. 槽一 prefillFileChangeList：并集/NEW: 保形/非法跳过/来源注 ===\n')
{
  const fx = makeChangeFixture('pf-slot1-', {
    tasks: {
      // 块列表形态 + NEW: 前缀 + 全谱非法条目（glob/目录前缀/引号/绝对路径/空剥）
      'task-01.md': [
        '---', 'id: task-01', 'target_files:', '  - NEW:src/new.js', '  - src/existing.js',
        '  - src/glob/*', '  - src/dir/', '  - NEW:', '---', '', 'body', '',
      ].join('\n'),
      // inline [] 形态 + 无前缀声明同一文件（NEW: 并集保形判据）+ 反斜杠/./ 归一 + 非法谱
      'task-02.md': [
        '---', 'id: task-02', 'target_files: [src/shared.js, src/new.js, "src/quoted.js", /abs/path.js, C:/win/abs.js, ./norm.js, src\\win.js]', '---', '', 'body', '',
      ].join('\n'),
    },
  })
  const rows = prefillFileChangeList({ tasksDir: fx.tasksDir })
  assert(deepEq(rows, [
    `| 修改 | norm.js | 预填自 task 卡 target_files 并集 ${PREFILL_NOTE} |`,
    `| 修改 | src/existing.js | 预填自 task 卡 target_files 并集 ${PREFILL_NOTE} |`,
    `| 新增 | NEW:src/new.js | 预填自 task 卡 target_files 并集 ${PREFILL_NOTE} |`,
    `| 修改 | src/shared.js | 预填自 task 卡 target_files 并集 ${PREFILL_NOTE} |`,
    `| 修改 | src/win.js | 预填自 task 卡 target_files 并集 ${PREFILL_NOTE} |`,
  ]), `清单=并集去重排序（NEW: 并集保形 + ./ 与反斜杠归一；got ${JSON.stringify(rows)}）`)
  assert(rows.every((r) => r.includes(PREFILL_NOTE)), '来源注协议：所有清单行行尾带 PREFILL_NOTE')
  assert(rows.some((r) => r.startsWith('| 新增 | NEW:src/new.js |')), 'NEW: 保形：任一卡声明 NEW: → 输出新增+NEW: 前缀（他卡无前缀声明不丢失待建标记）')
  assert(!rows.some((r) => r.includes('glob') || r.includes('dir/') || r.includes('quoted') || r.includes('abs') || r.includes('C:')),
    '非法条目（glob/目录前缀/引号/绝对路径/空剥）全部跳过不进清单')
  assert(deepEq(prefillFileChangeList({ tasksDir: join(fx.root, 'no-such-dir') }), []), 'tasksDir 缺失 → []（槽留空，骨架行为不变——design 兼容策略）')
  assert(deepEq(prefillFileChangeList({}), []), '入参缺省 → []（fail-soft 不抛）')
}

console.log('\n=== 2. 槽二 prefillDecisionTable：canonical 标题/排序/非 canonical 不收 ===\n')
{
  const fx = makeChangeFixture('pf-slot2-', {
    decisions: [
      '# 决策记录', '',
      '## D-002@v1 排序判据（数字升序而非字典序——D-010 须排在它后）', '',
      '## D-010@v1 字典序陷阱条目', '',
      '## D-001@v2 当前版本', '',
      '## D-001@v1 旧版条目（canonical 全收，不筛 superseded——与骨架生成器口径独立）', '',
      '## D-001@v2 重复标题（去重判据）', '',
      '### D-020@v1 手写漂移层级（### 级不收）', '',
      '## D-030 无版本（不收）', '',
      '## D-040@v2', '',
    ].join('\n'),
  })
  const rows = prefillDecisionTable({ changeDir: fx.changeDir })
  assert(deepEq(rows.map((r) => r.split(' | ')[0].replace('| ', '')), ['D-001@v1', 'D-001@v2', 'D-002@v1', 'D-010@v1', 'D-040@v2']),
    `D 编号数字升序、同号版本升序、重复去重；### 级/无版本不收（got ${JSON.stringify(rows)}）`)
  assert(rows.every((r) => r === `| ${r.split(' | ')[0].replace('| ', '')} | （待填覆盖点） | 待确认 ${PREFILL_NOTE} |`),
    '表行三列对齐 design 骨架「决策|覆盖点|状态」：状态列=待确认+来源注')
  assert(rows.every((r) => r.includes(PREFILL_NOTE)), '来源注协议：所有决策表行带 PREFILL_NOTE')
  const fxEmpty = makeChangeFixture('pf-slot2-empty-')
  assert(deepEq(prefillDecisionTable({ changeDir: fxEmpty.changeDir }), []), 'decisions.md 缺失 → []')
}

console.log('\n=== 3. 槽三 prefillCardIds：FR/D 抽取/排序/域式 id 不误收/缺源留空 ===\n')
{
  const fx = makeChangeFixture('pf-slot3-', {
    requirements: [
      '# 需求', '',
      '### FR-02: 数字排序判据', '',
      '#### FR-01: 标题级 #2~#6 容手写漂移', '',
      '### FR-10: 字典序陷阱（FR-10 须排在 FR-02 后）', '',
      '### FR-core-engine-001: 全局域式 id（无「FR-紧邻数字」形态，不误收）', '',
      '正文行提及 FR-99 不在标题（不收）', '',
    ].join('\n'),
    decisions: '## D-002@v1 b\n\n## D-001@v2 a\n\n## D-001@v1 a0\n',
  })
  const ids = prefillCardIds({ changeDir: fx.changeDir })
  assert(deepEq(ids.requirementIds, ['FR-01', 'FR-02', 'FR-10']),
    `FR 按数字升序（非字典序）、域式 FR-<域>-NNN 不误收（got ${JSON.stringify(ids.requirementIds)}）`)
  assert(deepEq(ids.decisionIds, ['D-001@v1', 'D-001@v2', 'D-002@v1']), 'D 按编号+版本升序')
  const fxPart = makeChangeFixture('pf-slot3-part-', { requirements: '### FR-01: x\n' })
  const partIds = prefillCardIds({ changeDir: fxPart.changeDir })
  assert(deepEq(partIds.decisionIds, []), 'decisions.md 缺失 → decisionIds 留空（生成器侧按在场文件预填）')
  const fxNone = makeChangeFixture('pf-slot3-none-')
  const noneIds = prefillCardIds({ changeDir: fxNone.changeDir })
  assert(deepEq(noneIds, { requirementIds: [], decisionIds: [] }), '两源全缺 → 双空数组（不抛）')
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 组·refresh 幂等（同输入二次重放：计数逐字段一致 + 产物零改写）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 4. runPrefillRefresh：三槽重放 + 幂等契约 ===\n')
{
  const fx = makeChangeFixture('pf-refresh-', {
    decisions: '## D-001@v1 a\n',
    requirements: '### FR-01: x\n\n### FR-02: y\n',
    design: EMPTY_SLOT_DESIGN,
    tasks: {
      // 占位双槽（直填路径）+ 块列表 target_files（喂槽一并集源）
      'task-01.md': [
        '---', 'id: task-01', 'requirement_ids: [FR-XX]', 'decision_ids: [D-XXX@vN]',
        'target_files:', '  - NEW:src/a.js', '---', '', 'body', '',
      ].join('\n'),
      // 人工 requirement_ids（无注=确认态）+ decision_ids 字段缺失（存量卡补写路径）+ CRLF 行尾（EOL 保真判据）
      'task-02.md': '---\r\nid: task-02\r\nrequirement_ids: [FR-999]\r\ntarget_files: [src/b.js]\r\n---\r\n\r\nbody2\r\n',
    },
  })
  const r1 = await runPrefillRefresh({ cwd: fx.root, specBase: fx.specBase, changeName: fx.changeName })
  assert(r1.filled === 5 && r1.skipped === 0 && r1.confirmed === 1,
    `首轮计数 filled=5（清单/决策表/task-01 双 ids/task-02 缺失字段）+confirmed=1（task-02 人工值）（got ${JSON.stringify({ filled: r1.filled, skipped: r1.skipped, confirmed: r1.confirmed })}）`)
  const designAfter1 = readAll(join(fx.changeDir, 'design.md'))
  const t1After1 = readAll(join(fx.changeDir, 'tasks', 'task-01.md'))
  const t2After1 = readAll(join(fx.changeDir, 'tasks', 'task-02.md'))
  assert(designAfter1.includes(`| 新增 | NEW:src/a.js | 预填自 task 卡 target_files 并集 ${PREFILL_NOTE} |`),
    '槽一落盘：design.md 清单节追加预填行（NEW: 保形）')
  assert(designAfter1.includes(`| D-001@v1 | （待填覆盖点） | 待确认 ${PREFILL_NOTE} |`),
    '槽二落盘：design.md 决策追踪节追加预填行（状态=待确认+注）')
  assert(t1After1.includes(`requirement_ids: [FR-01, FR-02]  # ${PREFILL_NOTE}`)
    && t1After1.includes(`decision_ids: [D-001@v1]  # ${PREFILL_NOTE}`),
    '槽三落盘：占位 [FR-XX]/[D-XXX@vN] 直填为推导值+注（行格式与 taskcard 直填/refresh 重放一致）')
  assert(t2After1.includes('requirement_ids: [FR-999]') && !t2After1.includes(`requirement_ids: [FR-999]  # ${PREFILL_NOTE}`),
    'D-005 已确认跳过：task-02 人工 requirement_ids（注不在场）不被覆盖')
  assert(t2After1.includes(`decision_ids: [D-001@v1]  # ${PREFILL_NOTE}`),
    '存量卡字段缺失 → 闭合 --- 前补写预填行')
  assert(readFileSync(join(fx.changeDir, 'tasks', 'task-02.md'), 'utf8').includes('\r\n'),
    'EOL 保真：CRLF 原文的卡重放后仍 CRLF（Windows 兼容）')

  const r2 = await runPrefillRefresh({ cwd: fx.root, specBase: fx.specBase, changeName: fx.changeName })
  assert(deepEq([r1.filled, r1.skipped, r1.confirmed], [r2.filled, r2.skipped, r2.confirmed]),
    `幂等契约：二次重放 { filled, skipped, confirmed } 逐字段一致（r2=${JSON.stringify({ filled: r2.filled, skipped: r2.skipped, confirmed: r2.confirmed })}）`)
  const unchanged = readAll(join(fx.changeDir, 'design.md')) === designAfter1
    && readAll(join(fx.changeDir, 'tasks', 'task-01.md')) === t1After1
    && readAll(join(fx.changeDir, 'tasks', 'task-02.md')) === t2After1
  assert(unchanged, '幂等契约：二次重放三产物字节零改写（已在位不重复追加/不改写）')

  const rMiss = await runPrefillRefresh({ cwd: fx.root, specBase: fx.specBase, changeName: 'no-such' })
  assert(rMiss.filled === 0 && rMiss.skipped === 0 && rMiss.confirmed === 0 && rMiss.lines.some((l) => l.includes('变更目录不存在')),
    '变更目录不存在：三计数归零+告警行（fail-soft 不抛）')
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 组·已确认跳过（人工内容保护：design 人工行 / ids 人工值全 confirmed）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 5. runPrefillRefresh：已确认槽（注已删=人工内容）跳过不覆盖 ===\n')
{
  const humanDesign = [
    '# 设计文档（Design）— demo-change', '',
    '## 文件变更清单', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    '| 修改 | src/human.js | 人工行（注已删=确认） |', '',
    '## 决策追踪', '| 决策 | 覆盖点 | 状态 |', '|---|---|---|',
    '| D-001@v1 | 人工覆盖点 | 已落实 |', '',
  ].join('\n')
  const humanTask = '---\nid: task-01\nrequirement_ids: [FR-007]\ndecision_ids: [D-009@v2]\ntarget_files: [src/a.js]\n---\n\nbody\n'
  const fx = makeChangeFixture('pf-confirmed-', {
    decisions: '## D-001@v1 a\n', requirements: '### FR-01: x\n',
    design: humanDesign, tasks: { 'task-01.md': humanTask },
  })
  const before = { d: readAll(join(fx.changeDir, 'design.md')), t: readAll(join(fx.changeDir, 'tasks', 'task-01.md')) }
  const r = await runPrefillRefresh({ cwd: fx.root, specBase: fx.specBase, changeName: fx.changeName })
  assert(r.filled === 0 && r.skipped === 0 && r.confirmed === 4,
    `全人工槽 confirmed=4（design 两表槽+task-01 双 ids）、零写入（got ${JSON.stringify({ filled: r.filled, skipped: r.skipped, confirmed: r.confirmed })}）`)
  assert(readAll(join(fx.changeDir, 'design.md')) === before.d, 'design.md 人工表行原样保留（字节不变）')
  const tAfter = readAll(join(fx.changeDir, 'tasks', 'task-01.md'))
  assert(tAfter.includes('requirement_ids: [FR-007]') && tAfter.includes('decision_ids: [D-009@v2]') && !tAfter.includes(PREFILL_NOTE),
    'task 卡人工 ids 值（FR-007/D-009@v2 非推导值）不被覆盖、不注入注')
  assert(r.lines.every((l) => l.includes('确认态跳过') || l.includes('人工')), '每槽结果行注明人工内容保护语义')
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 组·注清零双态（hasUnconfirmedPrefill + 探针 10 输出形态 + 门双态 CLI 层）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 6a. hasUnconfirmedPrefill + 探针 10（runProbe10PrefillNoteClearance）===\n')
{
  const fx = makeChangeFixture('pf-probe10-', {
    design: `# d\n\n## 决策追踪\n| 决策 | 覆盖点 | 状态 |\n|---|---|---|\n| D-001@v1 | x | 待确认 ${PREFILL_NOTE} |\n`,
    tasks: {
      'task-01.md': `---\nid: task-01\nrequirement_ids: [FR-001]  # ${PREFILL_NOTE}\n---\n`,
      'task-02.md': '---\nid: task-02\nrequirement_ids: [FR-001]\n---\n',
    },
  })
  const withNote = join(fx.changeDir, 'design.md')
  const cleanFile = join(fx.changeDir, 'tasks', 'task-02.md')
  assert(hasUnconfirmedPrefill(withNote) === true, '注在场 → true（未确认）')
  assert(hasUnconfirmedPrefill(cleanFile) === false, '注不在场 → false（确认态）')
  assert(hasUnconfirmedPrefill(join(fx.changeDir, 'no-such.md')) === false, '文件缺失 → false（无注可删不误报）')

  const p = runProbe10PrefillNoteClearance({ specBase: fx.specBase, changeName: fx.changeName })
  assert(p.applicable === true && p.checkedFiles === 3, `在检文件 3（design.md+两 task 卡）（got ${JSON.stringify(p)}）`)
  assert(deepEq(p.unclearedFiles, ['design.md', 'tasks/task-01.md']),
    `unclearedFiles=changeDir 相对正斜杠、design 在前 task 卡按名序（got ${JSON.stringify(p.unclearedFiles)}）`)

  const probes = runVerifyProbes({ cwd: fx.root, changeName: fx.changeName, specDir: fx.specBase })
  const md = renderVerifyProbesReport(probes)
  const p10sec = md.slice(md.indexOf('#### 探针 10'))
  assert(p10sec.includes('#### 探针 10：预填注清零（error 门）'), '探针 10 段标题（error 门口径）')
  assert(p10sec.includes('❌ 预填注未清 2 处') && p10sec.includes('`design.md` 仍含未删预填注') && p10sec.includes('`tasks/task-01.md` 仍含未删预填注'),
    '❌ 面：未清文件逐名列出（verify-result.md 探针段形态）')

  // 清零态：删净注 → 探针 ✅ 过
  writeFileSync(withNote, readAll(withNote).split(PREFILL_NOTE).join('').replace('待确认  |', '已落实 |'))
  writeFileSync(join(fx.changeDir, 'tasks', 'task-01.md'), `---\nid: task-01\nrequirement_ids: [FR-001]\n---\n`)
  const pClean = runProbe10PrefillNoteClearance({ specBase: fx.specBase, changeName: fx.changeName })
  assert(pClean.applicable === true && pClean.unclearedFiles.length === 0, '注删净 → unclearedFiles 空（error 门过）')
  const mdClean = renderVerifyProbesReport(runVerifyProbes({ cwd: fx.root, changeName: fx.changeName, specDir: fx.specBase }))
  const secClean = mdClean.slice(mdClean.indexOf('#### 探针 10'))
  assert(secClean.includes('✅ 预填注清零'), '✅ 面形态（删净过门）')

  const pMiss = runProbe10PrefillNoteClearance({ specBase: fx.specBase, changeName: 'no-such' })
  assert(pMiss.applicable === false && pMiss.notes.length > 0, '变更目录缺失 → 不适用+注记（纯骨架零红门禁）')
}

console.log('\n=== 6b. 门双态（CLI 层）：brainstorm --done advisory / verify --done error ===\n')
// ── brainstorm --done：注在场 → advisory warning 不阻断（旧路径零新硬门）──
const BRAINSTORM_STEPS = ['进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案', '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件']
async function seedBrainstormToLast(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'brainstorm',
    BRAINSTORM_STEPS.map((name, i) => ({ name, status: i < BRAINSTORM_STEPS.length - 1 ? 'completed' : 'pending' })))
}
function writeCompleteArtifacts(specBase, cn, cwd) {
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 模块域核验\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  writeFileSync(join(changeDir, 'design.md'),
    `# 设计文档（Design）— ${cn}\n\n## 背景\n决策模块域需核验。\n\n## 总体方案\ndesign-facts 纯函数核验。\n\n## 决策\nD-001@v1: 模块域登记。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/a/x.js | a 改动 |\n\n## 风险登记\n低风险。\n\n## 自审\n已核对。\n`)
  writeFileSync(join(changeDir, 'decisions.md'), '## D-001@v1 域声明\n- type: architecture\n- status: confirmed\n- 模块域: mod-a\n')
  mkdirSync(join(cwd, 'src', 'a'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'a', 'x.js'), '// fixture stub')
  const mapDir = join(specBase, 'docs', 'pfmap', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'modules:\n  mod-a:\n    paths:\n      - src/a/\n')
}
{
  const { cwd, specBase } = makeRepo('pf-gate-adv-')
  const cn = '2026-09-18-pf-adv'
  await seedBrainstormToLast(cwd, specBase, cn)
  writeCompleteArtifacts(specBase, cn, cwd)
  mkdirSync(join(specBase, 'changes', cn, 'tasks'), { recursive: true })
  writeFileSync(join(specBase, 'changes', cn, 'tasks', 'task-01.md'), `---\nid: task-01\nrequirement_ids: [FR-001]  # ${PREFILL_NOTE}\n---\n`)
  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认' })
  assert(r.status === 0, `注在场 --done exit 0（advisory 不阻断；实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  assert(r.combined.includes('⚠️ 预填注未清') && r.combined.includes('tasks/task-01.md'),
    'advisory 文案：点名列出未清文件+核对语义')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.brainstorm.status === 'completed', 'advisory 路径阶段正常 completed（忘删注=提示非阻断）')

  // 清零态：无注 → 无 warning 正常完成
  const { cwd: cwd2, specBase: sb2 } = makeRepo('pf-gate-adv-clean-')
  const cn2 = '2026-09-18-pf-adv-clean'
  await seedBrainstormToLast(cwd2, sb2, cn2)
  writeCompleteArtifacts(sb2, cn2, cwd2)
  mkdirSync(join(sb2, 'changes', cn2, 'tasks'), { recursive: true })
  writeFileSync(join(sb2, 'changes', cn2, 'tasks', 'task-01.md'), '---\nid: task-01\nrequirement_ids: [FR-001]\n---\n')
  const r2 = runStage('brainstorm', cn2, cwd2, { done: true, output: '生成规范完成', answer: '确认' })
  assert(r2.status === 0 && !r2.combined.includes('预填注未清'), '注删净 → 无 advisory 噪音、正常完成')
}
// ── verify --done：注在场 → error 阻断（归档前注清零收口）；删净 → 过 ──
const VERIFY_STEPS = ['状态检查', '加载规范并锚定', '逐项检查任务', '对照设计检查', '任务蓝图验收', '运行测试和质量扫描', '输出验证报告']
async function seedVerifyToLast(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  try {
    const db = pm._ensureDB(cwd)
    db.getDb().prepare("UPDATE changes SET created_at = '2026-01-01T00:00:00.000Z' WHERE name = ?").run(cn)
  } catch { /* 存量豁免回填失败不阻断（ir-hardening 同款 fail-open） */ }
  runCLI(['--dir', cwd, 'run', 'verify', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'verify', VERIFY_STEPS.map((name, i) => ({ name, status: i < VERIFY_STEPS.length - 1 ? 'completed' : 'pending' })))
}
function writeVerifyDocs(changeDir, extraDesign = '') {
  writeFileSync(join(changeDir, 'design.md'),
    '# Design: 列表排序\n\n## 背景\n列表需默认最新在前。\n\n## 总体方案\nservice 兜底。\n\n## 决策\nD-001@v1: 直接改。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序 |\n' + extraDesign)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'verify-result.md'), '# 验证报告\n\n## 结论\n\nPASS\n\n所有任务通过。\n')
}
{
  const { cwd, specBase } = makeRepo('pf-gate-err-')
  const cn = '2026-09-18-pf-err'
  await seedVerifyToLast(cwd, specBase, cn)
  writeVerifyDocs(join(specBase, 'changes', cn), `\n<!-- 槽状态：待确认 ${PREFILL_NOTE} -->\n`)
  const r = runStage('verify', cn, cwd, { done: true, output: '报告已输出' })
  assert(r.combined.includes('❌ verify 阶段被阻断：预填注清零校验未过'),
    `注在场 → error 阻断（输出尾：${r.combined.slice(-150)}）`)
  assert(r.combined.includes('design.md') && r.combined.includes('删注=确认动作'),
    'error 文案：点名未清文件+删注=确认动作指引')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.verify.status !== 'completed' && after.stages.verify.steps[after.stages.verify.steps.length - 1].status === 'pending',
    '阻断回滚：阶段不 completed、末步回退 pending（归档前置守死）')

  const { cwd: cwd2, specBase: sb2 } = makeRepo('pf-gate-err-clean-')
  const cn2 = '2026-09-18-pf-err-clean'
  await seedVerifyToLast(cwd2, sb2, cn2)
  writeVerifyDocs(join(sb2, 'changes', cn2))
  const r2 = runStage('verify', cn2, cwd2, { done: true, output: '报告已输出' })
  assert(r2.status === 0 && r2.combined.includes('验证通过'), '注删净 → verify 正常完成（error 门过）')
  const after2 = await new ProgressManager({ specDir: sb2 }).read(cwd2, cn2)
  assert(after2.stages.verify.status === 'completed', '清零态阶段 completed')
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 组·定向生成器回归（design-init 决策表注行 / taskcard ids 直填三态）
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n=== 7. 定向生成器回归：design-init 注行 + taskcard ids 直填 ===\n')
{
  // design-init：决策追踪表行带来源注（task-02 接线；design-facts L552/L576 同格式）
  const { cwd, specBase } = makeRepo('pf-gen-design-')
  const cn = '2026-09-18-pf-gen-design'
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), '## D-001@v1 采用骨架生成\n- type: architecture\n- status: confirmed\n')
  const r1 = runCLI(['--dir', cwd, 'design-init', '--change', cn], { cwd })
  assert(r1.status === 0, `design-init exit 0（实际 ${r1.status}，输出：${r1.combined.slice(-150)}）`)
  const gen = readAll(join(changeDir, 'design.md'))
  assert(gen.includes(`| D-001@v1 | （待填覆盖点） | 待确认 ${PREFILL_NOTE} |`),
    '决策追踪表预填行带来源注（D-003 预填≠结论）')
  assert(!gen.includes('| D-001@v1 | （待填覆盖点） | 待确认 |'),
    '无裸「待确认」行残留（骨架旧行形态被预填行整体替换）')
  const r2 = runCLI(['--dir', cwd, 'design-init', '--change', cn, '--force'], { cwd })
  assert(r2.status === 0 && readAll(join(changeDir, 'design.md')).includes(`| D-001@v1 | （待填覆盖点） | 待确认 ${PREFILL_NOTE} |`),
    '--force 重生成后注行仍在（幂等）')
}
{
  // taskcard：源在场 → ids 直填+注；源缺 → 留空+提示行；--set 显式覆盖 → 预填不碰
  const { cwd, specBase } = makeRepo('pf-gen-card-')
  const cn = '2026-09-18-pf-gen-card'
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n- [ ] task-02: 改 b\n- [ ] task-03: 改 c\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# 需求\n\n### FR-001: x\n\n### FR-02: y\n')
  writeFileSync(join(changeDir, 'decisions.md'), '## D-001@v1 a\n')
  const r = runCLI(['--dir', cwd, 'taskcard', cn, '--all'], { cwd })
  assert(r.status === 0, `taskcard --all exit 0（实际 ${r.status}，输出：${r.combined.slice(-200)}）`)
  const card = readAll(join(changeDir, 'tasks', 'task-01.md'))
  assert(card.includes(`requirement_ids: [FR-001, FR-02]  # ${PREFILL_NOTE}`) && card.includes(`decision_ids: [D-001@v1]  # ${PREFILL_NOTE}`),
    '源在场 → 占位 [FR-XX]/[D-XXX@vN] 直填推导值+来源注（行格式与 refresh 重放逐字一致）')
  assert(!card.includes('[FR-XX]') && !card.includes('[D-XXX@vN]'), '占位字面量零残留（plan --done 硬校验面不遗留）')
  assert(r.combined.includes('ids 预填：requirement_ids [FR-001, FR-02] / decision_ids [D-001@v1]'),
    'CLI 汇总行透出预填值+核对语义')

  const { cwd: cwd2, specBase: sb2 } = makeRepo('pf-gen-card-empty-')
  const cn2 = '2026-09-18-pf-gen-card-empty'
  const cd2 = join(sb2, 'changes', cn2)
  mkdirSync(cd2, { recursive: true })
  writeFileSync(join(cd2, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  const r2 = runCLI(['--dir', cwd2, 'taskcard', cn2, '--all'], { cwd: cwd2 })
  assert(r2.status === 0, `无源 taskcard exit 0（实际 ${r2.status}）`)
  const card2 = readAll(join(cd2, 'tasks', 'task-01.md'))
  assert(card2.includes('requirement_ids: []  # (预填源未就绪：plan 阶段后跑 prefill-refresh)')
    && card2.includes('decision_ids: []  # (预填源未就绪：plan 阶段后跑 prefill-refresh)'),
    '源未就绪 → 空数组+提示行（D-005：plan 阶段后 prefill-refresh 补齐）')

  const { cwd: cwd3, specBase: sb3 } = makeRepo('pf-gen-card-set-')
  const cn3 = '2026-09-18-pf-gen-card-set'
  const cd3 = join(sb3, 'changes', cn3)
  mkdirSync(cd3, { recursive: true })
  writeFileSync(join(cd3, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  writeFileSync(join(cd3, 'requirements.md'), '### FR-001: x\n')
  const r3 = runCLI(['--dir', cwd3, 'taskcard', cn3, '--all', '--set', 'requirement_ids=[FR-009]'], { cwd: cwd3 })
  assert(r3.status === 0, `--set taskcard exit 0（实际 ${r3.status}）`)
  const card3 = readAll(join(cd3, 'tasks', 'task-01.md'))
  assert(card3.includes("requirement_ids: '[FR-009]'") && !card3.includes(`requirement_ids: '[FR-009]'  # ${PREFILL_NOTE}`),
    '--set 显式覆盖优先：占位字面量已不在 → 预填改写不触碰（人工注入值保形）')
  assert(card3.includes('decision_ids: []  # (预填源未就绪：plan 阶段后跑 prefill-refresh)'),
    '--set 未覆盖的字段照常走直填/提示行逻辑（豁免只限被覆盖字段，非整体跳过）')
}

// ═══════════════════════════════════════════════════════════════════════════
// 收尾
// ═══════════════════════════════════════════════════════════════════════════
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
cleanup()
report(count.passed, count.failed, count.failures)
