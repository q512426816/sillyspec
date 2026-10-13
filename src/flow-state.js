// flow-state.yaml 单一源读取（2026-10-13-thin-sync-stage：自 flow.js 上移的叶子模块）。
// 依赖仅 node:fs / node:path / js-yaml——供 progress.js（同步投影，无循环依赖）与
// flow.js（协议主实现，re-export 保持 `import('../flow.js')` 既有引用面）共享。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'

export const FLOW_STATE_FILE = 'flow-state.yaml'

/** 读 flow-state（缺文件/损坏 → null = 未参与 thin）。 */
export function readFlowState(changeDir) {
  try {
    const raw = readFileSync(join(changeDir, FLOW_STATE_FILE), 'utf8')
    const obj = yaml.load(raw)
    return obj && typeof obj === 'object' ? obj : null
  } catch {
    return null
  }
}
