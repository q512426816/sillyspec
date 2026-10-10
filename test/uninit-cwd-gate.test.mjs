/**
 * 未初始化目录硬拦测试（坑：agent 在未初始化/错误目录跑非 init 命令，fail-soft 散点报错
 * 且不说正确 cwd——实测 status 在未初始化目录提示可开变更、flow start 到 local.yaml 才
 * 报错、knowledge 只报参数错，agent 多轮试错）。
 *
 * 修复：CLI 入口（src/index.js main()，worktree cwd 硬拦之后、命令分发之前）统一判定：
 * 非豁免命令在「本地祖先链（resolveSpecDir 全套守卫）+ 平台 pointer/声明 + 显式 --spec-dir/
 * 平台 flag」均未命中 .sillyspec 的目录运行 → exit 2 + 三条修复指引（cd 回项目根 / 先 init /
 * --spec-dir 显式指定）。命中祖先链时把 dir 重锚定到 spec 根（修 review status 等裸
 * join(dir,'.sillyspec') 调用点的子目录漂移）。豁免面（init/scan/doctor/status 等 16 个按
 * 设计可在未初始化目录运行的命令）行为不变。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { resolveUninitCwdGate, UNINIT_CWD_GATE_EXEMPT } from '../src/run/shared.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')
// 守卫文案独有标记（区别于各命令自身的「未找到」类报错）
const GATE_MARKER = '已上溯祖先链'

describe('resolveUninitCwdGate（判定单元）', () => {
  let base
  beforeEach(() => {
    base = join(tmpdir(), `uninit-gate-${Math.random().toString(36).slice(2)}`)
  })
  afterEach(() => { try { rmSync(base, { recursive: true, force: true }) } catch {} })

  it('豁免命令（init/scan/doctor/status/wt-commit 等）任意目录 → exempt（不拦不锚）', () => {
    const d = join(base, 'empty')
    mkdirSync(d, { recursive: true })
    for (const cmd of ['init', 'scan', 'doctor', 'status', 'progress', 'next', 'workspace',
      'setup', 'knowledge', 'local', 'config', 'mcp', 'dashboard', 'platform', 'wt-commit', 'agent-log']) {
      assert.equal(resolveUninitCwdGate(cmd, { dir: d }).verdict, 'exempt', `命令 ${cmd} 应豁免`)
    }
  })

  it('非豁免命令清单抽样：工作流/产物类命令不豁免', () => {
    const d = join(base, 'empty')
    mkdirSync(d, { recursive: true })
    for (const cmd of ['flow', 'run', 'task', 'review', 'worktree', 'handoff', 'runtime',
      'watcher', 'quicklog', 'commit', 'docs', 'delta', 'explore', 'module-impact']) {
      assert.ok(!UNINIT_CWD_GATE_EXEMPT.has(cmd), `命令 ${cmd} 不应在豁免清单`)
      assert.equal(resolveUninitCwdGate(cmd, { dir: d }).verdict, 'block', `命令 ${cmd} 空目录应 block`)
    }
  })

  it('显式 --spec-dir / 平台 flag → skip（显式意图不归本门管）', () => {
    const d = join(base, 'empty')
    mkdirSync(d, { recursive: true })
    assert.equal(resolveUninitCwdGate('flow', { dir: d, specDir: join(base, 'x', '.sillyspec') }).verdict, 'skip')
    assert.equal(resolveUninitCwdGate('flow', { dir: d, platformFlags: 'ws-1' }).verdict, 'skip')
  })

  it('平台 pointer / 接管声明在 dir → skip（平台模式 spec 解析与 fail-closed 错误归专门文案）', () => {
    const d = join(base, 'plat')
    mkdirSync(d, { recursive: true })
    writeFileSync(join(d, '.sillyspec-platform.json'), JSON.stringify({ specRoot: join(base, 'hub-spec') }), 'utf8')
    assert.equal(resolveUninitCwdGate('flow', { dir: d }).verdict, 'skip')
    const d2 = join(base, 'plat-managed')
    mkdirSync(d2, { recursive: true })
    writeFileSync(join(d2, '.sillyspec-platform-managed'), JSON.stringify({ specRoot: join(base, 'hub-spec') }), 'utf8')
    assert.equal(resolveUninitCwdGate('flow', { dir: d2 }).verdict, 'skip')
  })

  it('未初始化非 git 目录 → block 且 gitRoot=null', () => {
    const d = join(base, 'bare')
    mkdirSync(d, { recursive: true })
    const r = resolveUninitCwdGate('flow', { dir: d })
    assert.equal(r.verdict, 'block')
    assert.equal(r.gitRoot, null)
  })

  it('未初始化 git 仓 → block + gitRoot 指向仓根（报错文案锚点）', () => {
    const d = join(base, 'repo')
    mkdirSync(d, { recursive: true })
    const res = spawnSync('git', ['init', '-q', '.'], { cwd: d, encoding: 'utf8' })
    assert.equal(res.status, 0, `git init 失败: ${res.stderr}`)
    const r = resolveUninitCwdGate('task', { dir: d })
    assert.equal(r.verdict, 'block')
    assert.equal(resolve(r.gitRoot), resolve(d), `gitRoot 应为仓根 ${d}，实际 ${r.gitRoot}`)
  })

  it('已初始化根 / 其任意子目录 → pass + anchor=spec 根父目录（重锚定依据）', () => {
    const root = join(base, 'proj')
    mkdirSync(join(root, '.sillyspec'), { recursive: true })
    const r1 = resolveUninitCwdGate('flow', { dir: root })
    assert.equal(r1.verdict, 'pass')
    assert.equal(resolve(r1.anchor), resolve(root))
    const sub = join(root, 'src', 'lib')
    mkdirSync(sub, { recursive: true })
    const r2 = resolveUninitCwdGate('review', { dir: sub })
    assert.equal(r2.verdict, 'pass')
    assert.equal(resolve(r2.anchor), resolve(root), '子目录应锚定到 spec 根父目录')
  })

  it('linked worktree（兄弟路径）主仓有 .sillyspec → pass 且 anchor=null（锚定归命令层）', () => {
    // endpoint-baseline 用例形态：git worktree add 到主仓兄弟路径，主仓 .sillyspec 不在
    // cwd 祖先链上——误拦会打断 endpoints baseline 等命令层自有的主仓锚定逻辑。
    const fx = join(base, 'fx')
    const mainRoot = join(fx, 'main')
    const wtRoot = join(fx, 'wt')
    mkdirSync(join(mainRoot, '.sillyspec'), { recursive: true })
    const g = (args) => spawnSync('git', args, { cwd: mainRoot, encoding: 'utf8' })
    assert.equal(g(['init', '-q']).status, 0)
    g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
    writeFileSync(join(mainRoot, 'README.md'), 'init\n', 'utf8')
    g(['add', '.']); g(['commit', '-q', '-m', 'init'])
    assert.equal(g(['worktree', 'add', '-q', '-b', 'feat', wtRoot]).status, 0)
    const r = resolveUninitCwdGate('endpoints', { dir: wtRoot })
    assert.equal(r.verdict, 'pass', `linked worktree 应放行：${JSON.stringify(r)}`)
    assert.equal(r.anchor, null, 'worktree 场景不重锚定（命令层自有主仓锚定逻辑）')
  })

  it('无命令（usage/帮助早退后的保险路径）→ exempt 不拦', () => {
    mkdirSync(base, { recursive: true })
    assert.equal(resolveUninitCwdGate(undefined, { dir: base }).verdict, 'exempt')
    assert.equal(resolveUninitCwdGate('', { dir: base }).verdict, 'exempt')
  })
})

describe('CLI 入口未初始化目录硬拦（e2e）', () => {
  let work
  beforeEach(() => {
    work = join(tmpdir(), `uninit-gate-e2e-${Math.random().toString(36).slice(2)}`)
    mkdirSync(work, { recursive: true })
  })
  afterEach(() => { try { rmSync(work, { recursive: true, force: true }) } catch {} })

  const runCli = (cwd, args) => spawnSync(process.execPath, [cliBin, ...args], { cwd, encoding: 'utf8' })

  it('未初始化目录跑 flow → exit 2 + 硬拦文案（含修复三选一指引）', () => {
    const res = runCli(work, ['flow', 'status', '--change', '2026-01-01-x'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.equal(res.status, 2, `期望 exit 2，实际 ${res.status}\n${combined}`)
    assert.ok(combined.includes(GATE_MARKER), `应含守卫判定说明：\n${combined}`)
    assert.ok(combined.includes('sillyspec init'), `应指引 init：\n${combined}`)
    assert.ok(combined.includes('--spec-dir'), `应指引 --spec-dir：\n${combined}`)
  })

  it('git 仓未初始化 → 文案给出 git root 锚点', () => {
    const res = spawnSync('git', ['init', '-q', '.'], { cwd: work, encoding: 'utf8' })
    assert.equal(res.status, 0)
    const r = runCli(work, ['task', 'list'])
    const combined = (r.stdout || '') + (r.stderr || '')
    assert.equal(r.status, 2)
    assert.ok(combined.includes('git root'), `文案应含 git root：\n${combined}`)
  })

  it('豁免命令行为不变：status 在未初始化目录不触拦（保持自身空态输出）', () => {
    const res = runCli(work, ['status'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes(GATE_MARKER), `status 不应被硬拦：\n${combined}`)
  })

  it('--spec-dir 显式指定 → 不拦（交命令自身行为）', () => {
    const res = runCli(work, ['flow', 'status', '--change', '2026-01-01-x', '--spec-dir', join(work, '.sillyspec')])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes(GATE_MARKER), `显式 --spec-dir 不应被拦：\n${combined}`)
  })

  it('--spec-root 平台首扫 flag → 不拦（平台模式显式意图，spec 恒在仓外）', () => {
    const res = runCli(work, ['run', 'scan', '--spec-root', join(work, 'hub-spec')])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes(GATE_MARKER), `--spec-root 平台首扫不应被拦：\n${combined}`)
  })

  it('平台 pointer 在 cwd 的项目 → 不因缺本地 .sillyspec 被拦', () => {
    const hubSpec = join(work, 'hub-spec')
    mkdirSync(hubSpec, { recursive: true })
    writeFileSync(join(work, '.sillyspec-platform.json'), JSON.stringify({ specRoot: hubSpec }), 'utf8')
    const res = runCli(work, ['review', 'status', '--change', '2026-01-01-x'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes(GATE_MARKER), `平台模式项目不应被本门拦截：\n${combined}`)
  })

  it('已初始化根的子目录跑非豁免命令 → 放行 + 重锚定到项目根（不再读子目录 .sillyspec）', () => {
    const root = join(work, 'proj')
    mkdirSync(join(root, '.sillyspec', 'changes'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'local.yaml'), '# gate-test\n', 'utf8')
    const sub = join(root, 'src', 'lib')
    mkdirSync(sub, { recursive: true })
    const res = runCli(sub, ['review', 'status', '--change', '2026-01-01-x'])
    const combined = (res.stdout || '') + (res.stderr || '')
    assert.ok(!combined.includes(GATE_MARKER), `子目录命中祖先链应放行：\n${combined}`)
    assert.ok(combined.includes('锚定到项目根') && combined.includes(resolve(root)),
      `应提示重锚定与目标根路径：\n${combined}`)
  })
})
