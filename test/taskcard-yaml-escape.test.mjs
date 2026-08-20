/**
 * 坑 taskcard-title-backtick-yaml 回归：taskcard 骨架自由文本字段的 YAML 安全序列化
 *
 * 背景（2026-08-20 实证）：plan checkbox 行名是自由文本，带反引号（如 "`-p` 参数支持"）时
 * 裸插值进 frontmatter——`` ` `` 是 YAML 保留指示符，js-yaml 解析直接抛错，契约字段
 * （allowed_paths/constraints 等硬校验 9 字段）随整个 frontmatter 静默丢失，靠 plan postcheck 兜住。
 *
 * 锁定语义：
 *   1. buildTaskcardSkeleton：title/title_zh 含反引号/冒号/引号 → frontmatter 可被 js-yaml 解析，
 *      字段值 round-trip 无损（含契约 9 字段不丢）
 *   2. cmdTaskcard e2e：plan checkbox 行名带反引号 → 生成的卡片 frontmatter 解析通过
 *   3. 单引号值转义（' → ''）
 */
import { buildTaskcardSkeleton, cmdTaskcard } from '../src/taskcard.js'
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import yaml from 'js-yaml'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log('  ✅ ' + msg)) : (failed++, failures.push(msg), console.log('  ❌ ' + msg)) }
const parseFm = (text) => {
  const m = text.match(/^---\n([\s\S]*?)\n---/)
  if (!m) throw new Error('frontmatter 未闭合')
  return yaml.load(m[1])
}
const NOW = '2026-08-20 12:00:00'

console.log('=== taskcard title YAML 转义（坑 taskcard-title-backtick-yaml）===\n')

console.log('--- ① 反引号 title：frontmatter 可解析 + 契约字段不丢 ---')
{
  const text = buildTaskcardSkeleton({
    taskId: 'task-01',
    title: '`-p` 参数支持（修复 `--flag` 解析）',
    titleZh: '`-p` 参数支持',
    author: 'qinyi', now: NOW,
  })
  let fm
  try { fm = parseFm(text) } catch (e) { fm = null; console.log('    解析错误: ' + e.message) }
  assert(fm !== null, 'js-yaml 解析通过（反引号被单引号包裹）')
  assert(fm && fm.title === '`-p` 参数支持（修复 `--flag` 解析）', 'title 值 round-trip 无损')
  // 契约 9 字段仍在（此前整块 frontmatter 解析炸掉 → 全部丢失）
  for (const k of ['id', 'title', 'author', 'created_at', 'priority', 'depends_on', 'allowed_paths', 'goal', 'constraints']) {
    assert(fm && fm[k] !== undefined, `契约字段 ${k} 未丢失`)
  }
}

console.log('--- ② 冒号/井号/引号等 YAML 敏感字符同样安全 ---')
{
  const cases = [
    ['含冒号: 副本', 'colon'],
    ['含 # 注释符', 'hash'],
    ["含单引号'x'", 'quote'],
    ['含双引号"x"', 'dquote'],
    ['@ 开头保留符', 'at'],
  ]
  for (const [t, label] of cases) {
    const text = buildTaskcardSkeleton({ taskId: 'task-01', title: t, titleZh: t, author: 'a', now: NOW })
    let fm
    try { fm = parseFm(text) } catch { fm = null }
    assert(fm !== null && fm.title === t, `「${label}」值 round-trip 无损（实得 ${JSON.stringify(fm && fm.title)}）`)
  }
}

console.log('--- ③ cmdTaskcard e2e：plan checkbox 行名带反引号 → 卡片可解析 ---')
{
  const d = mkdtempSync(join(tmpdir(), 'taskcard-esc-'))
  const cn = '2026-08-20-tcard-esc'
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n- [ ] task-01: `-p` 参数支持：修复\n')
  const r = cmdTaskcard(cn, { cwd: d, taskIds: 'all' })
  assert(r.created.length === 1, '卡片已生成')
  const card = readFileSync(join(changeDir, 'tasks', 'task-01.md'), 'utf8')
  let fm
  try { fm = parseFm(card) } catch { fm = null }
  assert(fm !== null, '生成的卡片 frontmatter 可被 js-yaml 解析')
  assert(fm && fm.title === '`-p` 参数支持：修复', 'title 从 plan 行名带出且无损')
  assert(fm && Array.isArray(fm.allowed_paths) && fm.allowed_paths.length > 0, '契约字段 allowed_paths 完好')
  rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
