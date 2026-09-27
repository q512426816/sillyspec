/**
 * knowledge validate 锚点漂移告警（坑 knowledge-hits-anchor-drift-and-upload-stall T4）
 *
 * 实证（2026-09-25）：INDEX 路由行锚点与目标文件标题静默漂移——标题事后被改 / emoji 前缀 /
 * 点号 / 斜杠处理三代规则不一致 → 命中落空成幽灵锚（平台知识页不计覆盖、不计死条目清理）。
 * 修复：validate 对带锚点的路由行做容错归一比对（剥非字母数字 + 小写 + 截断前缀容忍），
 * 无对应标题 → anchor_drift 告警（不报错，修复由人拍板）。
 * 本测试锁：①真漂移（标题已换代）→ 告警；②三代规则并存形态（emoji 前缀差异 / 点号差异 /
 * 斜杠空格差异）→ 语义同源不告警；③长标题截断锚点 → 前缀容忍不告警。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const CLI = join(import.meta.dirname, '..', 'bin', 'sillyspec.js')
const roots = []
function makeSpecRoot() {
  const root = join(tmpdir(), `kv-adrift-${Math.random().toString(36).slice(2)}`)
  roots.push(root)
  const kd = join(root, 'knowledge')
  mkdirSync(kd, { recursive: true })
  return { root, kd }
}
const runValidate = (root) => JSON.parse(execFileSync(process.execPath,
  [CLI, 'knowledge', 'validate', '--json', '--spec-dir', root],
  { encoding: 'utf8', cwd: root }))

describe('knowledge validate anchor_drift（坑 knowledge-hits T4）', () => {
  it('① 真漂移：标题已换内容，锚点指向旧标题 → anchor_drift 告警', () => {
    const { root, kd } = makeSpecRoot()
    writeFileSync(join(kd, 'known-issues.md'), '---\nauthor: t\n---\n# K\n\n## 重写后的新标题形态\n\n正文。\n', 'utf8')
    writeFileSync(join(kd, 'INDEX.md'),
      '---\nauthor: t\n---\n\n# Knowledge Index\n\n## Known Issues\n\n- 旧问题|关键词 → [旧标题条目](known-issues.md#旧标题已被整体替换)\n', 'utf8')
    const r = runValidate(root)
    const drift = r.warnings.filter((w) => w.code === 'anchor_drift')
    assert.equal(drift.length, 1, `应恰一条漂移告警：${JSON.stringify(r.warnings)}`)
    assert.equal(drift[0].anchor, '旧标题已被整体替换')
  })

  it('② 三代规则并存形态：emoji 前缀 / 点号 / 斜杠空格差异 → 语义同源不告警', () => {
    const { root, kd } = makeSpecRoot()
    writeFileSync(join(kd, 'known-issues.md'), [
      '---\nauthor: t\n---\n# K',
      '## 🟡 sillyhub-daemon 于 2026-06-14 从 Python 重写为 Node.js',
      '## daemon pnpm overrides 把 sdk 二进制硬钉 0.3.181',
      '## 子项目构建 / 测试 / lint 命令',
      '正文。',
    ].join('\n\n') + '\n', 'utf8')
    // 三条锚点分别取坑文件实测的三代形态（无前导杠 / 点号被丢 / 斜杠差异）
    writeFileSync(join(kd, 'INDEX.md'),
      '---\nauthor: t\n---\n\n# Knowledge Index\n\n## Known Issues\n\n' +
      '- 关键词a → [daemon 重写](known-issues.md#sillyhub-daemon-于-2026-06-14-从-python-重写为-nodejs)\n' +
      '- 关键词b → [硬钉版本](known-issues.md#daemon-pnpm-overrides-把-sdk-二进制硬钉-03181)\n' +
      '- 关键词c → [构建命令](known-issues.md#子项目构建--测试--lint-命令)\n', 'utf8')
    const r = runValidate(root)
    assert.deepEqual(r.warnings.filter((w) => w.code === 'anchor_drift'), [],
      `三代并存形态不应误报：${JSON.stringify(r.warnings)}`)
  })

  it('③ 截断容忍：超长标题的 60 字符截断锚点 → 前缀命中不告警', () => {
    const { root, kd } = makeSpecRoot()
    const longTitle = '这是一个非常长的知识条目标题用来验证锚点截断容忍机制在前后缀方向上都能正确工作且不误报'
    writeFileSync(join(kd, 'patterns.md'), `---\nauthor: t\n---\n# P\n\n## ${longTitle}\n\n正文。\n`, 'utf8')
    const anchor = longTitle.slice(0, 30) // 截断锚点（归一后为标题前缀）
    writeFileSync(join(kd, 'INDEX.md'),
      `---\nauthor: t\n---\n\n# Knowledge Index\n\n## Patterns\n\n- 关键词 → [长条目](patterns.md#${anchor})\n`, 'utf8')
    const r = runValidate(root)
    assert.deepEqual(r.warnings.filter((w) => w.code === 'anchor_drift'), [],
      `截断锚点应前缀命中：${JSON.stringify(r.warnings)}`)
  })
})

describe('teardown', () => {
  it('cleanup', () => {
    for (const t of roots) { try { rmSync(t, { recursive: true, force: true }) } catch { /* Windows 句柄延迟 */ } }
  })
})
