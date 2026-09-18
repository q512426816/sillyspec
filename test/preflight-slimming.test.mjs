/**
 * preflight-slimming 测试套件（2026-09-18-preflight-slimming task-05 / FR-01~FR-04 / D-005@v1）
 *
 * 七组断言（plan.md Wave 4）：
 *   1) 前置清单三态：有失败（条数帽 5 截断「…另 N 项见 gate」）/无失败返空串/validator 异常
 *      整体 fail-open 返空串。超时态（3s 帽）见组一末 TODO 注释——PREFLIGHT_VALIDATORS
 *      映射表为模块私有，测试无法注入慢 validator，不在本文件硬造（时间盒约定：记 TODO 不算失败）。
 *   2) 账本幂等与摘要形态：shouldInjectFullContext 无账本 {full:true}/有账本 {full:false,digest,
 *      firstStep}/坏 JSON fail-open；outputStep 双渲染字节金丝雀（同 change+stage+step 两次调用
 *      输出逐字节一致，对齐 test/knowledge-inject.test.mjs:215 先例）+账本不覆盖（幂等）+
 *      摘要行含 digest 与可 Read 路径（R-03）。
 *   3) inherit-from 双态+兼容：hasDecisionId 纯函数双态（fail-closed 不做版本归一）；CLI 子进程
 *      层——不存在 ID exit 2 且不落任何 wait 状态 / 存在 ID 盖章轮落 wait_answers 回 pending /
 *      不带 --inherit-from 输出既有 wait 文案（逐字节兼容面的行为钉）。
 *   4) 引导行在场：execute 任务步 prompt 与 taskcard-rules.md verify 段均含「中间验证定向优先」
 *      固定行（逐字）。
 *   5) prompt 中位长度统计钩子：本文件导出 recordPromptLength/medianPromptLength（D-005③
 *      verify 验收「单步 prompt 中位不反弹」的采样统计形态——prompt.js 无既有长度记录可消费，
 *      按轻量形态落测试文件，不强制进 src；测试运行尾打印本批采样中位数供 verify 对账）。
 *   6) prune 登记断言：complete-handlers 源文本含 prompt-inject-<change>.json 枚举 +
 *      pruneArchivedChangeRuntime 直测（只删本变更账本，他变更账本不动）。
 *   7) 清单头行稳定性：头行逐字（含「非全部要求」子串——防应试措辞漂移）+ 尾行 gate 指引。
 *
 * 风格：自研 assert 裸脚本（对齐 test/machine-interface.test.mjs / knowledge-inject.test.mjs），
 * mkdtempSync 临时夹具，Windows/Linux/macOS 跨平台（路径全 join、CRLF 容错归一）。
 * CLI 层子进程复用 test/_cli-step-harness.mjs（非 .test.mjs 后缀，run-tests.mjs 不收集，仅 import）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { hasDecisionId } from '../src/decisions-io.js'
import { outputStep, renderPreflightFailures, shouldInjectFullContext } from '../src/run/prompt.js'
import { pruneArchivedChangeRuntime } from '../src/run/complete-handlers.js'
import { makeRepo, initChange, seedStage, runCLI, cleanup as cleanupRepos } from './_cli-step-harness.mjs'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')

let total = 0
let failed = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

// ── fixture 助手 ──────────────────────────────────────────────────────────────

const tmpRoots = []
function makeTmpRoot(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}
function cleanupRoot(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄迟滞容忍 */ }
}

/** 捕获 console.log 输出（warn/error 放行——后台平台 sync 噪音不进字节对比面） */
async function captureOutput(fn) {
  const orig = console.log
  const parts = []
  console.log = (...a) => { parts.push(a.map(x => String(x)).join(' ')) }
  try { await fn() } finally { console.log = orig }
  return parts.join('\n')
}

/**
 * 造含幻觉路径清单的 design.md（scale: small——四件套规则豁免 proposal/requirements/tasks，
 * 保证组一失败项全部来自 design-file-list，条数可精确控制）。
 * paths 数组条目不落 NEW: 前缀且文件不存在 → 每条一个 design_file_ref_invalid error。
 */
function writeDesignWithList(changeDir, paths) {
  const rows = paths.map((p, i) => `| 修改 | ${p} | 幻觉路径夹具${i + 1} |`).join('\n')
  writeFileSync(join(changeDir, 'design.md'), [
    '---',
    'scale: small',
    '---',
    '# 设计文档（Design）— 前置清单夹具',
    '',
    '## 文件变更清单',
    '',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    rows,
    '',
  ].join('\n'), 'utf8')
}

