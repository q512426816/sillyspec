/**
 * taskcard 骨架 depends_on 的 plan.md Wave 反填（坑 taskcard-depends-wave-backfill，
 * 2026-09-10 驾驭小结第五批③，三批子代理均发现骨架 depends_on 为空靠自觉补齐）。
 *
 * 锁定语义：
 *   - tasks.md 行内注解缺失 + plan.md 有 Wave 分组 → Wave N 任务骨架 depends_on = Wave N-1 全部任务
 *   - Wave 1 任务 depends_on 空；无 Wave 段 → 全空（fail-soft 回退）
 *   - 行内注解在场 → 注解优先（更细粒度，Wave 兜底不覆盖）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { cmdTaskcard, parsePlanWaveDeps } from '../src/taskcard.js'

const tmpRoots = []
function mkChange({ tasksMd, planMd } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'tc-wave-')); tmpRoots.push(root)
  const changeDir = join(root, '.sillyspec', 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  if (tasksMd) writeFileSync(join(changeDir, 'tasks.md'), tasksMd)
  if (planMd) writeFileSync(join(changeDir, 'plan.md'), planMd)
  return { root, changeDir }
}
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const PLAN_3_WAVES = [
  '# Plan',
  '',
  '## Wave 1',
  '',
  '- task-01',
  '- task-02',
  '',
  '## Wave 2',
  '',
  '- task-03',
  '',
  '## Wave 3',
  '',
  '- task-04',
  '- task-05',
  '',
].join('\n') + '\n'

function frontmatterDepends(cardPath) {
  const fm = readFileSync(cardPath, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return null
  const depLine = fm[1].split('\n').find(l => l.startsWith('depends_on:'))
  if (!depLine) return null
  const m = depLine.match(/depends_on:\s*\[(.*)\]/)
  return m ? m[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean) : []
}

test('parsePlanWaveDeps：Wave N → Wave N-1 全部任务（纯函数）', () => {
  const { root, changeDir } = mkChange({ planMd: PLAN_3_WAVES })
  const m = parsePlanWaveDeps(join(changeDir, 'plan.md'))
  assert.equal(m.get('task-01'), undefined, 'Wave 1 无依赖')
  assert.deepEqual(m.get('task-03'), ['task-01', 'task-02'], 'Wave 2 → Wave 1 全部')
  assert.deepEqual(m.get('task-04'), ['task-03'], 'Wave 3 → Wave 2')
  assert.deepEqual(m.get('task-05'), ['task-03'], 'Wave 3 → Wave 2')
  assert.equal(parsePlanWaveDeps(null).size, 0, 'null → 空 Map')
  assert.equal(parsePlanWaveDeps(join(root, 'nope.md')).size, 0, '文件缺失 → 空 Map（fail-soft）')
})

test('骨架生成：注解缺失时按 Wave 反填 depends_on（三批子代理实证场景）', () => {
  // tasks.md 无行内注解（agent 常态漏写）——旧实现骨架 depends_on 全空
  const tasksMd = '- [ ] task-01: 建表\n- [ ] task-02: 种子数据\n- [ ] task-03: 读接口\n- [ ] task-04: 写接口\n'
  const { root, changeDir } = mkChange({ tasksMd, planMd: PLAN_3_WAVES })
  const r = cmdTaskcard('c1', { cwd: root, taskIds: 'all' })
  assert.equal(r.created.length, 4)
  assert.deepEqual(frontmatterDepends(join(changeDir, 'tasks', 'task-01.md')), [], 'Wave 1 骨架 depends_on 空')
  assert.deepEqual(frontmatterDepends(join(changeDir, 'tasks', 'task-03.md')), ['task-01', 'task-02'],
    'Wave 2 骨架反填 Wave 1 依赖')
  assert.deepEqual(frontmatterDepends(join(changeDir, 'tasks', 'task-04.md')), ['task-03'],
    'Wave 3 骨架反填 Wave 2 依赖')
})

test('注解在场优先：行内 (depends_on: task-01) 不被 Wave 兜底覆盖', () => {
  const tasksMd = '- [ ] task-01: 建表\n- [ ] task-02: 种子\n- [ ] task-03: 读接口 (depends_on: task-01)\n'
  const { root, changeDir } = mkChange({ tasksMd, planMd: PLAN_3_WAVES })
  cmdTaskcard('c1', { cwd: root, taskIds: 'all' })
  assert.deepEqual(frontmatterDepends(join(changeDir, 'tasks', 'task-03.md')), ['task-01'],
    '注解细粒度依赖优先于 Wave 粗粒度兜底')
})

test('无 Wave 段 / 无 plan.md：骨架 depends_on 空（fail-soft 零回归）', () => {
  const tasksMd = '- [ ] task-01: a\n- [ ] task-02: b\n'
  const a = mkChange({ tasksMd, planMd: '# Plan\n\n无 Wave 段\n' })
  cmdTaskcard('c1', { cwd: a.root, taskIds: 'all' })
  assert.deepEqual(frontmatterDepends(join(a.changeDir, 'tasks', 'task-02.md')), [], '无 Wave → 空')
  const b = mkChange({ tasksMd })
  cmdTaskcard('c1', { cwd: b.root, taskIds: 'all' })
  assert.ok(existsSync(join(b.changeDir, 'tasks', 'task-01.md')), '无 plan.md 骨架照常生成')
  assert.deepEqual(frontmatterDepends(join(b.changeDir, 'tasks', 'task-02.md')), [], '无 plan.md → 空')
})
