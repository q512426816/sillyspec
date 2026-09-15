/**
 * worktree-deps 兄弟仓相对路径分类（坑 deps-sibling-repo-false-reject，2026-09-15 EHS 生产
 * 实证：local.yaml modules 里登记的 `../sub-grid-security`（跨仓测试命令的合法配置）被
 * isSafeModulePath 判「path 越界（绝对路径或 .. 段），拒绝 link」——吓人误报：该目录本来
 * 就不在 worktree 内、无 main/worktree 双份语义，node_modules link 天然不适用，正确动作是
 * 分类跳过 + 准确理由，不是当攻击面拒绝）。
 *
 * 锁定语义：
 *   - modules 路径 resolve 后 == repos 注册表某仓根（相对 worktree 在仓外）→ skipped +
 *     理由含「跨仓注册仓」与「modules.<name>.test」指引，不含「拒绝」字样
 *   - 未注册的 .. 越界路径 → 维持原「拒绝 link」判定（fail-closed 不放松）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { provisionDeps } from '../src/worktree-deps.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('注册兄弟仓相对路径 → 分类跳过（准确理由），未注册越界 → 维持拒绝', () => {
  const mainRoot = mk('wds-main-')          // 主仓根（= worktree 根的简化形态：in-place 无 worktree 副本）
  const sibling = mk('wds-sibling-')        // 兄弟仓（repos 注册）
  const rogue = mk('wds-rogue-')            // 未注册的外部目录
  mkdirSync(join(mainRoot, '.sillyspec'), { recursive: true })
  mkdirSync(sibling, { recursive: true })
  mkdirSync(rogue, { recursive: true })

  const mainAbs = mainRoot.split('\\').join('/')
  const siblingRel = '../' + sibling.split(/[\\/]/).pop() // ../wds-sibling-XXXX（相对主仓根）
  writeFileSync(join(mainRoot, '.sillyspec', 'local.yaml'), [
    'repos:',
    `  fe-repo: ${siblingRel}`,
    'modules:',
    '  fe:',
    `    path: ${siblingRel}`,
    '  rogue:',
    `    path: ../${rogue.split(/[\\/]/).pop()}`,
    '',
  ].join('\n'))

  // provisionDeps(worktreePath, mainCwd, opts)：非 node 主仓 + modules 块 → 走 modules link 分支
  const r = provisionDeps(mainRoot, mainRoot, { yamlTextOverride: null })
  const mods = r.depsModules || []
  const fe = mods.find(m => m.path === siblingRel)
  const rogueMod = mods.find(m => (m.path || '').includes(rogue.split(/[\\/]/).pop()))

  assert.ok(fe, `注册兄弟仓模块进结果（实际 depsModules：${JSON.stringify(mods)}）`)
  assert.equal(fe.status, 'skipped')
  assert.match(fe.reason, /跨仓注册仓/, '理由点明跨仓注册仓')
  assert.match(fe.reason, /modules\.<name>\.test/, '理由给出测试命令指引')
  assert.ok(!fe.reason.includes('拒绝'), '不再用「拒绝 link」误报吓人')

  assert.ok(rogueMod, '未注册越界模块进结果')
  assert.match(rogueMod.reason, /拒绝 link/, '未注册越界维持 fail-closed 拒绝')
})
