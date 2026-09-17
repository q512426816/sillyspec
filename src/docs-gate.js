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
 *
 * 坑 docs-gate-stale-baseline（ql-20260915-004，2026-09-15 用户实证）：基线文件是静态快照，
 * 远端 origin/main 已合入的失效消化/新增不会回流本地基线——出现「基线 371 < origin/main
 * 实测 379、本地 current 379」时 ratchet 拦 379>371，但本次推送零增量（不劣于远端）——
 * ratchet 本质=拦增量，被陈旧基线破坏成拦存量。修复：current > baseline 分支先实测
 * origin/main 树（临时 detach worktree 跑 runDocsCheck），current ≤ 实测值即放行；实测
 * 失败/无远端 ref fail-open 回原拦。快路径（current ≤ baseline）零成本零变化。
 *
 * 陈旧分支自动重锚（2026-09-17-docs-bracket-reanchor，D-002@v1）：走到该分支即已实付
 * 远端实测成本验证「本次不劣于远端」——已验证事实自动回流基线：口径守卫通过即
 * writeBaseline(current) + 消息披露（陈旧提示出现一次即消失，棘轮只紧不松：新基线 =
 * current ≤ 远端实测，每一分增量都有实测背书）。守卫只拦 checkOpts 一次性覆盖（paths/
 * skip/keywordAssert/crossRepoRoots 四键——异口径计数写盘会错调基线），不拦 local.yaml
 * 持久口径（measure 与 current 恒同读该配置，读写同源自洽）；首次立线 fail-closed 不变
 * （无基线仍须显式 --init-baseline，自动重锚仅限基线已存在的陈旧分支）。
 */
import { readFileSync, writeFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runDocsCheck, readDocsCheckConfig, DocsCheckConfigError } from './docs-check.js';
import { safeGit } from './git-helper.js';

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
 * 实测远端基准树的 docs check 失效数（坑 docs-gate-stale-baseline，ql-20260915-004）。
 *
 * 为什么临时 worktree 而非 runDocsCheck 的 --against reader：against reader 的干净文件
 * 走磁盘直读（磁盘 == HEAD 才成立，docs-check.js createHeadReader :88）——ref=origin/main
 * 时本地领先 origin 的已提交内容会被误当 origin 版，实测失真。临时 detach worktree
 * （`git worktree add --detach <tmp> origin/main`）检出的是真远端树，磁盘即实测基。
 *
 * 配置口径：读树内 local.yaml（gitignored → 通常缺省 → DEFAULT_DOC_PATHS，与远端真实
 * CI 口径一致——设备本地 skip 定制不污染远端实测）。清理含 .git 锁容错：worktree remove
 * 失败 → prune + rmSync 兜底；仍失败 stderr 一行不抛（临时目录残留 OS 清理，不阻断 gate）。
 *
 * @param {string} projectRoot 源码仓根
 * @param {string[]} [remoteRefs] 候选远端 ref（origin/main 优先；master 缺省仓兜底）
 * @returns {Promise<{ originCount: number|null, ref: string|null, error: string|null }>}
 *   originCount null = 未实测（无 ref / worktree 建/跑失败——调用方 fail-open 回原拦）
 */
