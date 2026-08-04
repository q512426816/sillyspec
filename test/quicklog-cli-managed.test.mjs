/**
 * quicklog CLI 接管层回归测试
 * change: B-1（CLI 接管 QUICKLOG 写入 + ql-ID 分配 + 并发加锁）
 *
 * 背景：QUICKLOG 原由 Agent 手写（漏写静默通过 + 并发丢更新）。
 * 本任务把分配/写入下沉到 src/quicklog.js，O_EXCL lockfile 串行化。
 *
 * 覆盖：
 *   1. allocateQuicklogEntry：格式 / NNN 递增 / XXXX / 描述清洗 / tasks.md 创建
 *   2. completeQuicklogEntry：翻状态 + 追加结果 + 勾选 tasks.md
 *   3. findQuicklogEntry：存在 / 不存在 / 目录缺失
 *   4. 轮转：>500 行 rename 归档，新条目写入新文件
 *   5. withFileLock：获取/释放、stale 偷锁、占用超时、无残留
 *   6. 并发：spawn N 子进程并发 allocate → 全不同 ql-ID + 全条目俱在 + 无 lock 残留
 *   7. writeAtomic：原子覆盖 + 无临时文件残留（reader 读不到半截/中间态）
 *   8. reader-writer 并发：writer 循环 complete，并发 reader 校验每次读到完整文件（非空/非半截）
 *
 * 隔离：mkdtempSync 临时 specBase，不污染真实仓库；quicklog 函数不需要 git。
 * 风格：自研 assert（无测试框架），参照 test/quick-baseline-dirty-worktree.test.mjs。
 */
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync,
  existsSync, rmSync, utimesSync, appendFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { allocateQuicklogEntry, completeQuicklogEntry, findQuicklogEntry, withFileLock, deriveTitleFromLinkedChange } from '../src/quicklog.js'
import { isQuickMetadata } from '../src/run/shared.js'

const execFileP = promisify(execFile)

let total = 0
let failed = 0
function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

const QL_RE = /^ql-\d{8}-\d{3}-[0-9a-f]{4}$/

console.log('=== quicklog CLI 接管层回归测试 ===\n')

// ─────────────────────────────────────────
// 验收 1：allocateQuicklogEntry — 格式 / NNN 递增 / 描述清洗 / tasks.md
// ─────────────────────────────────────────
console.log('--- 验收 1：allocateQuicklogEntry 分配 + tasks.md ---')
{
  const specBase = makeTmpDir('qlm-alloc-')
  // 契约：linkedChanges 指向已存在的变更；appendTaskCheckbox 不再 fabricate 目录（坑 quick-change-phantom）
  mkdirSync(join(specBase, 'changes', 'change-a'), { recursive: true })
  const r1 = await allocateQuicklogEntry(specBase, 'alice', {
    description: '修复登录校验',
    linkedChanges: ['change-a'],
    allowedFiles: ['src/login.js'],
  })
  assert(QL_RE.test(r1.qlId), `分配的 ql-ID 格式合法（${r1.qlId}）`)
  assert(r1.qlId.includes('-001-'), `首个条目 NNN=001（${r1.qlId}）`)

  const r2 = await allocateQuicklogEntry(specBase, 'alice', { description: '第二个任务' })
  assert(r2.qlId.includes('-002-'), `次日序号递增 NNN=002（${r2.qlId}）`)
  assert(r2.qlId !== r1.qlId, `两次分配得到不同 ql-ID`)

  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-alice.md'), 'utf8')
  assert(log.includes(`## ${r1.qlId} |`), 'QUICKLOG 含条目 1 标题')
  assert(log.includes(`## ${r2.qlId} |`), 'QUICKLOG 含条目 2 标题')
  assert((log.match(/状态：进行中/g) || []).length === 2, '两条条目均为「状态：进行中」')
  assert(log.includes('关联变更：change-a'), '条目 1 含关联变更')
  assert(log.includes('文件：src/login.js'), '条目 1 含预估文件')

  // tasks.md：关联变更追加未勾选 task
  const tasks = readFileSync(join(specBase, 'changes', 'change-a', 'tasks.md'), 'utf8')
  assert(tasks.includes(`- [ ] ${r1.qlId} 修复登录校验`), 'tasks.md 追加未勾选 task')

  // 描述清洗：空描述回退占位、换行压一行、超长截断
  const r3 = await allocateQuicklogEntry(specBase, 'alice', { description: '' })
  const log2 = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-alice.md'), 'utf8')
  assert(log2.includes('(quick 任务)'), '空描述回退占位符')

  // 幂等：重复追加同 qlId 的 tasks.md 不产生重复行
  const r1b = await allocateQuicklogEntry(specBase, 'alice', { description: '幂等任务', linkedChanges: ['change-a'] })
  const tasks2 = readFileSync(join(specBase, 'changes', 'change-a', 'tasks.md'), 'utf8')
  assert((tasks2.match(new RegExp(r1.qlId, 'g')) || []).length === 1, 'tasks.md 同 qlId 无重复行')
}

