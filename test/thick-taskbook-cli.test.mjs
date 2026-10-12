/**
 * thick-taskbook-cli.test.mjs — 厚档评审任务书 CLI 单源（2026-10-12-thick-taskbook-cli）
 *
 * 验收面：
 *   ① renderStageReviewerTaskbook 渲染：角色/主文档/检查单全量带序号/探针双态（注入与未配置
 *      零注入）/预算 12/只读纪律/产物路径+docHash 代填指引/完成后 run <stage> --done/契约单源
 *      （renderReviewJsonContract 字段在场）；
 *   ② 门失败条件性：printStageReviewResult 缺 review.json → 打印任务书；docHash 失配 → 不打印；
 *   ③ register-stage-review CLI 双态：骨架生成打印任务书（含 local.yaml 探针注入）；
 *      --refresh-hash 刷新不打印；
 *   ④ 回归：gate-echo / register / contract / review-dispatch 四族全绿（另跑）。
 * dogfood 驱动（fire-equipment 复盘）：主代理手写 9 份派发 prompt，6 份带 leading——检查单
 * 生产权收归 CLI。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderStageReviewerTaskbook, printStageReviewResult } from '../src/stage-review.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')

function capture(fn) {
  const origErr = console.error
  const origLog = console.log
  let err = ''
  let log = ''
  console.error = (...a) => { err += a.join(' ') + '\n' }
  console.log = (...a) => { log += a.join(' ') + '\n' }
  try { fn() } finally { console.error = origErr; console.log = origLog }
  return err + log
}

test('渲染面：检查单全量/探针双态/预算/纪律/产物/完成动作/契约单源', () => {
  const args = {
    stage: 'brainstorm',
    changeDir: '/ws/x/.sillyspec/changes/c1',
    changeName: 'c1',
    reviewRunId: 'review-20261012-000001',
    reviewPath: '/ws/x/.sillyspec/.runtime/stage-reviews/brainstorm-review-20261012-000001/review.json',
  }
  const tb = renderStageReviewerTaskbook({ ...args, probeLines: ['copy-drift｜报错一次给全必查'] })
  assert.match(tb, /独立评审员（干净上下文，未参与实现）/)
  assert.match(tb, /changes[\\/]c1[\\/]design\.md/)
  assert.match(tb, /reviewType=design/)
  // 检查单：brainstorm 全量条目带序号（抽查首条交叉审查模型与后段条目）
  assert.match(tb, /1\. \*\*定义层\*\*/)
  assert.match(tb, /承诺可兑现性/)
  // 探针注入段 + 逐条作答口径
  assert.match(tb, /【项目评审探针（local\.yaml review_probes 注入/)
  assert.match(tb, /copy-drift｜报错一次给全必查/)
  // 预算 / 纪律 / 产物 / 代填 / 完成后
  assert.match(tb, /硬帽 12 次/)
  assert.match(tb, /只读——禁止修改任何文件、禁止 git 写操作/)
  assert.match(tb, new RegExp(args.reviewPath.replace(/[\\/]/g, '[\\\\/]')))
  assert.match(tb, /--refresh-hash 代填/)
  assert.match(tb, /run brainstorm --done --change c1/)
  // 契约单源（renderReviewJsonContract 的特征字段）
  assert.match(tb, /specVerdict/)
  assert.match(tb, /validateStageReviewSchema/)
  // 未配置探针 → 零注入
  const plain = renderStageReviewerTaskbook(args)
  assert.ok(!plain.includes('项目评审探针'))
  const emptyArr = renderStageReviewerTaskbook({ ...args, probeLines: [] })
  assert.ok(!emptyArr.includes('项目评审探针'))
})

test('门失败条件性：缺 review.json 打印任务书 / docHash 失配不打印', () => {
  const ctx = { stage: 'execute', reviewRunId: 'review-20261012-000002', runtimeRoot: '/nonexistent/.runtime', changeName: 'c1' }
  const missing = capture(() => printStageReviewResult(
    { ok: false, errors: ['缺少 execute 阶段的 stage review.json — tier=independent 要求独立审查子代理产出（期望路径：/nonexistent/.runtime/stage-reviews/execute-review-20261012-000002/review.json）'], warnings: [] },
    ctx,
  ))
  assert.match(missing, /评审员任务书/)
  assert.match(missing, /【检查单（逐条 pass \/ gap \/ fail \+ 证据锚点）】/)
  assert.ok(!missing.includes('项目评审探针'), 'specBase 推导 miss（/nonexistent 无 local.yaml）→ 零注入但任务书主体在场')
  const dh = capture(() => printStageReviewResult(
    { ok: false, errors: ['docHash 失配：期望 abc123，实际 def456——design.md 已改版'], warnings: [] },
    ctx,
  ))
  assert.ok(!dh.includes('评审员任务书'), 'docHash 失配不打印任务书（防重复撞门噪音）')
  assert.match(dh, /docHash 失配修复/, '既有 docHash 提示原样在场')
})

test('register-stage-review CLI 双态：骨架打印（含探针注入）/ --refresh-hash 不打印', () => {
  const ws = mkdtempSync(join(tmpdir(), 'ttb-'))
  try {
    const specBase = join(ws, '.sillyspec')
    const changeDir = join(specBase, 'changes', 'c1')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'design.md'), '# D\n\n内容。\n')
    writeFileSync(join(specBase, 'local.yaml'), [
      'review_probes:',
      '  - id: copy-drift',
      '    lines:',
      '      - 报错一次给全必查（探针 e2e）',
    ].join('\n'))
    const cli = (args) => spawnSync(process.execPath, [CLI, ...args], {
      cwd: ws, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' },
    })
    // 骨架生成：打印任务书 + 探针行
    const r1 = cli(['register-stage-review', '--change', 'c1', '--stage', 'brainstorm'])
    assert.equal(r1.status, 0, r1.stderr)
    assert.match(r1.stdout, /已注册 brainstorm stage review/)
    assert.match(r1.stdout, /评审员任务书/)
    assert.match(r1.stdout, /copy-drift｜报错一次给全必查（探针 e2e）/)
    assert.match(r1.stdout, /run brainstorm --done --change c1/)
    // --refresh-hash：刷新既有，不打印任务书
    const r2 = cli(['register-stage-review', '--change', 'c1', '--stage', 'brainstorm', '--refresh-hash'])
    assert.equal(r2.status, 0, r2.stderr)
    assert.match(r2.stdout, /已注册 brainstorm stage review/)
    assert.ok(!r2.stdout.includes('评审员任务书'), '--refresh-hash 不打印（评审已在途/已完成）')
  } finally { rmSync(ws, { recursive: true, force: true }) }
})
