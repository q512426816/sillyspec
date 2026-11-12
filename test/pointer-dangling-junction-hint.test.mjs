/**
 * 2026-11-10 坑 worktree-remove-dangling-spec-junction 回归：悬空 junction 专项诊断
 *
 * 坑实证：worktree 拆除后 daemon spec junction 悬空，CLI fail-closed 报
 * 「pointer.specRoot 路径不存在（daemon 未起？已迁移？）」——完全误导排查方向
 * （daemon 在线），且悬空前静默空读窗曾致「未找到进度数据」误判收口完成。
 * 修复：存在性 miss 时 lstat 判 symlink/junction 且目标不在 → 专项 reason 点名悬空 +
 * 三步修复命令（rm 链接 → mklink/ln -s 重指主仓 .sillyspec → status 核对非空）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { resolvePlatformSpecDir, PointerUnreachableError } = await import(pathToFileURL(join(ROOT, '..', 'src', 'progress.js')).href)

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'pdj-')); tmpRoots.push(d); return d }
test.after?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function makeRepoWithDanglingSpecRoot() {
  const repo = fx()
  mkdirSync(join(repo, '.sillyspec'), { recursive: true }) // 主仓真实 spec 根（修复重指目标）
  const specRoot = join(repo, 'daemon-specs', 'ws-1')
  mkdirSync(dirname(specRoot), { recursive: true })
  // 悬空 junction：目标（已拆除的 worktree 副本）不存在——junction 不要求目标在场
  const removedWt = join(repo, '.worktrees', 'gone-worker', '.sillyspec')
  return { repo, specRoot, removedWt, specRootPromise: symlink(removedWt, specRoot, process.platform === 'win32' ? 'junction' : undefined) }
}

test('悬空 junction：专项 reason 点名 + 修复命令含主仓 .sillyspec 与三步核对', async () => {
  const { repo, specRoot, removedWt, specRootPromise } = makeRepoWithDanglingSpecRoot()
  await specRootPromise
  writeFileSync(join(repo, '.sillyspec-platform.json'), JSON.stringify({ specRoot }))
  try {
    resolvePlatformSpecDir(repo)
    assert.fail('悬空 specRoot 应抛 PointerUnreachableError')
  } catch (e) {
    assert.ok(e instanceof PointerUnreachableError, `错误类型（实际 ${e.constructor.name}）`)
    const msg = String(e.message)
    assert.match(msg, /悬空链接/, 'reason 点名悬空形态')
    assert.ok(msg.includes(removedWt), `reason 携带原目标路径（worktree 特征标注）：${msg.slice(0, 200)}`)
    assert.match(msg, /rm "/, '修复①删除悬空链接')
    assert.match(msg, new RegExp(repo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '.*\\.sillyspec'), '修复②重指主仓 .sillyspec')
    assert.match(msg, /sillyspec status/, '修复③核对活跃变更非空')
    assert.doesNotMatch(msg, /不在场，先核对仓库根/, '主仓 .sillyspec 在场时不附警告')
  }
})

test('悬空 junction + 主仓 .sillyspec 缺席：修复命令附在场警告', async () => {
  const { repo, specRoot, specRootPromise } = makeRepoWithDanglingSpecRoot()
  await specRootPromise
  rmSync(join(repo, '.sillyspec'), { recursive: true, force: true }) // 主仓无 spec 根
  writeFileSync(join(repo, '.sillyspec-platform.json'), JSON.stringify({ specRoot }))
  try {
    resolvePlatformSpecDir(repo)
    assert.fail('应抛')
  } catch (e) {
    assert.ok(e instanceof PointerUnreachableError)
    assert.match(String(e.message), /不在场，先核对仓库根/, '主仓目标缺席时附警告')
  }
})

test('非链接形态的缺失路径：保持通用提示零回归', () => {
  const repo = fx()
  writeFileSync(join(repo, '.sillyspec-platform.json'), JSON.stringify({ specRoot: join(repo, 'plain-missing-dir') }))
  try {
    resolvePlatformSpecDir(repo)
    assert.fail('应抛')
  } catch (e) {
    assert.ok(e instanceof PointerUnreachableError)
    assert.match(String(e.message), /daemon 未起/, '普通缺失走通用提示')
    assert.match(String(e.message), /doctor --json/, '通用 hint 在场')
  }
})
