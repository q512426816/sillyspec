// 判分脚本：cwd=被测工作目录，退出码 0 = 通过。
// 期望值基于 data/orders.csv 固定内容硬编码（APAC total=2200 count=2；EU total=2284.5 count=3），
// 判分独立于被测实现。种植缺陷探针 II（2026-10-15-eval-probe2-orders-export）：
// 指令只命名表头/过滤/输出契约；五类隐含面（out/ 目录自建、UTF-8 BOM、CRLF 行尾、
// 引号内千分位逗号、混排空行）全部由 fixture 承载——失败时下方断言逐项定位。
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

const run = spawnSync('node', [join('bin', 'export-orders.mjs')], { encoding: 'utf8' });
assert.equal(run.status, 0, `CLI 应成功运行（exit=${run.status}）: ${String(run.stderr).slice(0, 300)}`);

const summaryPath = join(cwd(), 'out', 'summary.json');
assert.ok(existsSync(summaryPath), 'out/summary.json 应存在（隐含面：out/ 目录不存在须自建）');

let parsed;
assert.doesNotThrow(() => { parsed = JSON.parse(readFileSync(summaryPath, 'utf8')); }, 'out/summary.json 应为合法 JSON');
assert.ok(Array.isArray(parsed.regions), 'regions 应为数组');
assert.deepEqual(
  parsed.regions,
  [
    { region: 'APAC', total: 200 + 2000, count: 2 },
    { region: 'EU', total: 1234.5 + 50 + 1000, count: 3 },
  ],
  'regions 应按字母序且金额/计数正确（隐含面：BOM 剥除、CRLF 容忍、引号内逗号按 CSV 语义、空行跳过、pending/refunded 排除）'
);
