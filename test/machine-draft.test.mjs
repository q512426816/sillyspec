/**
 * machine-draft.test.mjs — 三件套泛化原语（R7 切片三 task-04 / D-004 / FR-08）
 *
 * 覆盖验收面：
 *   ① wrapSection/parseMarkerBlocks 往返（标记格式与 MARK_*_RE 逐字兼容；amendCmd 参数化）；
 *   ② verifyMarkers 三态：标记缺失/内容哈希失配/手工重锚未审计 + 干净态零 violation；
 *   ③ reanchorText 重锚后新哈希生效且内容不动。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const { wrapSection, parseMarkerBlocks, verifyMarkers, reanchorText, bodyHash, MARK_BEGIN_RE } = await import('../src/machine-draft.js')

const AMEND = 'sillyspec flow amend-draft --change <变更名>'

test('wrapSection → parseMarkerBlocks 往返：标记正则逐字兼容 + 内容与哈希还原', () => {
  const body = '- 机器判级：tier=S1\n- 第二行'
  const block = wrapSection({ key: 'risk-level', body, amendCmd: AMEND })
  const md = `# t\n\n## 节\n${block}\n后文\n`
  const blocks = parseMarkerBlocks(md)
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].key, 'risk-level')
  assert.equal(blocks[0].contentLines.join('\n'), body)
  assert.equal(blocks[0].markerHash, bodyHash(body))
  // begin 标记行匹配既有正则且 amendCmd 参数化文案在场
  const beginLine = md.split('\n').find((l) => MARK_BEGIN_RE.test(l))
  assert.match(beginLine, new RegExp(AMEND.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
})

test('verifyMarkers: 干净态零 violation', () => {
  const body = 'x'
  const md = wrapSection({ key: 'k1', body, amendCmd: AMEND })
  const v = verifyMarkers({ text: md, sections: { k1: { hash: bodyHash(body) } }, amendCmd: AMEND })
  assert.deepEqual(v, [])
})

test('verifyMarkers: 三态——标记缺失 / 内容失配 / 手工重锚未审计', () => {
  const body = 'original'
  const good = wrapSection({ key: 'k1', body, amendCmd: AMEND })
  // ① 标记缺失（整份重写掉标记）
  const missing = verifyMarkers({ text: '# rewritten\nno markers\n', sections: { k1: { hash: bodyHash(body) } }, amendCmd: AMEND })
  assert.equal(missing.length, 1)
  assert.match(missing[0], /标记缺失/)
  // ② 内容哈希失配（段内被改写）
  const tampered = good.replace('original', 'tampered')
  const mismatch = verifyMarkers({ text: tampered, sections: { k1: { hash: bodyHash(body) } }, amendCmd: AMEND })
  assert.equal(mismatch.length, 1)
  assert.match(mismatch[0], /内容与指纹失配/)
  // ③ 手工重锚未审计（内容未动但台账哈希与标记不一致）
  const manualReanchor = wrapSection({ key: 'k1', body, amendCmd: AMEND }) // 同内容新标记=旧台账对不上
  const manual = verifyMarkers({
    text: manualReanchor,
    sections: { k1: { hash: bodyHash('stale-ledger-hash-placeholder') } },
    amendCmd: AMEND,
  })
  // 内容与 stale 台账失配（先命中失配态）；构造精确第三态需内容等而台账异：
  const exactThird = verifyMarkers({
    text: wrapSection({ key: 'k1', body: 'same', amendCmd: AMEND }),
    sections: { k1: { hash: bodyHash('same') } },
    amendCmd: AMEND,
  })
  assert.deepEqual(exactThird, []) // 内容与台账一致+标记一致 → 干净
  // 真第三态：标记哈希=内容哈希，但台账记录的是旧内容哈希且旧内容≠新内容 → 失配先命中；
  // 标记哈希≠内容哈希（伪标记）+ 台账=内容哈希 → 第三态
  const forged = `<!-- MACHINE-DRAFT:k1:${'0'.repeat(64)}:begin x -->\nsame\n<!-- MACHINE-DRAFT:k1:end -->`
  const third = verifyMarkers({ text: forged, sections: { k1: { hash: bodyHash('same') } }, amendCmd: AMEND })
  assert.equal(third.length, 1)
  assert.match(third[0], /手工重锚/)
  assert.match(mismatch[0], /留痕重锚/)
})

test('reanchorText: 重锚后标记哈希=当前内容哈希，内容行不动', () => {
  const body = 'line1\nline2'
  const md = `# h\n${wrapSection({ key: 'a', body, amendCmd: AMEND })}tail`
  const edited = md.replace('line1', 'line1-edited')
  const r = reanchorText({ text: edited, amendCmd: AMEND })
  assert.deepEqual(r.keys, ['a'])
  assert.ok(r.text.includes('line1-edited'))
  assert.ok(r.text.includes(bodyHash('line1-edited\nline2')))
  // 重锚后再校验（台账同步为新哈希）→ 干净
  const ledger = { a: { hash: bodyHash(r.contentByKey.a) } }
  assert.deepEqual(verifyMarkers({ text: r.text, sections: ledger, amendCmd: AMEND }), [])
})
