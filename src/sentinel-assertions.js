/**
 * sentinel-assertions.js — L0 收口侧纯断言（2026-09-23-sentinel-rules / FR-07 / D-002@v1）。
 *
 * 与 watcher 侧哨兵规则（src/watcher.js R1 假勾选）同判据的**硬门版**纯函数：--done 收口
 * 侧调用拒收「全勾但零完成证据」的假完成主张（L0 升级通道——watcher 恒 advisory 人判，
 * 收口是唯一拒绝点，符合「守卫必须是验收侧的机制，永远不是生成侧的劝说」设计原则）。
 *
 * ⚠️ 本批（task-03）只交付函数+单测，**无任何仓内调用方**——收口接线留下批（避免与并行
 * 会话改同文件）；测试文件是当前唯一消费方。
 *
 * 纯度口径：无副作用（零写盘/零 db），输出由参数+只读盘面（review.json 在场探测）决定；
 * 盘面探测可经 opts.listReviewsImpl 注入替身（单测零真 fs）。证据判据与 R1 同口径：
 * commit 消息（标题或正文——2026-09-25 起收口侧取 %B 整条消息）含完整 token task-NN
 * （负向前瞻，task-01 不证 task-010）或对应 review.json 在场（.runtime/execute-runs
 * 任意 run 的 tasks 目录下对应任务子目录）。
 */
import { join, dirname } from 'path';
import { existsSync, readdirSync } from 'fs';

/** 判集行锚：`- [x] task-01: …`（id 行才是可验证主张；无 id 勾选行不入判——不可验证不拒收）。 */
const CHECKED_TASK_LINE_RE = /^[-*] \[( |x|X)\] (task-\d+)/;

/** task id 完整 token 匹配（词边界，与 watcher R1 同口径）。 */
function taskTokenRe(id) {
  return new RegExp(`${id}(?!\\d)`);
}

/**
 * review.json 在场证据清单（execute-runs 两级遍历；异常/缺失 → []，commit 证据照判）。
 */