export async function measureRemoteBaselineCount(projectRoot, remoteRefs = ['origin/main', 'origin/master']) {
  let ref = null;
  for (const r of remoteRefs) {
    if ((safeGit(projectRoot, ['rev-parse', '--verify', '--quiet', r]) || {}).value) { ref = r; break; }
  }
  if (!ref) return { originCount: null, ref: null, error: 'no-remote-ref' };

  const tmp = mkdtempSync(join(tmpdir(), 'sillyspec-docsgate-remote-'));
  let originCount = null;
  let error = null;
  try {
    // git worktree add 接受已存在的空目录（mkdtempSync 产物）；失败 fail-open 由调用方回原拦
    const added = safeGit(projectRoot, ['worktree', 'add', '--detach', tmp, ref], { timeout: 120000 });
    if (added.error) {
      error = added.error;
      return { originCount: null, ref, error };
    }
    try {
      const cfg = readDocsCheckConfig(tmp);
      const res = runDocsCheck({
        projectRoot: tmp,
        paths: cfg.paths,
        skip: cfg.skip,
        keywordAssert: cfg.keywordAssert,
        crossRepoRoots: cfg.crossRepoRoots,
      });
      originCount = res.invalid.length;
    } catch (e) {
      if (e instanceof DocsCheckConfigError) {
        error = e.message;
        originCount = null;
      } else {
        throw e;
      }
    }
  } finally {
    try {
      const removed = safeGit(projectRoot, ['worktree', 'remove', '--force', tmp]);
      if (removed.error) {
        // .git 锁/并发竞争容错：prune 清注册残留 + 直删目录兜底
        safeGit(projectRoot, ['worktree', 'prune']);
        try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 目录已不在 */ }
      }
    } catch {
      try { rmSync(tmp, { recursive: true, force: true }); } catch { /* 同上 */ }
    }
  }
  return { originCount, ref, error };
}

/**
 * IO 入口：跑一次 gate。
 * @param {{ projectRoot: string, specBase: string, initBaseline?: boolean }} opts
 *   projectRoot 源码仓根（docs check 锚）；specBase .sillyspec 根（基线文件所在）
 * @param {object} checkOpts 透传 runDocsCheck（paths/skip/keywordAssert/crossRepoRoots 覆盖；缺省
 *   读 local.yaml）——四键任一显式传入即触发陈旧分支口径守卫（不自动重锚，见头注）
 * @returns {Promise<{ exitCode: 0|1|2, ok: boolean, current: number, baseline: number|null,
 *                     delta: number|null, message: string, inited: boolean,
 *                     reanchored: boolean }>} reanchored：陈旧分支自动重锚 true（baseline 返
 *   新值 = current），其余分支缺省 false
 */
