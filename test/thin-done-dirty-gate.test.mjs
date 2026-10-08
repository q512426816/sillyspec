/**
 * thin 收尾链两坑修复夹具（变更 2026-10-08-thin-done-dirty-gate-and-paren-attribution）。
 *
 * 坑记录：multi-agent-platform docs/sillyspec/thin-done-src-commit-order-and-attribution-paren.md
 *   坑①：flow done 对「未提交交付文件未入冻结面」只警告不阻断——autopilot 单跑到底直接归档，
 *        三选一（接受缺口 / --freeze-dirty / worktree）在归档后不可达。
 *   坑②：提交归属解析只认半角括号——全角（thin <变更名>；…）形态让 drift 归因静默失灵。
 *
 * 覆盖（requirements FR-01~03）：
 *   1. detectPatchDrift 全角括号交付提交判 drifted（FR-01）
 *   2. dirty 门三态：裸跑阻断（exit 1 @ patch 不归档）/ --freeze-dirty 并入 / --accept-dirty-gap 留痕完成（FR-02）
 *   3. 阻断→提交（全角括号尾缀）→重跑：冻结面自动并入 src（FR-03）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectPatchDrift } from '../src/flow-parity.js'
import { buildDepsBatches } from '../src/verify-postcheck.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'dirtygate-')); tmpRoots.push(d); return d }
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function gitRepo(dir) {
  const run = (args) => execFileSync('git', args, { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()
  run(['init', '-q', '-b', 'main']); run(['config', 'user.email', 't@t']); run(['config', 'user.name', 't'])
  return run
}

/** thin 变更夹具：start(autopilot) → 四问一行作答 + 清单 → tasks 收敛单任务 → 证据提交。
 *  leaveDirty=true 时不提交 src/work.js（留作未提交交付缺口）。 */
function setupThinChange(cwd, cn, { leaveDirty = false } = {}) {
  const run = gitRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node -e \\"0\\""\n  lint: "node -e \\"0\\""\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const env = { ...process.env, SILLYSPEC_WATCHER: '0' }
  // --no-review 在 start 落 flow-state（reviewForce 一票豁免；done 时传无效）——sampleBucket
  // 按变更名确定性哈希（1/4 桶），不钉会出现「夹具名决定要不要评审」的假红（dg-freeze 落桶实证）
  const s1 = spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'start', '--change', cn, '--autopilot', '--no-review', '--input', 'dirty 门 e2e\n\n成功标准：\n- 收口门行为'], { cwd, encoding: 'utf8', timeout: 120_000, env })
  assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
  const base = join(cwd, '.sillyspec', 'changes', cn)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规')
    + '\n## 文件变更清单\n\n| 操作 | 路径 | 说明 |\n|---|---|---|\n| 新增 | src/work.js | 交付 |\n')
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
  writeFileSync(join(base, 'tasks.md'), '---\nauthor: fixture\n---\n\n# 任务注册表（Tasks）\n\n- [x] task-01: 交付 src/work.js（e2e 夹具）\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'work.js'), 'export const a = 1\n')
  // 勾选证据面：全勾硬门要 task-NN 证据提交——leaveDirty 形态也要有（与 dirty 缺口无关的独立小件）
  writeFileSync(join(cwd, 'ev.txt'), 'tick evidence\n')
  run(['add', 'ev.txt'])
  run(['commit', '-q', '-m', 'chore: task tick evidence (task-01)'])
  if (!leaveDirty) {
    run(['add', 'src/work.js'])
    run(['commit', '-q', '-m', `work (${cn}) (task-01)`])
  }
  return { run, env, base }
}

function doneCmd(cwd, cn, env, extra = []) {
  return spawnSync(process.execPath, [CLI, '--dir', cwd, 'flow', 'done', '--change', cn, ...extra], { cwd, encoding: 'utf8', timeout: 300_000, env })
}

// ───────────────────────── FR-01：drift 全角括号 ─────────────────────────

test('FR-01 detectPatchDrift：全角括号交付提交判 drifted（旧正则静默失灵的坑②）', () => {
  const d = fx()
  const run = gitRepo(d)
  writeFileSync(join(d, 'a.txt'), 'a\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'base'])
  const freezeHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: d, encoding: 'utf8' }).trim()
  const CHG = '2026-10-08-dg-unit'
  // 全角括号 + thin 前缀 + 附注（坑记录实测形态）
  writeFileSync(join(d, 'b.txt'), 'b\n')
  run(['add', '.']); run(['commit', '-q', '-m', `fix: 评审处置（thin ${CHG}；task-02）`])
  let r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, true, `全角括号提交触发漂移（实际 ${JSON.stringify(r)}）`)
  assert.ok(r.ownCommits.some((s) => s.includes(CHG)), 'ownCommits 含该提交')
  // 反向：裸提交不触发
  writeFileSync(join(d, 'c.txt'), 'c\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'chore: 无后缀裸提交'])
  r = detectPatchDrift({ cwd: d, change: CHG, freezeHead })
  assert.equal(r.drifted, true, '仍只计归属提交（裸提交不计入不稀释）')
  // 反向：他变更名不触发
  writeFileSync(join(d, 'e.txt'), 'e\n')
  run(['add', '.']); run(['commit', '-q', '-m', 'fix: 他侧（2026-10-08-other-x）'])
  r = detectPatchDrift({ cwd: d, change: '2026-10-08-other-y', freezeHead })
  assert.equal(r.drifted, false, '他变更名不触发本变更漂移')
})

