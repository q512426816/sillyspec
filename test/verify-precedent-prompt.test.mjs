/**
 * 等效验证先例库（坑 verify-precedent-only-in-prose，2026-09-15 EHS 生产实证：mvn test 被
 * 公司框架 parent pom pluginManagement 硬编码 surefire skip=true、-D 覆盖无效——等效口径
 * dependency:build-classpath+javac+JUnitCore 第二次复用靠 agent 翻旧 verify-result.md 正文
 * 续命；先例只活在散文里 = 换个 agent/换个变更就断档）。结构化进 local.yaml verify_precedents
 * 段，verify prompt 时点自动注入提示。
 *
 * 锁定语义：
 *   - parseVerifyPrecedents：无段 → []；对象数组逐项解析（- key: 起项 + 续行 key: value）；
 *     注释/空行容错；缺 standard_command+equivalent 的残项过滤
 *   - renderVerifyPrecedentHint：空 → ''；非空含 id/标准命令/不可用原因/等效口径/确立变更
 *     + 「配进 commands.test 照常实测对账而非只 skip 放行」行动指引
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseVerifyPrecedents, renderVerifyPrecedentHint } from '../src/run/prompt.js'

const SAMPLE = `# local.yaml
commands:
  test: mvn test

verify_precedents:
  # 公司框架 parent pom 硬编码 surefire skip
  - id: mvn-test-surefire-skip
    standard_command: mvn test
    reason: 框架 parent pom pluginManagement 硬编码 surefire skip=true，-D 覆盖无效
    equivalent: mvn dependency:build-classpath + javac + JUnitCore 直跑
    established_by: 2026-08-26-building-area-ledger
    notes: 复跑条件固化在测试类头注释
  - id: fe-no-test-infra
    standard_command: npm test
    reason: sub-grid-security 无测试基建（package.json 无 test 脚本）
    equivalent: npx eslint + build 产物核验
    established_by: 2026-09-15-ehs-reward-punishment

known_failures: []
`

test('parseVerifyPrecedents：无段 → []；非 local.yaml 文本 → []', () => {
  assert.deepEqual(parseVerifyPrecedents(null), [])
  assert.deepEqual(parseVerifyPrecedents(''), [])
  assert.deepEqual(parseVerifyPrecedents('commands:\n  test: npm test\n'), [])
  assert.deepEqual(parseVerifyPrecedents('# verify_precedents: 注释里提到不算\n'), [])
})

test('parseVerifyPrecedents：对象数组逐项解析 + 注释空行容错', () => {
  const items = parseVerifyPrecedents(SAMPLE)
  assert.equal(items.length, 2, `应解析 2 条（实际 ${JSON.stringify(items)}）`)
  assert.equal(items[0].id, 'mvn-test-surefire-skip')
  assert.equal(items[0].standard_command, 'mvn test')
  assert.match(items[0].reason, /surefire skip/)
  assert.match(items[0].equivalent, /JUnitCore/)
  assert.equal(items[0].established_by, '2026-08-26-building-area-ledger')
  assert.equal(items[0].notes, '复跑条件固化在测试类头注释')
  assert.equal(items[1].id, 'fe-no-test-infra')
  // 块结束即止：known_failures 不吞
  assert.equal(items[1].equivalent, 'npx eslint + build 产物核验')
})

test('parseVerifyPrecedents：残项（无 standard_command 且无 equivalent）过滤', () => {
  const yaml = [
    'verify_precedents:',
    '  - id: only-id',
    '  - id: ok-one',
    '    equivalent: javac+JUnitCore',
  ].join('\n')
  const items = parseVerifyPrecedents(yaml)
  assert.equal(items.length, 1)
  assert.equal(items[0].id, 'ok-one')
})

test('renderVerifyPrecedentHint：空 → 空串；非空含五要素与行动指引', () => {
  assert.equal(renderVerifyPrecedentHint([]), '')
  assert.equal(renderVerifyPrecedentHint(null), '')
  const items = parseVerifyPrecedents(SAMPLE)
  const hint = renderVerifyPrecedentHint(items)
  assert.match(hint, /【验证先例提示】/, '提示块标题')
  assert.match(hint, /2 条等效验证先例/, '先例计数')
  assert.match(hint, /mvn-test-surefire-skip/, '含 id')
  assert.match(hint, /`mvn test`/, '含标准命令（反引号代码形态）')
  assert.match(hint, /JUnitCore 直跑/, '含等效口径')
  assert.match(hint, /2026-08-26-building-area-ledger/, '含确立变更')
  assert.match(hint, /commands\.test/, '行动指引：配进 commands.test')
  assert.match(hint, /test_strategy: skip/, '指引对照 skip 放行路径')
  assert.match(hint, /fe-no-test-infra/, '第二条先例也在')
})

test('renderVerifyPrecedentHint：超 5 条截断提示不刷屏', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({
    id: `prec-${i}`, standard_command: `cmd${i}`, reason: 'r', equivalent: `eq${i}`, established_by: 'chg',
  }))
  const hint = renderVerifyPrecedentHint(many)
  assert.match(hint, /8 条等效验证先例/)
  assert.match(hint, /prec-4/)
  assert.ok(!hint.includes('prec-5：') && !hint.includes('- prec-5'), '第 6 条起截断')
})
