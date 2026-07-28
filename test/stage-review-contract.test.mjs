/**
 * renderReviewJsonContract 测试 + 契约同源校验
 *
 * 验证 review.json 产物契约的事前渲染(renderReviewJsonContract)与事后 CLI 校验
 * (validateStageReviewSchema / verifyStageReviewDocHash)严格同源 —— contract 告知的
 * schema/枚举/算法 == CLI 实际校验的。历史教训:review 子代理靠读源码撞墙,常错(漏
 * schemaVersion / checklist 嵌套 / docHash 旧值)。本测试锁住"事前给的 == 事后查的"。
 */
import { renderReviewJsonContract, validateStageReviewSchema, verifyStageReviewDocHash, computeDocHash } from '../src/stage-review.js'
import { REVIEW_SCHEMA_VERSION, VALID_VERDICTS } from '../src/task-review.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}

console.log('=== renderReviewJsonContract independent 输出契约要素 ===')
{
  const md = renderReviewJsonContract({ stage: 'brainstorm', changeDir: '/x/changes/c', reviewRunId: 'review-2026', tier: 'independent' })
  assert(md.includes('review.json 产物契约'), '含标题')
  assert(md.includes('事前给的 == 事后查的'), '含同源声明')
  assert(md.includes('schemaVersion'), '含 schemaVersion 字段说明')
  assert(md.includes(String(REVIEW_SCHEMA_VERSION)), `含 schemaVersion 值 ${REVIEW_SCHEMA_VERSION}(同源常量)`)
  for (const v of VALID_VERDICTS) {
    assert(md.includes(v), `含 verdict 枚举 ${v}(同源 VALID_VERDICTS)`)
  }
  assert(md.includes('docHash'), '含 docHash')
  assert(md.includes('sha256'), '含 sha256 算法')
  assert(md.includes('readFileSync'), '含 node 算法(readFileSync 原始字节)')
  assert(md.includes('重算 docHash'), '含「主文档改后重算 docHash」提示(transcript 翻车根因)')
  assert(md.includes('stage-reviews/brainstorm-review-2026/review.json'), '含精确位置(stage + reviewRunId)')
  assert(md.includes('reviewType=design'), 'brainstorm reviewType=design')
  assert(md.includes('design.md'), 'brainstorm 主文档 design.md')
  assert(md.includes('扁平数组') && md.includes('不是按层'), 'checklist 明确「扁平数组,非按层嵌套」(transcript 翻车项)')
  assert(md.includes('```json'), '含完整 JSON 示例代码块(agent 照抄)')
}

console.log('\n=== tier=self 简短提示 ===')
{
  const md = renderReviewJsonContract({ stage: 'plan', tier: 'self' })
  assert(md.includes('tier=self') && md.includes('无需产出'), 'self 返回简短提示')
  assert(!md.includes('schemaVersion'), 'self 不含 schema(无需 review.json)')
}

console.log('\n=== 各 stage 映射(reviewType + 主文档)===')
{
  const plan = renderReviewJsonContract({ stage: 'plan', reviewRunId: 'r', tier: 'independent' })
  assert(plan.includes('reviewType=plan') && plan.includes('主审查文档=plan.md'), 'plan: reviewType=plan, mainDoc=plan.md')
  const propose = renderReviewJsonContract({ stage: 'propose', reviewRunId: 'r', tier: 'independent' })
  assert(propose.includes('reviewType=proposal') && propose.includes('proposal.md'), 'propose: reviewType=proposal, mainDoc=proposal.md')
  const execute = renderReviewJsonContract({ stage: 'execute', reviewRunId: 'r', tier: 'independent' })
  assert(execute.includes('reviewType=acceptance') && execute.includes('design.md'), 'execute: reviewType=acceptance, mainDoc=design.md')
}

