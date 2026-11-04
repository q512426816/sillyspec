// 2026-11-04-sync-fail-silent-fix——platform sync 失败可见性三锁：横幅谎言（FR-01）、
// 全量清单超时分档（FR-02）、422 op 级 detail 透传（FR-03，既有行为回归锁定）。
// 生产实证（2026-11-04 知识索引漏推确诊回执）：缓存漂移+慢链路+422 连坐叠加时用户只见
// 「✅ 全树 spec 同步完成（0 个文件差异）」，228 条知识漏推全程不可见。

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = join(fileURLToPath(import.meta.url), '..', '..')
const specSyncSrc = readFileSync(join(root, 'src', 'spec-sync.js'), 'utf8')
const indexSrc = readFileSync(join(root, 'src', 'index.js'), 'utf8')

let passed = 0, failed = 0
function ok(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

// ── FR-01：ok:false 报失败退出非零、无成功横幅 ──
console.log('\n=== T1: ok:false 失败可见 ===')
{
  // 调用方判定（index.js platform sync 全树分支）：ok===false → 失败行 + exit 1，先于成功横幅
  const branch = indexSrc.slice(indexSrc.indexOf('syncSpecTreeOnly(null, dir, {})'))
  const failIdx = branch.indexOf('r.ok === false')
  const bannerIdx = branch.indexOf('全树 spec 同步完成')
  ok(failIdx >= 0, '存在 ok === false 判定分支')
  ok(failIdx >= 0 && failIdx < bannerIdx, '失败判定先于成功横幅（横幅不可能在失败态打印）')
  ok(/❌ 全树 spec 同步失败/.test(branch), '失败语义行存在')
  const failBranch = branch.slice(failIdx, branch.indexOf('}', failIdx))
  ok(/process\.exit\(1\)/.test(failBranch), '失败退出码非零')
}

// ── FR-02：全量清单超时分档 ──
console.log('\n=== T2: 清单超时分档 ===')
{
  ok(/MANIFEST_FULL_TIMEOUT_MS = 120_000/.test(specSyncSrc), '全量档常量 120s 存在')
  // 主 GET：增量 10s / 全量 120s 三元分档
  ok(/withSignal\(cacheUsable \? 10000 : MANIFEST_FULL_TIMEOUT_MS\)/.test(specSyncSrc),
    '主清单 GET 按形态分档（增量 10s / 全量 120s）')
  // 倒退对账全量拉取同档：主分档三元（1）+ 倒退对账字面（1）
  const ternaryUses = specSyncSrc.split('cacheUsable ? 10000 : MANIFEST_FULL_TIMEOUT_MS').length - 1
  const literalUses = specSyncSrc.split('withSignal(MANIFEST_FULL_TIMEOUT_MS)').length - 1
  ok(ternaryUses === 1 && literalUses === 1, `全量档两处使用（三元 ${ternaryUses} + 倒退对账 ${literalUses}）`)
  // 增量小响应不受影响：分档表达式里 10000 仍绑定 cacheUsable（带 since）态
  ok(!/withSignal\(MANIFEST_FULL_TIMEOUT_MS\)\s*\)\s*;\s*\/\/ 增量/.test(specSyncSrc), '增量路径未误升档')
}

// ── FR-03：422 op 级 detail 透传（既有行为锁定）──
console.log('\n=== T3: 422 detail 透传 ===')
{
  const { describeErrorBody } = await import(pathToFileURL(join(root, 'src', 'spec-sync.js')).href)
  const body = JSON.stringify({
    code: 'SPEC_BUNDLE_INVALID',
    message: '同步包无效：源文件缺失的重命名操作必须携带文件内容。',
    details: { path: 'changes/2026-11-04-x/proposal.md' },
  })
  const d = describeErrorBody(422, body)
  ok(d.includes('changes/2026-11-04-x/proposal.md'), `detail 含无效 op 路径（实得 ${d}）`)
  ok(d.includes('SPEC_BUNDLE_INVALID'), 'detail 含错误码')
  ok(d.includes('必须携带文件内容'), 'detail 含服务端原因文本')
  // POST !res.ok 分支把 detail 拼进 warn 行（既有，锁定）
  const postBranch = specSyncSrc.slice(specSyncSrc.indexOf('同步请求失败 HTTP'))
  ok(postBranch.includes('${detail ? ` —— ${detail}` : \'\'}'), '失败 warn 行拼 detail')
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
