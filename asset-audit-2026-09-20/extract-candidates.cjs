#!/usr/bin/env node
// 从平台仓 quicklog 提取「事故候选」：根因段含实证/坑/假红/误拦等信号的条目，
// 作为 troubleshooting.md 冷启动的分诊 backlog。只读，输出 CSV。
// 口径：mentions_test = 条目块内出现 test/spec/pytest 字样（事故是否钉了测试的弱指示器）。
'use strict';
const fs = require('fs');
const path = require('path');
const OUT = __dirname;
const DIR = 'C:/Users/qinyi/IdeaProjects/multi-agent-platform/.sillyspec/quicklog';

const MARKER = /实证|踩坑|两坑|三坑|四坑|五坑|假红|假败|误拦|误报|误伤|事故|意外|教训|摩擦|坑位|翻车|卡死|挂死/;
const csvEscape = (s) => `"${String(s == null ? '' : s).replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

const files = fs.readdirSync(DIR).filter((f) => /^QUICKLOG-.*\.md$/.test(f)).sort();
const rows = []; let total = 0;
for (const f of files) {
  const text = fs.readFileSync(path.join(DIR, f), 'utf8');
  const blocks = text.split(/^(?=## ql-)/m);
  for (const b of blocks) {
    const h = b.match(/^## (ql-[A-Za-z0-9-]+) \| ([^|]+) \| ([^\r\n]*)/);
    if (!h) continue;
    total++;
    const rootCause = ((b.match(/^根因[:：]\s*(.+)$/m) || [])[1] || '').trim();
    if (!MARKER.test(rootCause) && !MARKER.test(h[3])) continue;
    const mentionsTest = /test|spec|pytest/i.test(b);
    rows.push([h[1], h[2].trim(), h[3].trim().slice(0, 90), rootCause.slice(0, 160), String(mentionsTest)]);
  }
}
rows.sort((a, b) => (a[1] < b[1] ? 1 : -1)); // 新的在前，分诊从最近的开始
fs.writeFileSync(
  path.join(OUT, 'platform-troubleshooting-candidates.csv'),
  '\ufeff' + [['ql_id', 'timestamp', 'title', 'root_cause_excerpt', 'mentions_test'], ...rows].map((r) => r.map(csvEscape).join(',')).join('\r\n'),
  'utf8'
);
const withTest = rows.filter((r) => r[4] === 'true').length;
console.log(`平台 quicklog 总条目 ${total}，命中事故信号 ${rows.length} 条（其中带 test 字样 ${withTest} 条，链接率 ${(rows.length ? ((withTest / rows.length) * 100).toFixed(0) : 0)}%）`);
console.log('输出: platform-troubleshooting-candidates.csv（按时间倒序，分诊从最近的做起）');
