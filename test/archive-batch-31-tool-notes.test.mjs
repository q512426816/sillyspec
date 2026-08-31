// 批量归档 31 变更工具观察回归（docs/sillyspec/archive-batch-31-tool-notes，2026-08-30）
//
// ① workflow-runs 产物文件名误标 fail：archive「extract-module-impact」步完成时，
//    archive-impact workflow 的整体 status 因下一步 doc-syncer 角色（sync-module-docs
//    步才执行，本步恒 fail）恒为 fail——按整体 status 命名把本步已通过的产物误标
//    -fail.json（存量 75 个实证）。修复：落盘按本步 impact-analyzer 结论定 status/文件名，
//    doc-syncer 明细保留在 roles/failures，status_scope 标注口径。
// ② 老变更 DB 步骤表漂移（5 步旧表 → 6 步新定义）时 --confirm 被耗在重播种插入的
//    中间步骤 + 通用完成提示不带 --confirm。修复：漂移重播种改变当前步身份时 mutating
//    命令 fail-closed 中止指引重跑（run/command.js）；「确认归档」步声明 requiresConfirm
//    → outputStep 完成提示带 --confirm。
//
// 隔离：tmpdir fixture + 真实 CLI 子进程；不碰真实 .sillyspec。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(REPO_ROOT, 'src', 'index.js')

function dirname(p) { return p.replace(/[\\/][^\\/]+$/, '') }

const tmpRoots = []
function makeFixture() {
  const fx = mkdtempSync(join(tmpdir(), `sillyspec-arch31-${process.pid}-`))
  tmpRoots.push(fx)
  return fx
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

/** 旧 5 步 archive 步骤表播种（无 sync-module-docs，前三完成，「确认归档」pending） */
async function seedOldTableChange(fx, name = 'demo-drift-change') {
  const { ProgressManager } = await import(pathToFileURL(join(REPO_ROOT, 'src', 'progress.js')).href)
  const pm = new ProgressManager({ specDir: join(fx, '.sillyspec') })
  pm.init(fx)
  pm.initChange(fx, name)
  const dir = join(fx, '.sillyspec', 'changes', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'tasks.md'), '# tasks\n', 'utf8')
  writeFileSync(join(dir, 'proposal.md'), '# p\n', 'utf8')
  pm._write(fx, {
    currentStage: 'archive',
    currentChange: name,
    stages: {
      archive: {
        status: 'in-progress', startedAt: '2026/08/30 10:00:00', completedAt: null,
        steps: [
          { name: '任务完成度检查', status: 'completed', completedAt: '2026/08/30 10:01:00' },
          { name: 'extract-module-impact', status: 'completed', completedAt: '2026/08/30 10:02:00' },
          { name: 'decision-distill 决策提炼', status: 'completed', completedAt: '2026/08/30 10:03:00' },
          { name: '确认归档', status: 'pending' },
          { name: '更新路线图和提交', status: 'pending' },
        ],
      },
    },
  }, name)
  return name
}

function runCli(fx, args) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd: fx, encoding: 'utf8', timeout: 60_000 })
}

// ─────────────────────────────────────────
// ① workflow-runs 产物命名按步骤终态
// ─────────────────────────────────────────

