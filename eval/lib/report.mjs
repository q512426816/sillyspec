// 报告：分臂通过率 + Wilson 95% CI + Δ(B−A) 区间 + flaky 剔除 + 基线回归对比。
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeConfigHash, sillyspecVersion } from './config.mjs';
import { EvalDB } from './db.mjs';
import { loadTasks, tasksFingerprint } from './tasks.mjs';
import { deltaCI, fmtPct, fmtPp, wilsonCI } from './util.mjs';

export function buildReport(config, opts = {}) {
  const dbFile = join(config.resultsDir, 'eval.db');
  if (!existsSync(dbFile)) return { empty: true };
  const db = new EvalDB(dbFile).init();

  const adapterType = opts.dryRun ? 'dryrun' : (config.adapter.type ?? 'cli');
  const currentHash = computeConfigHash(config, adapterType, tasksFingerprint(loadTasks(config.tasksDir)));
  const groups = db.groups();
  const group = groups.find((g) => g.config_hash === currentHash && g.adapter === adapterType)
    ?? groups.find((g) => g.adapter === adapterType);
  if (!group) return { empty: true };

  const rows = db.runsInGroup(group.config_hash, adapterType);
  const byArm = { A: new Map(), B: new Map() };
  for (const r of rows) {
    if (r.status !== 'pass' && r.status !== 'fail') continue; // timeout/error 不计入通过率
    if (!byArm[r.arm]) continue;
    if (!byArm[r.arm].has(r.task_id)) byArm[r.arm].set(r.task_id, []);
    byArm[r.arm].get(r.task_id).push(r.status);
  }

  const summary = {
    adapterType,
    configHash: group.config_hash,
    hashCurrent: group.config_hash === currentHash,
    sillyspecVersion: sillyspecVersion(),
    arms: {},
  };
  for (const arm of Object.keys(byArm)) {
    let n = 0;
    let pass = 0;
    const flaky = [];
    for (const [taskId, statuses] of byArm[arm]) {
      if (new Set(statuses).size > 1) flaky.push(taskId); // 同任务同臂结果摇摆 → flaky，剔除
      else { n++; if (statuses[0] === 'pass') pass++; }
    }
    summary.arms[arm] = {
      label: config.arms[arm]?.label ?? arm,
      n,
      pass,
      rate: n ? pass / n : null,
      ci: wilsonCI(pass, n),
      flaky,
    };
  }
  const A = summary.arms.A;
  const B = summary.arms.B;
  if (A?.rate != null && B?.rate != null) {
    summary.delta = { pp: B.rate - A.rate, ci: deltaCI(A.rate, A.n, B.rate, B.n) };
  }
  return summary;
}

export function printReport(config, summary) {
  if (!summary || summary.empty) {
    console.log('暂无可报告的评测数据（先 --dry-run 或真跑一轮）');
    return;
  }
  console.log('\n==== SillySpec Eval 报告 ====');
  console.log(`adapter=${summary.adapterType}  hash=${summary.configHash}${summary.hashCurrent ? '' : '（任务/配置已变更，以上为最近一轮）'}  sillyspec=${summary.sillyspecVersion}`);
  console.log('\n臂            n    pass  通过率   95% CI');
  for (const arm of ['A', 'B']) {
    const s = summary.arms[arm];
    if (!s || (s.n === 0 && s.flaky.length === 0)) continue;
    console.log(
      `${s.label.padEnd(12).slice(0, 12)}  ${String(s.n).padEnd(4)} ${String(s.pass).padEnd(5)} `
      + `${fmtPct(s.rate).padEnd(7)} [${fmtPct(s.ci[0])}, ${fmtPct(s.ci[1])}]`,
    );
  }
  if (summary.delta) {
    console.log(`\nΔ(B−A) = ${fmtPp(summary.delta.pp)}   95% CI [${fmtPp(summary.delta.ci[0])}, ${fmtPp(summary.delta.ci[1])}]`);
    if (Math.min(summary.arms.A.n, summary.arms.B.n) < 30) {
      console.log('（单臂样本 < 30，区间仅供方向参考）');
    }
  }
  const flakyAll = ['A', 'B'].flatMap((a) => (summary.arms[a]?.flaky ?? []).map((t) => `${t}(臂${a})`));
  if (flakyAll.length) console.log(`flaky ${flakyAll.length} 个（已从通过率剔除）：${flakyAll.join('、')}`);

  const baselinePath = join(config.resultsDir, 'baseline.json');
  if (existsSync(baselinePath)) {
    const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
    const threshold = (config.regressionThresholdPp ?? 5) / 100;
    const parts = [];
    for (const arm of ['A', 'B']) {
      const cur = summary.arms[arm]?.rate;
      const base = baseline.arms?.[arm]?.rate;
      if (cur == null || base == null) continue;
      const diff = cur - base;
      const flag = diff < -threshold ? ' ⚠️超回归阈值' : '';
      parts.push(`臂${arm} ${fmtPct(base)}→${fmtPct(cur)}（${fmtPp(diff)}${flag}）`);
    }
    if (parts.length) console.log(`基线对比（${baseline.createdAt}）：${parts.join('  ')}`);
  }
}

export function setBaseline(config, opts) {
  const summary = buildReport(config, opts);
  if (!summary || summary.empty) {
    console.log('暂无数据可固化为基线');
    return;
  }
  const pick = (a) => (a && a.rate != null ? { n: a.n, rate: a.rate } : null);
  const payload = {
    createdAt: new Date().toISOString(),
    configHash: summary.configHash,
    adapter: summary.adapterType,
    sillyspecVersion: summary.sillyspecVersion,
    arms: { A: pick(summary.arms.A), B: pick(summary.arms.B) },
  };
  writeFileSync(join(config.resultsDir, 'baseline.json'), JSON.stringify(payload, null, 2));
  console.log(`基线已固化 → ${join(config.resultsDir, 'baseline.json')}`);
}
