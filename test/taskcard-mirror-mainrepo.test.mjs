/**
 * taskcard --all 平台产物镜像主仓（坑 platform-init-artifact-daemon-dir-only 同族，
 * 2026-09-10 驾驭小结第六批①，用户实证「写到 daemon 镜像目录再回同步，中间一度两份副本」）。
 *
 * 锁定语义：
 *   - mirrorPlatformArtifactToMainRepo ensureParentDir：本地 changeDir 在而 tasks/ 子目录未建
 *     → 建子目录并镜像；changeDir 不在 → 仍不凭空建（守卫在 changeDir 层）
 *   - 端到端 CLI：pointer 态 agent 本地跑 taskcard --all → 卡片双写镜像主仓 changes/<n>/tasks/
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { mirrorPlatformArtifactToMainRepo } from '../src/run/shared.js'

const binCLI = join(fileURLToPath(import.meta.url).replace(/[^/\\]+$/, ''), '..', 'bin', 'sillyspec.js')
const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('ensureParentDir：changeDir 在而 tasks/ 未建 → 建子目录镜像；changeDir 不在 → 不凭空建', () => {
  const cwd = mk('tc-mirror-')
  const platformBase = mk('tc-mirror-plat-')
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'my-change'), { recursive: true })

  const p = mirrorPlatformArtifactToMainRepo({
    cwd, changeName: 'my-change', file: 'tasks/task-01.md', content: '---\nid: task-01\n---\n',
    platformBase, ensureParentDir: true,
  })
  assert.equal(p, join(cwd, '.sillyspec', 'changes', 'my-change', 'tasks', 'task-01.md'), '子目录自动建并镜像')
  assert.ok(existsSync(p), '镜像文件落盘')

  // ensureParentDir 缺省（旧行为零回归）：另一 changeDir（tasks/ 未建）→ 跳过
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'my-change2'), { recursive: true })
  const p2 = mirrorPlatformArtifactToMainRepo({
    cwd, changeName: 'my-change2', file: 'tasks/task-02.md', content: 'x',
    platformBase,
  })
  assert.equal(p2, null, '缺省 ensureParentDir 子目录未建仍跳过')

  // changeDir 不在：即使 ensureParentDir 也不凭空建
  const p3 = mirrorPlatformArtifactToMainRepo({
    cwd, changeName: 'nope', file: 'tasks/task-01.md', content: 'x',
    platformBase, ensureParentDir: true,
  })
  assert.equal(p3, null, 'changeDir 缺失守卫维持')
})

test('端到端：pointer 态本地跑 taskcard --all → 卡片双写镜像主仓 tasks/', () => {
  const cwd = mk('tc-e2e-')
  const platformBase = mk('tc-e2e-plat-')
  // 平台镜像侧：变更目录 + tasks.md（卡片由 CLI 写在镜像侧）
  const mirrorChange = join(platformBase, 'changes', 'c1')
  mkdirSync(mirrorChange, { recursive: true })
  writeFileSync(join(mirrorChange, 'tasks.md'), '- [ ] task-01: 甲\n- [ ] task-02: 乙\n')
  // 主仓侧：changeDir 存在（brainstorm/plan 产物在）而 tasks/ 未建
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'c1'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', '.gitignore'), '')
  // pointer（agent 本地形态：cwd 有 .sillyspec-platform.json 指向镜像根）
  writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({ specRoot: platformBase }))
  // git 环境（cmdTaskcard 取 author 用 git config，失败回退 unknown——无 git 也可）
  try {
    spawnSync('git', ['init', '-q'], { cwd, stdio: 'ignore' })
    spawnSync('git', ['config', 'user.email', 't@t.local'], { cwd, stdio: 'ignore' })
    spawnSync('git', ['config', 'user.name', 't'], { cwd, stdio: 'ignore' })
  } catch { /* 无 git 环境也可（author=unknown） */ }

  const r = spawnSync(process.execPath, [binCLI, 'taskcard', 'c1', '--all'], {
    cwd, encoding: 'utf8', timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'],
  })
  const out = (r.stdout || '') + (r.stderr || '')
  assert.equal(r.status, 0, `CLI exit 0（输出尾部：${out.slice(-200)}）`)
  // 镜像侧卡片（权威）
  assert.ok(existsSync(join(platformBase, 'changes', 'c1', 'tasks', 'task-01.md')), '镜像侧卡片已生成')
  // 主仓侧镜像（即时可见，不等 spec-sync）
  const mirrored = join(cwd, '.sillyspec', 'changes', 'c1', 'tasks', 'task-01.md')
  assert.ok(existsSync(mirrored), '主仓镜像卡片已双写')
  assert.ok(readFileSync(mirrored, 'utf8').includes('id: task-01'), '镜像内容与镜像侧一致')
  assert.ok(out.includes('📎'), '回显含镜像提示行')
})
