/**
 * 清单列表项「路径 ——尾注」剥离（坑 thin-flow-freeze-foreign-declared-hijack 建议1）
 *
 * 实测（2026-09-25，sillyspec 3.30.0）：design §6 自声明写成 `- backend/x.py ——新增服务`
 * 时，整行 looksLikePath 不过被丢弃 → 本变更自声明缺失 → 冻结面（change.patch）被他侧
 * 未归档旧变更的陈旧声明劫持（缺实现件 + 门禁 test: skipped）。冒号描述形态此前已剥
 * （坑 brainstorm-gate-agent-unavailable 坑2），本测试锁 em-dash 尾注同口径剥离。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseFileChangeList } from '../src/change-list.js'

const tmpRoots = []
function writeDesign(body) {
  const d = mkdtempSync(join(tmpdir(), 'cl-dash-'))
  tmpRoots.push(d)
  const changeDir = join(d, '.sillyspec', 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'),
    '---\nauthor: t\nscale: small\n---\n\n# Design\n\n## 文件变更清单\n\n' + body + '\n')
  return join(changeDir, 'design.md')
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

test('① `- path ——尾注` 剥离尾注取纯路径（自声明不再被丢弃）', () => {
  const p = writeDesign('- backend/app/modules/scan_docs/service.py ——统计口径修复主实现\n- test/x.py ——补充用例\n')
  const list = parseFileChangeList(p)
  assert.ok(list.has('backend/app/modules/scan_docs/service.py'), `应剥出实现件路径：${[...list].join(',')}`)
  assert.ok(list.has('test/x.py'), `第二行同样剥出：${[...list].join(',')}`)
})

test('② 既有形态回归：纯路径 / 反引号 / 冒号描述 / 非路径自由文本', () => {
  const p = writeDesign([
    '- src/a.js',
    '- `src/b.js`',
    '- src/c.js：冒号后描述',
    '- 这只是一句自由文本说明不是路径',
  ].join('\n'))
  const list = parseFileChangeList(p)
  assert.ok(list.has('src/a.js') && list.has('src/b.js') && list.has('src/c.js'), `三形态都在：${[...list].join(',')}`)
  assert.equal(list.size, 3, `自由文本不入表（实际 ${list.size}）`)
})
