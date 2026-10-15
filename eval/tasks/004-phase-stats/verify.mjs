// 判分脚本：cwd=被测工作目录，退出码 0 = 通过。
// 期望值基于 data/events.log 固定内容硬编码（download r1/10s、login r4/22s、upload r1/17s），
// 保证判分独立于被测实现。种植缺陷探针（2026-10-15-eval-planted-defect-probe）：
// 指令只命名解析格式与输出契约；五类隐含面（乱序交错/空行/纯空白行/未闭合 START/孤儿 END）
// 全部由 fixture 承载——失败时下方断言消息逐项定位是哪条隐含面挂了。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

const run = spawnSync('node', [join('bin', 'phase-stats.mjs')], { encoding: 'utf8' });
assert.equal(run.status, 0, `CLI 应成功运行（exit=${run.status}）: ${String(run.stderr).slice(0, 300)}`);

const out = String(run.stdout).trim();
assert.equal(out.split('\n').length, 1, 'stdout 只允许一行 JSON');
let parsed;
assert.doesNotThrow(() => { parsed = JSON.parse(out); }, 'stdout 应为合法 JSON');
assert.ok(Array.isArray(parsed.phases), 'phases 应为数组');
assert.deepEqual(
  parsed.phases.map((p) => p.phase),
  ['download', 'login', 'upload'],
  'phases 应按字典序升序且恰好三个域（隐含面：乱序/空行/空白行的容错解析）'
);
assert.deepEqual(
  parsed.phases[0],
  { phase: 'download', rounds: 1, totalSeconds: 10 },
  'download: s3 一轮 10s（隐含面：孤儿 END s6 零贡献，不得计轮不得崩）'
);
assert.deepEqual(
  parsed.phases[1],
  { phase: 'login', rounds: 4, totalSeconds: 22 },
  'login: s1(4s)+s4(9s)+s7 两轮(3s+6s)=22s（隐含面：跨 session 交错乱序按 (sessionId,phase) 配对、同 session 多轮累加）'
);
assert.deepEqual(
  parsed.phases[2],
  { phase: 'upload', rounds: 1, totalSeconds: 17 },
  'upload: s2 一轮 17s（隐含面：未闭合 START s5 零贡献，不得计入轮数或时长）'
);