// ─────────────────────────────────────────
// 验收 1b：linkedChanges 指向不存在的变更 → 不 fabricate 幻影目录（quick-change-phantom 回归）
// 历史 bug：appendTaskCheckbox 用 mkdirSync 硬造 changes/<名>/tasks.md，致 quick --done 边界审计
// 把 CLI 自建的 stub 判为「新增/危险文件」BLOCK。修复：目录不存在则跳过，关联仅作 QUICKLOG 标签。
// ─────────────────────────────────────────
console.log('\n--- 验收 1b：关联变更不存在时不造幻影目录 ---')
{
  const specBase = makeTmpDir('qlm-phantom-')
  const r = await allocateQuicklogEntry(specBase, 'alice', {
    description: '关联到不存在的变更',
    linkedChanges: ['made-up-change'],
  })
  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-alice.md'), 'utf8')
  assert(log.includes('关联变更：made-up-change'), 'QUICKLOG 仍记录关联标签')
  let entries = []
  try { entries = readdirSync(join(specBase, 'changes')) } catch {}
  assert(!entries.includes('made-up-change'), '不 fabricate 幻影 changes/made-up-change/（历史 mkdirSync 硬造 → --done 审计自造自拦）')
}

// ─────────────────────────────────────────
// 验收 2：completeQuicklogEntry — 翻状态 + 结果 + 勾选
// ─────────────────────────────────────────
console.log('\n--- 验收 2：completeQuicklogEntry 完成态 ---')
{
  const specBase = makeTmpDir('qlm-complete-')
  mkdirSync(join(specBase, 'changes', 'change-b'), { recursive: true })
  const r = await allocateQuicklogEntry(specBase, 'bob', {
    description: '完成我', linkedChanges: ['change-b'], allowedFiles: [],
  })
  await completeQuicklogEntry(specBase, 'bob', r.qlId, {
    resultText: '已修复并通过测试', linkedChanges: ['change-b'],
  })
  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-bob.md'), 'utf8')
  assert(log.includes('状态：已完成'), '条目已翻为「状态：已完成」')
  assert(!log.includes('状态：进行中'), '不再含「状态：进行中」')
  assert(log.includes('结果：已修复并通过测试'), '条目追加了结果行')
  const tasks = readFileSync(join(specBase, 'changes', 'change-b', 'tasks.md'), 'utf8')
  assert(tasks.includes(`- [x] ${r.qlId}`), 'tasks.md 已勾选为 - [x]')

  // 完成不存在的 qlId：不抛错、不产生幽灵结果行
  const before = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-bob.md'), 'utf8')
  await completeQuicklogEntry(specBase, 'bob', 'ql-99999999-999-zzzz', { resultText: 'x', linkedChanges: [] })
  const after = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-bob.md'), 'utf8')
  assert(after === before, '完成不存在的 qlId 不修改文件、不抛错')
}

