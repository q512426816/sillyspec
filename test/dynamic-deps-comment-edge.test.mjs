/**
 * 依赖推断三缺陷修复防回归（坑 dynamic-deps-e2e-vitest-exclude-false-red，2026-09-30
 * multi-agent-platform flow done 实证，用户授权修复）：
 *
 * ① 依赖命中只认代码内引用——剥注释（字符串感知）后匹配：注释里字面引用源文件完整
 *    路径（e2e 用例的出处标注）不再算依赖边；import/require/dynamic import/vi.mock
 *    等代码内引用照常命中。
 * ② isTestFilePath 补 jsx|tsx：.test.tsx/.spec.jsx 算测试文件（自家 tsx 测试进依赖面，
 *    不再被当 src 漏跑）。
 * ③ jsProject 批过滤端到端目录（e2e/cypress）：vitest/jest 收集面普遍 exclude 这些
 *    目录，点名传入必「No test files found」exit 1 恒假红——过滤后进 skip 批留痕；
 *    jsNative 批（node:test 协议）不受影响。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { discoverModuleDependentTests, buildDepsBatches } from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

// ── ① 剥注释匹配 ─────────────────────────────────────────────────────

test('注释里引用源文件完整路径（行注释+块注释）→ 不算依赖边', () => {
  const root = mk('cmt-1-')
  mkdirSync(join(root, 'frontend', 'src', 'components'), { recursive: true })
  mkdirSync(join(root, 'e2e'), { recursive: true })
  writeFileSync(join(root, 'frontend', 'src', 'components', 'top-bar.tsx'), 'export const x = 1\n')
  writeFileSync(join(root, 'e2e', 'auth.spec.ts'),
    `import { expect, test } from "@playwright/test";\n` +
    `// 登出入口（frontend/src/components/top-bar.tsx）：aria-label="用户菜单"\n` +
    `/* 块注释（frontend/src/components/top-bar.tsx）也引用 */\n` +
    `test('login', () => { expect(1).toBe(1) })\n`)
  const deps = discoverModuleDependentTests({ cwd: root, changedFiles: ['frontend/src/components/top-bar.tsx'], coveredCommands: [] })
  assert.ok(!deps.includes('e2e/auth.spec.ts'), `注释引用不算依赖边（实得 ${deps}）`)
})

test('代码内 import 引用照常命中（静态 import / dynamic import / vi.mock 路径串）', () => {
  const root = mk('cmt-2-')
  mkdirSync(join(root, 'test'), { recursive: true })
  mkdirSync(join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src', 'foo.js'), 'export const a = 1\n')
  writeFileSync(join(root, 'test', 'static.test.mjs'), "import { a } from '../src/foo.js'\n")
  writeFileSync(join(root, 'test', 'dyn.test.mjs'), "const { a } = await import('../src/foo.js')\n")
  writeFileSync(join(root, 'test', 'mock.test.mjs'), "vi.mock('../src/foo.js', () => ({}))\n")
  const deps = discoverModuleDependentTests({ cwd: root, changedFiles: ['src/foo.js'], coveredCommands: [] })
  assert.ok(deps.includes('test/static.test.mjs'), `静态 import 命中（实得 ${deps}）`)
  assert.ok(deps.includes('test/dyn.test.mjs'), 'dynamic import 命中')
  assert.ok(deps.includes('test/mock.test.mjs'), 'vi.mock 代码内路径串命中')
})

test('字符串感知：URL 里的 // 不被当行注释剥（同行后续真引用仍命中）', () => {
  const root = mk('cmt-3-')
  mkdirSync(join(root, 'test'), { recursive: true })
  mkdirSync(join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src', 'foo.js'), 'export const a = 1\n')
  writeFileSync(join(root, 'test', 'url.test.mjs'),
    `const base = 'https://example.com/api'; import { a } from '../src/foo.js'\n`)
  const deps = discoverModuleDependentTests({ cwd: root, changedFiles: ['src/foo.js'], coveredCommands: [] })
  assert.ok(deps.includes('test/url.test.mjs'), `字符串内 // 不截断同行真引用（实得 ${deps}）`)
})

test('Python：# 注释里的 from X import Y 不算依赖边，代码内 import 照常命中', () => {
  const root = mk('cmt-4-')
  mkdirSync(join(root, 'app'), { recursive: true })
  mkdirSync(join(root, 'tests'), { recursive: true })
  writeFileSync(join(root, 'app', 'foo.py'), 'X = 1\n')
  writeFileSync(join(root, 'tests', 'mention_test.py'), '# 见 app/foo.py 的 from app.foo import X\n')
  writeFileSync(join(root, 'tests', 'real_test.py'), 'from app.foo import X\n')
  const deps = discoverModuleDependentTests({ cwd: root, changedFiles: ['app/foo.py'], coveredCommands: [] })
  assert.ok(!deps.includes('tests/mention_test.py'), `py 注释引用不算依赖边（实得 ${deps}）`)
  assert.ok(deps.includes('tests/real_test.py'), 'py 代码内 import 命中')
})

