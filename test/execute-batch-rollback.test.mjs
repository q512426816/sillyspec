/**
 * execute 批量完成回滚测试（坑 execute-batch-rollback-half-state，2026-08-29 用户实证）
 *
 * 事故：execute 批量完成把步骤 12-16 批量标 completed 后，任一收尾 gate 失败 →
 * rollbackStageCompletion 只回滚 currentIdx（步骤 11）→ 落库「11 pending + 12-16 completed」
 * 半套状态（步骤序倒挂），要再补一次 --done 才对齐。
 *
 * 修复：detectExecuteBatchFinish 批量标记打 _batchAligned 戳（内存字段不落库），
 * rollbackStageCompletion 把戳上的步骤随当前步一并回滚 pending。
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { rollbackStageCompletion } from '../src/run/gates.js'

const mkStep = (status, extra = {}) => ({ name: `step-${Math.random()}`, status, completedAt: status === 'completed' ? '2026-08-29 10:00:00' : null, ...extra })

describe('rollbackStageCompletion 批量乐观标记一并回滚', () => {
  it('批量回填的步骤随当前步一起回滚（坑 execute-batch-rollback-half-state）', () => {
    // 模拟事故现场：--done 当前步（步骤 11，idx10）已标 completed，批量回填把 12-16（idx11-15）
    // 打戳标 completed，idx16（步骤 17）本就 pending；gate 失败走 rollback。
    const steps = [
      ...Array.from({ length: 10 }, () => mkStep('completed')), // 步骤 1-10（早已完成）
      mkStep('completed'),                                      // idx10 = 步骤 11（当前步，--done 标的）
      ...Array.from({ length: 5 }, () => mkStep('completed', { _batchAligned: true })), // idx11-15 = 步骤 12-16（批量戳）
      mkStep('pending'),                                        // idx16 = 步骤 17
    ]
    const stageData = { status: 'completed', completedAt: '2026-08-29 10:00:00' }

    rollbackStageCompletion(stageData, steps, 10)

    assert.equal(stageData.status, 'in-progress')
    assert.equal(stageData.completedAt, null)
    // 步骤 11（当前步）回滚 —— 原有行为保持
    assert.equal(steps[10].status, 'pending')
    assert.equal(steps[10].completedAt, null)
    // 步骤 12-16（批量戳）一并回滚 —— 本次修复点；修复前它们保持 completed 落库成半套状态
    for (let i = 11; i <= 15; i++) {
      assert.equal(steps[i].status, 'pending', `steps[${i}] 应随批量回滚为 pending`)
      assert.equal(steps[i].completedAt, null)
      assert.equal(steps[i]._batchAligned, false, '回滚后戳应清除')
    }
    // 步骤 1-10（早于本次 --done 的真实完成）不受影响
    for (let i = 0; i < 10; i++) assert.equal(steps[i].status, 'completed')
    // 步骤 17 本就 pending，不动
    assert.equal(steps[16].status, 'pending')
  })

  it('无批量戳时退化为原行为：只回滚当前步，其余 completed 不动', () => {
    const steps = [
      ...Array.from({ length: 10 }, () => mkStep('completed')),
      mkStep('completed'), // 当前步 idx10
      ...Array.from({ length: 5 }, () => mkStep('completed')), // 无戳（非本次批量所标）
    ]
    const stageData = { status: 'completed', completedAt: 'x' }

    rollbackStageCompletion(stageData, steps, 10)

    assert.equal(steps[10].status, 'pending')
    for (let i = 11; i <= 15; i++) assert.equal(steps[i].status, 'completed', `无戳步骤 steps[${i}] 不应被回滚`)
  })

  it('currentIdx 越界 / 空数组：不抛（防御）', () => {
    const stageData = { status: 'completed', completedAt: 'x' }
    rollbackStageCompletion(stageData, [], 0)
    assert.equal(stageData.status, 'in-progress')
  })
})