// ── 组五钩子：单步 prompt 渲染长度采样统计（D-005③ verify 验收数据点）──────────
// 轻量形态：记录函数 + 中位数计算落本测试文件并导出（verify 验收「单步 prompt 中位不反弹」
// 时消费——npm test 尾部打印本批采样；src 不强制收编，若后续进 src 由独立变更承接）。
const promptLengthSamples = []
export function recordPromptLength(stageName, stepName, renderedText) {
  promptLengthSamples.push({
    stage: String(stageName || ''), step: String(stepName || ''),
    chars: String(renderedText || '').length,
    at: new Date().toISOString(),
  })
}
export function medianPromptLength(samples = promptLengthSamples) {
  const vals = (samples || []).map(s => s.chars).sort((a, b) => a - b)
  if (vals.length === 0) return null
  const mid = Math.floor(vals.length / 2)
  return vals.length % 2 === 1 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2
}
export function promptLengthSamplesSnapshot() { return [...promptLengthSamples] }

// ══════════════════════════════════════════════════════════════════════════════
// 组一 + 组七：前置清单三态 + 头行/尾行稳定性
// ══════════════════════════════════════════════════════════════════════════════
console.log('--- 组一/组七：前置清单三态（有失败帽截断 / 无失败 / 异常 fail-open）+ 头尾行 ---')
{
  const root = makeTmpRoot('pfs-design-')
  const specBase = join(root, '.sillyspec')
  const changeName = '2026-09-18-pfs-design'
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  try {
    // 态① 有失败：7 条幻觉路径 → 7 error，条数帽 5 截断
    writeDesignWithList(changeDir, [
      'src/halluc/one.js', 'src/halluc/two.js', 'src/halluc/three.js', 'src/halluc/four.js',
      'src/halluc/five.js', 'src/halluc/six.js', 'src/halluc/seven.js',
    ])
    const out = await renderPreflightFailures({
      stageName: 'brainstorm', stepName: '生成规范文件', cwd: root, specBase, changeName,
    })
    assertTrue(out !== '', '7 条幻觉路径 → 清单非空（有失败态）')
    const lines = out.split('\n')
    assertTrue(lines[0] === '⚠️ 已知失败项（非全部要求），清单外仍需按步骤说明自检：',
      '头行逐字在场（组七：「已知失败项（非全部要求）」防应试措辞固定行）')
    assertTrue(out.includes('非全部要求'), '头行含「非全部要求」子串（防清单被当待办清单应试打磨）')
    const itemLines = lines.filter(l => l.startsWith('- '))
    assertTrue(itemLines.length === 5, `条数帽 5 截断（展示 ${itemLines.length} 项，7 项失败只显前 5）`)
    assertTrue(itemLines.every(l => l.startsWith('- design-file-list: ')), '条目带 validator 名前缀（design-file-list:）')
    assertTrue(out.includes('src/halluc/one.js') && out.includes('src/halluc/five.js'), '截断保留声明序前 5 条（one~five 在场）')
    assertTrue(!out.includes('src/halluc/six.js') && !out.includes('src/halluc/seven.js'), '第 6/7 条被截掉')
    assertTrue(out.includes('…另 2 项见 gate'), '截断尾注「…另 2 项见 gate」在场（完整判定归 gate）')
    assertTrue(lines[lines.length - 1] === '完整清单：sillyspec gate brainstorm --json',
      '尾行 gate 指引逐字在场（完整清单：sillyspec gate brainstorm --json）')

    // 态② 无失败：全部 NEW: 前缀（计划新建豁免）→ 空串零注入
    writeDesignWithList(changeDir, ['NEW:src/new/one.js', 'NEW:src/new/two.js'])
    const outOk = await renderPreflightFailures({
      stageName: 'brainstorm', stepName: '生成规范文件', cwd: root, specBase, changeName,
    })
    assertTrue(outOk === '', '无失败 → 空串（NEW: 前缀豁免，零注入零膨胀）')

    // 态②b 未声明步骤：无 preflightValidators 声明 → 空串（渐进兼容）
    const outNoDecl = await renderPreflightFailures({
      stageName: 'brainstorm', stepName: '不存在的步骤', cwd: root, specBase, changeName,
    })
    assertTrue(outNoDecl === '', '未声明/不存在步骤名 → 空串（声明落地前零注入）')

    // 态③ validator 异常：design.md 为目录 → four-piece-rules readFileSync 抛错 → 整体 fail-open 返 ''
    rmSync(join(changeDir, 'design.md'))
    mkdirSync(join(changeDir, 'design.md'))
    const outErr = await renderPreflightFailures({
      stageName: 'brainstorm', stepName: '生成规范文件', cwd: root, specBase, changeName,
    })
    assertTrue(outErr === '', 'validator 异常（design.md 为目录 readFileSync 抛错）→ fail-open 返空串，不阻渲染')
    // TODO（超时态，3s 帽）：PREFLIGHT_VALIDATORS 映射表为 run/prompt.js 模块私有，测试无法注入
    // 慢 validator 构造超时；该态由代码评审覆盖（runPreflightValidator Promise.race + PREFLIGHT_TIMEOUT
    // 哨兵，src/run/prompt.js），不在本文件硬造——按 taskcard 时间盒约定记 TODO 不算失败。
  } finally { cleanupRoot(root) }
}

