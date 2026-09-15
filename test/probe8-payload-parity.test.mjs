/**
 * 探针 8：载荷字段契约对账（2026-09-16 EHS 二次独立复核实证驱动：5 个 P1 里 4 处是字段/
 * 载荷错位——网页端表单 leaderUserId↔实体 rpLeaderUserId 等三处 Jackson 静默丢弃、小程序
 * 缺发 reportOrgId 必填被拒、sourceShdId↔safelyHiddenId 错位、report_org_name NOT NULL
 * 边界。探针5 只对账 method+path（URL 级），载荷级错位零覆盖）。
 *
 * 锁定语义：
 *   - extractJavaFields：private 字段名提取，全大写常量（TODO_FLAG_TODO）排除
 *   - extractSqlNotNullColumns：CREATE TABLE 内 NOT NULL 列，标准审计列（create_by 等）豁免
 *   - extractPayloadKeys：请求调用（apiFetch/request/axios/fetch）后 8 行窗口的对象键
 *   - 归一化比对：snake_case→camelCase + 大小写折叠；命中即覆盖
 *   - 疑似错位配对：前端键 ⊂ 后端字段名（或反之，≥4 字符）——leaderUserId↔rpLeaderUserId 命中
 *   - NOT NULL 列前端未见 → advisory（候选必填缺送/服务端填充）
 *   - 跨仓前端文件经 repos 注册表仓根读取（未注册 → 注记跳过）
 *   - 全程 advisory：命中≠结论（UI 本地态键/服务端填充列天然出现在差异里，agent 逐条复核）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  extractJavaFields, extractSqlNotNullColumns, extractPayloadKeys, runProbe8PayloadParity,
} from '../src/verify-probes.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('extractJavaFields：private 字段提取 + 全大写常量排除', () => {
  const java = [
    'public class PolluteRpOrder {',
    '  private String rpLeaderUserId;',
    '  private String punishedLeaderUserId;',
    '  private java.math.BigDecimal rpAmount;',
    '  private static final String TODO_FLAG_TODO = "todo";',
    '  private Integer pageNum = 1;',
    '}',
  ].join('\n')
  const f = extractJavaFields(java)
  assert.ok(f.has('rpLeaderUserId') && f.has('punishedLeaderUserId') && f.has('rpAmount') && f.has('pageNum'), `字段提取（实际 ${[...f]}）`)
  assert.ok(!f.has('TODO_FLAG_TODO'), '全大写常量排除')
})

test('extractSqlNotNullColumns：NOT NULL 列提取 + 审计列豁免', () => {
  const sql = [
    'CREATE TABLE pollute_rp_order (',
    '  id varchar(64) NOT NULL COMMENT \'pk\',',
    '  rp_number varchar(32) DEFAULT NULL,',
    '  report_org_id varchar(64) NOT NULL COMMENT \'提报单位\',',
    '  report_org_name varchar(100) NOT NULL,',
    '  create_by varchar(64) NOT NULL,',
    '  del_flag char(1) NOT NULL DEFAULT \'0\',',
    ')',
  ].join('\n')
  const c = extractSqlNotNullColumns(sql)
  assert.ok(c.has('report_org_id') && c.has('report_org_name'), `业务必填列命中（实际 ${[...c]}）`)
  assert.ok(!c.has('rp_number'), '可空列不命中')
  assert.ok(!c.has('id') && !c.has('create_by') && !c.has('del_flag'), '审计列/pk 豁免')
})

test('extractPayloadKeys：请求调用邻近对象键；非请求区对象键不收', () => {
  const js = [
    'const uiState = { loading: false, visible: true }',
    'export function addOrder(form) {',
    '  return apiFetch("/v1/rp/order", { method: "POST",',
    '    body: {',
    '      leaderUserId: form.leader,',
    '      punishedDutyUserId: form.duty,',
    '      rpCategory: "punishment",',
    '      rpAmount: 100,',
    '    }',
    '  })',
    '}',
  ].join('\n')
  const k = extractPayloadKeys(js)
  assert.ok(k.has('leaderUserId') && k.has('punishedDutyUserId'), `载荷键命中（实际 ${[...k]}）`)
  assert.ok(!k.has('loading') && !k.has('visible'), '非请求区 UI 态键不收')
})

test('端到端：错位配对 + NOT NULL 缺送 + 跨仓前端经注册仓根', () => {
  const mainRoot = mk('p8-main-')
  const feRoot = mk('p8-fe-')

  // 后端：实体（rpLeaderUserId 正名）+ SQL（report_org_id NOT NULL）
  mkdirSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo'), { recursive: true })
  writeFileSync(join(mainRoot, 'src', 'main', 'java', 'com', 'foo', 'PolluteRpOrder.java'), [
    'public class PolluteRpOrder {',
    '  private String rpLeaderUserId;',
    '  private String punishedLeaderUserId;',
    '  private String territoryOrgId;',
    '  private String rpCategory;',
    '}',
  ].join('\n'))
  mkdirSync(join(mainRoot, 'db'), { recursive: true })
  writeFileSync(join(mainRoot, 'db', '2026-09-15-rp.sql'), [
    'CREATE TABLE pollute_rp_order (',
    '  report_org_id varchar(64) NOT NULL,',
    '  rp_category varchar(20) NOT NULL,',
    ');',
  ].join('\n'))

  // 前端（兄弟仓）：错位键 leaderUserId/punishedDutyUserId + 正确键 rpCategory
  mkdirSync(join(feRoot, 'src', 'services'), { recursive: true })
  writeFileSync(join(feRoot, 'src', 'services', 'rp.js'), [
    'export function addOrder(form) {',
    '  return apiFetch("/v1/rp/order", { method: "POST",',
    '    body: { leaderUserId: form.leader, punishedDutyUserId: form.duty, rpCategory: form.cat }',
    '  })',
    '}',
  ].join('\n'))

  // spec：design 清单（跨仓前缀）+ repos 注册表
  const specBase = join(mainRoot, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'p8'), { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), `repos:\n  fe-repo: ${feRoot.split('\\').join('/')}\n`)
  writeFileSync(join(specBase, 'changes', 'p8', 'design.md'), [
    '# design',
    '',
    '## 文件变更清单',
    '',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    '| 新增 | NEW:src/main/java/com/foo/PolluteRpOrder.java | 实体 |',
    '| 新增 | NEW:db/2026-09-15-rp.sql | DDL |',
    '| 新增 | cross-repo:fe-repo:src/services/rp.js | service |',
    '',
  ].join('\n'))

  const r = runProbe8PayloadParity({ specBase, cwd: mainRoot, wtRoot: null, changeName: 'p8' })

  assert.equal(r.applicable, true)
  assert.ok(r.backendFieldCount >= 4 && r.feKeyCount >= 3, `双面计数（后端 ${r.backendFieldCount}/前端 ${r.feKeyCount}）`)

  // 疑似错位配对：leaderUserId↔rpLeaderUserId、punishedDutyUserId↔punishedLeaderUserId
  const pairs = r.mispairs.map(p => `${p.fe}<->${p.be}`)
  assert.ok(pairs.some(x => x.includes('leaderUserId') && x.includes('rpLeaderUserId')), `错位配对命中（实际 ${pairs}）`)
  assert.ok(pairs.some(x => x.includes('punishedDutyUserId') && x.includes('punishedLeaderUserId')), '第二处错位配对命中')

  // NOT NULL 缺送：report_org_id（前端键无归一命中）；rp_category 命中不列
  assert.ok(r.missingNotNull.some(c => /report_org_id/.test(c.col)), `NOT NULL 缺送命中（实际 ${JSON.stringify(r.missingNotNull)}）`)
  assert.ok(!r.missingNotNull.some(c => /rp_category/.test(c.col)), '已送必填列不列')

  // 正确键 rpCategory 归一命中 → 不在 feOnly
  assert.ok(!r.feOnly.includes('rpCategory'), '正确键不落前端独有清单')
})

test('无 Java/SQL/前端面 → 不适用零输出；跨仓未注册 → 注记跳过', () => {
  const mainRoot = mk('p8-empty-')
  const specBase = join(mainRoot, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'p8e'), { recursive: true })
  writeFileSync(join(specBase, 'changes', 'p8e', 'design.md'), [
    '# design', '',
    '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    '| 新增 | cross-repo:ghost-repo:src/a.js | 跨仓前端（未注册） |',
    '',
  ].join('\n'))
  const r = runProbe8PayloadParity({ specBase, cwd: mainRoot, wtRoot: null, changeName: 'p8e' })
  assert.equal(r.applicable, false, '无后端面不适用')
  assert.ok((r.notes || []).some(n => n.includes('ghost-repo') && n.includes('repos 注册')), '未注册跨仓注记')
})