console.log('\n=== 契约 schema 与 CLI 校验同源(合规通过 / 缺字段失败)===')
{
  const specBase = mkdtempSync(join(tmpdir(), 'review-contract-'))
  const changeDir = join(specBase, 'changes', 'c')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), 'rev2 content')
  const hash = computeDocHash(join(changeDir, 'design.md'))

  // 合规 review.json(按 contract schema 产出)
  const ok = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    reviewType: 'design',
    specVerdict: 'pass', qualityVerdict: 'pass',
    reviewedFiles: ['changes/c/design.md'],
    docHash: hash,
    checklist: [{ item: '定义层:术语统一', result: 'pass', note: '...' }],
    reviewerNotes: '通过',
  }
  const okSchema = validateStageReviewSchema(ok)
  assert(okSchema.ok, `合规 review.json 通过 schema 校验${okSchema.ok ? '' : ': ' + okSchema.errors.join('; ')}`)
  const dh = verifyStageReviewDocHash(ok, [specBase])
  assert(dh.ok, 'docHash 与 design.md 实际 sha256 匹配(同源算法 computeDocHash)')

  // 缺 schemaVersion(transcript gap 1)
  const noVer = { ...ok }; delete noVer.schemaVersion
  assert(!validateStageReviewSchema(noVer).ok, '缺 schemaVersion → schema 失败(contract 告知的必填)')

  // checklist 嵌套对象非扁平(transcript 翻车项)
  const nested = { ...ok, checklist: { 定义层: { result: 'pass' }, 一致性层: { result: 'pass' } } }
  assert(!validateStageReviewSchema(nested).ok, 'checklist 嵌套对象(非扁平数组)→ schema 失败')

  // design 改 rev 后 docHash 旧值(transcript 翻车根因)
  writeFileSync(join(changeDir, 'design.md'), 'rev3 content — design 又改了')
  const staleDh = verifyStageReviewDocHash(ok, [specBase])
  assert(!staleDh.ok, 'design 改后 docHash 仍是旧值 → 判伪造(contract 明确提示重算)')

  rmSync(specBase, { recursive: true, force: true })
}

console.log('\n=== docHash 路径找不到 → fail-closed（防 reviewedFiles[0] 伪造绕过）===')
{
  // searchDirs 都不含 reviewedFiles[0] 指向的文件：恶意 agent 填假路径 + 假 hash，
  // 旧逻辑降级 warning 放行(ok:true);fail-closed 后必须 ok:false 阻断。
  const specBase = mkdtempSync(join(tmpdir(), 'review-failclosed-'))
  const changeDir = join(specBase, 'changes', 'c')
  mkdirSync(changeDir, { recursive: true })
  // 故意不写 design.md — reviewedFiles[0] 在所有候选基准下都找不到
  const fakeReview = {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    reviewType: 'design',
    specVerdict: 'pass', qualityVerdict: 'pass',
    reviewedFiles: ['changes/c/design.md'],
    docHash: 'deadbeef',
    reviewerNotes: '通过',
  }
  assert(validateStageReviewSchema(fakeReview).ok, 'schema 单独看合规(字段齐全) — 漏洞在 docHash 无法交叉验证')
  const dh = verifyStageReviewDocHash(fakeReview, [specBase, changeDir])
  assert(!dh.ok, '主文档在所有候选基准下均不存在 → fail-closed ok:false(堵伪造路径绕过)')
  assert(dh.errors.length > 0, 'fail-closed 产出 error(非 warning 静默放行)')
  assert(dh.errors[0].includes('无法做 docHash'), 'error 文案指向路径伪造/基准错位')

  // 对照:写回真实 design.md + 正确 hash → 通过(确保 fail-closed 没误伤合法路径)
  writeFileSync(join(changeDir, 'design.md'), 'real content')
  const realHash = computeDocHash(join(changeDir, 'design.md'))
  const dhOk = verifyStageReviewDocHash({ ...fakeReview, docHash: realHash }, [specBase, changeDir])
  assert(dhOk.ok, '对照:文件存在且 hash 正确 → 通过(fail-closed 不误伤合法 review)')

  rmSync(specBase, { recursive: true, force: true })
}

console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 项失败`}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