// ══════════════════════════════════════════════════════════════════════════════
// 组二：账本幂等与摘要形态 + 双渲染字节金丝雀
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n--- 组二：账本分叉判定 + outputStep 注入分叉 + 双渲染字节金丝雀 ---')
{
  const root = makeTmpRoot('pfs-fork-')
  const specBase = join(root, '.sillyspec')
  const runtimeDir = join(specBase, '.runtime')
  const projectName = 'pfs-proj'
  const changeName = '2026-09-18-pfs-fork'
  mkdirSync(runtimeDir, { recursive: true })
  // 模块索引：module `core`（prompt 含「core」/「src/core/」即命中 → 非空全量注入）
  const mapDir = join(specBase, 'docs', projectName, 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'),
    'schema_version: 2\nmodules:\n  core:\n    role: 核心域\n    paths:\n      - src/core/\n', 'utf8')
  mkdirSync(join(specBase, 'changes', changeName), { recursive: true })
  const ledgerPath = join(runtimeDir, `prompt-inject-${changeName}.json`)
  try {
    // 判定三态（纯函数直测——import 同时收口 lint 未引用导出）
    const noLedger = shouldInjectFullContext({ changeName, stageName: 'execute', runtimeRoot: runtimeDir })
    assertTrue(noLedger.full === true, '无账本 → {full:true}（首步全量语义）')
    writeFileSync(ledgerPath, JSON.stringify({
      stages: { execute: { firstStep: 1, digest: 'abcd1234', at: '2026-09-18T00:00:00.000Z' } },
    }) + '\n', 'utf8')
    const hasLedger = shouldInjectFullContext({ changeName, stageName: 'execute', runtimeRoot: runtimeDir })
    assertTrue(hasLedger.full === false && hasLedger.digest === 'abcd1234' && hasLedger.firstStep === 1,
      '有账本 → {full:false, digest, firstStep}（摘要行判定输入）')
    const missStage = shouldInjectFullContext({ changeName, stageName: 'plan', runtimeRoot: runtimeDir })
    assertTrue(missStage.full === true, '账本无该 stage 记录 → {full:true}（阶段独立分叉）')
    writeFileSync(ledgerPath, '{broken json', 'utf8')
    const badLedger = shouldInjectFullContext({ changeName, stageName: 'execute', runtimeRoot: runtimeDir })
    assertTrue(badLedger.full === true, '坏 JSON → fail-open {full:true}（分叉失败回退每步全量现状）')
    rmSync(ledgerPath)

    // outputStep 注入分叉端到端（真实渲染/真实账本，非 mock）
    const steps = [{ name: '确认执行范围', prompt: '解析任务，确认执行范围。涉及 core 模块与 src/core/ 下的文件。' }]
    const render = () => captureOutput(() => outputStep(
      'execute', 0, steps, root, changeName, projectName, { specRoot: specBase }))

    // 首步：无账本 → 全量注入 + 落账
    const out1 = await render()
    recordPromptLength('execute', '确认执行范围#full', out1) // 组五采样：全量步
    assertTrue(out1.includes('### 📦 模块上下文（按相关性排序，来自 Module Context Index）'),
      '首步（无账本）全量注入模块上下文段')
    assertTrue(existsSync(ledgerPath), '首步全量注入后账本落盘（prompt-inject-<change>.json）')
    const ledger1 = JSON.parse(readFileSync(ledgerPath, 'utf8'))
    assertTrue(ledger1.stages && ledger1.stages.execute && ledger1.stages.execute.firstStep === 1,
      '账本记录 firstStep=1（本阶段首个非空注入锚点）')
    assertTrue(/^[0-9a-f]{8}$/.test(ledger1.stages.execute.digest), '账本 digest 为 8 位 hex（sha256 前 8 位指纹）')
    assertTrue(!out1.includes('已于步骤 1 注入'), '首步不出现摘要行（全量语义）')

    // 后续步：有账本 → 摘要行替代全量（digest + 可 Read 路径）
    const out2 = await render()
    recordPromptLength('execute', '确认执行范围#digest', out2) // 组五采样：摘要步
    assertTrue(out2.includes(`> 本阶段模块/scan 上下文已于步骤 1 注入（digest ${ledger1.stages.execute.digest}）`),
      '后续步摘要行含首步步骤号 + 账本 digest（可核对指纹）')
    assertTrue(out2.includes(join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')),
      '摘要行含可 Read 路径（模块索引 _module-map.yaml——R-03 摘要丢上下文对冲）')
    assertTrue(out2.includes(join(specBase, 'docs', projectName, 'scan')), '摘要行含 scan 文档目录路径')
    assertTrue(!out2.includes('### 📦 模块上下文'), '后续步不重注全量模块上下文段')

    // 双渲染字节金丝雀（幂等）：同 change+stage+step 再渲染一次，输出逐字节一致
    const out3 = await render()
    assertTrue(out2 === out3, '双渲染字节一致（同 change+stage+step 两次 outputStep 输出逐字节相同——knowledge-inject:215 先例形态）')
    const ledger3 = JSON.parse(readFileSync(ledgerPath, 'utf8'))
    assertTrue(ledger3.stages.execute.firstStep === 1 && ledger3.stages.execute.digest === ledger1.stages.execute.digest,
      '账本幂等：重复渲染不覆盖既有 stage 记录（firstStep/digest 不变）')
  } finally { cleanupRoot(root) }
}

// ══════════════════════════════════════════════════════════════════════════════
// 组三：inherit-from 双态 + 不带参数兼容（纯函数层 + CLI 子进程层）
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n--- 组三：hasDecisionId 双态 + CLI --inherit-from 双态/兼容 ---')
{
  // 纯函数层：tmp 变更目录 decisions.md 含 D-001@v1
  const root = makeTmpRoot('pfs-decid-')
  const changeDir = join(root, '.sillyspec', 'changes', '2026-09-18-pfs-dec')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), [
    '# 决策记录', '',
    '## D-001@v1 前置清单条数帽', '',
    '- 状态：accepted', '',
    '## D-002@v1 注入分叉账本', '',
    '- 状态：accepted', '',
  ].join('\n'), 'utf8')
  try {
    assertTrue(hasDecisionId(changeDir, 'D-001@v1') === true, 'hasDecisionId：存在 ID（## D-001@v1 标题）→ true')
    assertTrue(hasDecisionId(changeDir, 'D-999@v9') === false, 'hasDecisionId：不存在 ID → false（fail-closed）')
    assertTrue(hasDecisionId(changeDir, 'D-001@v2') === false, 'hasDecisionId：版本号不匹配 → false（不做版本归一）')
    assertTrue(hasDecisionId(changeDir, 'D-1@v1') === false, 'hasDecisionId：D-1 不归一到 D-001（机械字面匹配）')
    assertTrue(hasDecisionId(join(root, 'no-such-dir'), 'D-001@v1') === false, 'hasDecisionId：文件/目录不存在 → false 不抛')
    assertTrue(hasDecisionId(changeDir, '') === false, 'hasDecisionId：空 ID → false')
  } finally { cleanupRoot(root) }
}
{
  // CLI 子进程层：真实 wait 协议（真实 DB + 真实盖章轮落账，非 mock）
  const { cwd, specBase } = makeRepo('pfs-cli-')
  const changeName = '2026-09-18-pfs-cli'
  const pm = await initChange(cwd, specBase, changeName)
  await seedStage(pm, cwd, changeName, 'brainstorm', [
    { name: '进度确认', status: 'completed' },
    { name: '加载项目上下文', status: 'pending' },
  ])
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'),
    '# 决策记录\n\n## D-001@v1 前置清单条数帽\n\n- 状态：accepted\n', 'utf8')
  const baseArgs = ['--dir', cwd, 'run', 'brainstorm', '--change', changeName]

  // 态① 不存在 ID → exit 2（fail-closed 防伪造锚点）且不落任何 wait 状态
  const miss = runCLI([...baseArgs, '--wait', '--reason', '确认设计取舍', '--inherit-from', 'D-999@v9'], { cwd })
  assertTrue(miss.status === 2, `CLI：--inherit-from D-999@v9（不存在）→ exit 2（实际 ${miss.status}）`)
  assertTrue(miss.combined.includes('决策 ID 不存在于 decisions.md') && miss.combined.includes('fail-closed'),
    'CLI：exit 2 报错含 fail-closed 锚点校验语义')
  {
    const p1 = await pm.read(cwd, changeName)
    const step = p1.stages.brainstorm.steps[1]
    assertTrue(step.status === 'pending' && !step.waitReason && !(Array.isArray(step.waitAnswers) && step.waitAnswers.length),
      'CLI：校验失败不落任何 wait 状态（step 仍 pending、无 waitReason/waitAnswers）')
  }

  // 态② 存在 ID → 盖章轮落 wait_answers + 回 pending（真实协议通道）
  const hit = runCLI([...baseArgs, '--wait', '--reason', '确认设计取舍', '--inherit-from', 'D-001@v1'], { cwd })
  assertTrue(hit.status === 0, `CLI：--inherit-from D-001@v1（存在）→ exit 0（实际 ${hit.status}）`)
  assertTrue(hit.stdout.includes('wait 已由决策继承盖章'), 'CLI：收尾提示「wait 已由决策继承盖章」')
  assertTrue(hit.stdout.includes('由 D-001@v1 继承确认（CLI 盖章）'), 'CLI：盖章轮文案含决策 ID 来源标注（R-04 可审计）')
  {
    const p2 = await pm.read(cwd, changeName)
    const step = p2.stages.brainstorm.steps[1]
    const last = Array.isArray(step.waitAnswers) ? step.waitAnswers[step.waitAnswers.length - 1] : null
    assertTrue(last && last.answer === '由 D-001@v1 继承确认（CLI 盖章）',
      'CLI：盖章轮落 wait_answers（既有回放通道，answer=盖章文案）')
    assertTrue(typeof last.round === 'number' && last.round >= 1 && typeof last.answeredAt === 'string',
      'CLI：盖章轮记录形态 {round, answer, answeredAt}（照 continueStep 既有数据形态）')
    assertTrue(step.status === 'pending' && step.waitAnswer === '由 D-001@v1 继承确认（CLI 盖章）',
      'CLI：盖章后清 waiting 回 pending + waitAnswer 已置（后续 --done 不再要求 --answer）')
  }

  // 兼容：不带 --inherit-from → 既有 wait 文案（无任何盖章字样）
  const legacy = runCLI([...baseArgs, '--wait', '--reason', '需要用户确认方案'], { cwd })
  assertTrue(legacy.status === 0, 'CLI：不带 --inherit-from 的 --wait → exit 0（现状不变）')
  assertTrue(legacy.stdout.includes('已暂停等待') && legacy.stdout.includes('继续时执行'),
    'CLI：输出既有 wait 文案（⏸️ 已暂停等待 / 继续时执行）')
  assertTrue(!legacy.stdout.includes('盖章'), 'CLI：无盖章字样（不带参数路径零新文案，逐字节兼容面）')
}

