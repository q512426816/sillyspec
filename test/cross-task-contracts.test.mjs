/**
 * 跨任务契约校验测试
 *
 * 命中场景：provider task 漏字段（如 DaemonRuntimeRead 缺 daemon_instance_id），
 * consumer 不知道，到运行时 fallback 编造字段 → 403/500。
 *
 * 覆盖三层防线：
 * 1. parseTaskContracts: 解析 provides / expects_from（plan 阶段产出）
 * 2. validateCrossTaskContracts: plan-postcheck 确定性对账（plan 阶段阻断）
 * 3. buildContractFieldInjection: execute 阶段字段注入（二次保险 + 禁止 fallback）
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseTaskContracts, validateCrossTaskContracts } from '../src/stages/plan-postcheck.js'
import { buildContractFieldInjection } from '../src/contract-matrix.js'

// ─── 辅助：构造 task-NN.md ───────────────────────────────────────────────

function taskFile(id, { provides, expectsFrom, body = '' } = {}) {
  const fm = ['---', `id: ${id}`, `title: ${id}`]
  if (provides) {
    fm.push('provides:')
    for (const p of provides) {
      fm.push(`  - contract: ${p.contract}`)
      fm.push(`    fields: [${p.fields.join(', ')}]`)
    }
  }
  if (expectsFrom) {
    fm.push('expects_from:')
    for (const [provider, contracts] of Object.entries(expectsFrom)) {
      fm.push(`  ${provider}:`)
      for (const c of contracts) {
        fm.push(`    - contract: ${c.contract}`)
        fm.push(`      needs: [${c.needs.join(', ')}]`)
      }
    }
  }
  fm.push('---', body || 'goal: >\n  test\nacceptance:\n  - test')
  return fm.join('\n') + '\n'
}

// ─── parseTaskContracts ─────────────────────────────────────────────────

describe('parseTaskContracts', () => {
  it('解析 provides', () => {
    const content = taskFile('task-05', {
      provides: [{ contract: 'DaemonRuntimeRead', fields: ['id', 'runtime_id', 'daemon_instance_id'] }],
    })
    const { provides, expectsFrom } = parseTaskContracts(content)
    assert.equal(provides.length, 1)
    assert.equal(provides[0].contract, 'DaemonRuntimeRead')
    assert.deepEqual(provides[0].fields, ['id', 'runtime_id', 'daemon_instance_id'])
    assert.deepEqual(expectsFrom, {})
  })

  it('解析嵌套 expects_from', () => {
    const content = taskFile('task-11', {
      expectsFrom: { 'task-05': [{ contract: 'DaemonRuntimeRead', needs: ['daemon_instance_id'] }] },
    })
    const { provides, expectsFrom } = parseTaskContracts(content)
    assert.deepEqual(provides, [])
    assert.ok(expectsFrom['task-05'])
    assert.equal(expectsFrom['task-05'][0].contract, 'DaemonRuntimeRead')
    assert.deepEqual(expectsFrom['task-05'][0].needs, ['daemon_instance_id'])
  })

  it('向后兼容：无契约字段的老 task 返回空', () => {
    const content = '---\nid: task-01\ntitle: old\n---\ngoal: >\n  old task'
    const { provides, expectsFrom } = parseTaskContracts(content)
    assert.deepEqual(provides, [])
    assert.deepEqual(expectsFrom, {})
  })

  it('非法 YAML frontmatter 容错返回空（不阻断）', () => {
    const content = '---\nid: task-01\nbroken: [a, b\n---\ngoal: >\n  bad'
    const { provides, expectsFrom } = parseTaskContracts(content)
    assert.deepEqual(provides, [])
    assert.deepEqual(expectsFrom, {})
  })

  it('无 frontmatter 返回空', () => {
    const { provides, expectsFrom } = parseTaskContracts('no frontmatter here')
    assert.deepEqual(provides, [])
    assert.deepEqual(expectsFrom, {})
  })
})

// ─── validateCrossTaskContracts ─────────────────────────────────────────

describe('validateCrossTaskContracts', () => {
  let changeDir
  const tasksDir = () => join(changeDir, 'tasks')

  beforeEach(() => {
    changeDir = join(tmpdir(), `sillyspec-cross-${Math.random().toString(36).slice(2)}`)
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  })
  afterEach(() => {
    try { rmSync(changeDir, { recursive: true, force: true }) } catch {}
  })

  it('通过：consumer needs 全在 provider provides 内', () => {
    writeFileSync(join(tasksDir(), 'task-05.md'), taskFile('task-05', {
      provides: [{ contract: 'DaemonRuntimeRead', fields: ['id', 'runtime_id', 'daemon_instance_id'] }],
    }))
    writeFileSync(join(tasksDir(), 'task-11.md'), taskFile('task-11', {
      expectsFrom: { 'task-05': [{ contract: 'DaemonRuntimeRead', needs: ['daemon_instance_id'] }] },
    }))
    const result = validateCrossTaskContracts(changeDir)
    assert.equal(result.ok, true, JSON.stringify(result.errors))
    assert.equal(result.errors.length, 0)
  })

  it('失败：provider 漏字段（命中 DaemonRuntimeRead bug 场景）', () => {
    // task-05 承诺 DaemonRuntimeRead 但漏了 daemon_instance_id
    writeFileSync(join(tasksDir(), 'task-05.md'), taskFile('task-05', {
      provides: [{ contract: 'DaemonRuntimeRead', fields: ['id', 'runtime_id'] }],
    }))
    // task-11（前端）期望拿到 daemon_instance_id
    writeFileSync(join(tasksDir(), 'task-11.md'), taskFile('task-11', {
      expectsFrom: { 'task-05': [{ contract: 'DaemonRuntimeRead', needs: ['daemon_instance_id'] }] },
    }))
    const result = validateCrossTaskContracts(changeDir)
    assert.equal(result.ok, false)
    assert.ok(
      result.errors.some(e => e.includes('daemon_instance_id') && e.includes('task-11') && e.includes('task-05')),
      `错误信息应点出 task-11/task-05/daemon_instance_id，实际: ${result.errors.join('; ')}`
    )
  })

  it('失败：provider 未声明该 contract', () => {
    writeFileSync(join(tasksDir(), 'task-05.md'), taskFile('task-05', {
      provides: [{ contract: 'OtherDTO', fields: ['a'] }],
    }))
    writeFileSync(join(tasksDir(), 'task-11.md'), taskFile('task-11', {
      expectsFrom: { 'task-05': [{ contract: 'DaemonRuntimeRead', needs: ['id'] }] },
    }))
    const result = validateCrossTaskContracts(changeDir)
    assert.equal(result.ok, false)
    assert.ok(result.errors.some(e => e.includes('未声明此契约')), result.errors.join('; '))
  })

  it('失败：consumer 引用了不存在的 provider task', () => {
    writeFileSync(join(tasksDir(), 'task-11.md'), taskFile('task-11', {
      expectsFrom: { 'task-99': [{ contract: 'X', needs: ['a'] }] },
    }))
    const result = validateCrossTaskContracts(changeDir)
    assert.equal(result.ok, false)
    assert.ok(result.errors.some(e => e.includes('task-99') && e.includes('不存在')), result.errors.join('; '))
  })

  it('向后兼容：老 task 无契约字段 → 通过', () => {
    writeFileSync(join(tasksDir(), 'task-01.md'), '---\nid: task-01\ntitle: old\n---\ngoal: >\n  old\nacceptance:\n  - a')
    const result = validateCrossTaskContracts(changeDir)
    assert.equal(result.ok, true)
  })

  it('无 tasks/ 目录 → 通过（none/light 兼容）', () => {
    rmSync(join(changeDir, 'tasks'), { recursive: true, force: true })
    const result = validateCrossTaskContracts(changeDir)
    assert.equal(result.ok, true)
  })

  it('多 consumer 多契约：一缺全报，互不掩盖', () => {
    writeFileSync(join(tasksDir(), 'task-05.md'), taskFile('task-05', {
      provides: [{ contract: 'A', fields: ['x'] }],
    }))
    // task-10 缺 y
    writeFileSync(join(tasksDir(), 'task-10.md'), taskFile('task-10', {
      expectsFrom: { 'task-05': [{ contract: 'A', needs: ['x', 'y'] }] },
    }))
    // task-11 缺 contract B 整个
    writeFileSync(join(tasksDir(), 'task-11.md'), taskFile('task-11', {
      expectsFrom: { 'task-05': [{ contract: 'A', needs: ['x'] }, { contract: 'B', needs: ['z'] }] },
    }))
    const result = validateCrossTaskContracts(changeDir)
    assert.equal(result.ok, false)
    assert.equal(result.errors.length, 2, result.errors.join('; '))
    assert.ok(result.errors.some(e => e.includes('task-10') && e.includes('y')))
    assert.ok(result.errors.some(e => e.includes('task-11') && e.includes('B')))
  })
})

// ─── buildContractFieldInjection（execute 阶段注入）──────────────────────

describe('buildContractFieldInjection', () => {
  let changeDir
  beforeEach(() => {
    changeDir = join(tmpdir(), `sillyspec-fi-${Math.random().toString(36).slice(2)}`)
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  })
  afterEach(() => {
    try { rmSync(changeDir, { recursive: true, force: true }) } catch {}
  })

  it('正常注入：consumer needs 全在 provider provides', () => {
    writeFileSync(join(changeDir, 'tasks', 'task-05.md'), taskFile('task-05', {
      provides: [{ contract: 'DaemonRuntimeRead', fields: ['id', 'daemon_instance_id'] }],
    }))
    writeFileSync(join(changeDir, 'tasks', 'task-11.md'), taskFile('task-11', {
      expectsFrom: { 'task-05': [{ contract: 'DaemonRuntimeRead', needs: ['daemon_instance_id'] }] },
    }))
    const inj = buildContractFieldInjection(changeDir, 'task-11')
    assert.ok(inj)
    assert.match(inj, /✅ task-05 → DaemonRuntimeRead/)
    assert.match(inj, /daemon_instance_id/)
    assert.match(inj, /禁止 fallback/)
  })

  it('CONTRACT_GAP 注入：provider 漏字段', () => {
    writeFileSync(join(changeDir, 'tasks', 'task-05.md'), taskFile('task-05', {
      provides: [{ contract: 'DaemonRuntimeRead', fields: ['id'] }],
    }))
    writeFileSync(join(changeDir, 'tasks', 'task-11.md'), taskFile('task-11', {
      expectsFrom: { 'task-05': [{ contract: 'DaemonRuntimeRead', needs: ['daemon_instance_id'] }] },
    }))
    const inj = buildContractFieldInjection(changeDir, 'task-11')
    assert.match(inj, /CONTRACT_GAP/)
    assert.match(inj, /daemon_instance_id/)
    assert.match(inj, /停止编码并上报/)
  })

  it('无 expects_from 返回 null（向后兼容）', () => {
    writeFileSync(join(changeDir, 'tasks', 'task-01.md'), '---\nid: task-01\ntitle: x\n---\ngoal: >\n  x')
    const inj = buildContractFieldInjection(changeDir, 'task-01')
    assert.equal(inj, null)
  })

  it('consumer task 文件不存在返回 null', () => {
    const inj = buildContractFieldInjection(changeDir, 'task-99')
    assert.equal(inj, null)
  })
})
