/**
 * docs-check repo:// 跨仓引用 — 2026-08-20 负面问题修复（跨设备目录差异）
 *
 * 背景：文档引用外部仓文件（如主仓审计文档引用工具仓 doctor.js）时，checker 按本仓根
 * 解析必然失效；且不同设备兄弟仓库位置不同，硬编码兄弟路径也会在别的机器误报。
 *
 * 方案：`repo://<仓库名>/<路径>.js:行` 显式标记 + local.yaml docs-check.cross_repo_roots
 * 每设备映射。行为锁定：
 *   A. 未配映射 → 跳过不计失效（crossRepoSkipped 计数，total 不含）
 *   B. 配了映射 → 唯一候选 = <映射根>/<路径>，走同款层1（行号边界）+ 层2（关键词窗口）
 *   C. 配了映射但文件不存在 → invalid，reason 带跨仓前缀与映射根
 *   D. 本地引用（无前缀）行为不变
 *   E. collectDocRefs 纯函数：repo/file/start/end 解析正确
 *
 * 用法：node test/docs-check-cross-repo.test.mjs（run-tests.mjs 自动收集）
 * 铁律：只读 src；临时仓用 mkdtemp；CRLF/LF 兼容。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { runDocsCheck, collectDocRefs } from '../src/docs-check.js'

let passed = 0
let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

// ── E. collectDocRefs 解析 ─────────────────────────────────────────────────
{
  const md = '见 repo://sillyspec/src/stages/doctor.js:69 与 src/index.js:100-110 两处'
  const refs = collectDocRefs(md)
  assertTrue(refs.length === 2, `两处引用都被提取（实际 ${refs.length}）`)
  const cross = refs.find((r) => r.repo)
  assertTrue(!!cross && cross.repo === 'sillyspec', 'repo:// 前缀解析出仓库名 sillyspec')
  assertTrue(!!cross && cross.file === 'src/stages/doctor.js', 'repo:// 后路径正确剥离前缀')
  assertTrue(!!cross && cross.start === 69 && cross.end === 69, '单行行号正确')
  const local = refs.find((r) => !r.repo)
  assertTrue(!!local && local.repo === null && local.file === 'src/index.js', '本地引用不受影响（repo=null）')
  assertTrue(!!local && local.start === 100 && local.end === 110, '范围行号正确（100-110）')
}

// ── 临时环境：主仓 + 兄弟仓 ────────────────────────────────────────────────
function setup(base) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), base))
  const mainRepo = path.join(root, 'main-repo')
  const sibling = path.join(root, 'sibling-repo')
  fs.mkdirSync(path.join(mainRepo, 'docs'), { recursive: true })
  fs.mkdirSync(path.join(sibling, 'src'), { recursive: true })
  return { root, mainRepo, sibling }
}

{
  const { mainRepo, sibling } = setup('dcr-a-')
  fs.writeFileSync(path.join(sibling, 'src', 'tool.js'), 'line0\nfunction triggerPull() {}\nline2\n')
  fs.writeFileSync(
    path.join(mainRepo, 'docs', 'audit.md'),
    '跨仓引用 `triggerPull` 见 repo://tool/src/tool.js:2\n',
  )

  // A. 未配映射 → 跳过不计失效
  const rA = runDocsCheck({ projectRoot: mainRepo })
  assertTrue(rA.ok, 'A: 未配映射 → ok=true（跳过不判失效）')
  assertTrue(rA.crossRepoSkipped === 1, `A: crossRepoSkipped=1（实际 ${rA.crossRepoSkipped}）`)
  assertTrue(rA.total === 0, `A: total 不含被跳过的跨仓引用（实际 ${rA.total}）`)

  // B. 配了映射 → 真校验（行号+关键词窗口全过）
  const rB = runDocsCheck({ projectRoot: mainRepo, crossRepoRoots: { tool: sibling } })
  assertTrue(rB.ok, 'B: 配映射 → 校验通过')
  assertTrue(rB.total === 1 && rB.kwChecked === 1, `B: total=1 kwChecked=1（实际 ${rB.total}/${rB.kwChecked}）`)
  assertTrue(rB.crossRepoSkipped === 0, 'B: 无跳过')

  // C. 配了映射但行号错 → invalid，reason 含跨仓标记
  fs.writeFileSync(path.join(mainRepo, 'docs', 'audit.md'), '见 repo://tool/src/tool.js:99\n')
  const rC = runDocsCheck({ projectRoot: mainRepo, crossRepoRoots: { tool: sibling } })
  assertTrue(!rC.ok && rC.invalid.length === 1, 'C: 行号越界 → invalid')
  assertTrue(rC.invalid[0].reason.includes('repo://tool'), `C: reason 带跨仓上下文（实际：${rC.invalid[0].reason}）`)

  // C2. 映射根下文件不存在 → invalid
  fs.writeFileSync(path.join(mainRepo, 'docs', 'audit.md'), '见 repo://tool/src/gone.js:1\n')
  const rC2 = runDocsCheck({ projectRoot: mainRepo, crossRepoRoots: { tool: sibling } })
  assertTrue(!rC2.ok && rC2.invalid[0].reason.includes('cross_repo_roots'), 'C2: 文件不存在 reason 指引映射根')

  // D. 本地引用行为不变（同文档混写本地+跨仓）
  fs.mkdirSync(path.join(mainRepo, 'src'), { recursive: true })
  fs.writeFileSync(path.join(mainRepo, 'src', 'local.js'), 'a\nb\n')
  fs.writeFileSync(path.join(mainRepo, 'docs', 'audit.md'), '本地 local.js:1 与 repo://tool/src/tool.js:2\n')
  const rD = runDocsCheck({ projectRoot: mainRepo, crossRepoRoots: { tool: sibling } })
  assertTrue(rD.ok && rD.total === 2, `D: 混写时本地+跨仓都校验（total=${rD.total}）`)

  // A2. 混写且未配映射 → 只有本地引用计入
  const rD2 = runDocsCheck({ projectRoot: mainRepo })
  assertTrue(rD2.ok && rD2.total === 1 && rD2.crossRepoSkipped === 1, `A2: 未配映射只校本地（total=${rD2.total} skip=${rD2.crossRepoSkipped}）`)
}

console.log('—'.repeat(60))
if (failed > 0) {
  console.error(`❌ docs-check-cross-repo: ${passed} 通过 / ${failed} 失败`)
  process.exit(1)
}
console.log(`✅ docs-check-cross-repo: ${passed} 通过 / ${failed} 失败`)