// ───────────────────────── FR-06：套件编排器不进 deps 批 ─────────────────────────

test('FR-06 buildDepsBatches：run-tests.mjs（套件编排器）剔出执行面转 loud skip——FR 绑定收进来也不递归全量', () => {
  const batches = buildDepsBatches({
    deps: ['test/run-tests.mjs', 'test/a-plain.test.mjs', 'test/b-plain.test.mjs'],
    changedFiles: [],
    hits: [],
    cwd: null,
    priorityFiles: ['test/run-tests.mjs'], // FR 绑定钦定优先面（坑形态：绑定指向套件入口）
  })
  const jsBatch = batches.find((b) => b.name === 'deps(auto-js)')
  const skipBatch = batches.find((b) => b.name === 'deps(auto-js-meta-skip)')
  assert.ok(jsBatch, '普通 js 批在场')
  assert.ok(!jsBatch.command.includes('run-tests.mjs'), '执行命令不含套件编排器')
  assert.ok(jsBatch.command.includes('test/a-plain.test.mjs'), '普通测试照跑')
  assert.ok(skipBatch && skipBatch.skip === true, '套件编排器转 skip 批')
  assert.deepEqual(skipBatch.files, ['test/run-tests.mjs'])
  assert.ok(skipBatch.reason.includes('递归全量'), 'skip 理由 loud 披露')
})

// ───────────────────────── FR-02/03：门三态 e2e ─────────────────────────

test('FR-02/03 裸跑阻断→全角提交→重跑并入：patch 子步半态可重入（坑①+②合围）', () => {
  const cwd = fx()
  const cn = '2026-10-08-dg-block'
  const { run, env, base } = setupThinChange(cwd, cn, { leaveDirty: true })
  try {
    // 裸跑：dirty 缺口未处置 → 停在 patch 子步（exit 1、不归档）
    const s1 = doneCmd(cwd, cn, env)
    const out1 = s1.stdout + s1.stderr
    assert.ok(s1.status !== 0, `阻断应非零退出（实际 ${s1.status}）`)
    assert.ok(out1.includes('收口阻断'), `阻断信息在场（尾部 ${out1.split('\n').slice(-6).join(' | ')}）`)
    assert.ok(out1.includes('中断于子步「patch」'), '中断点=patch 子步')
    assert.ok(existsSync(base), 'change 仍 active（未归档）')
    assert.ok(!existsSync(join(base, 'change-patch.json')), '阻断时未落冻结件')

    // 处置①：提交 src（全角括号尾缀——坑②形态），重跑 → 并入 + 完成收口
    run(['add', 'src/work.js'])
    run(['commit', '-q', '-m', `feat: 交付 work（${cn}）(task-01)`])
    const s2 = doneCmd(cwd, cn, env)
    const out2 = s2.stdout + s2.stderr
    assert.equal(s2.status, 0, `重跑应完成收口: ${out2.split('\n').slice(-8).join(' | ')}`)
    const arch = join(cwd, '.sillyspec', 'changes', 'archive', cn)
    const patch = readFileSync(join(arch, 'change.patch'), 'utf8')
    assert.ok(patch.includes('+++ b/src/work.js'), '重跑冻结面含已提交 src（全角括号归属并入）')
    assert.ok(!out2.includes('收口阻断'), '处置后无阻断')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('FR-02 --freeze-dirty：显式声明并入冻结（既有行为零回退）', () => {
  const cwd = fx()
  const cn = '2026-10-08-dg-freeze'
  const { env } = setupThinChange(cwd, cn, { leaveDirty: true })
  try {
    const s = doneCmd(cwd, cn, env, ['--freeze-dirty'])
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `--freeze-dirty 应完成: ${out.split('\n').slice(-8).join(' | ')}`)
    const arch = join(cwd, '.sillyspec', 'changes', 'archive', cn)
    const metaB = JSON.parse(readFileSync(join(arch, 'change-patch.json'), 'utf8'))
    const patchB = readFileSync(join(arch, 'change.patch'), 'utf8')
    assert.ok(patchB.includes('+++ b/src/work.js'), `dirty 交付并入冻结面（files: ${metaB.files.join(',')}；patch 头: ${patchB.split('\n').slice(0, 4).join(' | ')}）`)
    assert.ok(!('acceptedDirtyGap' in metaB), '无缺口留痕键')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})

test('FR-02 --accept-dirty-gap：显式接受缺口留痕完成', () => {
  const cwd = fx()
  const cn = '2026-10-08-dg-accept'
  const { env } = setupThinChange(cwd, cn, { leaveDirty: true })
  try {
    const s = doneCmd(cwd, cn, env, ['--accept-dirty-gap'])
    const out = s.stdout + s.stderr
    assert.equal(s.status, 0, `--accept-dirty-gap 应完成: ${out.split('\n').slice(-8).join(' | ')}`)
    assert.ok(out.includes('--accept-dirty-gap'), 'console 留痕在场')
    const arch = join(cwd, '.sillyspec', 'changes', 'archive', cn)
    const meta = JSON.parse(readFileSync(join(arch, 'change-patch.json'), 'utf8'))
    assert.equal(meta.acceptedDirtyGap, 1, '缺口数随 change-patch.json 留痕')
    assert.ok(!readFileSync(join(arch, 'change.patch'), 'utf8').includes('+++ b/src/work.js'), '缺口文件不入冻结面')
  } finally { rmSync(cwd, { recursive: true, force: true, maxRetries: 3 }) }
})
