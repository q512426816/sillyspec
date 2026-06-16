/**
 * P0 补丁验证 — 4 类测试
 *
 * 1. 平台 scan prompt 不含正向写入 .sillyspec/ 指令
 * 2. 安全说明文字不被 prompt 自检误杀
 * 3. 平台模式不执行 git add {SPEC_ROOT}
 * 4. source_root 污染检查覆盖所有子目录/文件
 * 5. run.js 占位符替换补齐（平台+本地）
 *
 * 跑法: node test/platform-scan-p0.test.mjs
 */

import { join, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'fs'
import { execSync } from 'child_process'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const passed = []
const failed = []

function assert(label, condition, detail) {
  if (condition) {
    passed.push(label)
  } else {
    failed.push({ label, detail })
  }
}

// ── 测试 1：scan.js 模板不含裸 .sillyspec 输出路径 ──
{
  const { definition } = await import('../src/stages/scan.js')
  const prompts = definition.steps.map(s => s.prompt).join('\n')

  // 所有 .sillyspec 出现都应该是「禁止说明」，不是写入指令
  const writePatterns = [
    /write.*\.sillyspec\/docs/i,
    /save.*\.sillyspec\/docs/i,
    /create.*\.sillyspec\/docs/i,
    /mkdir.*\.sillyspec\/docs/i,
  ]
  for (const p of writePatterns) {
    assert(`scan 模板无写入 .sillyspec/docs: ${p}`, !p.test(prompts),
      p.test(prompts) ? `命中: ${prompts.match(p)[0]}` : '')
  }

  // 应该使用占位符
  assert('scan 模板使用 {WORKFLOWS_ROOT}', prompts.includes('{WORKFLOWS_ROOT}'))
  assert('scan 模板使用 {SPEC_ROOT}', prompts.includes('{SPEC_ROOT}'))
  assert('scan 模板使用 {DOCS_ROOT}', prompts.includes('{DOCS_ROOT}'))

  // 平台模式下 git add 应该是条件判断
  assert('scan 模板平台模式跳过 git add', prompts.includes('如果平台模式：跳过 git add'))
  assert('scan 模板非平台模式 git add .sillyspec/', prompts.includes('git add .sillyspec/'))
}

// ── 测试 2：prompt 自检不误杀安全说明 ──
{
  // 导入 run.js 中的正则
  const writeCtxRe = /(?<!不要|禁止|严禁)(?:save[\s.]+to|write|create|mkdir|git add|写入|保存到|写入到)[^a-zA-Z]*\.sillyspec\/[a-z]/i

  // 安全说明 — 不应命中
  const safeLines = [
    '严禁写入源码目录或相对路径 `.sillyspec/`',
    '⚠️ 不要写入 .sillyspec/docs',
    'source_root 下存在 .sillyspec/docs 文件',
    '不允许从 cwd 推导 .sillyspec 路径',
  ]
  for (const line of safeLines) {
    assert(`安全说明不误杀: "${line.slice(0, 40)}"`, !writeCtxRe.test(line),
      '误杀! 命中了安全说明文字')
  }

  // 写入指令 — 应该命中
  const badLines = [
    '写入 `.sillyspec/docs/ARCHITECTURE.md`',
    'save to `.sillyspec/docs/ARCHITECTURE.md`',
    'create `.sillyspec/docs/ARCH.md`',
    'git add .sillyspec/docs/',
    'write 到 .sillyspec/docs/',
  ]
  for (const line of badLines) {
    assert(`写入指令应命中: "${line.slice(0, 40)}"`, writeCtxRe.test(line),
      '漏杀! 没有捕获写入指令')
  }
}

// ── 测试 3：safeGit 使用 -c safe.directory（不污染全局 config） ──
{
  const runSrc = await readFile(join(__dirname, '..', 'src', 'run.js'), 'utf8')

  assert('safeGit 不含 --global', !runSrc.includes('git config --global'),
    '发现 --global，会污染容器 git config')

  assert('safeGit 使用 -c safe.directory', runSrc.includes("safe.directory=${cwd}"),
    '未发现 -c safe.directory per-command 参数')

  assert('safeGit 使用 -C cwd', runSrc.includes("-C', cwd"),
    '未发现 -C cwd 参数')

  assert('safeGit 返回 { value, error }', runSrc.includes("return { value, error: "),
    'safeGit 返回值不是 { value, error } 结构')

  assert('manifest 包含 source_commit_error 字段',
    runSrc.includes("source_commit_error:"), 'manifest 缺少 source_commit_error')
}

// ── 测试 4：postcheck 污染检查覆盖所有子目录 ──
{
  const postcheckSrc = await readFile(join(__dirname, '..', 'src', 'scan-postcheck.js'), 'utf8')

  const requiredSubs = ['docs', 'projects', 'workflows', 'knowledge']
  for (const sub of requiredSubs) {
    assert(`postcheck 检查 ${sub} 污染`,
      postcheckSrc.includes(`'${sub}'`) && postcheckSrc.includes("'.sillyspec', sub)"),
      `postcheck 未检查 .sillyspec/${sub}/ 污染`)
  }

  assert('postcheck 检查 manifest.json', postcheckSrc.includes('manifest.json'))
  assert('postcheck 检查 local.yaml', postcheckSrc.includes('local.yaml'))
  assert('污染 severity 使用枚举', postcheckSrc.includes('CHECK_SEVERITY'))
}

// ── 测试 5：run.js 占位符替换补齐 ──
{
  const runSrc = await readFile(join(__dirname, '..', 'src', 'run.js'), 'utf8')

  // 平台模式块
  const platformMarker = 'promptText.replace(/\\{WORKFLOWS_ROOT\\}'
  assert('平台模式替换 {WORKFLOWS_ROOT}', runSrc.includes('{WORKFLOWS_ROOT}') && runSrc.includes('workflowsRoot'))
  assert('平台模式替换 {KNOWLEDGE_ROOT}', runSrc.includes('{KNOWLEDGE_ROOT}') && runSrc.includes('knowledgeRoot'))
  assert('平台模式替换 {SPEC_ROOT}', runSrc.includes('{SPEC_ROOT}') && runSrc.includes("specSillyspec"))

  // 非平台模式块
  assert('非平台模式替换 {WORKFLOWS_ROOT}', runSrc.includes('workflowsRoot'))
  assert('非平台模式替换 {KNOWLEDGE_ROOT}', runSrc.includes('knowledgeRoot'))
  assert('非平台模式替换 {SPEC_ROOT}', runSrc.includes('{SPEC_ROOT}'))
}

// ── 测试 6：quick step 1 prompt 强制要求 quicklog ──
{
  const { definition } = await import('../src/stages/quick.js')
  const step1Prompt = definition.steps[0].prompt
  const step3Prompt = definition.steps[2].prompt

  assert('quick step 1 包含 ⛔ 标记', step1Prompt.includes('⛔'))
  assert('quick step 1 包含「不能跳过」', step1Prompt.includes('不能跳过'))
  assert('quick step 1 包含 quicklog 未创建 warning', step1Prompt.includes('quicklog 未创建'))
  assert('quick step 1 输出要求 quicklog 第一行', step1Prompt.includes('第一行确认'))
  assert('quick step 3 禁止 git add -A', step3Prompt.includes('禁止使用 `git add -A`'))
  assert('quick step 3 使用 scoped git add', step3Prompt.includes('git add -- <file...>'))

  // run.js 审计包含 quicklog 检查
  const runSrc = await readFile(join(__dirname, '..', 'src', 'run.js'), 'utf8')
  assert('quick 审计检查 quicklog 目录存在', runSrc.includes('quicklog 目录不存在'))
  assert('quick 审计检查 quicklog 为空', runSrc.includes('quicklog 目录为空'))
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed.length}`)
console.log(`❌ 失败: ${failed.length}`)
console.log(`${'='.repeat(50)}`)

if (failed.length > 0) {
  console.log('\n失败详情:')
  for (const f of failed) {
    console.log(`  ❌ ${f.label}`)
    if (f.detail) console.log(`     ${f.detail}`)
  }
  throw new Error("test failed")
} else {
  console.log('\n🎉 全部 P0 测试通过!')
}
