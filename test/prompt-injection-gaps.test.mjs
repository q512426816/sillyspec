/**
 * 机械事实注入三件（2026-09-07 注入缺口批次）测试：{LOCAL_COMMANDS} / {GIT_DIRTY} /
 * {TASKS_CHECKBOX}——CLI 渲染 prompt 时确定性直出，替代 agent 各自 cat local.yaml /
 * git status / 手数勾选（brainstorm/plan/execute/verify/quick 全流程 7+ 处步骤）。
 *
 * 锁住：
 *  1. {LOCAL_COMMANDS}：local.yaml commands 段注入；缺失 → local detect 指引（不留占位符）
 *  2. {GIT_DIRTY}：porcelain 清单注入；干净 → 「工作区干净」
 *  3. {TASKS_CHECKBOX}：tasks.md 勾选投影（已勾计数 + 逐行）；无 tasks.md → 跳过说明
 *  4. fail-soft：三占位符异常路径不炸渲染（占位符必被替换，无残留）
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { outputStep } from '../src/run/prompt.js'
import { runCapturing, makeRepo, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== 机械事实注入三件（LOCAL_COMMANDS / GIT_DIRTY / TASKS_CHECKBOX）===\n')

console.log('--- ① LOCAL_COMMANDS：commands 段注入 ---')
{
  const { cwd, specBase } = makeRepo('inj-local-')
  if (!existsSync(specBase)) mkdirSync(specBase, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: "npm test"\n  lint: "npm run lint"\nmodules:\n  foo: src/foo\n')
  const steps = [{ name: '加载', prompt: '构建命令：\n{LOCAL_COMMANDS}', requiresWait: false }]
  const r = await runCapturing(() => outputStep('brainstorm', 0, steps, cwd, null, null, {}, null))
  assert(r.stdout.includes('test: "npm test"'), 'commands 段原文注入（test）')
  assert(r.stdout.includes('lint: "npm run lint"'), 'commands 段原文注入（lint）')
  assert(!r.stdout.includes('modules:'), 'commands 段外内容不注入（modules 不出现）')
  assert(!r.stdout.includes('{LOCAL_COMMANDS}'), '无占位符残留')
}

console.log('\n--- ① LOCAL_COMMANDS：缺失 → local detect 指引 ---')
{
  const { cwd } = makeRepo('inj-local-miss-')
  const steps = [{ name: '加载', prompt: '构建命令：\n{LOCAL_COMMANDS}', requiresWait: false }]
  const r = await runCapturing(() => outputStep('brainstorm', 0, steps, cwd, null, null, {}, null))
  assert(r.stdout.includes('未配置 local.yaml') && r.stdout.includes('local detect'), '缺失时注入 detect 指引')
  assert(!r.stdout.includes('{LOCAL_COMMANDS}'), '无占位符残留')
}

console.log('\n--- ① LOCAL_COMMANDS：unavailable 条目剔除 ---')
{
  const { cwd, specBase } = makeRepo('inj-local-unavail-')
  if (!existsSync(specBase)) mkdirSync(specBase, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: "npm test"\n  build: unavailable\n  lint: unavailable # 探测失败占位\n')
  const steps = [{ name: '加载', prompt: '构建命令：\n{LOCAL_COMMANDS}', requiresWait: false }]
  const r = await runCapturing(() => outputStep('brainstorm', 0, steps, cwd, null, null, {}, null))
  assert(r.stdout.includes('test: "npm test"'), '可用条目保留')
  assert(!r.stdout.includes('unavailable'), 'unavailable 条目剔除（含带注释形态）')
}

console.log('\n--- ② GIT_DIRTY：porcelain 清单注入（quick） ---')
{
  const { cwd, specBase } = makeRepo('inj-dirty-')
  writeFileSync(join(cwd, 'dirty-file.md'), 'x\n') // makeRepo 提交后新增未跟踪文件
  const steps = [{ name: '暂存', prompt: '脏文件：\n{GIT_DIRTY}', requiresWait: false }]
  const r = await runCapturing(() => outputStep('quick', 0, steps, cwd, null, null, {}, null))
  assert(r.stdout.includes('dirty-file.md'), '未跟踪文件出现在注入清单')
  assert(!r.stdout.includes('{GIT_DIRTY}'), '无占位符残留')
}

console.log('\n--- ② GIT_DIRTY：干净仓 → 干净提示 ---')
{
  const { cwd } = makeRepo('inj-clean-')
  const steps = [{ name: '暂存', prompt: '脏文件：\n{GIT_DIRTY}', requiresWait: false }]
  const r = await runCapturing(() => outputStep('quick', 0, steps, cwd, null, null, {}, null))
  assert(r.stdout.includes('工作区干净'), '干净仓注入干净提示')
}

console.log('\n--- ③ TASKS_CHECKBOX：勾选投影（verify + changeName） ---')
{
  const { cwd, specBase } = makeRepo('inj-tasks-')
  const cn = '2026-09-07-inj-tasks'
  mkdirSync(join(specBase, 'changes', cn), { recursive: true })
  writeFileSync(join(specBase, 'changes', cn, 'tasks.md'), '# Tasks\n\n- [x] task-01: a\n- [ ] task-02: b\n- [X] task-03: c\n')
  const steps = [{ name: '逐项检查', prompt: '勾选：\n{TASKS_CHECKBOX}', requiresWait: false }]
  const r = await runCapturing(() => outputStep('verify', 0, steps, cwd, cn, null, {}, null))
  assert(r.stdout.includes('已勾 2/3'), '计数行（大小写 [x]/[X] 均计）')
  assert(r.stdout.includes('task-02: b'), '逐行投影含未勾行')
  assert(!r.stdout.includes('{TASKS_CHECKBOX}'), '无占位符残留')
}

console.log('\n--- ③ TASKS_CHECKBOX：无 tasks.md → 跳过说明 ---')
{
  const { cwd, specBase } = makeRepo('inj-tasks-miss-')
  const cn = '2026-09-07-inj-nope'
  mkdirSync(join(specBase, 'changes', cn), { recursive: true })
  const steps = [{ name: '逐项检查', prompt: '勾选：\n{TASKS_CHECKBOX}', requiresWait: false }]
  const r = await runCapturing(() => outputStep('verify', 0, steps, cwd, cn, null, {}, null))
  assert(r.stdout.includes('tasks.md 不存在'), '缺失时注入跳过说明')
}

cleanup()
report(count.passed, count.failed, count.failures)
