/**
 * 2026-10-06-fr-priority-overlap 回归：优先面传全量 fr.files（与 deps 重叠的绑定文件不再被帽弃）
 *
 * 背景（fr-regress-cap-drop 修复后的重测暴露）：runModuleSubset 传 priorityFiles: frLinked
 * （仅「新增」绑定子集）——与 import 依赖面重叠的绑定文件拿不到优先权，仍按普通依赖受 30 帽
 * 字母序弃置（2026-10-06-resume-title 收口实测：64 绑定文件弃 14）。
 *
 * 覆盖：
 *   ① 重叠形态：绑定文件 ∈ deps 且字母序最末 → 必入执行批命令（修复前被弃）
 *   ② 无 FR 索引：纯字母序配额帽行为与现状一致（最末文件被弃）
 *   ③ test:core 清单驻留断言（防移出日常拦截面）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { runModuleSubset } = await import(pathToFileURL(join(ROOT, '..', 'src', 'verify-postcheck.js')).href)

const ORDINARY = 40

/** 依赖 fixture：src/lib.js + 41 个 import 它的测试（zz-bound 同时是 FR 绑定文件）。 */
function fixture({ withFr }) {
  const root = mkdtempSync(join(tmpdir(), 'frpo-'))
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'changes'), { recursive: true })
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(root, 'src', 'lib.js'), 'export const a = 1\n')
  const testBody = (n) => [
    `import { test } from 'node:test'`,
    `import { a } from '../src/lib.js'`,
    `test('${n}', () => { if (a !== 1) throw new Error('x') })`,
    '',
  ].join('\n')
  for (let i = 0; i < ORDINARY; i++) {
    writeFileSync(join(root, 'test', `a${String(i).padStart(3, '0')}-ord.test.mjs`), testBody(`ord${i}`))
  }
  writeFileSync(join(root, 'test', 'zz-bound.test.mjs'), testBody('bound'))
  if (withFr) {
    mkdirSync(join(specBase, 'knowledge', 'fr'), { recursive: true })
    mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
    mkdirSync(join(specBase, 'changes', 'archive', '2026-09-20-old-change'), { recursive: true })
    writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'), 'modules:\n  core:\n    paths:\n      - src/\n')
    writeFileSync(join(specBase, 'changes', 'archive', '2026-09-20-old-change', 'change-patch.json'), '{"files": ["src/lib.js"]}\n')
    writeFileSync(join(specBase, 'knowledge', 'fr', 'core.md'), [
      '## FR-core-001 库行为',
      '变更：2026-09-20-old-change',
      '状态：active',
      '摘要：默认场景',
      '',
      '测试绑定：',
      '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
      '- row: 2026-09-20-old-change:task-01:FR-01',
      '  tests: test/zz-bound.test.mjs',
      '  reason: spec',
      '  state: candidate',
      '  discovery: machine',
      '  confirmed_by: null',
      '  confirmed_at: null',
      '',
    ].join('\n'))
  }
  return { root, specBase }
}

/** 跑 runModuleSubset（吞批日志噪声），读落盘 test-result.json 的 deps(auto-js) 命令。 */
async function runAndReadCommand(root, specBase) {
  const origLog = console.log
  console.log = () => {}
  try {
    const result = await runModuleSubset({ cwd: root, specBase, changeName: 'c1', hits: [], changedFiles: ['src/lib.js'] })
    const runsDir = join(specBase, '.runtime', 'verify-runs')
    const latest = existsSync(runsDir) ? readdirSync(runsDir).sort().pop() : null
    assert.ok(latest, 'verify-runs 落盘在场')
    const tr = JSON.parse(readFileSync(join(runsDir, latest, 'test-result.json'), 'utf8'))
    const cmd = ((tr.modules || []).find((m) => m.name === 'deps(auto-js)') || {}).command || ''
    return { result, cmd }
  } finally {
    console.log = origLog
  }
}

test('① 重叠形态：绑定文件 ∈ deps 且字母序最末 → 必入执行批（修复前被 30 帽弃置）', async () => {
  const { root, specBase } = fixture({ withFr: true })
  try {
    const { result, cmd } = await runAndReadCommand(root, specBase)
    assert.equal(result.status, 'passed', `批应 passed，reason=${result.reason}`)
    assert.ok(cmd.includes('node --test'), 'deps(auto-js) 命令在场')
    assert.ok(cmd.includes('test/zz-bound.test.mjs'), `重叠绑定文件必须在执行命令中（字母序最末，无优先权时必被弃），命令：${cmd.slice(0, 160)}…`)
    // 标签如实（FR-02）：帽内时 N=帽值（绑定文件占帽内席位而非加帽），fr(M)=绑定面数
    assert.ok(result.command.includes('deps(js30)+fr(1)'), `披露标签应如实反映实跑与绑定面，实际：${result.command}`)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('② 无 FR 索引：纯字母序配额帽行为现状一致（最末文件被弃、批 passed）', async () => {
  const { root, specBase } = fixture({ withFr: false })
  try {
    const { result, cmd } = await runAndReadCommand(root, specBase)
    assert.equal(result.status, 'passed')
    assert.ok(!cmd.includes('zz-bound'), '无绑定面时 zz-bound 按普通依赖受帽（现状钉：字母序最末被弃）')
    const files = cmd.split(' ').filter((t) => t.startsWith('test/'))
    assert.equal(files.length, 30, `帽内 30 个（现状），实际 ${files.length}`)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('③ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/fr-priority-overlap.test.mjs'),
    'test:core 必须包含 test/fr-priority-overlap.test.mjs',
  )
})
