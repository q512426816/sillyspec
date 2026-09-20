/**
 * R4 对撞反馈四修复回归（2026-09-21）：
 * 1. lint 归属鉴定：extractLintFailureFiles / triageLintOwnership 纯函数语义
 *    （R4-S-F 实证：verify lint 硬门 7 轮全是 HEAD 存量债——快照含基线债文件恒败）
 * 2. fail-fast 前置：verify 纯文档 blocking 检查（module-impact 死信 + 预填注清零 error 门）
 *    源序钉在 test/lint 实测门之前（R4-S-F 166min 形状的结构性修复——秒级失败不再排在
 *    9 分钟实测门后面）
 * 3. quick/verify 两门接线源文本钉（triageLintOwnership 消费在场——只改一门另一门必漏）
 * 4. advisory 观察期计数措辞（「实测 N 次中失败 M 次」，治「1/1」读作 1-of-1 的歧义）
 * 5. worktree / monorepo 多实例守卫报错附一键放行整行（R4-S-Q：agent 试 3 次才拼对组合）
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { extractLintFailureFiles, triageLintOwnership } from '../src/verify-postcheck.js'

let failed = 0
let total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) } else { console.log(`  ✅ PASS: ${msg}`) }
}
const srcOf = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

// ── 1. extractLintFailureFiles ──
{
  const ruff = extractLintFailureFiles('backend/app/modules/admin/model.py:42:1: E302 expected 2 blank lines\nWould reformat: backend/app/modules/admin/model.py\n2 files would be reformatted.')
  assert(ruff.includes('backend/app/modules/admin/model.py'), `1a ruff path:line:col 形态提取（实得 ${JSON.stringify(ruff)}）`)
  assert(ruff.length === 1, '1b 去重（同文件两次出现只收一次）')

  const eslint = extractLintFailureFiles('error  no-unused-vars  "C:\\proj\\src\\y.tsx"  3:1  warning  ..')
  assert(eslint.includes('C:/proj/src/y.tsx'), `1c 引号包裹反斜杠绝对路径归一（实得 ${JSON.stringify(eslint)}）`)

  const none = extractLintFailureFiles('error: configuration file not found\nfailed with no output')
  assert(none.length === 0, '1d 无路径输出 → 空（unattributable 输入）')

  const bare = extractLintFailureFiles('file.py readme.md something.tsx')
  assert(bare.length === 0, '1e 不带路径分隔符的裸文件名不收（防普通单词误报）')

  assert(extractLintFailureFiles(null).length === 0 && extractLintFailureFiles(123).length === 0, '1f 非字符串输入零崩')
}

// ── 2. triageLintOwnership ──
{
  const owned = triageLintOwnership({ failureFiles: ['backend/a.py'], changeFiles: ['frontend/x.tsx', 'backend/a.py'] })
  assert(owned.verdict === 'owned' && owned.overlap.length === 1, '2a 有交集 → owned（维持硬拦）')

  const pre = triageLintOwnership({ failureFiles: ['backend/debt1.py', 'backend/debt2.py'], changeFiles: ['frontend/x.tsx', 'sillyhub-daemon/src/a.ts'] })
  assert(pre.verdict === 'pre-existing', '2b 零交集 → pre-existing（存量债降档）')

  const unatt = triageLintOwnership({ failureFiles: [], changeFiles: ['a.py'] })
  assert(unatt.verdict === 'unattributable', '2c 失败文件为空 → unattributable（保守硬拦）')

  const absRel = triageLintOwnership({ failureFiles: ['C:/repo/backend/a.py'], changeFiles: ['backend/a.py'] })
  assert(absRel.verdict === 'owned', '2d 绝对/相对口径混用双向 endsWith 命中')

  const sep = triageLintOwnership({ failureFiles: ['src\\a.py'], changeFiles: ['src/a.py'] })
  assert(sep.verdict === 'owned', '2e 反斜杠/正斜杠归一后命中')

  assert(triageLintOwnership({}).verdict === 'unattributable', '2f 全空参零崩')
}

// ── 3. fail-fast 源序钉（gates.js）──
{
  const g = srcOf('../src/run/gates.js')
  const iPre = g.indexOf('fail-fast 前置')
  const iDead = g.indexOf('module-impact.md「更新结果」表存在')
  const iTest = g.indexOf('Verify 测试对账')
  const iMoved = g.indexOf('已前移至 test/lint 实测门之前')
  assert(iPre !== -1 && iDead !== -1 && iTest !== -1, `3a 三标记在场（pre=${iPre} dead=${iDead} test=${iTest}）`)
  assert(iDead > -1 && iDead < iTest, `3b 死信阻断在 test 实测门之前（dead=${iDead} < test=${iTest}）——纯文档检查 fail-fast`)
  assert(iMoved !== -1, '3c 原位置留前移标记（防重复执行）')
  const iPrefill = g.indexOf('预填注清零校验未过')
  assert(iPrefill > -1 && iPrefill < iTest, '3d 预填注 error 门同样前置')
  assert(g.includes("verdict === 'pre-existing'"), '3e verify lint 硬拦分支含归属鉴定降档（pre-existing 放行路径）')
}

// ── 4. quick 门接线 + 措辞 ──
{
  const q = srcOf('../src/run/quick-audit.js')
  assert(q.includes('triageLintOwnership') && q.includes("verdict === 'pre-existing'"), '4a quick lint 门接同一归属鉴定（两门同根因同修）')
  const v = srcOf('../src/verify-postcheck.js')
  assert(v.includes('次中失败') && !v.includes('失败累计'), '4b advisory 观察期计数措辞改「实测 N 次中失败 M 次」（治 1/1 歧义）')
}

// ── 5. 守卫一键放行整行 ──
{
  const i = srcOf('../src/index.js')
  assert(i.includes('一键放行') && i.includes('--allow-worktree-cwd --spec-dir'), '5a worktree 守卫报错附双 flag 整行（R4-S-Q 试错 3 次的痛点）')
  const c = srcOf('../src/run/command.js')
  assert(c.includes('一键指定') && c.includes('--spec-dir "${specBase}"'), '5b monorepo 多实例守卫报错附 --spec-dir 整行')
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