// ══════════════════════════════════════════════════════════════════════════════
// 组四：引导行在场（execute 任务步 prompt + taskcard-rules verify 段，逐字）
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n--- 组四：中间验证定向优先引导行在场 ---')
{
  const GUIDE = '中间验证定向优先：node --test <本任务测试文件>；全量 npm test 留 task 收口与 verify --done'
  const executeSrc = readFileSync(join(repoRoot, 'src', 'stages', 'execute.js'), 'utf8')
  const taskcardRules = readFileSync(join(repoRoot, 'templates', 'prompts', 'taskcard-rules.md'), 'utf8')
  assertTrue(executeSrc.includes(GUIDE), 'src/stages/execute.js 任务步 prompt 含引导行（逐字）')
  assertTrue(taskcardRules.includes(GUIDE), 'templates/prompts/taskcard-rules.md verify 段含引导行（逐字同款——测选路引导单点定义，双处漂移锁）')
}

// ══════════════════════════════════════════════════════════════════════════════
// 组五：prompt 中位长度统计钩子（D-005③ verify 验收「单步中位不反弹」数据点）
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n--- 组五：中位长度钩子自检 + 本批采样 ---')
{
  // 钩子正确性自检（奇数样本取中位、偶数样本取两中均值——隔离样本集，不与真实采样混算）
  assertTrue(medianPromptLength([{ chars: 3 }, { chars: 1 }, { chars: 2 }]) === 2,
    '奇数样本中位数取中位值（median([1,2,3])=2）')
  assertTrue(medianPromptLength([{ chars: 4 }, { chars: 1 }, { chars: 3 }, { chars: 2 }]) === 2.5,
    '偶数样本中位数取两中均值（median([1,2,3,4])=2.5）')
  assertTrue(medianPromptLength([]) === null, '空样本 → null（无中位数）')
  // 真实采样核对：组二两次真实渲染（全量步/摘要步）已记录
  const realSamples = promptLengthSamples.filter(s => s.stage === 'execute')
  assertTrue(realSamples.length === 2, `组二真实渲染采样 2 条已落（实际 ${realSamples.length}）`)
  assertTrue(realSamples.every(s => Number.isInteger(s.chars) && s.chars > 0 && s.step && typeof s.at === 'string'),
    '采样记录形态 {stage, step, chars, at}（verify 验收按 stage+step 对账单步中位）')
  assertTrue(medianPromptLength(realSamples) > 0, '真实采样中位数可计算（D-005③ verify 数据点）')
}

