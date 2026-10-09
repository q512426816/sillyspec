/**
 * verify-papercuts 四小修回归锁（2026-10-09-verify-papercuts）。
 * ①cmd-existence script 名合法字符集截断（全角标点不拼入）
 * ②verify-probes --force 保人工面（applySkeletonPreservingHuman 按段携载）
 * ③无分支锚形态的提交信息锚定救援窗口（declared-rescue-only 语义不变）
 * ④stageArchiveArtifacts 排除归档目录内嵌套 .sillyspec/ 运行时异物
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync, execFileSync } from 'node:child_process'
import { validateScriptCommands } from '../src/stages/cmd-existence.js'
import { applySkeletonPreservingHuman } from '../src/verify-probes.js'
import { reconcileTargetFiles } from '../src/verify-postcheck.js'
import { stageArchiveArtifacts } from '../src/git-helper.js'

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

test('① 全角标点不拼入 script 名：『npm run test；模块卡』提取 script=test 校验通过', () => {
  const dir = mkdtempSync(join(tmpdir(), 'papercut1-'))
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'node -e 0', lint: 'node -e 0' } }))
    const r = validateScriptCommands('verify: npm run test；模块卡 diff 一致', { projectRoot: dir })
    assert.equal(r.checked, 1, '恰好提取一条命令')
    assert.equal(r.invalid.length, 0, `全角分号截断后 script=test 存在（实得 ${JSON.stringify(r.invalid)}）`)
    const r2 = validateScriptCommands('implementation: pnpm run build。附带说明', { projectRoot: dir })
    assert.equal(r2.checked, 1)
    assert.ok(r2.invalid.length === 1 && r2.invalid[0].cmd === 'pnpm run build', '句点截断后 script=build 仍按真实存在性校验（不存在→报）')
    const r3 = validateScriptCommands('npm run lint && npm run typecheck, 可选', { projectRoot: dir })
    assert.equal(r3.invalid.length, 1, 'ASCII 分隔符（&&/,）同样截断；typecheck 不存在如实报')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})

test('② --force 保人工面：结论/移交项/矩阵已填行按段携载，占位段换新骨架', () => {
  const oldText = [
    '# 验证报告',
    '',
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`PASS WITH NOTES`——手填结论在场',
    '',
    '## 移交项（结构化） [层：人工判断——CLI 清单核验]',
    '| 类型 | 条目 | 复跑/验收条件 |',
    '|---|---|---|',
    '| other | 手填移交条目 | 复跑条件 |',
    '',
    '## 任务完成度 [层：人工判断]',
    '<!--TODO: 逐 task 对照-->',
    '',
    '## 决策追踪矩阵',
    '| 决策 ID | FR | Task | Evidence | 状态 |',
    '|---|---|---|---|---|',
    '| D-001@v1 | FR-01 | task-01 | 手填证据 | closed |',
    '',
    '## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '| acceptance 条目 | 归属测试文件 | 判定 | 证据 |',
    '|---|---|---|---|',
    '| 已填验收项 | `test/a.test.mjs` | covered | 手填证据 |',
    '',
    '## 自定义补充节 [层：用户]',
    '',
    '用户手写内容不应被销毁',
    '',
  ].join('\n')
  const skeleton = [
    '# 验证报告',
    '',
    '## 结论 [层：人工判断]',
    '',
    '结论枚举：`<待填：三选一>`',
    '',
    '## 移交项（结构化） [层：人工判断——CLI 清单核验]',
    '| 类型 | 条目 | 复跑/验收条件 |',
    '|---|---|---|',
    '| <待填> | <待填> | <待填> |',
    '',
    '## 任务完成度 [层：人工判断]',
    '<!--TODO: 新骨架占位-->',
    '',
    '## 决策追踪矩阵',
    '| 决策 ID | FR | Task | Evidence | 状态 |',
    '|---|---|---|---|---|',
    '| D-001@v1 | <待填> | <待填> | <待填：证据回指> | <待填> |',
    '| D-002@v1 | <待填> | <待填> | <待填：证据回指> | <待填> |',
    '',
    '## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '| acceptance 条目 | 归属测试文件 | 判定 | 证据 |',
    '|---|---|---|---|',
    '| 已填验收项 | `test/` | <待填：五选一> | <待填：锚点> |',
    '| 新增验收项 | `test/b.test.mjs` | <待填：五选一> | <待填：锚点> |',
    '',
  ].join('\n')
  const r = applySkeletonPreservingHuman(oldText, skeleton)
  assert.ok(r.text.includes('结论枚举：`PASS WITH NOTES`——手填结论在场'), '已填结论原样保留')
  assert.ok(r.text.includes('| other | 手填移交条目 | 复跑条件 |'), '已填移交行携载')
  assert.ok(r.text.includes('新骨架占位'), 'TODO 段换新骨架（未填无损失）')
  assert.ok(r.text.includes('| D-001@v1 | FR-01 | task-01 | 手填证据 | closed |'), '决策矩阵已填行携载')
  assert.ok(r.text.includes('| D-002@v1'), '决策矩阵新增行从骨架进场')
  assert.ok(r.text.includes('| 已填验收项 | `test/a.test.mjs` | covered | 手填证据 |'), '探针 7 已填行携载')
  assert.ok(r.text.includes('| 新增验收项 |'), '探针 7 新增行进场')
  assert.ok(r.text.includes('用户手写内容不应被销毁'), '自定义节不销毁')
  assert.ok(r.carriedSections.includes('结论') && r.carriedSections.includes('移交项'), `携载段清单如实（实得 ${JSON.stringify(r.carriedSections)}）`)
})

test('③ 无分支锚形态：含变更名的提交消息锚定窗口救赎已 commit 的声明文件（②类不再假红）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'papercut3-'))
  try {
    git(dir, ['init', '-q'])
    git(dir, ['config', 'user.email', 't@t.local'])
    git(dir, ['config', 'user.name', 't'])
    writeFileSync(join(dir, 'README.md'), 'init\n')
    git(dir, ['add', '-A'])
    git(dir, ['commit', '-qm', 'init'])
    const cn = '2026-10-09-x'
    const specBase = join(dir, '.sillyspec')
    mkdirSync(join(specBase, 'changes', cn, 'tasks'), { recursive: true })
    // task 卡声明交付文件（无分支/tag/meta——主代理直改形态）
    writeFileSync(join(specBase, 'changes', cn, 'tasks', 'task-01.md'), [
      '---', 'id: task-01', 'title: t', 'title_zh: t', 'status: draft', 'depends_on: []',
      'goal: g', 'implementation: i', 'verify: node a.js', 'constraints: c',
      'acceptance:', '  - a1',
      'target_files:', '  - src/delivered.js', '  - test/delivered.test.mjs', '---', '',
    ].join('\n'))
    // 交付直接 commit 到主干（消息含变更名），工作区干净
    mkdirSync(join(dir, 'src'), { recursive: true })
    mkdirSync(join(dir, 'test'), { recursive: true })
    writeFileSync(join(dir, 'src', 'delivered.js'), 'export const x = 1\n')
    writeFileSync(join(dir, 'test', 'delivered.test.mjs'), 'export const t = 1\n')
    git(dir, ['add', 'src/delivered.js', 'test/delivered.test.mjs'])
    git(dir, ['commit', '-m', 'feat: 交付 (2026-10-09-x) (task-01)'])
    const r = reconcileTargetFiles({ cwd: dir, specBase, changeName: cn, runtimeRoot: join(specBase, '.runtime'), strictMode: false })
    assert.equal(r.status, 'ok', `对账通过（实得 ${r.status}: ${JSON.stringify(r.missing)}）`)
    assert.equal(r.missing.length, 0, '已 commit 的声明文件不再假红 ②类')
    assert.ok(r.sources.some((x) => String(x).includes('log-msg-window')), `来源含消息锚定窗口（实得 ${JSON.stringify(r.sources)}）`)
    assert.equal(r.undeclared.length, 0, 'undeclared 面不受影响（declared-rescue-only 不放大）')
    // 反向钉：他变更消息的提交不救——声明一个未交付文件
    writeFileSync(join(specBase, 'changes', cn, 'tasks', 'task-02.md'), [
      '---', 'id: task-02', 'title: t', 'title_zh: t', 'status: draft', 'depends_on: []',
      'goal: g', 'implementation: i', 'verify: node a.js', 'constraints: c',
      'acceptance:', '  - a1',
      'target_files:', '  - src/never-delivered.js', '---', '',
    ].join('\n'))
    const r2 = reconcileTargetFiles({ cwd: dir, specBase, changeName: cn, runtimeRoot: join(specBase, '.runtime'), strictMode: false })
    assert.ok(r2.missing.some((m) => String(m.path || m).includes('never-delivered')), '真未交付仍如实报 ②类（消息窗口不误救）')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})

test('④ 归档暂存排除嵌套 .sillyspec/ 异物：正常产物进暂存，db/日志不进', () => {
  const dir = mkdtempSync(join(tmpdir(), 'papercut4-'))
  try {
    git(dir, ['init', '-q'])
    git(dir, ['config', 'user.email', 't@t.local'])
    git(dir, ['config', 'user.name', 't'])
    writeFileSync(join(dir, 'README.md'), 'init\n')
    git(dir, ['add', '-A'])
    git(dir, ['commit', '-qm', 'init'])
    const arch = join(dir, '.sillyspec', 'changes', 'archive', '2026-10-09-y')
    mkdirSync(join(arch, '.sillyspec', '.runtime'), { recursive: true })
    writeFileSync(join(arch, 'verify-result.md'), '# 报告\n')
    writeFileSync(join(arch, '.sillyspec', '.runtime', 'sillyspec.db'), 'junk')
    writeFileSync(join(arch, '.sillyspec', 'spec-sync-bg.log'), 'junk')
    const r = stageArchiveArtifacts(dir)
    const staged = execSync('git diff --cached --name-only', { cwd: dir, encoding: 'utf8' }).trim().split('\n').filter(Boolean)
    assert.ok(staged.some((p) => p.endsWith('verify-result.md')), '正常归档产物进暂存')
    assert.ok(!staged.some((p) => p.includes('.sillyspec/changes/archive') && p.includes('/.sillyspec/')), `嵌套 .sillyspec 异物不进暂存（实得 ${JSON.stringify(staged)}）`)
    assert.ok(Array.isArray(r.staged), '返回结构不变（兼容调用方）')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})
