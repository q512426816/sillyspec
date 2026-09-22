#!/usr/bin/env node
// R4 对照实验·核算脚本 —— zcode db 会话级 token/请求/时长归账
// 用法：node account.mjs [--arm R4] [--title 关键词] [--since 2026-09-19]
// 注意（第2/3轮各踩一次的坑）：model_usage.started_at / session.time_created 均按
// 数值 epoch-ms 处理；若遇 ISO 字符串自动 Date.parse 兜底，绝不字符串比较。
import { DatabaseSync } from 'node:sqlite';

const DB = 'C:/Users/qinyi/.zcode/cli/db/db.sqlite';
const args = process.argv.slice(2);
const flag = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const toMs = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v;
  const s = String(v);
  if (/^\d+$/.test(s)) return Number(s);
  const p = Date.parse(s.includes('T') ? s : s.replace(' ', 'T') + '+08:00');
  return Number.isNaN(p) ? null : p;
};
const fmtMin = (ms) => (ms == null ? '?' : (ms / 60000).toFixed(1) + 'min');
const fmtTok = (t) => (t == null ? '?' : (t / 1e6).toFixed(2) + 'M');

const db = new DatabaseSync(DB, { readOnly: true });

// 1) 定位会话：标题关键词（可多个，逗号分隔），可加 --since YYYY-MM-DD 下限
const titleKw = (flag('--title') ?? 'R4').split(',').map(s => s.trim()).filter(Boolean);
const sinceRaw = flag('--since');
const sinceMs = sinceRaw ? toMs(sinceRaw + 'T00:00:00+08:00') : null;

const like = titleKw.map(() => 'title LIKE ?').join(' OR ');
const rows = db.prepare(
  `SELECT id, parent_id, title, time_created FROM session WHERE (${like}) ORDER BY time_created`
).all(...titleKw.map(k => '%' + k + '%'));

// 2) 每会话聚合（主会话 + 递归子会话），窗口=会话创建起 48h 防 spill
//    v2（2026-09-21 R5 准备）：三分扩展——新鲜 input（=input−cache_read）、缓存读、输出，
//    及账单当量两界（方案 v3.2 口径：新入 1× / 缓存 0.1× / 输出 3–5×，R5 验收判法依赖）
const aggFor = (sid) => db.prepare(
  `SELECT COUNT(*) req, SUM(computed_total_tokens) tok, SUM(input_tokens) itok, SUM(output_tokens) otok,
          SUM(cache_read_input_tokens) cr,
          SUM(duration_ms) dur, MIN(started_at) mn, MAX(started_at) mx, SUM(tool_call_count) tools
   FROM model_usage WHERE session_id = ? AND started_at >= ?`
);

const results = [];
for (const s of rows) {
  const created = toMs(s.time_created);
  const winStart = sinceMs != null ? Math.max(created ?? 0, sinceMs) : (created ?? 0);
  const winEnd = winStart + 48 * 3600 * 1000;
  // 递归滚子会话
  const kids = db.prepare(
    `WITH RECURSIVE tree(id, title) AS (SELECT id, title FROM session WHERE parent_id = ?
      UNION ALL SELECT s.id, s.title FROM session s JOIN tree t ON s.parent_id = t.id)
     SELECT id, title FROM tree`
  ).all(s.id);
  const self = aggFor(s.id).get(winStart > 0 ? winStart : 0);
  // 请求窗口上界也钳（started_at < winEnd）
  const inWin = (r) => { const a = db.prepare(
    `SELECT COUNT(*) req, SUM(computed_total_tokens) tok, SUM(duration_ms) dur,
            SUM(input_tokens) itok, SUM(output_tokens) otok, SUM(cache_read_input_tokens) cr
     FROM model_usage
     WHERE session_id = ? AND started_at >= ? AND started_at < ?`
  ).get(r, winStart, winEnd); return a; };
  const mainAgg = inWin(s.id);
  let kidReq = 0, kidTok = 0, kidDur = 0, kidIt = 0, kidCr = 0, kidOt = 0;
  for (const k of kids) {
    const a = inWin(k.id); kidReq += a.req ?? 0; kidTok += a.tok ?? 0; kidDur += a.dur ?? 0;
    kidIt += a.itok ?? 0; kidCr += a.cr ?? 0; kidOt += a.otok ?? 0;
  }
  const wall = mainAgg.req > 0 || kidReq > 0 ? null : null;
  const span = db.prepare(
    `SELECT MIN(started_at) mn, MAX(started_at) mx FROM model_usage WHERE session_id = ?`
  ).get(s.id);
  const spanMs = (toMs(span.mx) ?? 0) - (toMs(span.mn) ?? 0);
  // 三分与当量（新鲜 = input − cache_read，钳 ≥0 防口径倒挂；当量两界 = 输出 3×/5×）
  const mIt = mainAgg.itok ?? 0, mCr = mainAgg.cr ?? 0, mOt = mainAgg.otok ?? 0;
  const tIt = mIt + kidIt, tCr = mCr + kidCr, tOt = mOt + kidOt;
  const fresh = Math.max(0, tIt - tCr);
  const eq3 = fresh + 0.1 * tCr + 3 * tOt;
  const eq5 = fresh + 0.1 * tCr + 5 * tOt;
  results.push({
    id: s.id, title: s.title, kids: kids.length,
    mainReq: mainAgg.req ?? 0, mainTok: mainAgg.tok ?? 0, mainDur: mainAgg.dur ?? 0,
    kidReq, kidTok, kidDur,
    totReq: (mainAgg.req ?? 0) + kidReq, totTok: ((mainAgg.tok ?? 0) + kidTok),
    spanMin: spanMs / 60000,
    fresh, cacheR: tCr, out: tOt, eq3, eq5,
  });
}

// 3) 输出
console.log(`| 会话 | 标题 | 子代 | 主会话 req/tok/model-time | 子代 req/tok | 合计 req | 合计 tok | 活动跨度 | 新鲜in | 缓存R | 输出 | 当量@3× | 当量@5× |`);
console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
for (const r of results) {
  console.log(`| ${r.id} | ${(r.title ?? '').slice(0, 40).replace(/\|/g, '/')} | ${r.kids} | ${r.mainReq} / ${fmtTok(r.mainTok)} / ${fmtMin(r.mainDur)} | ${r.kidReq} / ${fmtTok(r.kidTok)} | ${r.totReq} | ${fmtTok(r.totTok)} | ${fmtMin(r.spanMs ?? r.spanMin * 60000)} | ${fmtTok(r.fresh)} | ${fmtTok(r.cacheR)} | ${fmtTok(r.out)} | ${fmtTok(r.eq3)} | ${fmtTok(r.eq5)} |`);
}
if (results.length === 0) console.log('(无匹配会话——检查标题关键词或 --since');
db.close();
