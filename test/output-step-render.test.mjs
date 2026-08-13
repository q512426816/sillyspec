/**
 * outputStep characterization — 渲染结构快照（W6 Step3 必改，先冻结）
 *
 * outputStep（run.js:709-1130）是 agent 每步收到的 prompt 渲染器，W6 Step3 要整体搬到
 * run/prompt.js。这里冻结它的**结构契约**（哪些块、什么顺序、关键分叉），W6 重构后逐条
 * 回归。不做逐字节全等（persona/guardrails 文案来自 stages/ 模块，超出 outputStep 契约），
 * 只断言 outputStep 自己的渲染逻辑产出的结构标记。
 *
 * 覆盖分叉：
 *   - step0 vs step1+（persona/铁律/护栏 全文 vs 精简）
 *   - 平台 vs 非平台（changeDir 绝对 vs 相对、平台 directives 块）
 *   - scan scanProfile（严禁子代理/文档上限）
 *   - requiresWait（完成后执行 --wait/--continue 模板）
 *   - 越界防御（step 缺失 → console.error + return false）
 *
 * 确定性：用不含 <now-*>/<quicklog-id>/{KNOWLEDGE_HIT_REPORT} 等动态占位符的 step.prompt，
 * 保证 new Date()/文件 IO 不进快照。projectName=basename(cwd) 是随机串，只断言「project:」行存在。
 */
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { outputStep } from '../src/run/prompt.js'
import { runCapturing, makeRepo, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== outputStep characterization: 渲染结构快照 ===\n')

// ── Case 1: 非平台 brainstorm step0（无 change）→ persona + 铁律 + 默认完成后执行 ──
console.log('--- brainstorm step0（无 change）：persona + 铁律 + 默认完成后执行 ---')
{
  const { cwd } = makeRepo('os-brainstorm-')
  const steps = [{ name: '理解需求', prompt: '分析需求并产出方案', requiresWait: false }]
  const r = await runCapturing(() =>
    outputStep('brainstorm', 0, steps, cwd, null, null, {}, null))

  assert(!r.error, 'brainstorm step0 不应 process.exit')
  assert(r.result === undefined, '正常渲染返回 undefined（非 false）')
  assert(r.stdout.includes('stage: brainstorm'), 'header: stage: brainstorm')
  assert(r.stdout.includes('step: 1/1'), 'header: step: 1/1')
  assert(r.stdout.includes('stepName: 理解需求'), 'header: stepName')
  assert(/^project: /m.test(r.stdout), 'header: project 行存在（值=basename(cwd) 随机，只验存在）')
  assert(r.stdout.includes('### 🎯 你的角色：资深架构师'), 'persona step0 注入（资深架构师）')
  assert(r.stdout.includes('## Step 1/1: 理解需求'), 'Step 标题')
  assert(r.stdout.includes('### ⚠️ 铁律'), 'step0 注入铁律全文')
  assert(r.stdout.includes('- 文档优先'), '铁律含「文档优先」条目')
  assert(r.stdout.includes('sillyspec run brainstorm --done'), '完成后执行默认态：--done')
  assert(!r.stdout.includes('\nchange:'), '无 changeName → 无 change 行')
  assert(!r.stdout.includes('### 📩 上一步用户回答'), '无 prevStepAnswer → 无上一步回答块')
}

// ── Case 2: 非平台 plan step1 + changeName → 无 persona/铁律 + changeDir 相对路径 ──
console.log('\n--- plan step1 + changeName（非平台）：changeDir 相对路径 + 无 persona/铁律 ---')
{
  const { cwd } = makeRepo('os-plan-')
  const cn = '2026-07-25-plan-render'
  const steps = [
    { name: '复杂度分类', prompt: '分类', requiresWait: false },
    { name: '生成分级计划', prompt: '生成 plan', requiresWait: false },
  ]
  const r = await runCapturing(() =>
    outputStep('plan', 1, steps, cwd, cn, null, {}, null))

  assert(!r.error, 'plan step1 不应 process.exit')
  assert(r.stdout.includes('stage: plan'), 'header: stage: plan')
  assert(r.stdout.includes('step: 2/2'), 'header: step: 2/2（第二步）')
  assert(r.stdout.includes('change: ' + cn), 'header: change 行')
  assert(/changeDir: \.sillyspec[\\\/]changes[\\\/]/.test(r.stdout), 'changeDir 非平台相对路径（.sillyspec/changes/，跨平台分隔符）')
  assert(!r.stdout.includes('你的角色'), 'step1+ 不注入 persona')
  assert(r.stdout.includes('## Step 2/2: 生成分级计划'), 'Step 标题（第二步）')
  assert(!/### ⚠️ 铁律\n- 文档优先/.test(r.stdout), 'step1+ 不注入铁律全文')
  assert(r.stdout.includes('sillyspec run plan --done --change ' + cn), '完成后执行带 --change')
}

// ── Case 3: 平台 scan step0 + scanProfile → 平台 directives + Scan Profile 硬约束 ──
console.log('\n--- 平台 scan step0 + scanProfile：平台路径约束 + 严禁子代理 ---')
{
  const { cwd } = makeRepo('os-scan-platform-')
  // 独立 specRoot（非 cwd/.sillyspec，模拟平台外部 spec 目录）
  const specRoot = mkdtempSync(join(tmpdir(), 'os-specroot-'))
  const steps = [{ name: '探测项目结构', prompt: '扫描项目 {SPEC_ROOT}', requiresWait: false }]
  const platformOpts = {
    specRoot,
    scanProfile: { mode: 'quick', reason: '小项目', maxAgentCalls: 0, maxDocs: 3 },
  }
  const r = await runCapturing(() =>
    outputStep('scan', 0, steps, cwd, null, null, platformOpts, null))

  assert(!r.error, '平台 scan step0 不应 process.exit（prompt 无裸 .sillyspec/ 写入）')
  assert(r.stdout.includes('## ⚠️ 平台模式 — 写入路径约束'), '平台 directives 块')
  assert(r.stdout.includes('规范目录（specDir）: `' + specRoot + '`'), '平台块含 specRoot 绝对路径')
  assert(r.stdout.includes('## 📊 Scan Profile: quick (小项目)'), 'Scan Profile 块（mode + reason）')
  assert(r.stdout.includes('严禁使用子代理'), 'maxAgentCalls=0 → 严禁子代理')
  assert(r.stdout.includes('文档上限：3 份'), 'maxDocs=3 → 文档上限')
  assert(r.stdout.includes(specRoot), 'prompt {SPEC_ROOT} 被替换为 specRoot 绝对路径')
  assert(r.stdout.includes('sillyspec run scan --done'), '完成后执行（scan 无 changeName）')
}

// ── Case 4: 非平台 quick requiresWait → 完成后执行 --wait/--continue 模板 ──
console.log('\n--- quick requiresWait：完成后执行 --wait/--continue/--done 三段模板 ---')
{
  const { cwd } = makeRepo('os-quick-wait-')
  const cn = 'quick-abcd1234'
  const steps = [{
    name: '确认方案', prompt: '请用户确认方案', requiresWait: true,
    waitReason: '等待用户确认', waitOptions: ['确认', '取消'],
  }]
  const r = await runCapturing(() =>
    outputStep('quick', 0, steps, cwd, cn, null, {}, null))

  assert(!r.error, 'quick requiresWait 不应 process.exit')
  assert(r.stdout.includes('### 💻 你的角色：全栈老兵'), 'persona quick step0（全栈老兵）')
  assert(r.stdout.includes('本步骤必须等待用户输入，不能直接 --done'), 'requiresWait → 必须等待提示')
  assert(r.stdout.includes('sillyspec run quick --wait --reason "等待用户确认"'), '--wait 模板含 reason')
  assert(r.stdout.includes('--options "确认,取消"'), '--wait 模板含 options')
  assert(r.stdout.includes('sillyspec run quick --continue --answer "用户回答" --change ' + cn), '--continue 模板带 --change')
  assert(r.stdout.includes('sillyspec run quick --done --change ' + cn), 'requiresWait 末尾仍有 --done')
}

// ── Case 5: 越界防御 → console.error + return false ──
console.log('\n--- 越界防御：steps 为空 → console.error + return false ---')
{
  const { cwd } = makeRepo('os-oob-')
  const r = await runCapturing(() =>
    outputStep('brainstorm', 0, [], cwd, null, null, {}, null))

  assert(r.result === false, '越界返回 false')
  assert(r.stdout.includes('无法输出步骤'), 'console.error 提示步骤缺失')
  assert(r.stdout.includes('stage=brainstorm'), '诊断含 stage')
}

// ── Case 6: verify _globalGuardrails 分叉（step0 全文 vs step1 精简提醒）──
console.log('\n--- verify 护栏：step0 全文注入 vs step1 精简提醒 ---')
{
  const { cwd } = makeRepo('os-verify-guard-')
  const steps = [
    { name: '状态检查', prompt: '检查状态', requiresWait: false },
    { name: '加载规范', prompt: '加载', requiresWait: false },
  ]
  // step0：护栏全文
  const r0 = await runCapturing(() =>
    outputStep('verify', 0, steps, cwd, null, null, {}, null))
  // step1：护栏精简提醒
  const r1 = await runCapturing(() =>
    outputStep('verify', 1, steps, cwd, null, null, {}, null))

  // verify 有 _globalGuardrails（全文「verify 阶段绝对禁止的操作」）：
  //   step0 注入全文；step1 只一行精简提醒「⛔ 本阶段护栏生效中」
  assert(r0.stdout.includes('verify 阶段绝对禁止的操作'), 'verify step0 注入 _globalGuardrails 全文（绝对禁止的操作）')
  assert(!r0.stdout.includes('本阶段护栏生效中（详见首步）'), 'step0 注入全文而非 step1 精简提醒')
  assert(r1.stdout.includes('本阶段护栏生效中'), 'verify step1 护栏精简提醒（⛔ 本阶段护栏生效中）')
  assert(!r1.stdout.includes('verify 阶段绝对禁止的操作'), 'step1 不重复注入护栏全文（token 效率）')
}

// ── Case 7: {REVIEW_SCHEMA_VERSION} 占位符替换（task review 示例模板用 CLI 当前常量值）──
console.log('\n--- {REVIEW_SCHEMA_VERSION} 替换：prompt 含占位符 → 渲染为 CLI 当前常量值 ---')
{
  const { cwd } = makeRepo('os-schema-ver-')
  const steps = [{ name: '写 review', prompt: '{ "schemaVersion": {REVIEW_SCHEMA_VERSION}, "task": "task-01" }', requiresWait: false }]
  const r = await runCapturing(() =>
    outputStep('execute', 0, steps, cwd, null, null, {}, null))

  assert(!r.stdout.includes('{REVIEW_SCHEMA_VERSION}'), '占位符 {REVIEW_SCHEMA_VERSION} 已被替换（不残留字面量）')
  // 当前 REVIEW_SCHEMA_VERSION 常量值=1（src/task-review.js:32）；升 v2 时此断言随常量走
  assert(r.stdout.includes('"schemaVersion": 1'), '渲染为 CLI 当前 REVIEW_SCHEMA_VERSION 常量值（=1）')
}

cleanup()
report(count.passed, count.failed, count.failures)