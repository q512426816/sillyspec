import { definition as brainstorm } from './brainstorm.js'
import { definition as propose } from './propose.js'
import { definition as plan } from './plan.js'
import { definition as execute } from './execute.js'
import { definition as verify } from './verify.js'

export const stageRegistry = {
  brainstorm,
  propose,
  plan,
  execute,
  verify
}

// 阶段顺序，用于 getNextStage
const stageOrder = ['brainstorm', 'propose', 'plan', 'execute', 'verify']

export function getNextStage(currentStage) {
  const index = stageOrder.indexOf(currentStage)
  if (index === -1 || index >= stageOrder.length - 1) return null
  return stageOrder[index + 1]
}
