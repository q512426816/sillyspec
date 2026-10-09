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

test('②b 审查 P2 修正：stale 携载行 + 多探针段时输出不损坏（倒序替换）', () => {
  const oldText = [
    '## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '| acceptance 条目 | 归属测试文件 | 判定 | 证据 |',
    '|---|---|---|---|',
    '| 已填项 | `test/a.test.mjs` | covered | 手填 |',
    '| 已撤下项 | `test/old.test.mjs` | covered | stale 手填 |',
    '',
    '#### 探针 8：载荷字段契约对账',
    '| 字段 | 在场 |',
    '|---|---|',
    '| src/x.js | yes |',
    '',
  ].join('\n')
  const skeleton = [
    '## 探针结果（CLI 机械预填） [层：可复跑探针——gate 抽查防篡改]',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '| acceptance 条目 | 归属测试文件 | 判定 | 证据 |',
    '|---|---|---|---|',
    '| 已填项 | `test/` | <待填：五选一> | <待填：锚点> |',
    '',
    '#### 探针 8：载荷字段契约对账',
    '| 字段 | 在场 |',
    '|---|---|',
    '| src/x.js | <待填> |',
    '| src/y.js | <待填> |',
    '',
  ].join('\n')
  const r = applySkeletonPreservingHuman(oldText, skeleton)
  // 探针 7：已填行携载 + stale 追加（不丢）
  assert.ok(r.text.includes('| 已填项 | `test/a.test.mjs` | covered | 手填 |'), '探针 7 已填行携载')
  assert.ok(r.text.includes('已撤下项'), 'stale 行携载保留（agent 裁决）')
  // 探针 8：正序错位会残留探针 7 的表尾/待填——倒序后应干净
  const p8 = r.text.slice(r.text.indexOf('#### 探针 8'))
  assert.ok(p8.includes('| src/x.js | yes |'), '探针 8 已填行按首列键携载（错位修复的判别锚）')
  assert.ok(!p8.includes('|---|---|---|---|'), '探针 8 段无他表（探针 7 的四列分隔行）串入（正序错位的残留信号）')
  assert.ok(!p8.includes('已撤下项'), '探针 8 段无探针 7 的 stale 行串入')
  assert.ok(p8.includes('| src/y.js |'), '探针 8 新增行进场')
  assert.ok(!p8.slice(p8.indexOf('| src/x.js |')).includes('|---|---|---|---|'), '无他表分隔行串入')
})

test('③b 审查 P3 修正：前缀变更名不误纳（边界锚定）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'papercut3b-'))
  try {
    git(dir, ['init', '-q'])
    git(dir, ['config', 'user.email', 't@t.local'])
    git(dir, ['config', 'user.name', 't'])
    writeFileSync(join(dir, 'README.md'), 'init\n')
    git(dir, ['add', '-A'])
    git(dir, ['commit', '-qm', 'init'])
    // 变更 B（名含 A 作前缀）先提交他自己的文件
    mkdirSync(join(dir, 'src'), { recursive: true })
    writeFileSync(join(dir, 'src', 'b-only.js'), 'export const b = 1\n')
    git(dir, ['add', 'src/b-only.js'])
    git(dir, ['commit', '-m', 'feat: B 交付 (2026-10-09-x2)'])
    // 变更 A 声明了 B 的文件（跨变更误声明形态）——A 无自己提交
    const cn = '2026-10-09-x'
    const specBase = join(dir, '.sillyspec')
    mkdirSync(join(specBase, 'changes', cn, 'tasks'), { recursive: true })
    writeFileSync(join(specBase, 'changes', cn, 'tasks', 'task-01.md'), [
      '---', 'id: task-01', 'title: t', 'title_zh: t', 'status: draft', 'depends_on: []',
      'goal: g', 'implementation: i', 'verify: node a.js', 'constraints: c',
      'acceptance:', '  - a1',
      'target_files:', '  - src/b-only.js', '---', '',
    ].join('\n'))
    const r = reconcileTargetFiles({ cwd: dir, specBase, changeName: cn, runtimeRoot: join(specBase, '.runtime'), strictMode: false })
    assert.ok(r.missing.some((m) => String(m.path || m).includes('b-only')), `B 的提交不救 A 的声明（子串误纳已修；实得 missing=${JSON.stringify(r.missing)} sources=${JSON.stringify(r.sources)}）`)
    assert.ok(!r.sources.some((x) => String(x).includes('log-msg-window')), 'A 的窗口源不应被 B 的提交激活')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})

test('②c 审查 P3 修正：技术债务/Runtime Evidence/代码审查 段同享人工面携载', () => {
  const oldText = [
    '## 技术债务 [层：人工判断]',
    '',
    '手填债务叙述在场',
    '',
    '## Runtime Evidence [层：人工判断]',
    '',
    '手填运行时证据在场',
    '',
    '## 代码审查 [层：人工判断]',
    '',
    '手填审查叙述在场',
    '',
  ].join('\n')
  const skeleton = [
    '## 技术债务 [层：人工判断]',
    '',
    '<!--TODO: 技术债务-->',
    '',
    '## Runtime Evidence [层：人工判断]',
    '',
    '<!--TODO: 运行时证据-->',
    '',
    '## 代码审查 [层：人工判断]',
    '',
    '<!--TODO: 代码审查-->',
    '',
  ].join('\n')
  const r = applySkeletonPreservingHuman(oldText, skeleton)
  for (const marker of ['手填债务叙述在场', '手填运行时证据在场', '手填审查叙述在场']) {
    assert.ok(r.text.includes(marker), `${marker} 携载`)
  }
  assert.ok(!r.text.includes('<!--TODO'), '已填段不再回到占位')
})
