// 判分脚本：cwd=被测工作目录，退出码 0 = 通过。
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';

const mod = await import(pathToFileURL(join(cwd(), 'src', 'dates.mjs')).href);
const eachDay = mod.eachDay ?? mod.default?.eachDay;
assert.equal(typeof eachDay, 'function', '应导出具名函数 eachDay');

assert.deepEqual(
  eachDay('2024-02-27', '2024-03-02'),
  ['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02'],
);
assert.deepEqual(
  eachDay('2024-12-30', '2025-01-02'),
  ['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02'],
);
assert.deepEqual(eachDay('2024-01-15', '2024-01-15'), ['2024-01-15']);
assert.deepEqual(
  eachDay('2024-01-01T10:00:00Z', '2024-01-03T23:00:00Z'),
  ['2024-01-01', '2024-01-02', '2024-01-03'],
);
// 2100 是「逢百年不闰」的非闰年
assert.deepEqual(eachDay('2100-02-28', '2100-03-01'), ['2100-02-28', '2100-03-01']);
assert.throws(() => eachDay('2024-03-01', '2024-02-28'), RangeError);
assert.throws(() => eachDay('2024-02-30', '2024-03-01'), TypeError);
assert.throws(() => eachDay('2024-1-1', '2024-01-02'), TypeError);
assert.throws(() => eachDay(null, '2024-01-02'), TypeError);

console.log('002-each-day verify OK');