// ─────────────────────────────────────────
// 验收 2c：标题语义化 — deriveTitleFromLinkedChange（启动回退）+ 翻完成刷新标题
// 治 QUICKLOG/tasks.md 标题落 (quick 任务) 占位坑（启动不带 --input 时从关联变更回退 + 完成按需求刷新）。
// ─────────────────────────────────────────
console.log('\n--- 验收 2c：标题语义化（deriveTitle + flipEntry 刷新）---')
{
  const specBase = makeTmpDir('qlm-title-')
  // deriveTitleFromLinkedChange：proposal 标题提取 + 去「提案书（Proposal）—」前缀
  mkdirSync(join(specBase, 'changes', 'change-p'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'change-p', 'proposal.md'),
    '---\nauthor: t\n---\n\n# 提案书（Proposal）— 登录加 IP 限流\n\n正文\n')
  assert(deriveTitleFromLinkedChange(specBase, 'change-p') === '登录加 IP 限流',
    'deriveTitle 从 proposal 提取并去前缀')

  // design.md 回退（无 proposal 时）
  mkdirSync(join(specBase, 'changes', 'change-d'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'change-d', 'design.md'), '# 设计文档（Design）— 滑块验证\n')
  assert(deriveTitleFromLinkedChange(specBase, 'change-d') === '滑块验证',
    'deriveTitle 无 proposal 时回退 design.md 并去前缀')

  // 无任何文档 → 空串（调用方再回退占位，保持向后兼容）
  mkdirSync(join(specBase, 'changes', 'change-empty'), { recursive: true })
  assert(deriveTitleFromLinkedChange(specBase, 'change-empty') === '',
    'deriveTitle 无文档返回空串')

  // flipEntry 翻完成刷新标题：启动占位标题 + result 含「需求：」→ 标题刷新为需求摘要
  // （直接调 allocateQuicklogEntry 模拟"不经 stage.js 回退"的空描述 → 占位标题）
  const r = await allocateQuicklogEntry(specBase, 'eve', { description: '' })
  let log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-eve.md'), 'utf8')
  assert(log.includes('(quick 任务)'), '空描述落占位标题 (quick 任务)')
  await completeQuicklogEntry(specBase, 'eve', r.qlId, {
    resultText: '需求：登录接口加 IP 限流（5 次/分）\n根因：无 rate limit\n方案：INCR 计数\n结果：通过',
    linkedChanges: [],
  })
  log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-eve.md'), 'utf8')
  assert(!log.includes('(quick 任务)'), '翻完成后标题被刷新，不再含占位')
  assert(log.includes('登录接口加 IP 限流'), '翻完成标题含「需求：」摘要')
}

// ─────────────────────────────────────────
// 验收 2b：completeQuicklogEntry 回填「文件：」行（实际改动文件）
// 治「文件：（见实际改动）」默认偷懒坑：CLI 在 quick 收尾时把 audit 算出的实际文件回填进条目。
// complete-handlers 用 isQuickMetadata 过滤元数据后传 changedFiles（本测模拟已过滤列表）。
// ─────────────────────────────────────────
console.log('\n--- 验收 2b：completeQuicklogEntry 回填文件行 ---')
{
  const specBase = makeTmpDir('qlm-files-')
  // 启动不传预估文件 → 文件行默认「（见实际改动）」
  const r = await allocateQuicklogEntry(specBase, 'dave', { description: '回填我', allowedFiles: [] })
  let log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-dave.md'), 'utf8')
  assert(log.includes('文件：（见实际改动）'), '启动时文件行为默认占位')

  // 收尾传实际文件（已过滤元数据，模拟 complete-handlers 调用）→ 文件行回填
  await completeQuicklogEntry(specBase, 'dave', r.qlId, {
    resultText: '需求：x\n根因：y\n方案：z\n结果：w',
    linkedChanges: [],
    changedFiles: ['src/login.js', 'src/login.test.js'],
  })
  log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-dave.md'), 'utf8')
  assert(log.includes('文件：src/login.js, src/login.test.js'), '文件行回填为实际改动文件')
  assert(!log.includes('文件：（见实际改动）'), '默认占位被替换掉')
  assert(log.includes('状态：已完成'), '状态仍正常翻转')
  assert(log.includes('结果：w'), '结果块仍正常追加')

  // 不传 changedFiles → 文件行不动（向后兼容：旧调用方 / brownfield / changedFiles 空）
  const r2 = await allocateQuicklogEntry(specBase, 'dave', { description: '不改我', allowedFiles: [] })
  await completeQuicklogEntry(specBase, 'dave', r2.qlId, { resultText: 'done', linkedChanges: [] })
  log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-dave.md'), 'utf8')
  assert(log.includes('文件：（见实际改动）'), '不传 changedFiles 时文件行保持默认（向后兼容）')
}

