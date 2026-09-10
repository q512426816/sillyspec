/**
 * apply 校验读侧的归档回退（坑 apply-archived-evidence-recycled，2026-09-10 驾驭小结第二批①）。
 *
 * 背景：archive 收尾有意保留「未 apply 的 worktree」期待归档后补 apply（archiveWorktreeCleanup
 * 对有未应用变更的 worktree 保留并提示），但 pruneArchivedChangeRuntime 同时按 change 戳回收
 * execute-runs/stage-reviews/apply-pathspec 等 runtime 取证；apply 的读侧
 * （resolveApplyAllowSet / assess 段）又只认 changes/<name>/ 的 design.md/tasks——归档 rename 到
 * changes/archive/<name>/ 后 allow 集恒空 → Gate1 把整批交付文件拦成「不在清单」，归档后补 apply
 * 必死。自相矛盾（流程一侧期待、另一侧回收）。
 *
 * 锁定语义（读侧回退，不动归档回收策略）：
 *   - resolveApplyAllowSet：活跃目录无 design.md 而归档目录有 → 读归档版（allow 集非空）
 *   - assess 段（checkWorktreeAssess 纯函数层）：incidental/review 声明豁免集合同样回退
 *     （经 resolveAssessSpecBase——此函数 assess 内联，本测试经 checkWorktreeAssess 冒烟：
 *     活跃缺归档在时 assessSpecBase 指向归档目录）
 *   - 活跃目录存在时零变化（正常流程不变）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { resolveApplyAllowSet } from '../src/worktree-apply.js'

const tmpRoots = []
function mkProject() {
  const root = mkdtempSync(join(tmpdir(), 'apply-archive-fb-'))
  tmpRoots.push(root)
  return root
}
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const CN = '2026-09-10-archived-change'

function writeDesignAt(specBase, name, body) {
  const dir = join(specBase, 'changes', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'design.md'), body)
  return dir
}

const DESIGN_LIST = [
  '## 文件变更清单',
  '',
  '| 操作 | 文件路径 | 说明 |',
  '|---|---|---|',
  '| 修改 | src/core/engine.js | 核心改动 |',
  '',
].join('\n')

test('活跃目录无 design.md 而归档目录有 → 回退读归档版（allow 集非空）', () => {
  const root = mkProject()
  const specBase = join(root, '.sillyspec')
  // 归档形态：changes/archive/<name>/design.md（活跃目录不存在）
  writeDesignAt(specBase, join('archive', CN), DESIGN_LIST)

  const m = resolveApplyAllowSet(root, CN, { specBase })
  assert.ok(m.get('main').has('src/core/engine.js'), '归档 design.md 清单进 main allow 集')
})

test('活跃目录存在（正常流程）→ 零变化，不读归档', () => {
  const root = mkProject()
  const specBase = join(root, '.sillyspec')
  // 两处都有：活跃版是权威（含不同文件），归档版不应被混入
  writeDesignAt(specBase, CN, DESIGN_LIST.replace('src/core/engine.js', 'src/core/active.js'))
  writeDesignAt(specBase, join('archive', CN), DESIGN_LIST.replace('src/core/engine.js', 'src/core/stale.js'))

  const m = resolveApplyAllowSet(root, CN, { specBase })
  assert.ok(m.get('main').has('src/core/active.js'), '活跃 design.md 正常读取')
  assert.ok(!m.get('main').has('src/core/stale.js'), '归档 design.md 不混入（活跃为权威）')
})

test('task 卡目录同样回退：归档 tasks/task-01.md 的 allowed_paths 进集', () => {
  const root = mkProject()
  const specBase = join(root, '.sillyspec')
  const dir = writeDesignAt(specBase, join('archive', CN), DESIGN_LIST)
  const tasksDir = join(dir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  writeFileSync(join(tasksDir, 'task-01.md'),
    '---\nid: task-01\nallowed_paths:\n  - src/core/taskfile.js\n---\n\n# task-01\n')

  const m = resolveApplyAllowSet(root, CN, { specBase })
  assert.ok(m.get('main').has('src/core/taskfile.js'), '归档 task 卡 allowed_paths 进 main 集')
})

test('两处都无 → 空 Map（原 fail-closed 行为不变）', () => {
  const root = mkProject()
  const m = resolveApplyAllowSet(root, 'nope-change', { specBase: join(root, '.sillyspec') })
  assert.equal(m.size === 0 || m.get('main').size === 0, true, '无 design/tasks → allow 集空')
})
