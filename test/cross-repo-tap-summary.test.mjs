// 跨仓 node:test TAP 摘要级判定（坑 verify-gate-worktree-crossrepo-three-defects 缺陷三）
//
// 实证（2026-09-21）：sillyspec 仓 npm test 自身 EXIT=0 全绿，但主仓 verify gate 把其
// stdout 中通过用例的预期错误文案（❌/AssertionError 等 58 行 fixture 噪音）全计入
// 「未豁免失败行」阻断——疑似外层命令链（管道/包装脚本）退出码丢失变非 0。
//
// 修复：runCrossRepoFullTest 对非 0 退出码做 TAP 摘要覆盖——输出含 `ℹ fail 0` +
// `ℹ pass N≥1`（node:test 权威摘要行）时判包装层丢失，覆盖为通过。摘要 fail>0 /
// 无摘要 → 旧行为不变。
// 双层验证：① 源码契约（判定正则/门控条件存在）；② 行为级——真实 node:test 输出
// 形态锚定（防 node 版本升级摘要行格式漂移导致覆盖静默失效）。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

const src = readFileSync(new URL('../src/verify-postcheck.js', import.meta.url), 'utf8')

const tmpRoots = []
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), `tapsumm-${process.pid}-`))
  tmpRoots.push(dir)
  return dir
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

test('① 源码契约：TAP 摘要覆盖判定存在且门控正确', () => {
  assert.ok(/ℹ fail \(\\d\+\)/.test(src), 'TAP fail 摘要正则存在（^ℹ fail N$ 行锚定）')
  assert.ok(/Number\(tapFail\[1\]\) === 0/.test(src), '仅 fail=0 覆盖（fail>0 维持失败）')
  assert.ok(/Number\(tapPass\[1\]\) > 0/.test(src), '要求 pass≥1（防空摘要误判）')
  assert.ok(/if \(exitCode !== 0\) \{[\s\S]*?tapFail/.test(src), '仅非 0 退出码时适用（exit 0 早退不变）')
})

test('② 行为锚定：真实 node:test stdout 含 ^ℹ fail 0$ 与 ^ℹ pass N≥1$ 摘要行', () => {
  const dir = makeRepo()
  writeFileSync(join(dir, 'ok.test.mjs'),
    "import { test } from 'node:test'\ntest('passing', () => {})\n", 'utf8')
  // node:test 摘要行走 stdout（spec reporter）——runCrossRepoFullTest 的 catch 路径合并
  // e.stdout+e.stderr。⚠️ 剥 NODE_TEST_CONTEXT env：本测试自身经 node --test 跑，该 env
  // 被内层 node --test 继承会静默零跑 exit 0 假绿（ql-20260919-007 实测踩），必须摘除。
  const out = execFileSync(process.execPath, ['--test', 'ok.test.mjs'], {
    cwd: dir, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_TEST_CONTEXT: undefined },
  })
  assert.match(out, /^ℹ fail 0$/m, `真实摘要含 ℹ fail 0（尾：${out.split('\n').slice(-6).join(' | ')}）`)
  const mPass = out.match(/^ℹ pass (\d+)$/m)
  assert.ok(mPass && Number(mPass[1]) >= 1, '真实摘要含 ℹ pass N≥1')
})