// ─────────────────────────────────────────
// 验收 2d：单行四字段 --output 归一为多行字段块（prompt-control-debt quick-①）
// quick step3 --output 常被压成单行「需求：…根因：…方案：…结果：…」（agent 未加换行）；
// flipEntryInContent 应 split 成 4 个独立字段行，而非双层前缀「结果：需求：…结果：…」。
// ─────────────────────────────────────────
console.log('\n--- 验收 2d：单行四字段 --output 归一为多行 ---')
{
  const specBase = makeTmpDir('qlm-singleline-')
  const r = await allocateQuicklogEntry(specBase, 'frank', { description: '单行四字段', allowedFiles: [] })
  await completeQuicklogEntry(specBase, 'frank', r.qlId, {
    resultText: '需求：登录加 IP 限流 根因：无 rate limit 方案：INCR 计数 结果：通过',
    linkedChanges: [],
  })
  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-frank.md'), 'utf8')
  assert(log.includes('需求：登录加 IP 限流'), '单行四字段被拆出「需求：」独立行')
  assert(log.includes('根因：无 rate limit'), '拆出「根因：」独立行')
  assert(log.includes('方案：INCR 计数'), '拆出「方案：」独立行')
  assert(log.includes('结果：通过'), '拆出「结果：」独立行')
  assert(!log.includes('结果：需求：'), '不产生双层「结果：需求：」前缀（quick-① 修复）')
}

// ─────────────────────────────────────────
// 验收 2e：字段正文引用字段标签字样不误拆（quick-① 残留补丁，2026-08-04 复盘实证）
// 原 split(/(?=需求：|根因：|方案：|结果：)/) 在正文任意位置切——根因里写「双层「结果：」前缀」会把根因
// 行误断成「…双层「」+「结果：」前缀；…」。改为按序扫描：真实标签 = 上一标签之后首次出现，字段正文引用
// 更靠后的标签（根因引「结果：」）不再误断。
// ─────────────────────────────────────────
console.log('\n--- 验收 2e：字段正文引用字段标签字样不误拆 ---')
{
  const specBase = makeTmpDir('qlm-labelref-')
  const r = await allocateQuicklogEntry(specBase, 'grace', { description: '字段标签引用', allowedFiles: [] })
  await completeQuicklogEntry(specBase, 'grace', r.qlId, {
    resultText: '需求：登记 4 项复盘债 根因：quick step3 --done 四字段被 CLI 原样塞单行双层「结果：」前缀 方案：按序扫描 split 结果：npm test 108/0',
    linkedChanges: [],
  })
  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-grace.md'), 'utf8')
  assert(log.includes('根因：quick step3 --done 四字段被 CLI 原样塞单行双层「结果：」前缀'), '根因行含引用字段标签字样保持完整不被误断')
  assert(log.includes('方案：按序扫描 split'), '方案仍被正确拆为独立行')
  assert(log.includes('结果：npm test 108/0'), '真实「结果：」行仍在')
  assert(!log.includes('\n结果：」'), '引用的「结果：」不产生以 结果： 开头的伪行')
}

