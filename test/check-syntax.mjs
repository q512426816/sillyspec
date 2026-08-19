import { execFileSync } from 'node:child_process'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function collect(root) {
  const files = []
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (/\.(js|cjs|mjs)$/.test(entry)) files.push(full)
    }
  }
  walk(root)
  return files
}

const srcFiles = collect('src')
const testFiles = collect('test')

// 1. 语法检查（src + test）
const allFiles = [...srcFiles, ...testFiles].sort()
for (const file of allFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
}

// 2. 内容规则：test/ 禁用 console 的 assert 方法（拆字定义 BAD，避免本文件自匹配）。
//    该方法失败只打印不抛，run-tests.mjs runner 按 exit 0 判通过 → 断言全假也显示绿。
//    test/ 必须用 node:assert（失败抛错→非零 exit→runner 捕获）。
const BAD = 'console' + '.assert'
const contentErrors = []
for (const file of testFiles.sort()) {
  const content = readFileSync(file, 'utf8')
  if (content.includes(BAD)) {
    contentErrors.push(`${file}: 禁用 ${BAD}（失败不抛致 runner 误判通过），改用 node:assert 的 assert()`)
  }
}
if (contentErrors.length) {
  console.error('\n⚠️ lint 内容规则违规（test/）：')
  for (const e of contentErrors) console.error('  - ' + e)
  process.exit(1)
}

// 3. 未引用导出检测（22e-b，性能#7）：src/ 非入口模块的 export 符号在 src/+test/ 其余文件
//    零引用即报（A6 propose.js 死码、22d onboard 孤儿先例只能人肉 grep 发现）。
//    入口白名单：bin 入口、CLI index.js、各 stage 定义（动态经 stages/index.js registry 消费）。
//    判定是文本级（import { X } / import(X) / 字符串引用），不解析 AST——零依赖与现有 lint 一致。
const ENTRY_WHITELIST = new Set([
  'src/index.js', 'src/version.js', 'src/db.js', 'src/db-engine.js',
  'src/fs-atomic.js', 'src/git-helper.js', 'src/version.js',
  'src/docs-check.js', // applyFixes 经 CLI index.js docs 子命令消费（task-03 接线前零文本引用，2026-08-18-platform-map-auto-anchors）
])
const dynamicEntryPatterns = [
  /await import\('\.\/stages\/(\w+)\.js'\)/,   // stages/index.js registry
]
const deadExports = []
const srcContents = new Map() // file -> content（复用读取）
for (const f of srcFiles) srcContents.set(f.replaceAll('\\', '/'), readFileSync(f, 'utf8'))
const testContents = new Map()
for (const f of testFiles) testContents.set(f.replaceAll('\\', '/'), readFileSync(f, 'utf8'))
// 全体内容合串（引用检测语料）；排除待检文件自身
const allContent = [...srcContents.entries(), ...testContents.entries()]

for (const [file, content] of srcContents) {
  if (ENTRY_WHITELIST.has(file)) continue
  // stage 定义与 workflow 脚本经 registry/动态加载消费，跳过
  if (file.startsWith('src/stages/') || file.startsWith('src/scan-diff')) continue
  const namedExports = [...content.matchAll(/export\s+(?:async\s+)?(?:function|const|class)\s+([A-Za-z_$][\w$]*)/g)]
    .map(m => m[1])
  if (namedExports.length === 0) continue
  const isStageIndex = file === 'src/stages/index.js'
  if (isStageIndex) continue // registry 自身
  for (const sym of namedExports) {
    // 宽松文本级判定：符号名出现在其他任一 src/+test/ 文件即算引用（防误报优先；
    // 动态 import 字符串路径、destructure、注释提及都会命中——代价是漏报，可接受）
    const refRe = new RegExp(`\\b${sym}\\b`)
    const referenced = allContent.some(([f2, c2]) => f2 !== file && refRe.test(c2))
    if (!referenced) {
      deadExports.push(`${file}: export \`${sym}\` 在 src/+test/ 其余文件零引用`)
    }
  }
}
if (deadExports.length) {
  // hard fail（22e-b 首版 advisory → 21 候选全仓核验后收紧）：text 级判定只查「src+test 其余文件
  // 零引用」——packages/bin/templates 不 import src（实证），stages/ 与 scan-diff 动态加载已跳过，
  // 入口模块白名单豁免。确为有意导出（如供外部包消费）时用注释标注或收进白名单，勿静默积累死码。
  console.error(`\n❌ 未引用导出 ${deadExports.length} 项（src/ 死码：src+test 其余文件零引用，见 22e-b 裁决）：`)
  for (const e of deadExports) console.error('  - ' + e)
  process.exit(1)
}

console.log(`Checked ${allFiles.length} JavaScript files (src ${srcFiles.length} + test ${testFiles.length}); test/ 内容规则通过 + 未引用导出 ${deadExports.length} 项（hard fail）`)
