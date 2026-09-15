// 跨仓 per-repo 对账 + 探针7 covered 锚点校验 回归锁定（2026-09-15 复盘后续两项）：
//   A. cross-repo-reconcile-blindness 兑现 D-004 分期：跨仓 task 卡声明不再只是「已剔除」，
//      per-repo 到注册仓对账（声明/实测/②缺/③多 + 脚手架聚合 + 未注册/不可达/非仓 degraded），
//      advisory 不阻断；reconcileTargetFiles 集成（crossRepo 字段 + notes 摘要 + 主仓不混入跨仓）。
//   B. probe7-covered-anchor-missing：verify-result.md 探针7 段 covered 行证据列缺 file:line
//      锚点 → advisory 报告（partial/uncovered/non-testable 豁免；无段 applicable=false）。
import { execSync } from 'child_process'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const { reconcileCrossRepoDeclarations } = await import('../src/cross-repo-reconcile.js')
const { reconcileTargetFiles } = await import('../src/verify-postcheck.js')
const { checkProbe7AnchorCoverage } = await import('../src/probe7-anchor-check.js')

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}
const sh = (cwd, cmd) => execSync(cmd, { cwd, stdio: 'ignore' })
function initRepo(dir) {
  mkdirSync(dir, { recursive: true })
  sh(dir, 'git init -q')
  sh(dir, 'git config user.email t@t.local')
  sh(dir, 'git config user.name tester')
  writeFileSync(join(dir, 'base.txt'), 'base\n')
  sh(dir, 'git add .')
  sh(dir, 'git commit -qm base')
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-crossrepo-${process.pid}-`))

try {
  // ─────────────────────────────────────────
  console.log('\n[A] 跨仓 per-repo 对账（cross-repo-reconcile）')

  console.log('\n--- A1. 注册仓正常对账（已提交窗口 + untracked 并集） ---')
  {
    const cross = join(tmpRoot, 'spdemo')           // 跨仓：两笔提交 + 未提交改动
    initRepo(cross)
    mkdirSync(join(cross, 'src'), { recursive: true })
    writeFileSync(join(cross, 'src', 'a.js'), 'export const a = 1\n')
    sh(cross, 'git add . && git commit -qm feat-a')
    writeFileSync(join(cross, 'src', 'extra.js'), 'export const e = 1\n')  // untracked → ③多
    mkdirSync(join(cross, '.claude', 'skills', 'h'), { recursive: true })
    writeFileSync(join(cross, '.claude', 'skills', 'h', 'SKILL.md'), 'x\n') // 脚手架 → 聚合

    const specBase = join(tmpRoot, 'proj', '.sillyspec')
    mkdirSync(specBase, { recursive: true })
    writeFileSync(join(specBase, 'local.yaml'), `# 注册表\nrepos:\n  spdemo: ${cross.replace(/\\/g, '/').replace(/ /g, '%20')}\n`)

    const r = reconcileCrossRepoDeclarations({
      specBase, cwd: join(tmpRoot, 'proj'),
      declarationsByRepo: {
        spdemo: [
          { task: 'task-01', path: 'src/a.js' },
          { task: 'task-02', path: 'src/missing.js', isNew: true },
        ],
      },
    })
    assert(r.length === 1 && r[0].repo === 'spdemo', '注册仓解析命中（key→path）')
    assert(r[0].degradedReason === null, '可达仓不降级')
    assert(r[0].matched.includes('src/a.js'), '①已提交窗口内声明文件 matched')
    assert(r[0].missing.length === 1 && r[0].missing[0].path === 'src/missing.js' && r[0].missing[0].isNew,
      '②跨仓声明落空带 isNew 标（该仓未见 missing.js）')
    assert(r[0].undeclared.includes('src/extra.js'), '③untracked 未声明文件进 undeclared')
    assert(r[0].scaffoldCount === 1, '脚手架（.claude/skills）聚合不进③类逐条')
  }

  console.log('\n--- A2. 未注册 / 路径不可达 / 空 declarations 防御 ---')
  {
    const specBase = join(tmpRoot, 'proj2', '.sillyspec')
    mkdirSync(specBase, { recursive: true })
    writeFileSync(join(specBase, 'local.yaml'), 'repos:\n  other: /definitely/not/here\n')
    const r = reconcileCrossRepoDeclarations({
      specBase, cwd: join(tmpRoot, 'proj2'),
      declarationsByRepo: {
        nosuch: [{ task: 'task-01', path: 'src/a.js' }],
        other: [{ task: 'task-02', path: 'src/b.js' }],
      },
    })
    assert(r.length === 2, '每 repo 一项结果')
    assert(r.find(x => x.repo === 'nosuch')?.degradedReason?.includes('未在 local.yaml repos 注册'), '未注册 key → degraded 说明')
    assert(r.find(x => x.repo === 'other')?.degradedReason?.includes('不可达'), '注册路径不可达 → degraded 说明')
    assert(reconcileCrossRepoDeclarations({ specBase, cwd: join(tmpRoot, 'proj2'), declarationsByRepo: {} }).length === 0,
      '空 declarations → 空结果（零成本）')
  }

  console.log('\n--- A3. reconcileTargetFiles 集成（跨仓卡转 per-repo，主仓不混入） ---')
  {
    const proj = join(tmpRoot, 'proj3')
    initRepo(proj)
    const sb = join(proj, '.sillyspec')
    const cross = join(tmpRoot, 'spdemo3')
    initRepo(cross)
    mkdirSync(join(cross, 'src'), { recursive: true })
    writeFileSync(join(cross, 'src', 'api.py'), 'x = 1\n')
    sh(cross, 'git add . && git commit -qm feat')
    mkdirSync(join(sb, 'changes', 'c1', 'tasks'), { recursive: true })
    writeFileSync(join(sb, 'local.yaml'), `repos:\n  spdemo: ${cross.replace(/\\/g, '/')}\n`)

    const changeDir = join(sb, 'changes', 'c1')
    writeFileSync(join(changeDir, 'tasks', 'task-01.md'), `---
id: task-01
target_files:
  - src/feature.js
---
# task-01
`)
    writeFileSync(join(changeDir, 'tasks', 'task-02.md'), `---
id: task-02
repo: spdemo
target_files:
  - src/api.py
---
# task-02（跨仓）
`)
    mkdirSync(join(proj, 'src'), { recursive: true })
    writeFileSync(join(proj, 'src', 'feature.js'), 'x\n')   // 主仓声明落地

    const r = reconcileTargetFiles({ cwd: proj, specBase: sb, changeName: 'c1', runtimeRoot: join(sb, '.runtime') })
    assert(r.status === 'ok', `主仓对账 ok（跨仓卡不计主仓差集；实际 ${r.status}）`)
    assert(r.matched.includes('src/feature.js'), '主仓声明文件 matched')
    assert(Array.isArray(r.crossRepo) && r.crossRepo.length === 1 && r.crossRepo[0].repo === 'spdemo',
      'crossRepo 字段带 per-repo 结果')
    assert(r.crossRepo[0].matched.includes('src/api.py'), '跨仓声明在对应仓 matched')
    assert(r.notes.some(n => n.includes('跨仓 task 卡 task-02（repo: spdemo） 不进主仓对账')), '剔除注记指向 per-repo 段')
    assert(r.notes.some(n => n.includes('跨仓 spdemo 对账：声明 1 / 实测 1 / 对上 1')), 'notes 带跨仓对账摘要行')

    // 全跨仓卡形态：主仓 skipped 但 crossRepo 仍出口（零机器可见性缺口）
    rmSync(join(changeDir, 'tasks', 'task-01.md'))
    const r2 = reconcileTargetFiles({ cwd: proj, specBase: sb, changeName: 'c1', runtimeRoot: join(sb, '.runtime') })
    assert(r2.status === 'skipped' && r2.crossRepo.length === 1, '全跨仓卡：主仓 skipped 且 crossRepo 仍带结果')
  }

  // ─────────────────────────────────────────
  console.log('\n[B] 探针7 covered 锚点校验（probe7-anchor-check）')
  {
    const md = [
      '## 探针结果',
      '',
      '#### 探针 7：验收×测试覆盖矩阵',
      '<!-- 口径注记 -->',
      '',
      '**task-01**',
      '',
      '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
      '|---|---|---|---|---|',
      '| 登录限流 | `test/auth.test.mjs` | 限流（2 命中） | covered | `test/auth.test.mjs:42`（probe7） |',
      '| 图形验证 | `test/captcha.test.mjs` | 验证码（1 命中） | covered | 已人工核验，测试在场 |',
      '| 部署文档 | — | — | non-testable | 文档类 |',
      '',
      '**task-02**',
      '',
      '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
      '|---|---|---|---|---|',
      '| 半语义探测 | `test/sem.test.mjs` | 探测（0 命中） | partial | （无机械命中——人工核验 `test/sem.test.mjs`） |',
      '',
      '#### 探针 8：下一段',
      '**task-03**',
      '| 不参与 | x | x | covered | 无锚点也不算（段外） |',
    ].join('\n')

    const r = checkProbe7AnchorCoverage(md)
    assert(r.applicable === true, '有探针7 段 → applicable')
    assert(r.rowsChecked === 4 && r.coveredRows === 2, `判定行计数 4 / covered 2（实际 ${r.rowsChecked}/${r.coveredRows}）`)
    assert(r.missingAnchors.length === 1, '仅缺锚点的 covered 行被标记（partial/non-testable 豁免）')
    assert(r.missingAnchors[0].task === 'task-01' && r.missingAnchors[0].acceptance.includes('图形验证'),
      '缺锚点行带 task 归属与 acceptance 摘要')
    assert(r.missingAnchors[0].evidence.includes('人工核验'), '缺锚点行附当前证据原文（回补定位）')

    const r2 = checkProbe7AnchorCoverage('# 报告\n\n无探针段')
    assert(r2.applicable === false && r2.missingAnchors.length === 0, '无探针7 段 → applicable=false 零输出')
    assert(checkProbe7AnchorCoverage('').applicable === false, '空文本防御')

    // 段外 covered（探针8 之后的伪造行）不计——findIndex 起点后第一个 #### 截断
    assert(!r.missingAnchors.some(m => m.acceptance.includes('段外')), '探针7 段外的表行不参与校验')
  }
} finally {
  rmSync(tmpRoot, { recursive: true, force: true })
}

console.log(failures === 0 ? '\n✅ 通过: 全部' : `\n❌ 失败: ${failures}`)
process.exit(failures === 0 ? 0 : 1)