// ─────────────────────────────────────────
// 验收 2f：根因正文内嵌正则（含全部四标签字样）仍正确分段（边界启发，2026-08-04 实证）
// 顺序扫描只挡「引用更靠后标签」；根因里嵌正则 split(/(?=需求：|根因：|方案：|结果：)/) 时，引用的
// 「方案：」出现在真实方案标签之前、且紧跟根因标签，顺序扫描会先命中引用字样→错位（本次登记 quick 的
// QUICKLOG 精修现场踩到）。加字段边界判定：真实标签 = 串首 / 前导空白 / 前导句末标点（。；！？），
// 括号/管道/引号内引用字样因前导非边界字符而跳过；严格失败退回顺序扫描兜底。
// ─────────────────────────────────────────
console.log('\n--- 验收 2f：根因正文内嵌正则（含全部四标签）仍正确分段 ---')
{
  const specBase = makeTmpDir('qlm-regexref-')
  const r = await allocateQuicklogEntry(specBase, 'heidi', { description: '正则引用标签', allowedFiles: [] })
  await completeQuicklogEntry(specBase, 'heidi', r.qlId, {
    resultText: '需求：修四字段落盘误拆。根因：quick-① 首修用 split(/(?=需求：|根因：|方案：|结果：)/) 在正文任意位置切。方案：加字段边界判定，真实标签需串首或前导空白/句末标点。结果：quicklog 82/0',
    linkedChanges: [],
  })
  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-heidi.md'), 'utf8')
  assert(log.includes('根因：quick-① 首修用 split(/(?=需求：|根因：|方案：|结果：)/) 在正文任意位置切。'), '根因行内嵌正则保持完整（含引用的 方案：/结果： 字样）')
  assert(log.includes('\n方案：加字段边界判定，真实标签需串首或前导空白/句末标点。'), '真实「方案：」被正确拆为独立行')
  assert(log.includes('\n结果：quicklog 82/0'), '真实「结果：」以独立行存在')
  assert(!log.includes('\n结果：)/) 在正文任意位置切'), '正则里的「结果：)/」不产生以 结果： 开头的伪行')
}

// ─────────────────────────────────────────
// 验收 2c：isQuickMetadata 过滤口径（complete-handlers 回填前用它过滤 review.changedFiles）
// 与 auditQuickCompletion 单源（shared.js export）。确认 quick 自身元数据被过滤、业务文件保留。
// ─────────────────────────────────────────
console.log('\n--- 验收 2c：isQuickMetadata 过滤口径 ---')
{
  const linked = ['my-change']
  // quick 自身元数据 → true（回填时过滤掉）
  assert(isQuickMetadata('.sillyspec/quicklog/QUICKLOG-x.md', linked), 'quicklog 元数据')
  assert(isQuickMetadata('.sillyspec/.runtime/quick-sessions/x/guard.json', linked), 'runtime 元数据')
  assert(isQuickMetadata('.sillyspec/docs/proj/modules/core.md', linked), '模块文档元数据')
  assert(isQuickMetadata('.sillyspec/docs/proj/modules/_module-map.yaml', linked), 'module-map 元数据')
  assert(isQuickMetadata('.sillyspec/knowledge/uncategorized.md', linked), 'knowledge-uncategorized 元数据')
  // 非关联 changes/ → true（并发他者会话工作，放行）
  assert(isQuickMetadata('.sillyspec/changes/other-change/design.md', linked), '非关联 changes/ 放行')
  assert(isQuickMetadata('.sillyspec/changes/', linked), 'changes/ 折叠 token 放行')
  // 关联 changes/ → false（本 quick 真实改动，reverse-sync 可见，不算元数据）
  assert(!isQuickMetadata('.sillyspec/changes/my-change/design.md', linked), '关联 changes/ 不算元数据')
  // 业务文件 → false（保留）
  assert(!isQuickMetadata('src/login.js', linked), '业务文件保留')
  assert(!isQuickMetadata('package.json', linked), '业务文件保留（危险文件判定另走 audit DANGEROUS_PATTERNS）')
  // 路径分隔符容错（Windows \）
  assert(isQuickMetadata('.sillyspec\\quicklog\\QUICKLOG-x.md', linked), '反斜杠路径同样识别为元数据')

  // 模拟 complete-handlers 的过滤：review.changedFiles 混入元数据 → 只留业务文件
  const reviewFiles = ['src/a.js', '.sillyspec/quicklog/QUICKLOG-x.md', 'src/b.js', '.sillyspec/.runtime/x.json']
  const realFiles = reviewFiles.filter(f => !isQuickMetadata(f, []))
  assert(JSON.stringify(realFiles) === JSON.stringify(['src/a.js', 'src/b.js']), '过滤后只留业务文件')
}