export async function runDocsGate(opts = {}, checkOpts = {}) {
  const { projectRoot, specBase, initBaseline = false } = opts;
  // 口径守卫：checkOpts 一次性子集/异口径覆盖时计数口径 ≠ 持久口径，写盘会错调基线——
  // 陈旧分支不自动重锚（against 不算守卫键：与 --init-baseline --against 同写提交树
  // 实测值语义一致，不新增口径）。不拦 local.yaml 持久口径（measure 与 current 恒同读）
  const scopeGuarded = !!(checkOpts.paths || checkOpts.skip || checkOpts.keywordAssert != null || checkOpts.crossRepoRoots);
  let result;
  try {
    const cfg = readDocsCheckConfig(projectRoot);
    result = runDocsCheck({
      projectRoot,
      paths: checkOpts.paths || cfg.paths,
      skip: checkOpts.skip || cfg.skip,
      keywordAssert: checkOpts.keywordAssert ?? cfg.keywordAssert,
      crossRepoRoots: checkOpts.crossRepoRoots || cfg.crossRepoRoots,
      // 坑 docs-gate-shared-worktree-parallel-block：--against <ref> 透传——按提交树校验
      //（pre-push 语义），隔离并行会话在途编辑的锚点瞬时漂移（移动靶）
      ...(checkOpts.against ? { against: checkOpts.against } : {}),
    });
  } catch (e) {
    if (e instanceof DocsCheckConfigError) {
      return { exitCode: 2, ok: false, current: null, baseline: null, delta: null, originCount: null, message: `docs gate 配置错误：${e.message}`, inited: false, reanchored: false };
    }
    throw e;
  }
  const current = result.invalid.length;

  if (initBaseline) {
    writeBaseline(specBase, current);
    return { exitCode: 0, ok: true, current, baseline: current, delta: 0, originCount: null, message: `📌 docs gate: 基线已初始化为当前实测 ${current} 处失效（${baselineDisplay(specBase)}）`, inited: true, reanchored: false };
  }

  const baseline = readBaseline(specBase);
  if (baseline === null) {
    return {
      exitCode: 2, ok: false, current, baseline: null, delta: null, originCount: null,
      message: `❌ docs gate: 无基线文件（${baselineDisplay(specBase)}）。首次使用先跑 sillyspec docs gate --init-baseline（以当前实测数立基线，存量既往不咎只拦增量）`,
      inited: false, reanchored: false,
    };
  }
  if (Number.isNaN(baseline)) {
    return { exitCode: 2, ok: false, current, baseline: null, delta: null, originCount: null, message: `❌ docs gate: 基线文件损坏（非非负整数），手工修正或 --init-baseline 重置`, inited: false, reanchored: false };
  }
  const v = evaluateRatchet({ current, baseline });
  if (v.ok) {
    // 快路径（current ≤ baseline）：原路零变化——不触远端实测（零 git 成本零行为漂移）
    return { exitCode: 0, ok: true, current, baseline, delta: v.delta, originCount: null, message: v.message, inited: false, reanchored: false };
  }
  // 坑 docs-gate-stale-baseline（ql-20260915-004）：current > baseline 时 origin 实测兜底——
  // ratchet 本质=拦增量；基线是静态快照，远端已合入的失效增长不回流基线会造成「未劣于远端
  // 也被拦」的假拦。实测 origin/main 树：current ≤ 实测值 = 本次不劣于远端 → 放行 + 自动
  // 重锚落盘（D-002@v1；口径守卫命中时不写盘、维持手动重锚建议）；无远端 ref / 实测失败
  // fail-open 回原拦；current > 实测值 = 真增量劣于远端 → 拦。
  const measured = await measureRemoteBaselineCount(projectRoot);
  if (measured.originCount !== null && current <= measured.originCount) {
    if (scopeGuarded) {
      // 守卫：checkOpts 一次性覆盖（异口径计数）——基线文件不动，维持手动 --init-baseline 建议文案
      return {
        exitCode: 0, ok: true, current, baseline, delta: v.delta, originCount: measured.originCount,
        message: `⚠️ docs gate: 基线陈旧：基线 ${baseline} < ${measured.ref} 实测 ${measured.originCount}，本次 ${current} 处失效未劣于远端不拦——建议 sillyspec docs gate --init-baseline 重锚锁定（以当前实测 ${current} 立线，存量既往不咎只拦增量）`,
        inited: false, reanchored: false,
      };
    }
    // 自动重锚：已实付实测成本验证「本次不劣于远端」——事实回流基线，同态第二次跑走快路径
    //（陈旧提示与远端实测各只发生一次）；新基线 = current ≤ 远端实测，棘轮只紧不松
    writeBaseline(specBase, current);
    return {
      exitCode: 0, ok: true, current, baseline: current, delta: v.delta, originCount: measured.originCount,
      message: `⚠️ docs gate: 基线陈旧：基线 ${baseline} < ${measured.ref} 实测 ${measured.originCount}，本次 ${current} 处失效未劣于远端不拦——📌 已自动重锚 基线 ${baseline}→${current}（实测不劣于远端，已落盘锁定；棘轮只紧不松）`,
      inited: false, reanchored: true,
    };
  }
  const remoteNote = measured.originCount !== null
    ? `，且劣于 ${measured.ref} 实测 ${measured.originCount} 处（真增量）`
    : '';
  return {
    exitCode: 1, ok: false, current, baseline, delta: v.delta, originCount: measured.originCount,
    message: `❌ docs gate: ${current} 处失效 > 基线 ${baseline}（新增 ${v.delta} 处）${remoteNote}，拦截。修掉新增引用或显式 --init-baseline 重置基线（需你确认存量合法）`,
    inited: false, reanchored: false,
  };
}
