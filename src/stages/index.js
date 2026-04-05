import { definition as brainstorm } from './brainstorm.js'
import { definition as propose } from './propose.js'
import { definition as plan } from './plan.js'
import { definition as execute } from './execute.js'
import { definition as verify } from './verify.js'
import { definition as scan } from './scan.js'
import { definition as quick } from './quick.js'
import { definition as archive } from './archive.js'
import { definition as status } from './status.js'

export const stageRegistry = {
  brainstorm,
  propose,
  plan,
  execute,
  verify,
  scan,
  quick,
  archive,
  status
}

// 流程阶段顺序，用于 getNextStage
const stageOrder = ['brainstorm', 'propose', 'plan', 'execute', 'verify']

export function getNextStage(currentStage) {
  const index = stageOrder.indexOf(currentStage)
  if (index === -1 || index >= stageOrder.length - 1) return null
  return stageOrder[index + 1]
}

// 辅助命令（不影响流程阶段推进）
export const auxiliaryStages = ['scan', 'quick', 'archive', 'status']