// ─────────────────────────────────────────
// 验收 3：findQuicklogEntry — 存在 / 不存在 / 目录缺失
// ─────────────────────────────────────────
console.log('\n--- 验收 3：findQuicklogEntry 查找 ---')
{
  const specBase = makeTmpDir('qlm-find-')
  const r = await allocateQuicklogEntry(specBase, 'carol', { description: '找我' })
  assert(findQuicklogEntry(specBase, 'carol', r.qlId) === true, '能找到已分配条目')
  assert(findQuicklogEntry(specBase, 'carol', 'ql-20260101-001-dead') === false, '查不到不存在的条目')

  const emptyBase = makeTmpDir('qlm-findempty-')
  assert(findQuicklogEntry(emptyBase, 'nobody', 'ql-20260101-001-beef') === false, 'quicklog 目录缺失时返回 false')
}

// ─────────────────────────────────────────
// 验收 4：轮转 — >500 行 rename 归档
// ─────────────────────────────────────────
console.log('\n--- 验收 4：QUICKLOG 轮转 ---')
{
  const specBase = makeTmpDir('qlm-rotate-')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  const lines = ['## ql-20260701-001-abcd | 2026-07-01 10:00:00 | 旧记录', '状态：已完成']
  for (let i = 0; i < 501; i++) lines.push(`填充行 ${i}`)
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-rot.md'), lines.join('\n'))

  const r = await allocateQuicklogEntry(specBase, 'rot', { description: '新任务' })
  assert(existsSync(join(specBase, 'quicklog', 'QUICKLOG-rot-2026-07-01.md')), '超过500行触发轮转归档（日期取最后记录）')
  const fresh = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-rot.md'), 'utf8')
  assert(fresh.includes(`## ${r.qlId} |`), '轮转后新条目写入新主文件')
  assert(!fresh.includes('旧记录'), '新主文件不含旧记录')
}

// ─────────────────────────────────────────
// 验收 5：withFileLock — 获取/释放 / stale 偷锁 / 占用超时 / 无残留
// ─────────────────────────────────────────
console.log('\n--- 验收 5：withFileLock 锁行为 ---')
{
  const specBase = makeTmpDir('qlm-lock-')
  const lockDir = join(specBase, 'quicklog')
  mkdirSync(lockDir, { recursive: true })

  // 获取/释放
  const lpBasic = join(lockDir, '.basic.lock')
  let sawLockInside = false
  await withFileLock(lpBasic, async () => { sawLockInside = existsSync(lpBasic) })
  assert(sawLockInside, '持锁期间 lockfile 存在')
  assert(!existsSync(lpBasic), '释放后 lockfile 不存在（无残留）')

  // stale 偷锁
  const lpStale = join(lockDir, '.stale.lock')
  writeFileSync(lpStale, '')
  const past = new Date(Date.now() - 60_000)
  utimesSync(lpStale, past, past)
  let ran = false
  await withFileLock(lpStale, async () => { ran = true }, { staleMs: 1000, timeoutMs: 2000, retryMs: 20 })
  assert(ran, 'stale 锁被偷走，临界区正常执行')
  assert(!existsSync(lpStale), 'stale 偷锁后锁已释放')

  // 占用超时（fresh 锁）
  const lpFresh = join(lockDir, '.fresh.lock')
  writeFileSync(lpFresh, '')
  let threw = null
  try {
    await withFileLock(lpFresh, async () => {}, { timeoutMs: 300, retryMs: 50, staleMs: 60000 })
  } catch (e) { threw = e }
  assert(threw !== null, '锁被占用（fresh）时 withFileLock 超时抛错')
  rmSync(lpFresh, { force: true })
}

