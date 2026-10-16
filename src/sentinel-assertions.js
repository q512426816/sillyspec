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
 * 提交消息连写 token 组展开（坑 flow-done-sentinel-token-split，2026-10-08 实证）：
 * `task-01/02/03`、`task-1、2，03` 等自然语言连写组只含首个完整 token——字面匹配判
 * 其余为零完成证据误拒收。展开为独立规范 token（补零到两位，与判集行锚同形）后再判；
 * 尾数不跟数字（防 task-013 版本串误切）。纯函数，供哨兵判定与 autopilot 勾选提取共用。
 */
export function expandTaskShorthand(messages) {
  return (Array.isArray(messages) ? messages : []).map((msg) =>
    String(msg ?? '').replace(
      /task-(\d{1,2})((?:\s*[\/、，,；;]\s*\d{1,2}(?!\d))+)/gi,
      (full, first, rest) =>
        ' ' + [first, ...(rest.match(/\d{1,2}/g) || [])]
          .map((n) => `task-${String(Number(n)).padStart(2, '0')}`)
          .join(' ') + ' '
    )
  );
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
  // 连写组先展开（坑 flow-done-sentinel-token-split）：task-01/02/03 → 独立 token 再字面判
  const expanded = expandTaskShorthand(messages);
  const missing = entries
    .filter((e) => {
      if (!e.checked) return false;
      const re = taskTokenRe(e.id);
      const byCommit = expanded.some((msg) => re.test(msg));
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
    if (!e || e.kind !== 'task-done') continue;
    // 节奏域过滤（2026-10-08-batch-tick-false-positive）：只认任务队列面（stage='tasks'，缺省
    // 视同 tasks 兼容 legacy 流）。其他阶段的 task-done（如 design.md 自审预勾的首现计数）不是
    // tick 信号——混入会把逐格勾选误判成单拍大跳（实证：design 0→8 拒收六次独立 tick）。
    if (e.stage != null && e.stage !== 'tasks') continue;
    taskEvents.push(e);
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
 * 侧车勾选突发检测（2026-10-14-tick-burst-sidecar-gate，纯函数）：task-ticks.jsonl 的毫秒级
 * 时戳按相邻间隔窗口分簇——CLI 逐格快连点（收口一把点的官方路径形态）在事件流里是单格精确跳，
 * 10-07 采样去重后对 detectBatchCheckCadence 不可见（近期实证：6 格 2 秒内/4 格 1 秒内零检出）；
 * 侧车是 CLI tick 的事实源（随归档进 git、不受观测盲窗影响），收口节奏门回退消费本函数——
 * CLI 与直接 Edit 两条路径同判。
 * 语义：tickLog 同任务取最早（幂等重勾防御）+ 坏行跳过（task 形态/时戳有限性）+ 排序后按
 * gap<=windowMs（缺省 60s，opts.windowMs 覆写）分簇；最大簇 size>=2 → 返回与事件流同形的
 * batchTick 记录。from/to 是 CLI 勾序计数（Edit 翻格不记侧车，与事件流 checked N→M 计数空间
 * 不同源）——resolveBatchTickAction 只消费跳幅（to-from）与 ts，语义等价；detail 带「侧车突发」
 * 标注防口径混淆。fail-open：不足两格/空输入/全坏行 → null。
 */
export function detectTickBurst(tickLog, opts = {}) {
  const windowMs = Number.isFinite(opts.windowMs) ? opts.windowMs : 60_000;
  const byTask = new Map();
  for (const r of Array.isArray(tickLog) ? tickLog : []) {
    const task = String((r && r.task) || '').trim();
    const ts = Number(r && r.ts);
    if (!/^task-\d+$/.test(task) || !Number.isFinite(ts)) continue;
    const prev = byTask.get(task);
    if (prev === undefined || ts < prev) byTask.set(task, ts);
  }
  const ticks = [...byTask.values()].sort((a, b) => a - b);
  if (ticks.length < 2) return null;
  let worst = null;
  let start = 0;
  for (let i = 1; i <= ticks.length; i++) {
    if (i < ticks.length && ticks[i] - ticks[i - 1] <= windowMs) continue;
    const size = i - start;
    if (size >= 2 && (!worst || size > worst.size)) {
      worst = { size, from: start, to: i, ts: ticks[start], spanMs: ticks[i - 1] - ticks[start] };
    }
    start = i;
  }
  if (!worst) return null;
  return {
    from: worst.from, to: worst.to, size: worst.size, spanMs: worst.spanMs, ts: worst.ts,
    source: 'tick-burst',
    detail: `checked ${worst.from}→${worst.to}（task tick 侧车突发 ${worst.size} 格）`,
  };
}

/**
 * 勾选时点判定·换源版（2026-10-17-tick-timing-source，纯函数）：task-ticks.jsonl 侧车的逐格
 * 墙钟时戳 → 勾选是「边干边勾」还是「末尾集中」。旧判据（tasks.md git 首次提交 == 收口最后
 * 提交）已退役——git 历史形态被官方允许的 reset --soft 压扁无声摧毁（tick-timing-squash-
 * blindspot 坑：边干边勾的渐进提交被并行会话压扁后警告照出，结构性误报；且 tasks.md 不进
 * 交付 pathspec 的纪律下「untracked 直至归档」恒复现）。墙钟时戳是侧车文件事实，压扁/
 * rebase 均不可改写——与「审计真相锚 change.patch sha256、不依赖 git 形态」口径对齐。
 * 判定序（豁免优先）：
 *   'no-ticks'    侧车无记录（agent 全程直接 Edit）——不判（调用方给一行 task tick 教学）；
 *   'single'      仅 1 格——单格无节奏可言；
 *   'spread'      时戳跨度 > clusterWindowMs（缺省 120s）——天然分散，边干边勾确认
 *                 （超窗即铁证，无需存活锚）；
 *   'no-anchor'   lifespanMs 非有限或 ≤0（baseline 缺失）——fail-open 不判（防误报）；
 *   'concentrated' 跨度 ≤ clusterWindowMs 且 lifespanMs ≥ ratio×max(跨度,1ms)（缺省 10）
 *                 ——格子全挤在收口前短窗且变更活得够久，末尾集中勾选形态；
 *   其余（挤短窗但存活比不足）→ 'spread'——快变更快勾是合法形态，不告。
 * 输入 ticks 为 [{ts, task}]（parseTickLog 产物或同形）；行序不保证，内部按 ts 排序。
 * 坏行（ts 非有限/≤0）静默剔除。watcher 采样事件刻意不作判据（部分观测会把分散勾选采样
 * 成尾窗聚集，与采样合并跳系列坑同源——缺观测宁可教学不判）。
 * @param {{ticks?:Array<{ts:number,task:string}>, lifespanMs?:number, clusterWindowMs?:number, ratio?:number}} args
 * @returns {{status:'spread'|'concentrated'|'single'|'no-ticks'|'no-anchor', count:number, spanMs:number}}
 */
export function detectTickTiming({ ticks, lifespanMs, clusterWindowMs = 120_000, ratio = 10 } = {}) {
  const list = (Array.isArray(ticks) ? ticks : [])
    .map((r) => Number(r && r.ts))
    .filter((ts) => Number.isFinite(ts) && ts > 0)
    .sort((a, b) => a - b);
  if (list.length === 0) return { status: 'no-ticks', count: 0, spanMs: 0 };
  if (list.length === 1) return { status: 'single', count: 1, spanMs: 0 };
  const spanMs = list[list.length - 1] - list[0];
  if (spanMs > clusterWindowMs) return { status: 'spread', count: list.length, spanMs };
  const life = Number(lifespanMs);
  if (!Number.isFinite(life) || life <= 0) return { status: 'no-anchor', count: list.length, spanMs };
  if (life >= ratio * Math.max(spanMs, 1)) return { status: 'concentrated', count: list.length, spanMs };
  return { status: 'spread', count: list.length, spanMs };
}

/**
 * 单拍勾选门决策（2026-09-29-batch-tick-gate，纯函数）：检出单拍跳（batchTick 非 null）
 * 时的收口动作裁决。镜像豁免分支退役（2026-10-07-thin-tasks-v3——任务面统一为 agent
 * 工作分解，无镜像面）。五态（决策顺序即豁免优先序）：
 *   'silent'   无单拍跳；
 *   'bypass'   --allow-batch-tick 显式旁路——留痕放行（同意门先例）；
 *   'advisory' 三路：哨兵面未知（fail-open 防误拒）；哨兵证据完备（status=complete——
 *              2026-10-13-batchtick-evidence-domain-hint：同形态 git 时点检查「一把勾模式」
 *              因 token 证据齐放行，事件流门对齐该语义——证据是提交哈希锚定的客观面，
 *              损害只剩 per-task 时间戳信号面；证据缺失形态不走此态，维持 reject）；机器代勾
 *              可解释整跳（autopilotTicked >= 跳幅——governance-autopilot 代勾是单拍多格机械写，
 *              非 agent 纪律面；代勾数不可解释最大跳时落到 reject——防「留一格给代勾补、自身
 *              大跳蹭豁免」的对抗绕过，二轮评审 P3-E）；
 *   'reject'   非旁路、证据不完备、代勾解释不了整跳——agent 一把勾，拒收。
 * @param {{batchTick:object|null, nonMirrorCount?:number|null, allowBatchTick?:boolean, autopilotTicked?:number, evidenceComplete?:boolean}} args
 *   nonMirrorCount 保留为哨兵面未知信号（null → fail-open advisory）；镜像-only 语义已退役。
 *   evidenceComplete 缺省 false（additive——既有调用方零感知）。
 * @returns {{action:'silent'|'advisory'|'bypass'|'reject', reason:string}}
 */
export function resolveBatchTickAction({ batchTick, nonMirrorCount = null, allowBatchTick = false, autopilotTicked = 0, evidenceComplete = false } = {}) {
  if (!batchTick) return { action: 'silent', reason: 'no-batch-tick' };
  if (allowBatchTick === true) return { action: 'bypass', reason: 'flag' };
  if (nonMirrorCount === null) return { action: 'advisory', reason: 'sentinel-unknown' };
  if (evidenceComplete === true) return { action: 'advisory', reason: 'evidence-complete' };
  if (autopilotTicked >= batchTick.to - batchTick.from) return { action: 'advisory', reason: 'autopilot-ticked' };
  return { action: 'reject', reason: 'agent-batch-tick' };
}

export default { detectFakeCheckCompletion, detectBatchCheckCadence, detectTickBurst };