// ── ② isTestFilePath 补 jsx|tsx ──────────────────────────────────────

test('.test.tsx/.spec.jsx 算测试文件：自家变更测试进依赖面 + tsx 测试的代码引用可被发现', () => {
  const root = mk('tsx-1-')
  mkdirSync(join(root, 'src', '__tests__'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(root, 'src', 'foo.js'), 'export const a = 1\n')
  // tsx 测试放 test/ 下、import 串含 'src/foo.js' 子串（与既有匹配语义一致——路径串包含）
  writeFileSync(join(root, 'test', 'bar.test.tsx'), "import { a } from '../src/foo.js'\n")
  writeFileSync(join(root, 'src', '__tests__', 'qux.spec.jsx'), "import {} from 'vitest'\n")
  // 变更的 tsx 测试文件本身 → changedTests 直入
  let deps = discoverModuleDependentTests({ cwd: root, changedFiles: ['src/__tests__/qux.spec.jsx'], coveredCommands: [] })
  assert.deepEqual(deps, ['src/__tests__/qux.spec.jsx'], '变更的 .spec.jsx 自身进依赖面')
  // tsx 测试内代码引用变更 src → collectTestFiles 收集得到（原正则漏配收不到）
  deps = discoverModuleDependentTests({ cwd: root, changedFiles: ['src/foo.js'], coveredCommands: [] })
  assert.ok(deps.includes('test/bar.test.tsx'), `tsx 测试代码引用被发现（实得 ${deps}）`)
})

// ── ③ jsProject 批过滤端到端目录 ─────────────────────────────────────

function setupFe(root) {
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fe', devDependencies: { vitest: '^2.0.0' } }))
  writeFileSync(join(root, 'pnpm-lock.yaml'), '')
  mkdirSync(join(root, 'test'), { recursive: true })
  mkdirSync(join(root, 'e2e'), { recursive: true })
  writeFileSync(join(root, 'test', 'foo.test.tsx'), "import { test } from 'vitest'\n")
  writeFileSync(join(root, 'e2e', 'auth.spec.ts'), "import { expect, test } from '@playwright/test'\n")
}

test('e2e 文件不进 vitest 批：命令只含非 e2e 文件，e2e 进 skip 批留痕', () => {
  const root = mk('e2e-1-')
  setupFe(root)
  const batches = buildDepsBatches({
    deps: ['test/foo.test.tsx', 'e2e/auth.spec.ts'],
    changedFiles: [], hits: [], cwd: root,
  })
  const jsx = batches.find(b => b.short === 'jsx')
  assert.ok(jsx, 'jsx 批在场（非 e2e 文件照常组批）')
  assert.ok(!/e2e/.test(jsx.command), `命令不含 e2e 文件（实得 ${jsx.command}）`)
  assert.ok(jsx.command.includes('test/foo.test.tsx'), '命令含真实单测文件')
  const e2eSkip = batches.find(b => b.short === 'jsx-e2e-skip')
  assert.ok(e2eSkip, 'e2e skip 批在场（留痕不拦门）')
  assert.equal(e2eSkip.skip, true)
  assert.deepEqual(e2eSkip.files, ['e2e/auth.spec.ts'])
  assert.equal(e2eSkip.command, null, 'skip 批无命令（不产恒败段）')
})

test('deps 全是 e2e 文件 → 只有 skip 批，不产 vitest 命令（No test files found 假红根除）', () => {
  const root = mk('e2e-2-')
  setupFe(root)
  const batches = buildDepsBatches({ deps: ['e2e/auth.spec.ts'], changedFiles: [], hits: [], cwd: root })
  assert.ok(!batches.some(b => b.short === 'jsx' && b.command), '无 jsx 命令批')
  assert.ok(!batches.some(b => b.command && /e2e/.test(b.command)), `任何批都不点名 e2e 文件（实得 ${JSON.stringify(batches.map(b => b.command))}）`)
  assert.ok(batches.some(b => b.short === 'jsx-e2e-skip' && b.skip), 'e2e skip 批留痕')
})

test('边界：e2e 目录下 node:test 协议文件仍走 jsNative 批（过滤只作用于项目运行器批）', () => {
  const root = mk('e2e-3-')
  setupFe(root)
  writeFileSync(join(root, 'e2e', 'plain.spec.ts'), "import { test } from 'node:test'\n")
  const batches = buildDepsBatches({ deps: ['e2e/plain.spec.ts'], changedFiles: [], hits: [], cwd: root })
  const jsNative = batches.find(b => b.short === 'js')
  assert.ok(jsNative, 'jsNative 批在场（node 原生可跑形态不受过滤影响）')
  assert.ok(jsNative.command.includes('e2e/plain.spec.ts'), '命令含该文件')
})
