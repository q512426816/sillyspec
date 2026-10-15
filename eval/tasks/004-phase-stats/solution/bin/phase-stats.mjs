#!/usr/bin/env node
// 参考解（eval dry-run 参考与判别力测试用；不进 agent 工作副本、不进任务指纹）。
// 覆盖全部隐含面：乱序交错行按 (sessionId, phase) 配对；空行/纯空白行跳过；行字段 trim
// （兼容 CRLF）；未闭合 START 与孤儿 END 零贡献；同 (sessionId, phase) 多轮累加。
import { readFileSync } from 'node:fs';

const raw = readFileSync('data/events.log', 'utf8');
const open = new Map(); // "session|phase" -> start ms
const agg = new Map();  // phase -> { rounds, totalSeconds }

for (const line of raw.split(/\r?\n/)) {
  const t = line.trim();
  if (!t) continue; // 空行 / 纯空白行
  const parts = t.split(/\s+/);
  if (parts.length < 4) continue;
  const [ts, kind, session, phase] = parts;
  const ms = Date.parse(ts);
  if (!Number.isFinite(ms)) continue;
  const key = `${session}|${phase}`;
  if (kind === 'START') {
    if (!open.has(key)) open.set(key, ms); // 重复 START 以首者计，防覆盖丢轮
  } else if (kind === 'END') {
    const start = open.get(key);
    if (start === undefined) continue; // 孤儿 END 零贡献
    open.delete(key);
    const a = agg.get(phase) ?? { rounds: 0, totalSeconds: 0 };
    a.rounds += 1;
    a.totalSeconds += Math.round((ms - start) / 1000);
    agg.set(phase, a);
  }
  // 未闭合 START：循环结束自然零贡献
}

const phases = [...agg.entries()]
  .map(([phase, a]) => ({ phase, rounds: a.rounds, totalSeconds: a.totalSeconds }))
  .sort((x, y) => (x.phase < y.phase ? -1 : x.phase > y.phase ? 1 : 0));
process.stdout.write(JSON.stringify({ phases }) + '\n');
