/**
 * thin-empty-face-crosscheck.test.mjs — 空冻结面声明面自证（2026-10-13-thin-empty-face-crosscheck）
 *
 * 坑档案：multi-agent-platform docs/sillyspec/thin-done-empty-face-no-declared-crosscheck.md
 * （37c7d146b 实证版）——2026-10-12-fire-ledger-form-strict 跨仓交付撞空面：planEntries 解析、
 * 跨仓防呆告警整段挂在非空 else 分支内，空面一行提示即 patchOk=true 短路，归档件永久缺
 * patch 留档且零告警；design 裸写「仓目录名/路径」前缀形态本可命中告警。
 *
 * 覆盖验收面（与 close-trace-freeze-integrity FR-01 ② 的分工：那边锚「无声明清单的空面
 * 跳过是有意设计」，本文件锚「有声明清单的空面必须自证」）：
 *   FR-01 空面+声明清单未标注条目 → 阻断三处置一次给全（跨仓前缀形态命中）；
 *   FR-02 防呆告警空面也执行 + 嫌疑判定放宽（主仓不存在即点名，不限首段命中）；
 *        非空面告警零回归；
 *   FR-03 --accept-empty-face 签收留痕（flow-state 持久化、重跑免重拦）+ 纯跨仓规范
 *        标注空面不阻断出 advisory；
 *   FR-04 flow start 横幅两态（注册仓非空出跨仓写法行 / 为空零该行）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function git(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim()
}

function readdirSyncSafe(dir) {
  try { return readdirSync(dir) } catch { return [] }
}

/** makeRepo 产出的跨仓仓路径（cwd → libx），供新用例在 flow start 后向跨仓投递交付。 */
const FIXTURE_REPOS = new Map()

/** 建主仓夹具；opts.repos 时注册跨仓 libx（真实 git 仓，主仓根看不到其内容）。 */
function makeRepo(opts = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'tefc-'))
  git(cwd, ['init', '-q', '-b', 'main'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  let yaml = 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n'
  if (opts.repos) {
    const lib = mkdtempSync(join(tmpdir(), 'tefc-lib-'))
    git(lib, ['init', '-q', '-b', 'main'])
    git(lib, ['config', 'user.email', 't@t'])
    git(lib, ['config', 'user.name', 't'])
    mkdirSync(join(lib, 'src', 'routes'), { recursive: true })
    writeFileSync(join(lib, 'base.txt'), 'base\n')
    git(lib, ['add', '.'])
    git(lib, ['commit', '-qm', 'base'])
    FIXTURE_REPOS.set(cwd, lib)
    // deadkey：不可达注册仓（跨仓对账降级形态；只在显式声明 deadkey 条目的用例里出现）
    yaml += `repos:\n  libx: ${lib.replace(/\\/g, '/')}\n  deadkey: C:/nonexistent-deadkey-path-xyz\n`
  }
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), yaml)
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  git(cwd, ['add', '.'])
  git(cwd, ['commit', '-q', '-m', 'base'])
  return cwd
}

function cli(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

/** v2 工件例行动作答（四问/FR 行为句/绑定行）+ 追加 design 声明清单（extraDesign）。 */
function fillDocs(specBase, change, extraDesign = '') {
  const base = join(specBase, 'changes', change)
  const dp = join(base, 'design.md')
  writeFileSync(dp, readFileSync(dp, 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规')
    + (extraDesign ? `\n${extraDesign}\n` : ''))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
}

function tickTasks(specBase, cwd, change) {
  const tasksPath = join(specBase, 'changes', change, 'tasks.md')
  writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/^- \[ \] (task-\d+):/gm, '- [x] $1:'))
  git(cwd, ['add', tasksPath])
  git(cwd, ['commit', '-q', '-m', `chore: tick (task-01)`])
}

function writeReviewFixture(specBase, cwd, change) {
  const head = git(cwd, ['rev-parse', 'HEAD'])
  writeFileSync(join(specBase, 'changes', change, 'review.json'), JSON.stringify({
    schemaVersion: 1, change, reviewer: 'test-fixture', verdict: 'PASS', reviewedAgainst: head,
    findings: [], dimensionNotes: { 乱序: 'n/a', 并发: 'n/a', 切换: 'n/a', 作用域: 'n/a' }, reviewedAt: new Date().toISOString(),
  }, null, 2))
}

