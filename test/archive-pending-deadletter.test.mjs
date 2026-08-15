/**
 * D-5 死信箱校验测试：module-impact.md「更新结果」表 pending 行 → archive 阻断
 *
 * 修复场景（债单 doc-consistency-debt.md D-5）：perf-remediation 类变更把文档同步显式推给
 * archive（「（execute 完成后由 archive 阶段同步）| 待办 | pending」），archive 又没做 →
 * 带 pending 归档且 verify 全 PASS，至少 5 个归档 change 带未清 pending。
 *
 * 校验算法 extractPendingDocSyncRows 纯函数直接测（无 fs/git 依赖）；
 * 归档阻断路径已有 archive-stage-physical-tracking-desync 等 test 覆盖 process.exit 模式，
 * 此处用子进程冒烟验证 pending module-impact 阻断归档移动。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractPendingDocSyncRows, extractDoneDocTargets } from '../src/run/complete-handlers.js'

const mk = (updateResultRows) => `---
author: test
created_at: 2026-08-15 00:00:00
---

# 模块影响分析（Module Impact）— 测试

## 变更范围

测试变更。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|--------------|
| backend / change 子模块 | 逻辑变更 | service.py | sync_manual_get_pending 加 files_total（pending_review 联动） | false |

## 未匹配文件

无。

## 更新结果

| 模块文档 | 操作 | 状态 |
|----------|------|------|
${updateResultRows}

## 备注

- 末段内容，校验不应越过「## 更新结果」段边界。
`

describe('extractPendingDocSyncRows（D-5 死信提取）', () => {
  it('末列 pending → 提取死信行', () => {
    const rows = extractPendingDocSyncRows(mk('| （execute 完成后由 archive 阶段同步） | 待办 | pending |'))
    assert.equal(rows.length, 1)
    assert.ok(rows[0].includes('archive 阶段同步'))
  })

  it('末列 done / skipped → 无死信（合法完成态）', () => {
    const content = mk('| modules/daemon.md | 契约摘要补 llm-proxy | done |\n| modules/platform_sync.md | 卡片不存在 | skipped |')
    assert.deepEqual(extractPendingDocSyncRows(content), [])
  })

  it('矩阵列的代码标识符 pending_review / sync_manual_get_pending / needs_review false → 不误报', () => {
    // 矩阵段摘要列含 pending 字样是代码内容；needs_review 列的 false 是合法字段。
    // 只查「更新结果」段 + 末列精确匹配，二者都不该命中。
    const content = mk('| modules/change.md | 契约更新 | done |')
    assert.deepEqual(extractPendingDocSyncRows(content), [])
  })

  it('末列「待办」中文 → 提取', () => {
    const rows = extractPendingDocSyncRows(mk('| modules/x.md | 补契约 | 待办 |'))
    assert.equal(rows.length, 1)
  })

  it('末列未同步 / TODO（大小写）→ 提取', () => {
    assert.equal(extractPendingDocSyncRows(mk('| modules/x.md | 补契约 | 未同步 |')).length, 1)
    assert.equal(extractPendingDocSyncRows(mk('| modules/x.md | 补契约 | TODO |')).length, 1)
    assert.equal(extractPendingDocSyncRows(mk('| modules/x.md | 补契约 | Pending |')).length, 1)
  })

  it('pending 出现在非末列（操作列）→ 不误报（只认状态末列）', () => {
    assert.deepEqual(extractPendingDocSyncRows(mk('| modules/x.md | pending 状态说明 | done |')), [])
  })

  it('无「## 更新结果」段 → 空数组（老格式 module-impact 兼容）', () => {
    const content = '# 模块影响\n\n## 模块影响矩阵\n\n| a | b |\n|---|---|\n| x | pending |\n'
    assert.deepEqual(extractPendingDocSyncRows(content), [])
  })

  it('「更新结果」段后的下一章节含 pending 表格 → 不越界（段边界截断）', () => {
    const content = mk('| modules/x.md | done | done |') +
      '\n## 后续待办清单\n\n| 项 | 状态 |\n|---|---|\n| 文档补录 | pending |\n'
    assert.deepEqual(extractPendingDocSyncRows(content), [])
  })

  it('CRLF 换行 → 容错提取', () => {
    const content = mk('| modules/x.md | 补契约 | pending |').replace(/\n/g, '\r\n')
    assert.equal(extractPendingDocSyncRows(content).length, 1)
  })

  it('空输入 / 非字符串 → 空数组', () => {
    assert.deepEqual(extractPendingDocSyncRows(''), [])
    assert.deepEqual(extractPendingDocSyncRows(null), [])
  })
})

describe('extractDoneDocTargets（D-4 窄口径：done 行目标文档提取）', () => {
  it('done 行首列反引号全路径 → 提取', () => {
    const content = mk('| `.sillyspec/docs/backend/modules/daemon.md` | 契约更新 | done |')
    assert.deepEqual(extractDoneDocTargets(content), ['.sillyspec/docs/backend/modules/daemon.md'])
  })

  it('多 done 行 → 去重收集；skipped/pending 行不取', () => {
    const content = mk(
      '| modules/daemon.md | 契约更新 | done |\n| modules/daemon.md | 重复声明 | done |\n| modules/x.md | 跳过 | skipped |'
    )
    assert.deepEqual(extractDoneDocTargets(content), ['modules/daemon.md'])
  })

  it('_module-map.yaml 裸名 → 跳过（各项目都有，无判定价值）', () => {
    assert.deepEqual(extractDoneDocTargets(mk('| modules/_module-map.yaml | 索引更新 | done |')), [])
  })

  it('done 行首列纯中文描述（无路径 token）→ 不误报', () => {
    assert.deepEqual(extractDoneDocTargets(mk('| 卡片不存在跳过 | 无操作 | done |')), [])
  })

  it('无「更新结果」段 → 空数组', () => {
    assert.deepEqual(extractDoneDocTargets('# 无段落\n\n内容\n'), [])
  })
})
