/**
 * verify-mode —— verify 阶段仓级开关（2026-11-26-verify-skip-switch）。
 *
 * local.yaml：
 *   verify:
 *     mode: full   # 缺省——现行七步验证
 *     mode: skip   # 仓主显式关停：run verify 入口短路，不渲染步骤、不产
 *                  # verify-result.md / verify-facts.json，阶段直接 completed；
 *                  # resolveFactsExpected 按无事实面放行（不因 facts 缺失 fail-closed）。
 *
 * 设计边界：这只是止血阀，不删阶段壳、不动 verify-result 的消费面；缺省 full 零行为变化。
 * 叶子模块（只依赖 fs/path/js-yaml），被 run/stage.js、stage-contract.js、run/next.js 共用，
 * 不反向 import 流程模块（避免 stage-contract ↔ verify-probes 一类 TLA 环）。
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'

/**
 * 读 local.yaml 的 verify.mode。
 * fail-soft：文件缺失/解析失败/值非法一律 full（零配置可用 + 不静默关停）。
 * @param {string} specBase .sillyspec 根目录
 * @returns {'full'|'skip'}
 */
export function readVerifyMode(specBase) {
  try {
    const p = join(specBase, 'local.yaml')
    if (!existsSync(p)) return 'full'
    const doc = yaml.load(readFileSync(p, 'utf8'))
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return 'full'
    const verify = doc.verify
    if (!verify || typeof verify !== 'object' || Array.isArray(verify)) return 'full'
    return verify.mode === 'skip' ? 'skip' : 'full'
  } catch {
    return 'full'
  }
}

/**
 * 阶段是否应被跳过（纯判定，便于单测）。
 * @param {{ specBase?: string, stageName?: string }} [opts]
 * @returns {boolean}
 */
export function shouldSkipVerify(opts = {}) {
  return opts.stageName === 'verify' && readVerifyMode(opts.specBase) === 'skip'
}

/** 跳过留痕文案（单源——入口短路与文档/测试共用同一措辞）。 */
export function renderVerifySkipNotice() {
  return '⏭️ verify 阶段跳过（local.yaml verify.mode: skip）：不渲染步骤、不产 verify-result.md/verify-facts.json，语义核验已按仓主配置关闭。恢复：删除该键或改回 full 后 `sillyspec run verify --change <名> --reopen`。'
}
