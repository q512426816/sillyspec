/**
 * 提取器路径可移植（2026-11-22-recommend-anchor-recorrect FR-03）
 *
 * 背景：docs/prompt/_extract.mjs 的 demo 变更目录由 root=__dirname 推导出绝对路径，
 * 渗进 buildPlanSteps/buildExecuteSteps 生成的 prompt 文本——worktree/任意目录下运行
 * 提取，产物 _extracted.json 含环境绝对路径（mattpocock-absorb 票 04/05 各撞一次路径
 * 噪音，只能 git checkout 还原）。修法：写盘前归一化为仓相对形；归一函数 export 直测。
 * 配套 main-guard：import 本模块零副作用（脚本直接运行才执行提取主体）。
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== 提取器路径可移植（sanitizeDemoPath）===\n')

// ── 1. import 零副作用（main-guard）：模块可导入且不抛 ──
console.log('--- 1. import 零副作用 ---')
let mod
try {
  mod = await import(pathToFileURL(join(ROOT, '..', 'docs', 'prompt', '_extract.mjs')).href)
  assertTrue(typeof mod.sanitizeDemoPath === 'function', 'sanitizeDemoPath 已导出（可导入直测）')
} catch (e) {
  assertTrue(false, `import _extract.mjs 不应有副作用或错误（实际：${String(e).slice(0, 120)}）`)
}

if (mod && typeof mod.sanitizeDemoPath === 'function') {
  // ── 2. 归一函数直测：反斜杠/正斜杠/JSON 转义三种形态 → 仓相对形 ──
  console.log('\n--- 2. 归一直测（三形态）---')
  {
    const demo = 'C:\\wt\\some-worktree\\.sillyspec\\changes\\2026-05-13-demo-change'
    const rel = '.sillyspec/changes/2026-05-13-demo-change'
    const out1 = mod.sanitizeDemoPath(`变更目录：${demo}`, demo)
    assertTrue(out1 === `变更目录：${rel}`, `反斜杠绝对路径归一为仓相对形（实际：${out1}）`)
    const demoFwd = demo.replaceAll('\\', '/')
    const out2 = mod.sanitizeDemoPath(`path: ${demoFwd}`, demo)
    assertTrue(out2 === `path: ${rel}`, `正斜杠形态同样归一（实际：${out2}）`)
    const out3 = mod.sanitizeDemoPath(`"${demo.replaceAll('\\', '\\\\')}"`, demo)
    assertTrue(!out3.includes('C:\\') && !out3.includes('wt\\some-worktree') && out3.includes(rel),
      'JSON 转义双反斜杠形态同样归一（无绝对路径残留）')
    const out4 = mod.sanitizeDemoPath('普通文本不含 demo 路径，原样返回', demo)
    assertTrue(out4 === '普通文本不含 demo 路径，原样返回', '无关文本零改动')
    assertTrue(mod.sanitizeDemoPath('无参样例', undefined) === '无参样例', 'demoDir 缺省容错（undefined 不炸）')
  }

  // ── 3. 提交面金档现状：_extracted.json 无绝对路径残留 ──
  console.log('\n--- 3. 金档现状无绝对路径 ---')
  {
    const golden = readFileSync(join(ROOT, '..', 'docs', 'prompt', '_extracted.json'), 'utf8')
    assertTrue(!/[A-Za-z]:\\\\/.test(golden) && !/[A-Za-z]:\\{1}[\w-]+\\{1}(Users|IdeaProjects|worktrees)/.test(golden),
      '金档 _extracted.json 无盘符绝对路径（环境无关可移植）')
    assertTrue(golden.includes('.sillyspec/changes/2026-05-13-demo-change') || !golden.includes('2026-05-13-demo-change'),
      'demo 目录若在场则以仓相对形在场')
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${failed === 0 ? 'all' : '部分'}  ❌ 失败断言: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
