import { definition as brainstorm } from './brainstorm.js'
import { definition as propose } from './propose.js'
import { definition as plan } from './plan.js'
import { definition as execute } from './execute.js'
import { definition as verify } from './verify.js'
import { definition as scan } from './scan.js'
import { definition as quick } from './quick.js'
import { definition as explore } from './explore.js'
import { definition as archive } from './archive.js'
import { definition as status } from './status.js'
import { definition as doctor } from './doctor.js'

// 标记辅助阶段
const auxiliaryFlag = { auxiliary: true }

export const stageRegistry = {
  brainstorm,
  propose,
  plan,
  execute,
  verify,
  scan: { ...scan, ...auxiliaryFlag },
  quick: { ...quick, ...auxiliaryFlag },
  explore: { ...explore, ...auxiliaryFlag },
  archive: { ...archive, ...auxiliaryFlag },
  status: { ...status, ...auxiliaryFlag },
  doctor: { ...doctor, ...auxiliaryFlag }
}

// 辅助命令（在没有 progress.json 时也可执行）
export const auxiliaryStages = ['scan', 'quick', 'explore', 'archive', 'status', 'doctor']