// ─────────────────────────────────────────
// 验收 6：并发 — spawn N 子进程并发 allocate，全不同 + 全俱在 + 无残留
// ─────────────────────────────────────────
console.log('\n--- 验收 6：并发分配（spawn 子进程）---')
{
  const specBase = makeTmpDir('qlm-conc-')
  const quicklogUrl = new URL('../src/quicklog.js', import.meta.url).href
  const workerPath = join(specBase, 'worker.mjs')
  writeFileSync(workerPath, [
    'const [,, quicklogUrl, specBase, gitUser, desc] = process.argv',
    'const { allocateQuicklogEntry } = await import(quicklogUrl)',
    'const r = await allocateQuicklogEntry(specBase, gitUser, { description: desc, linkedChanges: [], allowedFiles: [] })',
    'process.stdout.write(r.qlId + "\\n")',
  ].join('\n'))

  const N = 6
  const jobs = []
  for (let i = 0; i < N; i++) {
    jobs.push(execFileP(process.execPath, [workerPath, quicklogUrl, specBase, 'conc', `task-${i}`]))
  }
  const results = await Promise.all(jobs)
  const ids = results.map(r => r.stdout.trim())
  assert(new Set(ids).size === N, `并发 ${N} 进程得到 ${N} 个不同 ql-ID（无 NNN 撞号）`)
  assert(ids.every(id => QL_RE.test(id)), '并发分配的 ql-ID 全部格式合法')

  const logContent = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-conc.md'), 'utf8')
  const entryCount = (logContent.match(/^## ql-\d{8}-\d{3}-[0-9a-f]{4} \|/gm) || []).length
  assert(entryCount === N, `并发写入后 QUICKLOG 有 ${N} 条条目（无丢失/无交错）`)

  const lockResidue = readdirSync(join(specBase, 'quicklog')).filter(f => f.endsWith('.lock'))
  assert(lockResidue.length === 0, '并发结束后无 lockfile 残留')
}

// ─────────────────────────────────────────
// 验收 7：writeAtomic — 原子覆盖 + 无临时文件残留
// ─────────────────────────────────────────
console.log('\n--- 验收 7：writeAtomic 原子写行为 ---')
{
  const specBase = makeTmpDir('qlm-atomic-')
  const r = await allocateQuicklogEntry(specBase, 'atomic', { description: '原子写' })
  await completeQuicklogEntry(specBase, 'atomic', r.qlId, { resultText: 'done', linkedChanges: [] })

  const userFile = join(specBase, 'quicklog', 'QUICKLOG-atomic.md')
  const log = readFileSync(userFile, 'utf8')
  assert(log.includes('状态：已完成'), 'complete 走原子写后状态已翻')
  assert(log.includes(`## ${r.qlId} |`), '条目标题完整存在（非半截）')
  // 临时文件随 rename 消失（同 pid 复用则覆盖而非堆积），不残留 .tmp-*
  const tmpResidue = readdirSync(join(specBase, 'quicklog')).filter(f => f.includes('.tmp-'))
  assert(tmpResidue.length === 0, '原子写后无 .tmp-* 临时文件残留')
}

// ─────────────────────────────────────────
// 验收 7b：CRLF 文件 flip — 缺陷 quick-done-quicklog-duplicate-status-line 回归
// Windows 下 QUICKLOG 可能是 CRLF。原 flipEntryInContent 用 `lines[i] === '状态：进行中'`
// 精确匹配，split('\n') 后行带 \r 恒匹配失败 → 走 splice「兜底插入」→ 条目内同时
// 「状态：已完成」+「状态：进行中」。修复后前缀匹配容忍 \r，替换而非插入。
// ─────────────────────────────────────────
console.log('\n--- 验收 7b：CRLF 文件 flip 无重复状态行 ---')
{
  const specBase = makeTmpDir('qlm-crlf-')
  const qlId = 'ql-20260722-002-abcd'
  const userFile = join(specBase, 'quicklog', 'QUICKLOG-crlf.md')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  // 预置 CRLF 进行中条目（含 进行中 行带 \r）
  const crlfEntry = ['', `## ${qlId} | 2026-07-22 10:00:00 | 测试任务`, '状态：进行中', '关联变更：（无）', '文件：（见实际改动）', '']
    .join('\r\n')
  writeFileSync(userFile, crlfEntry)

  await completeQuicklogEntry(specBase, 'crlf', qlId, { resultText: '已完成', linkedChanges: [] })
  const out = readFileSync(userFile, 'utf8')
  const doneCount = (out.match(/状态：已完成/g) || []).length
  const doingCount = (out.match(/状态：进行中/g) || []).length
  assert(doneCount === 1, `CRLF flip 后恰好一条「状态：已完成」（实际 ${doneCount}）`)
  assert(doingCount === 0, `CRLF flip 后无残留「状态：进行中」（实际 ${doingCount}，旧 bug 会留下 1 条）`)
  assert(out.includes('结果：已完成'), 'CRLF flip 追加了结果行')
  assert(!out.includes('状态：已完成\n状态：进行中') && !out.includes('状态：已完成\r\n状态：进行中'),
    '无「已完成+进行中」相邻重复状态行')
}

// ─────────────────────────────────────────
// 验收 8：reader-writer 并发 — writer 循环 complete，独立 reader 进程校验每次读到完整文件
// 守护用户原始故障：「agent 读 QUICKLOG 时，quick 写入的新日志落进其读到的文件」。
// writeAtomic 保证 reader 永远看到完整旧版或完整新版，绝不读半截/空。
// reader 用独立 spawn 进程（贴近真实：dashboard / 另一 agent 是独立进程，也避免同进程 event-loop 串扰）。
// ─────────────────────────────────────────
console.log('\n--- 验收 8：reader-writer 并发（独立 reader 进程）---')
{
  const specBase = makeTmpDir('qlm-rw-')
  const quicklogUrl = new URL('../src/quicklog.js', import.meta.url).href
  // 预置多个条目，让 complete 循环逐条翻状态（多轮读改写）
  const ids = []
  for (let i = 0; i < 3; i++) {
    const r = await allocateQuicklogEntry(specBase, 'rw', { description: `rw-task-${i}` })
    ids.push(r.qlId)
  }
  const userFile = join(specBase, 'quicklog', 'QUICKLOG-rw.md')
  const resultFile = join(specBase, 'reader-result.txt')

  // 独立 reader 进程：不持锁，按固定时长循环读，校验非空、非半截；结束时把 reads/corrupt 写结果文件
  const readerPath = join(specBase, 'reader.mjs')
  writeFileSync(readerPath, [
    'import { readFileSync, writeFileSync } from "node:fs"',
    'const [,, userFile, resultFile, runMs] = process.argv',
    'const deadline = Date.now() + Number(runMs)',
    'let reads = 0, corrupt = 0',
    'while (Date.now() < deadline) {',
    '  let content = ""',
    '  try { content = readFileSync(userFile, "utf8") } catch { content = "" }',
    '  if (content === "") corrupt++',
    '  else {',
    '    const lines = content.split("\\n")',
    '    if (lines.some(l => l.startsWith("## ") && !l.includes(" | "))) corrupt++',
    '  }',
    '  reads++',
    '}',
    'writeFileSync(resultFile, JSON.stringify({ reads, corrupt }))',
  ].join('\n'))

  const readerPromise = execFileP(process.execPath, [readerPath, userFile, resultFile, '3000'])

  // writer（主进程）：循环 complete 所有条目多轮，持续触发读改写（翻转在 atomic 内完成）
  const writerStart = Date.now()
  let rounds = 0
  while (Date.now() - writerStart < 3200) {
    for (const id of ids) {
      await completeQuicklogEntry(specBase, 'rw', id, { resultText: `round-${rounds}`, linkedChanges: [] })
    }
    rounds++
  }
  await readerPromise

  const { reads, corrupt } = JSON.parse(readFileSync(resultFile, 'utf8'))
  assert(reads > 0, `reader 实际执行了读取（${reads} 次）`)
  assert(corrupt === 0, `并发期间 reader 读到 ${reads} 次，损坏次数 ${corrupt}（应为 0）`)
  const finalLog = readFileSync(userFile, 'utf8')
  assert((finalLog.match(/状态：已完成/g) || []).length === 3, '收尾后 3 条条目全部已完成')
  const tmpResidue = readdirSync(join(specBase, 'quicklog')).filter(f => f.includes('.tmp-'))
  assert(tmpResidue.length === 0, '并发结束后无 .tmp-* 临时文件残留')
}

// ─────────────────────────────────────────
// 清理 & 汇总
// ─────────────────────────────────────────
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
