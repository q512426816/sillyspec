/**
 * quick step1 语义护栏进场注入测试（change: 2026-09-11-cross-change-decision-guard，
 * task-05，FR-03，D-001@v1 模块四——挂载点 src/run/prompt.js 渲染层）。
 *
 * 与 test/semantic-guard.test.mjs（task-03/06）严格隔离：本文件只测注入分支
 * （outputStep quick step1「理解任务」渲染 + buildQuickSemanticGuardInjection 拼装），
 * 不碰 semantic-guard.js 内部单测面（plan-postcheck 硬约束——同 Wave 并行不共享文件）。
 *
 * TaskCard acceptance 四条 + 候选采集口径：
 *   1. 零命中 → step1 prompt 输出与改动前一致（无空段残留，与开关关闭态字节一致）
 *   2. 命中 → prompt 末尾含决策段 / 交付段（rejected 标注勿复潮）
 *   3. semantic_guard.enabled=false → prompt 与现状一致
 *   4. 知识库读取异常 → prompt 含单行降级说明，流程不中断
 *   5. 候选 = guard.allowedFiles ∪ porcelain 脏文件（反斜杠归一去重）
 *   6. 候选封顶 20（helper 直测）
 *
 * 夹具先例：test/semantic-guard.test.mjs makeRepo/commitFile/writeKnowledge
 * （task-03，同变更同款形态）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { outputStep, buildQuickSemanticGuardInjection } from '../src/run/prompt.js'

/** git 调用：数组参数不经 shell（Windows 路径安全），stdio pipe 吞输出 */
function sh(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function cleanup(d) {
  try { rmSync(d, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }) } catch { /* Windows 句柄延迟，重试后仍失败留给 OS Temp 回收 */ }
}

/** 临时 git 仓：main 分支 + 身份配置 + gitignore .sillyspec/（夹具内 spec 产物不进 git log） */
function makeRepo(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  sh(d, ['init', '-q', '-b', 'main'])
  sh(d, ['config', 'user.email', 't@t.com'])
  sh(d, ['config', 'user.name', 't'])
  writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  return d
}

/** 写文件并提交（自动建父目录） */
function commitFile(d, rel, content, subject) {
  const p = join(d, rel)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, content)
  sh(d, ['add', '--', rel])
  sh(d, ['commit', '-q', '-m', subject])
}

/** knowledge 决策库夹具：INDEX.md Decisions 段路由行 → decisions/eng.md（knowledge-match 解析契约） */
function writeKnowledge(specBase, engMd) {
  mkdirSync(join(specBase, 'knowledge', 'decisions'), { recursive: true })
  writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), [
    '# Knowledge Index',
    '',
    '## Decisions',
    '- 语义护栏|决策 → [决策库](decisions/eng.md)',
    '',
  ].join('\n'))
  writeFileSync(join(specBase, 'knowledge', 'decisions', 'eng.md'), engMd)
}

/** quick 会话 guard.json（readQuickGuardField 同源读取路径：.runtime/quick-sessions/<sid>/） */
function writeGuard(specBase, sid, guard) {
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', sid), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'quick-sessions', sid, 'guard.json'), JSON.stringify(guard))
}

/** 渲染 quick step1「理解任务」并捕获 console 输出（outputStep 全输出走 console，无返回 prompt） */
async function renderQuickStep1(cwd, sid, promptBody = '【任务正文锚点XYZ】理解本任务后动手。') {
  const STEP = { name: '理解任务', prompt: promptBody, requiresWait: false }
  const origLog = console.log, origErr = console.error, origWarn = console.warn
  let buf = ''
  const sink = (...a) => { buf += a.join(' ') + '\n' }
  console.log = sink; console.error = sink; console.warn = sink
  try {
    await outputStep('quick', 0, [STEP], cwd, sid, null, {}, null)
  } finally {
    console.log = origLog; console.error = origErr; console.warn = origWarn
  }
  return buf
}

const SID = 'quick-1a2b3c4d'

// ───────────────────────── acceptance ①②③④ + 采集口径 ─────────────────────────

test('注入：零命中 → 不含护栏段，输出与开关关闭态字节一致（prompt 与现状一致）', async () => {
  const d = makeRepo('sgi-zero-')
  try {
    const specBase = join(d, '.sillyspec')
    // 候选管道真实跑：声明文件有候选，但无知识库 + 提交无标记 → 双零命中
    commitFile(d, 'src/clean.js', 'v1\n', 'init clean')
    writeGuard(specBase, SID, { allowedFiles: ['src/clean.js'] })
    const outZero = await renderQuickStep1(d, SID)
    assert.ok(!outZero.includes('【语义护栏】'), '零命中不出现护栏段（无空段残留）')
    assert.ok(outZero.includes('## Step 1/1'), 'step 渲染正常')
    // 字节一致对照：开关显式关闭后渲染，与零命中输出逐字节相同（无占位符/空段差异）
    writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: npm test\nsemantic_guard:\n  enabled: false\n')
    const outOff = await renderQuickStep1(d, SID)
    assert.equal(outZero, outOff, '零命中输出 == 开关关闭输出（与改动前现状字节一致）')
  } finally { cleanup(d) }
})