// ══════════════════════════════════════════════════════════════════════════════
// 组六：prune 登记断言（complete-handlers 枚举 + pruneArchivedChangeRuntime 直测）
// ══════════════════════════════════════════════════════════════════════════════
console.log('\n--- 组六：prune 登记含 prompt-inject 账本 ---')
{
  const handlersSrc = readFileSync(join(repoRoot, 'src', 'run', 'complete-handlers.js'), 'utf8')
  assertTrue(handlersSrc.includes('prompt-inject-${changeName}.json'),
    'complete-handlers 源文本含 prompt-inject-${changeName}.json 精确文件名枚举（文本级登记钉）')

  const root = makeTmpRoot('pfs-prune-')
  const runtimeRoot = join(root, '.runtime')
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(join(runtimeRoot, 'prompt-inject-2026-09-18-pfs-a.json'), '{"stages":{}}\n', 'utf8')
  writeFileSync(join(runtimeRoot, 'prompt-inject-2026-09-18-pfs-b.json'), '{"stages":{}}\n', 'utf8')
  try {
    const r = pruneArchivedChangeRuntime(runtimeRoot, '2026-09-18-pfs-a')
    assertTrue(r.ok === true && r.removed >= 1, `prune 直测：目标账本被删（removed=${r.removed}）`)
    assertTrue(!existsSync(join(runtimeRoot, 'prompt-inject-2026-09-18-pfs-a.json')),
      '归档回收本变更 prompt-inject 账本（不累积孤儿文件）')
    assertTrue(existsSync(join(runtimeRoot, 'prompt-inject-2026-09-18-pfs-b.json')),
      '他变更账本不动（精确文件名归属，禁 glob 连坐）')
  } finally { cleanupRoot(root) }
}

// ── 收尾：采样打印（verify 验收数据点）+ 汇总 ─────────────────────────────────
cleanupRepos()
for (const d of tmpRoots) cleanupRoot(d)
const realSamplesTail = promptLengthSamples.filter(s => s.stage === 'execute')
if (realSamplesTail.length > 0) {
  const full = realSamplesTail.find(s => s.step.endsWith('#full'))
  const digest = realSamplesTail.find(s => s.step.endsWith('#digest'))
  console.log(`\n📊 prompt 长度采样（D-005③ verify 验收「单步中位不反弹」数据点）: execute 全量步=${full ? full.chars : '?'} chars，摘要步=${digest ? digest.chars : '?'} chars，中位=${medianPromptLength(realSamplesTail)}`)
}
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
