#!/usr/bin/env node
// 参考解（eval dry-run 参考与判别力测试用；不进 agent 工作副本、不进任务指纹）。
// 覆盖全部隐含面：剥 UTF-8 BOM；容忍 CRLF 行尾；跳过空行；CSV 引号语义（引号内逗号非
// 分隔符，引号内金额剥千分位逗号）；输出前自建 out/ 目录。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** 引号感知的单行 CSV 切分（覆盖本任务数据形态：引号包裹含逗号字段）。 */
function splitCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else { cur += ch; }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(cur); cur = '';
    } else { cur += ch; }
  }
  fields.push(cur);
  return fields;
}

const raw = readFileSync('data/orders.csv', 'utf8').replace(/^\uFEFF/, ''); // 剥 BOM
const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== ''); // CRLF 容忍 + 空行跳过
const header = splitCsvLine(lines[0]);
const col = (name) => header.indexOf(name);
const iRegion = col('region');
const iAmount = col('amount');
const iStatus = col('status');

const agg = new Map(); // region -> { total, count }
for (const line of lines.slice(1)) {
  const f = splitCsvLine(line);
  const status = (f[iStatus] ?? '').trim();
  if (status !== 'paid') continue;
  const region = (f[iRegion] ?? '').trim();
  const amount = Number.parseFloat((f[iAmount] ?? '').replace(/,/g, '')); // 引号内千分位剥除
  if (!Number.isFinite(amount)) continue;
  const a = agg.get(region) ?? { total: 0, count: 0 };
  a.total += amount;
  a.count += 1;
  agg.set(region, a);
}

const regions = [...agg.entries()]
  .map(([region, a]) => ({ region, total: Math.round(a.total * 100) / 100, count: a.count }))
  .sort((x, y) => (x.region < y.region ? -1 : x.region > y.region ? 1 : 0));

const outPath = join('out', 'summary.json');
mkdirSync(dirname(outPath), { recursive: true }); // 隐含面：目录不存在须自建
writeFileSync(outPath, JSON.stringify({ regions }) + '\n');
