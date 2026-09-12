/**
 * acceptance best-effort 标识符 grep 降噪测试
 *
 * 用户实证 2026-08-29：15 张卡 20+ 条「acceptance 提到 X 但 allowed_paths 源文件未命中」
 * 全是误报——acceptance 天然大量提及本次计划要新增的字段/函数（此刻不在源码里是正常的）。
 *
 * 三道降噪门（src/stages/plan-postcheck.js validatePlanFeasibility 检查点 6）：
 * ① 停用词（snake_case 等格式名词 / allowed_paths 等 TaskCard 字段名）不计
 * ② design.md 已声明的标识符（本次计划新增物）不计
 * ③ allowed_paths 源文件已含的标识符不计（原行为）
 * 剩下的（源码与 design 均未命中、非停用词）才提 warning。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { validatePlanFeasibility } from '../src/stages/plan-postcheck.js'

function taskCard({ id = 'task-01', acceptance, allowedPaths }) {
  const lines = ['---', `id: ${id}`, `title: ${id}`, 'title_zh: 测试', 'allowed_paths:']
  for (const p of allowedPaths) lines.push(`  - ${p}`)
  lines.push(
    'goal: >', '  test', 'implementation: >', '  test', 'constraints: >', '  test',
    'verify:', '  - echo ok', 'acceptance:', ...acceptance.map(a => `  - ${a}`),
    '---'
  )
  return lines.join('\n') + '\n'
}

describe('acceptance 标识符 grep 降噪（design 豁免 + 停用词）', () => {
  let dir
  let projectRoot
  beforeEach(() => {
    const rnd = Math.random().toString(36).slice(2)
    dir = join(tmpdir(), `sillyspec-acc-${rnd}`)
    projectRoot = join(tmpdir(), `sillyspec-acc-proj-${rnd}`)
    mkdirSync(join(dir, 'tasks'), { recursive: true })
    mkdirSync(join(projectRoot, 'src'), { recursive: true })
    writeFileSync(
      join(projectRoot, 'src', 'api.js'),
      'export const existing_field = 1\nexport function usedFunction() {}\n'
    )
  })
  afterEach(() => {
    for (const d of [dir, projectRoot]) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
  })

  it('design 已声明 / 停用词 / 源码已有的标识符不告警，仅幽灵标识符告警', () => {
    writeFileSync(join(dir, 'design.md'), [
      '# D', '',
      '## 接口定义', '',
      '新增字段 new_field_name 与 newFunctionName，写入 src/api.js。', '',
    ].join('\n'))
    writeFileSync(join(dir, 'tasks', 'task-01.md'), taskCard({
      allowedPaths: ['src/api.js'],
      acceptance: [
        'existing_field 保持不变', // ③ 源码已有 → 不告警
        'new_field_name 按 design 新增', // ② design 已声明 → 不告警
        '输出 snake_case 格式', // ① 格式名词停用词 → 不告警
        'allowed_paths 只含本文件', // ① TaskCard 字段名停用词 → 不告警
        '响应含 ghost_identifier', // 源码与 design 均无 → 告警
      ],
    }))
    const r = validatePlanFeasibility(dir, projectRoot)
    const grepWarns = r.warnings.filter(w => w.includes('acceptance 提到'))
    assert.equal(grepWarns.length, 1, JSON.stringify(grepWarns))
    assert.ok(grepWarns[0].includes('ghost_identifier'), grepWarns[0])
    assert.ok(grepWarns[0].includes('design.md'), grepWarns[0]) // 文案与降噪口径一致
  })

  it('camelCase 新函数在 design 已声明 → 不告警（提取器同时覆盖 snake/camel）', () => {
    writeFileSync(join(dir, 'design.md'), 'newFunctionName 由本变更新增\n')
    writeFileSync(join(dir, 'tasks', 'task-01.md'), taskCard({
      allowedPaths: ['src/api.js'],
      acceptance: ['newFunctionName 可被调用'],
    }))
    const r = validatePlanFeasibility(dir, projectRoot)
    assert.equal(r.warnings.filter(w => w.includes('acceptance 提到')).length, 0, JSON.stringify(r.warnings))
  })

  it('无 design.md → 退化为纯源码 grep（design 豁免门关闭）', () => {
    writeFileSync(join(dir, 'tasks', 'task-01.md'), taskCard({
      allowedPaths: ['src/api.js'],
      acceptance: ['new_field_name 新增', 'ghost_identifier 出现'],
    }))
    const r = validatePlanFeasibility(dir, projectRoot)
    const grepWarns = r.warnings.filter(w => w.includes('acceptance 提到'))
    assert.equal(grepWarns.length, 2, JSON.stringify(grepWarns))
  })
})
