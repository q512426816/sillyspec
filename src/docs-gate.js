/**
 * docs gate：docs check 的 ratchet 门（欠账只许减少不许增加）。
 *
 * 动机（doc-consistency-debt 第七节裁决）：behind 计数是代理信号不能当阈值（源码活跃
 * 不代表卡错，误报会让所有人学会忽略报警）；docs check 失效数是直接信号（每条都是
 * 具体的错），ratchet 语义 = 失效数 ≤ 基线即过、超基线拦——不管历史存量，只拦增量。
 *
 * 基线文件：.sillyspec/docs-check-baseline（纯数字一行，可手工改）。首次无基线时
 * 必须显式 --init-baseline 生成（不悄悄合法化存量欠账——与 quick fail-closed 调性
 * 一致）；--init-baseline 幂等，重跑以当前实测数覆盖。
 *
 * exit code：0 过（≤基线）/ 1 拦（>基线）/ 2 配置或 IO 错误（含无基线）。
 * 纯判定逻辑（evaluateRatchet）与 IO 面（runDocsGate）分离，前者可单测。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runDocsCheck, readDocsCheckConfig, DocsCheckConfigError } from './docs-check.js';

/** 基线文件名（相对 specBase/.sillyspec 根；specBase 由调用方传入完整路径锚） */
export const BASELINE_FILENAME = 'docs-check-baseline';

/** 展示用基线路径（文案用，POSIX 风格；join 防 specBase 带不带尾分隔符两种形态） */
function baselineDisplay(specBase) {
  return [specBase.replace(/[\\/]+$/, ''), BASELINE_FILENAME].join('/').replace(/\\/g, '/');
}

/**
 * 纯判定：ratchet 语义。
 * @param {{ current: number, baseline: number }} r
 * @returns {{ ok: boolean, delta: number, message: string }}
 *   delta = current - baseline；负值（清偿了）提示可下调基线但不强制。
 */
export function evaluateRatchet({ current, baseline }) {
  const delta = current - baseline;
  if (delta <= 0) {
    const hint = delta < 0
      ? `✅ docs gate: ${current} 处失效 ≤ 基线 ${baseline}（清偿了 ${-delta} 处，可跑 --init-baseline 下调基线锁住成果）`
      : `✅ docs gate: ${current} 处失效 = 基线 ${baseline}，放行`;
    return { ok: true, delta, message: hint };
  }
  return {
    ok: false, delta,
    message: `❌ docs gate: ${current} 处失效 > 基线 ${baseline}（新增 ${delta} 处），拦截。修掉新增引用或显式 --init-baseline 重置基线（需你确认存量合法）`,
  };
}

/** 读基线：不存在返回 null（调用方决定 init 或报错）；内容非数字行返回 NaN（按损坏报错）。 */
export function readBaseline(specBase) {
  const p = join(specBase, BASELINE_FILENAME);
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, 'utf8').trim();
  const n = parseInt(raw, 10);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

/** 写基线（--init-baseline）：以实测当前失效数覆盖。 */
export function writeBaseline(specBase, value) {
  writeFileSync(join(specBase, BASELINE_FILENAME), `${value}\n`, 'utf8');
}

/**
 * IO 入口：跑一次 gate。
 * @param {{ projectRoot: string, specBase: string, initBaseline?: boolean }} opts
 *   projectRoot 源码仓根（docs check 锚）；specBase .sillyspec 根（基线文件所在）
 * @param {object} checkOpts 透传 runDocsCheck（paths/skip/keywordAssert 覆盖；缺省读 local.yaml）
 * @returns {Promise<{ exitCode: 0|1|2, ok: boolean, current: number, baseline: number|null,
 *                     delta: number|null, message: string, inited: boolean }>}
 */
export async function runDocsGate(opts = {}, checkOpts = {}) {
  const { projectRoot, specBase, initBaseline = false } = opts;
  let result;
  try {
    const cfg = readDocsCheckConfig(projectRoot);
    result = runDocsCheck({
      projectRoot,
      paths: checkOpts.paths || cfg.paths,
      skip: checkOpts.skip || cfg.skip,
      keywordAssert: checkOpts.keywordAssert ?? cfg.keywordAssert,
      crossRepoRoots: checkOpts.crossRepoRoots || cfg.crossRepoRoots,
    });
  } catch (e) {
    if (e instanceof DocsCheckConfigError) {
      return { exitCode: 2, ok: false, current: null, baseline: null, delta: null, message: `docs gate 配置错误：${e.message}`, inited: false };
    }
    throw e;
  }
  const current = result.invalid.length;

  if (initBaseline) {
    writeBaseline(specBase, current);
    return { exitCode: 0, ok: true, current, baseline: current, delta: 0, message: `📌 docs gate: 基线已初始化为当前实测 ${current} 处失效（${baselineDisplay(specBase)}）`, inited: true };
  }

  const baseline = readBaseline(specBase);
  if (baseline === null) {
    return {
      exitCode: 2, ok: false, current, baseline: null, delta: null,
      message: `❌ docs gate: 无基线文件（${baselineDisplay(specBase)}）。首次使用先跑 sillyspec docs gate --init-baseline（以当前实测数立基线，存量既往不咎只拦增量）`,
      inited: false,
    };
  }
  if (Number.isNaN(baseline)) {
    return { exitCode: 2, ok: false, current, baseline: null, delta: null, message: `❌ docs gate: 基线文件损坏（非非负整数），手工修正或 --init-baseline 重置`, inited: false };
  }
  const v = evaluateRatchet({ current, baseline });
  return { exitCode: v.ok ? 0 : 1, ok: v.ok, current, baseline, delta: v.delta, message: v.message, inited: false };
}