test('① extract-module-impact 步：impact-analyzer 过 + doc-syncer 未过 → 产物命名 -pass.json + status_scope 标注', async () => {
  const fx = makeFixture()
  const change = 'wf-naming-change'
  const specBase = join(fx, '.sillyspec')
  // 最小 archive-impact workflow：impact-analyzer 三项检查可满足；doc-syncer 检查必失败（文件不存在）
  mkdirSync(join(specBase, 'workflows'), { recursive: true })
  writeFileSync(join(specBase, 'workflows', 'archive-impact.yaml'), [
    'name: archive-impact',
    'description: 测试用最小 workflow',
    'spec_version: 1',
    'roles:',
    '  - id: impact-analyzer',
    '    name: "影响分析"',
    '    task: "分析"',
    '    outputs:',
    '      - path: ".sillyspec/changes/<change-name>/module-impact.md"',
    '        required: true',
    '        checks:',
    '          - type: file_exists',
    '          - type: min_lines',
    '            min: 3',
    '          - type: contains_sections',
    '            sections: ["模块影响矩阵"]',
    '  - id: doc-syncer',
    '    name: "文档同步"',
    '    depends_on:',
    '      - impact-analyzer',
    '    outputs:',
    '      - path: ".sillyspec/docs/proj/modules/_module-map.yaml"',
    '        required: false',
    '        checks:',
    '          - type: file_exists',
    'checks:',
    '  role_level:',
    '    - type: file_exists',
    '  workflow_level:',
    '    - type: file_exists',
    '      path: ".sillyspec/changes/<change-name>/module-impact.md"',
    'retry:',
    '  max_attempts: 1',
  ].join('\n'), 'utf8')
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'module-impact.md'),
    '# 模块影响分析\n## 模块影响矩阵\n- x\n## 未匹配文件\n- 无\n', 'utf8')

  const { handleWorkflowPostCheck } = await import(pathToFileURL(join(REPO_ROOT, 'src', 'run', 'complete-handlers.js')).href)
  const ret = await handleWorkflowPostCheck({
    stageName: 'archive',
    steps: [{ name: 'extract-module-impact', status: 'completed' }],
    currentIdx: 0,
    cwd: fx,
    specBase,
    progress: { project: 'demo' },
    platformOpts: {},
    changeName: change,
  })
  assert.equal(ret, null, 'archive 分支不阻断（仅报告）')

  const runsDir = join(specBase, '.runtime', 'workflow-runs')
  const files = readdirSync(runsDir).filter(f => f.endsWith('.json'))
  assert.equal(files.length, 1, '落盘一份产物')
  assert.match(files[0], /-pass\.json$/, '产物文件名按本步最终校验（impact-analyzer）命名（修复前恒 -fail.json）')
  const record = JSON.parse(readFileSync(join(runsDir, files[0]), 'utf8'))
  assert.equal(record.status, 'pass', '记录顶层 status = 本步结论')
  assert.equal(record.status_scope, 'step:extract-module-impact', '口径字段标注步骤范围')
  const docSyncer = (record.roles || []).find(r => r.id === 'doc-syncer')
  assert.ok(docSyncer, 'doc-syncer 角色明细保留（另记字段不丢信息）')
  assert.equal(docSyncer.status, 'fail', 'doc-syncer 未过的事实仍在 roles 里')
})

// ─────────────────────────────────────────
// ② 漂移重播种 fail-closed + 确认步提示带 --confirm
// ─────────────────────────────────────────

test('② 旧 5 步表漂移：--done --confirm 首跑 fail-closed 指引重跑（不再耗在中间步骤）', async () => {
  const fx = makeFixture()
  const name = await seedOldTableChange(fx)
  spawnSync('git', ['init', '-q', '.'], { cwd: fx, timeout: 30_000 })

  const r1 = runCli(fx, ['run', 'archive', '--done', '--confirm', '--output', '确认归档', '--change', name])
  assert.notEqual(r1.status, 0, '首跑应中止（fail-closed），--confirm 不被耗在新插入的中间步骤')
  assert.match(r1.stdout + r1.stderr, /当前步骤由「确认归档」变为「sync-module-docs」/, '显式告知当前步身份变化')
  assert.match(r1.stdout + r1.stderr, /原样重跑同一命令/, '指引原样重跑（原 flags 生效）')

  const r2 = runCli(fx, ['run', 'archive', '--done', '--confirm', '--output', '同步完成', '--change', name])
  assert.equal(r2.status, 0, '重跑按新步骤表正常完成首个 pending（sync-module-docs）')
  assert.match(r2.stdout, /Step 3\/6 完成：sync-module-docs/, '重播种后的中间步骤被正确完成')
})

test('② 「确认归档」步完成提示带 --confirm（requiresConfirm 数据驱动）', async () => {
  const fx = makeFixture()
  const name = await seedOldTableChange(fx)
  spawnSync('git', ['init', '-q', '.'], { cwd: fx, timeout: 30_000 })
  // 推进到第 5 步：漂移中止 → 完成 sync-module-docs → 完成 decision-distill
  runCli(fx, ['run', 'archive', '--done', '--confirm', '--output', 'x', '--change', name])
  runCli(fx, ['run', 'archive', '--done', '--output', '同步', '--change', name])
  runCli(fx, ['run', 'archive', '--done', '--output', '提炼', '--change', name])

  const r = runCli(fx, ['run', 'archive', '--change', name])
  assert.equal(r.status, 0, '步骤 prompt 渲染成功')
  assert.match(r.stdout, /Step 5\/6: 确认归档/, '当前为第 5 步确认归档')
  assert.match(r.stdout, /run archive --done --confirm --change/, '完成后执行提示带 --confirm（修复前通用模板不带，agent 照抄撞确认门）')
})
