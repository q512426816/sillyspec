#!/usr/bin/env node
// 参考解（dry-run 假 agent 使用，也供人工对照）。
import { readFileSync } from 'node:fs';

function parseArgs(argv) {
  const out = { input: 'data/notes.txt', top: 5, minLen: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input') out.input = argv[++i];
    else if (a === '--top') out.top = Number(argv[++i]);
    else if (a === '--min-len') out.minLen = Number(argv[++i]);
  }
  return out;
}

const { input, top, minLen } = parseArgs(process.argv.slice(2));
let text;
try {
  text = readFileSync(input, 'utf8');
} catch (err) {
  console.error(`无法读取输入文件: ${input}（${err.code ?? err.message}）`);
  process.exit(1);
}

const counts = new Map();
for (const word of text.toLowerCase().split(/\s+/)) {
  if (!word || word.length < minLen) continue;
  counts.set(word, (counts.get(word) ?? 0) + 1);
}
const totalWords = [...counts.values()].reduce((a, b) => a + b, 0);
const topWords = [...counts.entries()]
  .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  .slice(0, top)
  .map(([word, count]) => ({ word, count }));

process.stdout.write(`${JSON.stringify({ totalWords, top: topWords })}\n`);