const FLIST_TABLE = (rows) => ['## 文件变更清单', '', '| 操作 | 路径 | 说明 |', '|---|---|---|', ...rows.map((r) => `| 修改 | ${r} | 交付 |`)].join('\n')

// ── FR-01：跨仓前缀形态（实证复现）→ 空面阻断三处置一次给全 ──
test('空面+声明清单裸写仓目录前缀 → 阻断：三处置+三种正确写法+命中注册仓点名（实证形态）', () => {
  const cwd = makeRepo({ repos: true })
  const change = '2026-10-13-tefc-prefix'
  const specBase = join(cwd, '.sillyspec')
  try {
    const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '跨仓前缀形态命中注册仓\n成功标准：\n- 空面门阻断并点名', '--autopilot'])
    assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
    fillDocs(specBase, change, FLIST_TABLE(['libx/src/routes/X.js']))
    tickTasks(specBase, cwd, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.notEqual(s2.status, 0, '空面+未标注声明必须阻断')
    const out = `${s2.stdout}\n${s2.stderr}`
    assert.match(out, /冻结面为空.*声明/, '矛盾点名')
    assert.match(out, /libx\/src\/routes\/X\.js（首段命中注册仓 libx）/, '嫌疑条目带注册仓标注')
    assert.match(out, /先提交后重跑/, '处置①主仓提交')
    assert.match(out, /## <注册key> 仓变更/, '处置②三种正确写法（段头）')
    assert.match(out, /cross-repo:<注册key>:/, '处置②三种正确写法（前缀）')
    assert.match(out, /--accept-empty-face/, '处置③显式签收')
    assert.match(out, /中断于子步「patch」/, '断点在 patch')
    assert.ok(existsSync(join(specBase, 'changes', change, 'flow-state.yaml')), 'change 保持 active 未归档')
    assert.equal(readdirSyncSafe(join(specBase, 'changes', 'archive')).filter((d) => d.includes(change)).length, 0, '未归档')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-02①：仓根相对路径盲区 → 放宽判定（主仓不存在即点名，不限首段命中）──
test('空面+仓根相对路径（首段不命中注册仓）→ 仍点名阻断（放宽判定）', () => {
  const cwd = makeRepo({ repos: true })
  const change = '2026-10-13-tefc-blind'
  const specBase = join(cwd, '.sillyspec')
  try {
    cli(cwd, ['flow', 'start', '--change', change, '--input', '盲区形态主仓缺文件点名\n成功标准：\n- 主仓不存在即点名', '--autopilot'])
    fillDocs(specBase, change, FLIST_TABLE(['src/routes/X.js']))
    tickTasks(specBase, cwd, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.notEqual(s2.status, 0, '盲区形态也必须阻断')
    const out = `${s2.stdout}\n${s2.stderr}`
    assert.match(out, /src\/routes\/X\.js（主仓不存在）/, '主仓不存在点名（无注册仓标注）')
    assert.match(out, /中断于子步「patch」/, '断点在 patch')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-02②：非空面防呆告警零回归（旧告警面：alias 命中 + 主仓不存在）──
test('非空面：未标注跨仓声明仍出防呆告警且不阻断（零回归）', () => {
  const cwd = makeRepo({ repos: true })
  const change = '2026-10-13-tefc-nonempty'
  const specBase = join(cwd, '.sillyspec')
  try {
    cli(cwd, ['flow', 'start', '--change', change, '--input', '非空面回归不触发跨仓门\n成功标准：\n- 告警在场收口通过', '--autopilot'])
    writeFileSync(join(cwd, 'work.txt'), 'done\n')
    git(cwd, ['add', 'work.txt'])
    git(cwd, ['commit', '-q', '-m', `work (${change}) (task-01)`])
    fillDocs(specBase, change, FLIST_TABLE(['work.txt', 'libx/src/y.js']))
    tickTasks(specBase, cwd, change)
    writeReviewFixture(specBase, cwd, change) // 豁免面有 1/4 抽查采样——评审件预置，免采样抖动
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `非空面不阻断: ${s2.stdout}\n${s2.stderr}`)
    const out = `${s2.stdout}\n${s2.stderr}`
    assert.match(out, /疑似跨仓声明未按规范标注/, '防呆告警在场')
    assert.match(out, /libx\/src\/y\.js（主仓不存在，首段命中注册仓 libx）/, '嫌疑点名带 key')
    assert.ok(readdirSyncSafe(join(specBase, 'changes', 'archive')).some((d) => d.includes(change)), '归档完成')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-03①：--accept-empty-face 签收留痕持久化，重跑免重拦，归档件带留痕 ──
test('--accept-empty-face：签收放行 + flow-state 持久化 + 无 flag 重跑不再拦', () => {
  const cwd = makeRepo({ repos: true })
  const change = '2026-10-13-tefc-signoff'
  const specBase = join(cwd, '.sillyspec')
  try {
    cli(cwd, ['flow', 'start', '--change', change, '--input', '签收形态放行持久化留痕\n成功标准：\n- 签收留痕免重拦', '--autopilot'])
    fillDocs(specBase, change, FLIST_TABLE(['libx/src/routes/X.js']))
    tickTasks(specBase, cwd, change)
    // 首跑无 flag：阻断在 patch
    const s1 = cli(cwd, ['flow', 'done', '--change', change])
    assert.notEqual(s1.status, 0, '首跑阻断')
    // 带 flag：过 patch，断在 review（无 review.json——空面证据不足需代行评审）
    const s2 = cli(cwd, ['flow', 'done', '--change', change, '--accept-empty-face'])
    const out2 = `${s2.stdout}\n${s2.stderr}`
    assert.match(out2, /--accept-empty-face：显式签收/, '签收提示在场')
    assert.match(out2, /中断于子步「review」/, '过了 patch 断在 review')
    // 无 flag 重跑：accept_empty_face 已持久化，patch 不再拦
    const s3 = cli(cwd, ['flow', 'done', '--change', change])
    const out3 = `${s3.stdout}\n${s3.stderr}`
    assert.match(out3, /中断于子步「review」/, '重跑仍过 patch（免重拦）')
    assert.doesNotMatch(out3, /冻结面为空但.*声明清单.*阻断/, '不再空面阻断')
    // 补评审件 → 完整归档；归档 flow-state 带签收留痕
    writeReviewFixture(specBase, cwd, change)
    const s4 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s4.status, 0, `归档完成: ${s4.stdout}\n${s4.stderr}`)
    const archived = readdirSyncSafe(join(specBase, 'changes', 'archive')).find((d) => d.includes(change))
    assert.ok(archived, '归档目录在')
    const stText = readFileSync(join(specBase, 'changes', 'archive', archived, 'flow-state.yaml'), 'utf8')
    assert.match(stText, /accept_empty_face/, '签收留痕随归档件')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-03②：清单全部规范标注（### libx 子段）的纯跨仓空面 → advisory 不阻断 ──
test('纯跨仓规范标注空面：不阻断，出空面跨仓冻结缺口 advisory', () => {
  const cwd = makeRepo({ repos: true })
  const change = '2026-10-13-tefc-marked'
  const specBase = join(cwd, '.sillyspec')
  try {
    cli(cwd, ['flow', 'start', '--change', change, '--input', '纯跨仓规范标注不阻断面\n成功标准：\n- advisory 不阻断', '--autopilot'])
    fillDocs(specBase, change, ['## 文件变更清单', '', '### libx', '', '- src/routes/X.js'].join('\n'))
    tickTasks(specBase, cwd, change)
    writeReviewFixture(specBase, cwd, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `纯跨仓标注不阻断: ${s2.stdout}\n${s2.stderr}`)
    assert.match(`${s2.stdout}\n${s2.stderr}`, /跨仓规范标注.*冻结面为空|冻结面为空.*跨仓/, '空面跨仓缺口 advisory')
    assert.ok(readdirSyncSafe(join(specBase, 'changes', 'archive')).some((d) => d.includes(change)), '归档完成')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── h2 段头形态（2026-10-13-h2-repo-heading-parse FR-05）：生态标准写法在 thin 收口
//    侧同样被识别——空面走纯跨仓标注路径而非被节截断静默丢条目/误触未标注阻断 ──
test('空面 + 清单用「## libx 仓变更」h2 段头 → 识别为规范标注，advisory 不阻断', () => {
  const cwd = makeRepo({ repos: true })
  const change = '2026-10-13-tefc-h2hdr'
  const specBase = join(cwd, '.sillyspec')
  try {
    cli(cwd, ['flow', 'start', '--change', change, '--input', 'h2 段头形态识别为规范标注\n成功标准：\n- 段头识别不阻断', '--autopilot'])
    fillDocs(specBase, change, ['## 文件变更清单', '', '## libx 仓变更', '', '| 操作 | 路径 | 说明 |', '|---|---|---|', '| 修改 | src/routes/X.js | 交付 |'].join('\n'))
    tickTasks(specBase, cwd, change)
    writeReviewFixture(specBase, cwd, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `h2 段头不阻断: ${s2.stdout}\n${s2.stderr}`)
    const out = `${s2.stdout}\n${s2.stderr}`
    assert.match(out, /跨仓规范标注.*冻结面为空|冻结面为空.*跨仓/, '空面跨仓缺口 advisory（段头被识别）')
    assert.doesNotMatch(out, /冻结面为空但 design 声明清单有/, '不误触未标注阻断')
    assert.ok(readdirSyncSafe(join(specBase, 'changes', 'archive')).some((d) => d.includes(change)), '归档完成')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── 2026-10-19-thin-empty-face-cross-repo-freeze：空面 + 规范跨仓标注 + 跨仓真实交付
//    → JSON-only 冻结（change-patch.json 的 repos[].patch，无 change.patch），回执如实报
//    「跨仓 N 仓」，不再写「无冻结件」 ──
test('空面 + 跨仓规范标注且跨仓有交付 → JSON-only 跨仓冻结', () => {
  const cwd = makeRepo({ repos: true })
  const lib = FIXTURE_REPOS.get(cwd)
  const change = '2026-10-19-tefc-xrepo-freeze'
  const specBase = join(cwd, '.sillyspec')
  try {
    const s1 = cli(cwd, ['flow', 'start', '--change', change, '--input', '空面跨仓冻结落 JSON 留档\n成功标准：\n- repos 内有 patch 正文', '--autopilot'])
    assert.equal(s1.status, 0, `start: ${s1.stderr}`)
    assert.ok(lib, '跨仓仓路径在场')
    // 跨仓两笔交付：一笔提交（带变更名 token）+ 一笔工作树未提交
    writeFileSync(join(lib, 'impl.txt'), 'impl\n')
    git(lib, ['add', 'impl.txt'])
    git(lib, ['commit', '-qm', `feat: 实现 (${change})`])
    writeFileSync(join(lib, 'fix.txt'), 'fix\n')
    // 工具治理模板（2026-10-19-cross-repo-face-tool-filter）：跨仓面同口径剔除
    mkdirSync(join(lib, '.claude', 'skills', 't'), { recursive: true })
    writeFileSync(join(lib, '.claude', 'skills', 't', 'SKILL.md'), '# template\n')
    git(lib, ['add', '.claude'])
    git(lib, ['commit', '-qm', `chore: 模板 (${change})`])
    fillDocs(specBase, change, ['## 文件变更清单', '', '### libx', '', '- impl.txt', '- fix.txt', '', '### deadkey', '', '- src/dead.js'].join('\n'))
    // 预置旧 change.patch（重冻结到空主仓面的清理路径）：修完仍存在即为回归。
    writeFileSync(join(specBase, 'changes', change, 'change.patch'), 'diff --git a/stale b/stale\n')
    tickTasks(specBase, cwd, change)
    writeReviewFixture(specBase, cwd, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `空面跨仓冻结: ${s2.stdout}\n${s2.stderr}`)
    const arch = join(specBase, 'changes', 'archive', change)
    const metaPath = join(arch, 'change-patch.json')
    assert.ok(existsSync(metaPath), 'change-patch.json 已落盘')
    assert.ok(!existsSync(join(arch, 'change.patch')), 'JSON-only：不落 change.patch')
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    assert.equal(meta.patchStatus, 'ok', '冻结成功状态（非 failed）')
    assert.deepEqual(meta.files, [], '主仓 files 为空')
    const repos = (meta.scopeAudit || {}).repos || []
    assert.equal(repos.length, 2, '健康仓 + 降级仓都原样保留')
    const libRepo = repos.find((r) => r.key === 'libx')
    const deadRepo = repos.find((r) => r.key === 'deadkey')
    assert.ok(libRepo && deadRepo, '两仓条目都在')
    assert.match(libRepo.patch, /impl\.txt/, '提交交付进 patch')
    assert.match(libRepo.patch, /fix\.txt/, '工作树交付进 patch')
    assert.match(libRepo.patchSha256, /^[0-9a-f]{64}$/, '跨仓 patch 正文带 sha256 锚')
    // 工具治理模板不入跨仓面（2026-10-19-cross-repo-face-tool-filter）
    assert.doesNotMatch(libRepo.patch, /\.claude/, '跨仓模板不入 patch 正文')
    const crossRows = (meta.scopeAudit || {}).rows || []
    assert.ok(!crossRows.some((r) => String(r.path).includes('.claude')), '跨仓模板不入对账行')
    assert.equal(deadRepo.degraded, true, '降级仓条目不丢')
    assert.ok(deadRepo.degradedReason, '降级原因随条目留档')
    assert.doesNotMatch(String(deadRepo.degradedReason), /nonexistent-deadkey/, '降级原因不含本机路径')
    const vr = readFileSync(join(arch, 'verify-result.md'), 'utf8')
    assert.match(vr, /跨仓 1 仓/, '回执报跨仓冻结')
    assert.doesNotMatch(vr, /无冻结件/, '回执不再写无冻结件')
    assert.match(`${s2.stdout}\n${s2.stderr}`, /空面跨仓 patch 留档/, '收口输出点名 JSON 路线')
  } finally {
    const lib2 = FIXTURE_REPOS.get(cwd)
    if (lib2) rmSync(lib2, { recursive: true, force: true })
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── FR-04：flow start 横幅两态 ──
test('flow start 横幅：注册仓非空出跨仓写法行；为空零该行', () => {
  const withRepos = makeRepo({ repos: true })
  const noRepos = makeRepo()
  try {
    const s1 = cli(withRepos, ['flow', 'start', '--change', '2026-10-13-tefc-banner1', '--input', '横幅两态跨仓写法行对齐\n成功标准：\n- 跨仓行在场', '--autopilot'])
    assert.equal(s1.status, 0)
    assert.match(s1.stdout, /跨仓交付/, '跨仓写法行在场')
    assert.match(s1.stdout, /## <注册key> 仓变更/, '段头写法在场')
    assert.match(s1.stdout, /local\.yaml repos/, 'key 来源指明')
    const s2 = cli(noRepos, ['flow', 'start', '--change', '2026-10-13-tefc-banner2', '--input', '横幅两态跨仓写法行对齐\n成功标准：\n- 无跨仓行', '--autopilot'])
    assert.equal(s2.status, 0)
    assert.doesNotMatch(s2.stdout, /跨仓交付/, '无注册仓时零跨仓行')
  } finally {
    rmSync(withRepos, { recursive: true, force: true })
    rmSync(noRepos, { recursive: true, force: true })
  }
})

// ── 2026-10-19-undeclared-cross-repo-probe：无清单段 + 注册跨仓窗口有交付
//    → advisory 点名仓键/文件数（不阻断）；窗口零改动 → 零输出 ──
test('无清单段 + 注册跨仓有交付 → 窗口探测点名（advisory 不阻断）', () => {
  const cwd = makeRepo({ repos: true })
  const lib = FIXTURE_REPOS.get(cwd)
  const change = '2026-10-19-tefc-probe-hit'
  const specBase = join(cwd, '.sillyspec')
  try {
    assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '未标注跨仓探测点名告警\n成功标准：\n- 点名不阻断', '--autopilot']).status, 0)
    writeFileSync(join(lib, 'impl.txt'), 'impl\n')
    git(lib, ['add', 'impl.txt'])
    git(lib, ['commit', '-qm', `feat: 实现 (${change})`])
    fillDocs(specBase, change) // 刻意不写文件变更清单
    tickTasks(specBase, cwd, change)
    writeReviewFixture(specBase, cwd, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `探测不阻断: ${s2.stdout}\n${s2.stderr}`)
    const out = `${s2.stdout}\n${s2.stderr}`
    assert.match(out, /注册跨仓窗口内有交付改动/, '探测命中')
    assert.match(out, /libx（1 文件）/, '点名仓键与文件数')
    assert.match(out, /正确写法三选一/, '给规范标注指引')
  } finally {
    const lib2 = FIXTURE_REPOS.get(cwd)
    if (lib2) rmSync(lib2, { recursive: true, force: true })
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('无清单段 + 注册跨仓零改动 → 探测零输出', () => {
  const cwd = makeRepo({ repos: true })
  const change = '2026-10-19-tefc-probe-quiet'
  const specBase = join(cwd, '.sillyspec')
  try {
    assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '零改动探测保持零输出\n成功标准：\n- 无告警', '--autopilot']).status, 0)
    fillDocs(specBase, change)
    tickTasks(specBase, cwd, change)
    writeReviewFixture(specBase, cwd, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `零改动不阻断: ${s2.stdout}\n${s2.stderr}`)
    assert.doesNotMatch(`${s2.stdout}\n${s2.stderr}`, /注册跨仓窗口内有交付改动/, '零改动零输出')
  } finally {
    const lib2 = FIXTURE_REPOS.get(cwd)
    if (lib2) rmSync(lib2, { recursive: true, force: true })
    rmSync(cwd, { recursive: true, force: true })
  }
})

// ── 2026-10-19-freeze-filter-tool-scaffold：工具治理模板不入冻结面 ──
test('e2e：.claude/ 与 CLAUDE.md 剔除，正常源码保留', () => {
  const cwd = makeRepo()
  const change = '2026-10-19-tefc-tool-filter'
  const specBase = join(cwd, '.sillyspec')
  try {
    assert.equal(cli(cwd, ['flow', 'start', '--change', change, '--input', '工具治理模板不入冻结面\n成功标准：\n- 模板剔除源码保留', '--autopilot']).status, 0)
    mkdirSync(join(cwd, 'src'), { recursive: true })
    mkdirSync(join(cwd, '.claude', 'skills', 'x'), { recursive: true })
    writeFileSync(join(cwd, '.claude', 'skills', 'x', 'SKILL.md'), '# template\n')
    writeFileSync(join(cwd, 'CLAUDE.md'), '# instr\n')
    writeFileSync(join(cwd, 'src', 'ok.js'), 'ok\n')
    git(cwd, ['add', '.claude', 'CLAUDE.md', 'src', 'base.txt'])
    git(cwd, ['commit', '-qm', `chore: 模板+实现 (${change})`])
    fillDocs(specBase, change)
    tickTasks(specBase, cwd, change)
    writeReviewFixture(specBase, cwd, change)
    const s2 = cli(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `tool-filter: ${s2.stdout}\n${s2.stderr}`)
    const arch = join(specBase, 'changes', 'archive', change)
    const meta = JSON.parse(readFileSync(join(arch, 'change-patch.json'), 'utf8'))
    assert.deepEqual(meta.files, ['src/ok.js'], '只有源码入冻结面')
    const patchText = readFileSync(join(arch, 'change.patch'), 'utf8')
    assert.match(patchText, /src\/ok\.js/, '源码在 patch 内')
    assert.doesNotMatch(patchText, /\.claude|CLAUDE\.md/, '模板不入 patch')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})
