/**
 * module 子集测试面依赖测试自动发现（坑 module-test-face-rot，2026-09-16 本会话 5325f55
 * 实证：local.yaml modules 的 test 命令是硬编码文件清单，src/verify-probes.js 命中 cli-core
 * 但其断言测试 verify-probes-facts.test.mjs 不在清单 → quick --done 的 module 收窄实测漏掉
 * 全量断言（骨架章节计数），回归漏到合并态全量才暴露）。
 *
 * 锁定语义（discoverModuleDependentTests）：
 *   - 变更 src 文件的直接 import 测试（test/*.test.* 内含 ../src/<changed> 引用）→ 发现
 *   - 变更的 test 文件本身 → 发现（自身就该跑）
 *   - 已被命中模块命令串覆盖（命令串含该文件名）→ 排除
 *   - 无变更/无 test 目录/无可发现 → []（零行为）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { discoverModuleDependentTests } from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function setup(cwd) {
  mkdirSync(join(cwd, 'test'), { recursive: true })
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'foo.js'), 'export const a = 1\n')
  writeFileSync(join(cwd, 'src', 'run'), '') // 占位防误用（目录形态由用例自建）
  rmSync(join(cwd, 'src', 'run'))
  writeFileSync(join(cwd, 'test', 'foo-assert.test.mjs'), "import { a } from '../src/foo.js'\nimport assert from 'node:assert/strict'\nassert.ok(a)\n")
  writeFileSync(join(cwd, 'test', 'dynamic-import.test.mjs'), "const { a } = await import('../src/foo.js')\n")
  writeFileSync(join(cwd, 'test', 'unrelated.test.mjs'), "import assert from 'node:assert/strict'\nassert.ok(true)\n")
}

test('变更 src 文件 → 直接 import 测试被发现（静态+动态 import）；无关测试不收', () => {
  const cwd = mk('msd-1-')
  setup(cwd)
  const deps = discoverModuleDependentTests({ cwd, changedFiles: ['src/foo.js'], coveredCommands: [] })
  assert.ok(deps.includes('test/foo-assert.test.mjs'), `静态 import 发现（实际 ${deps}）`)
  assert.ok(deps.includes('test/dynamic-import.test.mjs'), '动态 import 发现')
  assert.ok(!deps.includes('test/unrelated.test.mjs'), '无关测试不收')
})

test('已被命中模块命令串覆盖 → 排除（不重复跑）', () => {
  const cwd = mk('msd-2-')
  setup(cwd)
  const deps = discoverModuleDependentTests({
    cwd, changedFiles: ['src/foo.js'],
    coveredCommands: ['node --test test/foo-assert.test.mjs test/other.test.mjs'],
  })
  assert.ok(!deps.includes('test/foo-assert.test.mjs'), '命令串已含 → 排除')
  assert.ok(deps.includes('test/dynamic-import.test.mjs'), '未覆盖的仍发现')
})

test('变更 test 文件本身 → 发现（即使无 src 变更命中它）', () => {
  const cwd = mk('msd-3-')
  setup(cwd)
  const deps = discoverModuleDependentTests({ cwd, changedFiles: ['test/unrelated.test.mjs'], coveredCommands: [] })
  assert.deepEqual(deps, ['test/unrelated.test.mjs'])
})

test('无变更 / 无 test 目录 / 反斜杠路径形态 → 零行为或容错', () => {
  const cwd = mk('msd-4-')
  assert.deepEqual(discoverModuleDependentTests({ cwd, changedFiles: [], coveredCommands: [] }), [])
  assert.deepEqual(discoverModuleDependentTests({ cwd, changedFiles: ['src/foo.js'], coveredCommands: [] }), [], '无 test 目录 → []')
  setup(cwd)
  const deps = discoverModuleDependentTests({ cwd, changedFiles: ['src\\foo.js'], coveredCommands: [] })
  assert.ok(deps.includes('test/foo-assert.test.mjs'), 'Windows 反斜杠形态归一后命中')
})

test('src 内子目录路径（src/run/shared.js）→ 测试内 ../src/run/shared.js 引用命中', () => {
  const cwd = mk('msd-5-')
  mkdirSync(join(cwd, 'test'), { recursive: true })
  mkdirSync(join(cwd, 'src', 'run'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'run', 'shared.js'), 'export const s = 1\n')
  writeFileSync(join(cwd, 'test', 'shared-assert.test.mjs'), "import { s } from '../src/run/shared.js'\n")
  const deps = discoverModuleDependentTests({ cwd, changedFiles: ['src/run/shared.js'], coveredCommands: [] })
  assert.deepEqual(deps, ['test/shared-assert.test.mjs'])
})