function listReviewEvidence(changeDir, opts) {
  if (typeof opts.listReviewsImpl === 'function') {
    try { return opts.listReviewsImpl(changeDir) || []; } catch { return []; }
  }
  if (!changeDir) return [];
  try {
    const runsRoot = join(dirname(changeDir), '.runtime', 'execute-runs');
    const out = [];
    for (const run of readdirSync(runsRoot)) {
      let names = [];
      try { names = readdirSync(join(runsRoot, run, 'tasks')); } catch { continue; }
      for (const t of names) {
        if (existsSync(join(runsRoot, run, 'tasks', t, 'review.json'))) {
          out.push(`execute-runs/${run}/tasks/${t}/review.json`);
        }
      }
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * 假勾选三态判定（L0 收口拒收支点）。
 *
 * 证据判据统一（2026-10-07-thin-tasks-v3，镜像豁免退役）：tasks.md 是 agent 的工作分解
 * 队列，每格勾选都是 agent 的完成主张——一律按 per-task 证据判（提交消息含完整 token
 * task-NN（负向前瞻，task-01 不证 task-010）或对应 review.json 在场）。机器种子与
 * agent 改写行同判，不再区分「镜像/覆写」。
 *
 * @param {object} args
 * @param {string|null} args.changeDir 变更目录（推导 specBase 定位 execute-runs；null/探测
 *   失败按无 review 证据，commit 证据照判）
 * @param {string|null} args.tasksMd tasks.md 全文（判集=行首 checkbox+task-NN id 行）
 * @param {Array<string|{message:string}|{subject:string}>} args.commits 提交组（消息含
 *   task-NN 即该任务证据）
 * @param {{listReviewsImpl?: Function}} [args.opts] 注入面（测试替身）
 * @returns {{status:'complete'|'fake'|'none', claimTotal:number, checked:number, missing:string[]}}
 *   none=无完成主张（判集空或未全勾）；complete=全勾且零 missing；fake=全勾且有零证据
 *   任务（missing 列其 id，收口侧拒收依据）
 */
export function detectFakeCheckCompletion({ changeDir, tasksMd, commits, opts = {} } = {}) {
  const entries = [];
  for (const line of String(tasksMd || '').split(/\r?\n/)) {
    const m = line.match(CHECKED_TASK_LINE_RE);
    if (m) entries.push({ id: m[2], checked: m[1].toLowerCase() === 'x' });
  }
  const claimTotal = entries.length;
  const checked = entries.filter((e) => e.checked).length;
  const messages = (Array.isArray(commits) ? commits : [])
    .map((c) => (typeof c === 'string' ? c : String((c && (c.message ?? c.subject)) || '')));
  if (claimTotal === 0 || checked < claimTotal) {
    return { status: 'none', claimTotal, checked, missing: [] };
  }
  const reviews = listReviewEvidence(changeDir, opts);
  const missing = entries
    .filter((e) => {
      if (!e.checked) return false;
      const re = taskTokenRe(e.id);
      const byCommit = messages.some((msg) => re.test(msg));
      const byReview = reviews.some((p) => p.includes(`/tasks/${e.id}/`));
      return !(byCommit || byReview);
    })
    .map((e) => e.id);
  return { status: missing.length === 0 ? 'complete' : 'fake', claimTotal, checked, missing };
}

/**
 * 勾选节奏检测（2026-09-26-thin-check-cadence；2026-10-07-thin-tasks-v3 采样去重）：
 * 事件流里 task-done 单拍跳 ≥2 格 = 一把全勾（未按工作单元逐个勾）。
 * 事件两源同流：`task tick` 命令直写的精确事件（source:'task-tick'，一次一格）与 watcher
 * 3s 轮询的采样事件（快速连续 tick 被合并成一跳）。判最大跳以 CLI 精确事件为权威：
 *   ① 采样事件落点计数 M 与任一 CLI 事件落点相同 → 整跳被 CLI 精确序列覆盖，剔除；
 *   ② 其余采样事件起点按「小于其落点的最大 CLI 落点」抬高（CLI 已勾到的格不重复计入跳幅）。
 * 纯函数：事件清单→最大跳格记录；无多格跳返回 null。detail 与事件生成格式成对
 * （`checked N→M`）；解析失配（格式漂移/坏行/非 task-done）按无证据静默——fail-open。
 */
export function detectBatchCheckCadence(events) {
  const taskEvents = [];
  for (const e of events || []) {
    if (e && e.kind === 'task-done') taskEvents.push(e);
  }
  const parse = (e) => {
    const m = /^checked (\d+)→(\d+)$/.exec(String(e.detail || ''));
    return m ? { from: Number(m[1]), to: Number(m[2]) } : null;
  };
  const cliParsed = [];
  for (const e of taskEvents) {
    if (e.source !== 'task-tick') continue;
    const r = parse(e);
    if (r) cliParsed.push(r);
  }
  const cliTargets = new Set(cliParsed.map((r) => r.to));
  const maxCliBelow = (to) => {
    let best = 0;
    for (const r of cliParsed) if (r.to < to && r.to > best) best = r.to;
    return best;
  };
  let worst = null;
  for (const e of taskEvents) {
    const r = parse(e);
    if (!r) continue;
    const isCli = e.source === 'task-tick';
    if (!isCli && cliTargets.has(r.to)) continue; // 采样合并跳被 CLI 精确序列覆盖
    const from = isCli ? r.from : Math.max(r.from, maxCliBelow(r.to));
    if (r.to - from < 2) continue;
    if (!worst || r.to - from > worst.to - worst.from) worst = { from, to: r.to, detail: e.detail, ts: e.ts };
  }
  return worst;
}

/**
 * 单拍勾选门决策（2026-09-29-batch-tick-gate，纯函数）：检出单拍跳（batchTick 非 null）
 * 时的收口动作裁决。镜像豁免分支退役（2026-10-07-thin-tasks-v3——任务面统一为 agent
 * 工作分解，无镜像面）。四态（决策顺序即豁免优先序）：
 *   'silent'   无单拍跳；
 *   'bypass'   --allow-batch-tick 显式旁路——留痕放行（同意门先例）；
 *   'advisory' 机器代勾可解释整跳（autopilotTicked >= 跳幅——governance-autopilot 代勾是
 *              单拍多格机械写，非 agent 纪律面；代勾数不可解释最大跳时落到 reject——防「留
 *              一格给代勾补、自身大跳蹭豁免」的对抗绕过，二轮评审 P3-E）；
 *   'reject'   非旁路、代勾解释不了整跳——agent 一把勾，拒收。
 * @param {{batchTick:object|null, nonMirrorCount?:number|null, allowBatchTick?:boolean, autopilotTicked?:number}} args
 *   nonMirrorCount 保留为哨兵面未知信号（null → fail-open advisory）；镜像-only 语义已退役。
 * @returns {{action:'silent'|'advisory'|'bypass'|'reject', reason:string}}
 */
export function resolveBatchTickAction({ batchTick, nonMirrorCount = null, allowBatchTick = false, autopilotTicked = 0 } = {}) {
  if (!batchTick) return { action: 'silent', reason: 'no-batch-tick' };
  if (allowBatchTick === true) return { action: 'bypass', reason: 'flag' };
  if (nonMirrorCount === null) return { action: 'advisory', reason: 'sentinel-unknown' };
  if (autopilotTicked >= batchTick.to - batchTick.from) return { action: 'advisory', reason: 'autopilot-ticked' };
  return { action: 'reject', reason: 'agent-batch-tick' };
}

export default { detectFakeCheckCompletion, detectBatchCheckCadence };
