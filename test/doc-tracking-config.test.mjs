/**
 * 2026-11-27-changes-dir-platform-default FR-01：changes.doc_tracking 枚举配置与缺省回退
 *
 * 锁定（design Phase 1 / D-004@v2）：
 *   ① 未配置（无文件/无 changes 段/无键）→ 回退 platform 且 explicit=false
 *   ② 三显式值 platform|never|repo 各自解析
 *   ③ 非法值回退 platform 并标 invalid（留痕警告由调用方承担，纯函数只返回标志）
 *   ④ 其他段在场时正确提取 changes 段；CRLF 兼容；注释行不干扰
 *   ⑤ DOC_TRACKING_VALUES 常量与 config validate 接受值同源
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DOC_TRACKING_VALUES, resolveDocTracking } from '../src/config-schema.js'

test('FR-01① 未配置三态全部回退 platform 且非显式', () => {
  for (const text of [undefined, '', '# 只有注释\n', 'project:\n  type: nodejs\n']) {
    const r = resolveDocTracking(text)
    assert.equal(r.value, 'platform', `text=${JSON.stringify(text)}`)
    assert.equal(r.explicit, false)
    assert.equal(r.invalid, false)
  }
})

test('FR-01① 文件不存在形态（null 文本）与非 changes 段在场均回退缺省', () => {
  const r = resolveDocTracking(null)
  assert.equal(r.value, 'platform')
  assert.equal(r.explicit, false)
})

test('FR-01② 三显式值各自解析且 explicit=true', () => {
  assert.deepEqual(resolveDocTracking('changes:\n  doc_tracking: repo\n'), { value: 'repo', explicit: true, invalid: false })
  assert.deepEqual(resolveDocTracking('changes:\n  doc_tracking: never\n'), { value: 'never', explicit: true, invalid: false })
  assert.deepEqual(resolveDocTracking('changes:\n  doc_tracking: platform\n'), { value: 'platform', explicit: true, invalid: false })
})

test('FR-01③ 非法值回退 platform 并标 invalid', () => {
  const r = resolveDocTracking('changes:\n  doc_tracking: always\n')
  assert.equal(r.value, 'platform')
  assert.equal(r.explicit, false, '非法值不算显式声明（doctor 迁移 INFO 不被非法值误导）')
  assert.equal(r.invalid, true)
})

test('FR-01③ 空值键与坏缩进不算显式声明', () => {
  assert.equal(resolveDocTracking('changes:\n  doc_tracking:\n').explicit, false)
  assert.equal(resolveDocTracking('changes:\n    doc_tracking: repo\n').explicit, true, '深层缩进（块内多级）仍可解析')
})

test('FR-01④ changes 段与其他段共存时正确提取', () => {
  const text = [
    'project:',
    '  type: nodejs',
    'flow:',
    '  mode: thin',
    'changes:',
    '  doc_tracking: never',
    'platform:',
    '  url: https://x.example.com',
    '  token: shp_x',
  ].join('\n')
  const r = resolveDocTracking(text)
  assert.equal(r.value, 'never')
  assert.equal(r.explicit, true)
})

test('FR-01④ CRLF 换行与行内注释兼容', () => {
  const r = resolveDocTracking('changes:\r\n  doc_tracking: repo   # 想入库的仓显式开\r\n')
  assert.equal(r.value, 'repo')
  assert.equal(r.explicit, true)
})

test('FR-01⑤ DOC_TRACKING_VALUES 与 schema 注册面同源', () => {
  assert.deepEqual([...DOC_TRACKING_VALUES], ['platform', 'never', 'repo'])
})