test('注入：决策+交付命中 → prompt 末尾追加护栏段（rejected 标注勿复潮）', async () => {
  const d = makeRepo('sgi-hit-')
  try {
    const specBase = join(d, '.sillyspec')
    commitFile(d, 'src/foo.js', 'a1\n', '变更 2026-09-04-other-change：修 A')
    writeKnowledge(specBase, [
      '# 决策知识 — eng',
      '',
      '## D-102@v1 被否掉的方案',
      '状态：rejected',
      '文件：src/foo.js',
      '理由：曾考虑引入',
      '否决理由：否决理由内容xyz',
      '复潮条件：启动耗时优化到位后',
      '',
    ].join('\n'))
    writeGuard(specBase, SID, { allowedFiles: ['src/foo.js'] })
    const out = await renderQuickStep1(d, SID)
    assert.ok(out.includes('【语义护栏】'), '护栏段头出现')
    assert.ok(out.includes('决策库命中'), '决策段出现')
    assert.ok(out.includes('D-102@v1') && out.includes('已否决，勿复潮'), 'rejected 标注勿复潮')
    assert.ok(out.includes('他者交付归因'), '交付段出现')
    assert.ok(out.includes('src/foo.js ← 2026-09-04-other-change'), '交付归因 文件→变更名')
    // 「prompt 末尾」：护栏段在 step 正文之后（追加非前置）
    assert.ok(out.indexOf('【语义护栏】') > out.indexOf('【任务正文锚点XYZ】'), '护栏段追加在 prompt 正文之后')
    // 流程完整：完成命令仍在（渲染未被注入阻断）
    assert.ok(out.includes('run quick --done'), '完成命令仍在输出尾部')
  } finally { cleanup(d) }
})

test('注入：semantic_guard.enabled=false（命中场景）→ prompt 与现状一致', async () => {
  const d = makeRepo('sgi-off-')
  try {
    const specBase = join(d, '.sillyspec')
    commitFile(d, 'src/foo.js', 'a1\n', '变更 2026-09-04-other-change：修 A')
    writeKnowledge(specBase, [
      '# 决策知识 — eng',
      '',
      '## D-102@v1 被否掉的方案',
      '状态：rejected',
      '文件：src/foo.js',
      '理由：曾考虑引入',
      '',
    ].join('\n'))
    writeGuard(specBase, SID, { allowedFiles: ['src/foo.js'] })
    writeFileSync(join(specBase, 'local.yaml'), 'semantic_guard:\n  enabled: false\n')
    const out = await renderQuickStep1(d, SID)
    assert.ok(!out.includes('【语义护栏】'), '开关关 → 零输出（命中场景同样不注入）')
    assert.ok(out.includes('## Step 1/1'), 'step 渲染正常（全停非半停，不阻断）')
  } finally { cleanup(d) }
})

test('注入：知识库读取异常 → 单行降级说明，流程不中断', async () => {
  const d = makeRepo('sgi-err-')
  try {
    const specBase = join(d, '.sillyspec')
    commitFile(d, 'src/foo.js', 'a1\n', 'init')
    writeGuard(specBase, SID, { allowedFiles: ['src/foo.js'] })
    // INDEX.md 造成目录：existsSync 真 + readFileSync 抛 EISDIR → 反查链异常冒泡到注入层
    mkdirSync(join(specBase, 'knowledge', 'INDEX.md'), { recursive: true })
    const out = await renderQuickStep1(d, SID)
    assert.ok(out.includes('【语义护栏】'), '降级行以护栏段头标记出现')
    assert.ok(out.includes('注入失败'), '单行降级说明（fail-soft）')
    assert.ok(out.includes('## Step 1/1') && out.includes('run quick --done'), '渲染与完成命令完整（流程不中断）')
  } finally { cleanup(d) }
})

test('注入：候选 = allowedFiles ∪ porcelain 脏文件（反斜杠归一去重）', async () => {
  const d = makeRepo('sgi-union-')
  try {
    const specBase = join(d, '.sillyspec')
    // 声明侧命中（已提交 + 他者标记）
    commitFile(d, 'src/foo.js', 'a1\n', '变更 2026-09-04-other-change：修 A')
    // 脏文件侧命中：提交后保持未提交修改 → porcelain ' M src/bar.js'
    commitFile(d, 'src/bar.js', 'b1\n', '变更 2026-09-05-other-change2：修 B')
    writeFileSync(join(d, 'src', 'bar.js'), 'b2-dirty\n')
    // 声明列表含反斜杠同形重复 → 归一后去重为一个候选
    writeGuard(specBase, SID, { allowedFiles: ['src/foo.js', 'src\\foo.js'] })
    const out = await renderQuickStep1(d, SID)
    assert.ok(out.includes('src/foo.js ← 2026-09-04-other-change'), '声明文件命中交付归因')
    assert.ok(out.includes('src/bar.js ← 2026-09-05-other-change2'), 'porcelain 脏文件并入候选')
    assert.equal(out.split('src/foo.js ←').length - 1, 1, '反斜杠同形去重（foo 只归因一次）')
  } finally { cleanup(d) }
})

test('注入：候选封顶 20（buildQuickSemanticGuardInjection 直测）', () => {
  const d = makeRepo('sgi-cap-')
  try {
    const specBase = join(d, '.sillyspec')
    mkdirSync(join(d, 'src'), { recursive: true })
    for (let i = 1; i <= 25; i++) {
      writeFileSync(join(d, 'src', `f${String(i).padStart(2, '0')}.js`), `v${i}\n`)
    }
    sh(d, ['add', '-A'])
    sh(d, ['commit', '-q', '-m', '变更 2026-09-04-bulk：批量'])
    const files = Array.from({ length: 25 }, (_, i) => `src/f${String(i + 1).padStart(2, '0')}.js`)
    writeGuard(specBase, SID, { allowedFiles: files })
    const block = buildQuickSemanticGuardInjection({ specBase, cwd: d, changeName: SID })
    assert.ok(typeof block === 'string' && block.length > 0, '封顶场景仍有注入（前 20 候选）')
    assert.equal(block.split(' ← ').length - 1, 20, '恰前 20 文件进反查（第 21+ 不采）')
  } finally { cleanup(d) }
})
