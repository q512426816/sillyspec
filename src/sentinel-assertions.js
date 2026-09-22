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
 * commit subject 含完整 token task-NN（负向前瞻，task-01 不证 task-010）或对应
 * review.json 在场（.runtime/execute-runs 任意 run 的 tasks 目录下对应任务子目录）。
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
 * 假勾选三态判定（L0 收口拒收支点，下批接线）。
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
 *   任务（missing 列其 id，收口侧拒收依据）。
 */
export function detectFakeCheckCompletion({ changeDir, tasksMd, commits, opts = {} } = {}) {
  const entries = [];
  for (const line of String(tasksMd || '').split(/\r?\n/)) {
    const m = line.match(CHECKED_TASK_LINE_RE);
    if (m) entries.push({ id: m[2], checked: m[1].toLowerCase() === 'x' });
  }
  const claimTotal = entries.length;
  const checked = entries.filter((e) => e.checked).length;
  if (claimTotal === 0 || checked < claimTotal) {
    return { status: 'none', claimTotal, checked, missing: [] };
  }
  const messages = (Array.isArray(commits) ? commits : [])
    .map((c) => (typeof c === 'string' ? c : String((c && (c.message ?? c.subject)) || '')));
  const reviews = listReviewEvidence(changeDir, opts);
  const missing = entries
    .filter((e) => {
      const re = taskTokenRe(e.id);
      const byCommit = messages.some((msg) => re.test(msg));
      const byReview = reviews.some((p) => p.includes(`/tasks/${e.id}/`));
      return !(byCommit || byReview);
    })
    .map((e) => e.id);
  return { status: missing.length === 0 ? 'complete' : 'fake', claimTotal, checked, missing };
}

export default { detectFakeCheckCompletion };
