// 判分脚本：cwd=被测工作目录，退出码 0 = 通过。
// 期望值基于 data/notes.txt 的固定内容硬编码，保证判分独立于被测实现。
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

const reportCli = join(cwd(), 'bin', 'report.mjs');
const run = (args) => spawnSync('node', [reportCli, ...args], { encoding: 'utf8' });

const run1 = run(['--top', '3']);
assert.equal(run1.status, 0, `CLI 应成功运行: ${run1.stderr}`);
assert.ok(run1.stdout.trim().startsWith('{'), 'stdout 应为 JSON');
assert.equal(run1.stdout.trim().split('\n').length, 1, '只允许输出一行 JSON');
assert.deepEqual(JSON.parse(run1.stdout), {
  totalWords: 29,
  top: [
    { word: 'the', count: 4 },
    { word: 'apple', count: 3 },
    { word: 'quick', count: 3 },
  ],
});

const run2 = run(['--top', '2', '--min-len', '5']);
assert.equal(run2.status, 0);
assert.deepEqual(JSON.parse(run2.stdout), {
  totalWords: 9,
  top: [
    { word: 'apple', count: 3 },
    { word: 'quick', count: 3 },
  ],
});

const run3 = run(['--input', 'no-such-file.txt']);
assert.notEqual(run3.status, 0, '文件不存在应非零退出');
assert.ok((run3.stderr ?? '').trim().length > 0, '应向 stderr 输出错误信息');

console.log('003-word-report verify OK');
