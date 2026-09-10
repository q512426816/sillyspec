/**
 * docs check 输出降噪（2026-09-10 驾驭小结第二批③）。
 *
 * 痛点：advisory（变更名提名悬空，warn 语义）与硬失效（invalid，exit code 语义）混在同一
 * 检查输出里；同一引用在同文档行重复出现时逐条原样列出（platform-interface-map.md:L73 三连），
 * 提名悬空同一名字多处逐条刷屏——信噪比低。
 *
 * 锁定语义（纯渲染层，不改 invalid 集与 exit code）：
 *   - 硬失效显示去重：同 doc+docLine+ref 的重复 invalid 只显示一次（带 ×N 次数标注）
 *   - advisory 尾部分区：变更名提名段固定在硬失效区块之后（含修复指引行之后），标题明确
 *     「advisory 不阻断、不进 exit code」，与硬失效的 ❌ 视觉分离
 *   - advisory 按名聚合：同一悬空名多处提名 → 一行（名字 + 提及处数 + 首处定位），封顶展示
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const binCLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')

const tmpRoots = []
function mkProject(prefix = 'docs-noise-') {
  const root = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(root)
  return root
}
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function runCheck(root) {
  // docs check 硬失效 → exit 1 是既有语义（advisory 不进 exit code）——用 spawnSync 捕获
  const r = spawnSync(process.execPath, [binCLI, 'docs', 'check'], {
    cwd: root, encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'],
  })
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') }
}

test('硬失效去重：同 doc 行同 ref 重复 invalid 只显示一次带 ×N；advisory 尾部分区 + 按名聚合', () => {
  const root = mkProject()
  const specBase = join(root, '.sillyspec')
  // 源文件：一个符号，锚点行在 5 行附近
  mkdirSync(join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src', 'core.js'), 'line1\nline2\nline3\nmarkerFn\nline5\nline6\nline7\n')
  // 文档：① 同一行重复引用同 ref 两次（构造重复 invalid——runDocsCheck 对同行多次引用逐条收集）
  //       ② 两行重复同一失效 ref（不同 docLine 不去重，各显示一次）
  //       ③ 变更名悬空提名：同一名字 3 处（不同文件）→ advisory 聚合一行
  mkdirSync(join(root, 'docs'), { recursive: true })
  writeFileSync(join(root, 'docs', 'guide.md'), [
    '# Guide',
    '',
    '引用见 src/core.js:99 旧锚（markerFn）与 src/core.js:99 再提一次。',
    '另一行失效锚：src/core.js:98（markerFn）。',
    '相关变更 2099-01-01-dangling-name 的讨论，另见 2099-01-01-dangling-name 补充。',
    '',
  ].join('\n'))
  mkdirSync(join(root, 'docs', 'sub'), { recursive: true })
  writeFileSync(join(root, 'docs', 'sub', 'note.md'), [
    '# Note',
    '',
    '第三处提及 2099-01-01-dangling-name。',
    '',
  ].join('\n'))
  // 让 docs check 扫到这些文档：local.yaml 最小配置
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), [
    'docs_check:',
    '  paths:',
    '    - "docs/**/*.md"',
    '',
  ].join('\n'))
  // 基线不参与本命令（docs check 不读基线，gate 才读）

  const { status, out } = runCheck(root)
  // advisory 与硬失效分区：advisory 标题出现在修复指引之后（尾部）
  assert.match(out, /变更名提名悬空/, 'advisory 段标题存在')
  const advisoryIdx = out.indexOf('变更名提名悬空')
  const guideIdx = out.indexOf('修复指引')
  assert.ok(guideIdx >= 0, '硬失效区块与修复指引存在')
  assert.ok(advisoryIdx > guideIdx, 'advisory 段位于修复指引之后（尾部分区）')
  // 按名聚合：悬空名只在聚合行出现一次（豁免键提示里的名字不计——收紧到「提及悬空」行）
  const nameHits = out.match(/「2099-01-01-dangling-name」\d+ 处提及悬空/g) || []
  assert.equal(nameHits.length, 1, `悬空名聚合为一行（实际聚合行 ${nameHits.length} 条）`)
  assert.match(out, /「2099-01-01-dangling-name」3 处提及悬空/, '聚合行含提及计数（3 处）')
  // 硬失效显示去重：guide.md:L3 行同 ref 两次 → 该 (doc, line, ref) 组合只一行且带 ×2
  const l3Hits = out.match(/docs\/guide\.md:L3.*src\/core\.js:99/g) || []
  assert.equal(l3Hits.length, 1, `同行同引用只显示一次（实际 ${l3Hits.length} 行）`)
  assert.match(out, /docs\/guide\.md:L3.*×2/, '重复标注 ×2')
  // 硬失效计数行不变（invalid 集不动，显示数 < 总数时给折叠行）
  assert.match(out, /docs check: \d+\/\d+ 处引用失效/, '硬失效计数行仍是主输出')
  assert.match(out, /已折叠 1 条同文档行同引用的重复条目/, '折叠说明行存在')
  // exit code 语义未动：硬失效存在 → exit 1（advisory 不参与）
  assert.equal(status, 1, 'docs check 硬失效 exit 1 维持（advisory 不进 exit code）')
})
