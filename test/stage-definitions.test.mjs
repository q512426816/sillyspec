import assert from 'node:assert/strict'
import { stageRegistry } from '../src/stages/index.js'
import { buildPlanSteps } from '../src/stages/plan.js'
import { buildExecuteSteps } from '../src/stages/execute.js'

const stageSteps = {
  brainstorm: stageRegistry.brainstorm.steps,
  scan: stageRegistry.scan.steps,
  quick: stageRegistry.quick.steps,
  archive: stageRegistry.archive.steps,
  verify: stageRegistry.verify.steps,
  plan: buildPlanSteps(null),
  execute: buildExecuteSteps(null),
}

function names(stage) {
  return stageSteps[stage].map(step => step.name)
}

function assertContains(stage, expectedNames) {
  const actual = names(stage)
  for (const name of expectedNames) {
    assert.ok(actual.includes(name), `${stage} should include step "${name}". Actual: ${actual.join(', ')}`)
  }
}

assert.equal(stageSteps.brainstorm.length, 13, 'brainstorm should include optional demand clarification and default Design Grill gates')
assertContains('brainstorm', ['需求澄清 Grill', '写设计文档并自审', 'Design Grill 交叉审查', '用户确认并生成规范文件'])

assert.equal(stageSteps.scan.length, 11, 'scan base definition should be 11 steps (with Extract Project Knowledge) before per-project expansion')
assertContains('scan', ['构建扫描项目列表', '生成本地配置', '生成模块映射'])

assert.equal(stageSteps.quick.length, 3, 'quick should remain a short auxiliary workflow')
assertContains('quick', ['理解任务', '实现并验证', '暂存和更新记录'])

assert.equal(stageSteps.archive.length, 5, 'archive should keep its five-step lifecycle')
assertContains('archive', ['extract-module-impact', 'sync-module-docs', '确认归档'])

console.log('✅ stage definition regression checks passed')
