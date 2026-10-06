// 2026-10-06-datetime-timeago 回归：datetime.timeAgo 人读相对时间（档位与 stage-machine._timeAgo
// 现状逐字一致）+ stage-machine 委托后行为不变（含解析失败回退）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { timeAgo, toWallClock } from '../src/datetime.js';
import { StageMachine } from '../src/progress/stage-machine.js';

const NOW = new Date(2026, 9, 6, 12, 0, 0); // 注入「当前时刻」（本地时区，跨时区机器同样确定）
const ago = (ms) => timeAgo(new Date(NOW.getTime() - ms), NOW);

test('timeAgo 档位形状与 stage-machine 现状逐字一致', () => {
  assert.equal(ago(0), '刚刚');
  assert.equal(ago(59 * 1000), '刚刚');                       // 差值不足 1 分钟
  assert.equal(ago(-5 * 60 * 1000), '刚刚');                  // 未来时间（负差）
  assert.equal(ago(30 * 60 * 1000), '30 分钟前');
  assert.equal(ago(59 * 60 * 1000 + 59 * 1000), '59 分钟前'); // floor：59 分 59 秒不进位
  assert.equal(ago(60 * 60 * 1000), '1 小时前');
  assert.equal(ago(23 * 3600 * 1000 + 59 * 60 * 1000), '23 小时前');
  assert.equal(ago(24 * 3600 * 1000), '1 天前');
  assert.equal(ago(3 * 24 * 3600 * 1000), '3 天前');
});

test('三类输入面（Date / epoch 毫秒 / 时间字符串）与注入时钟', () => {
  const past = new Date(NOW.getTime() - 5 * 60 * 1000);
  assert.equal(timeAgo(past, NOW), '5 分钟前');                 // Date 实例
  assert.equal(timeAgo(past.getTime(), NOW.getTime()), '5 分钟前'); // epoch 毫秒（input 与 now 均可）
  assert.equal(timeAgo(past.toISOString(), NOW), '5 分钟前');   // 时间字符串（解析面归语言规范，钉 ISO 一形即可）
});

test('无效输入抛 TypeError 且 message 含输入字符串形式', () => {
  for (const bad of [null, undefined, {}, true, 'not-a-date', NaN, Infinity]) {
    assert.throws(
      () => timeAgo(bad, NOW),
      (e) => e instanceof TypeError && e.message.includes(String(bad)),
      `输入 ${String(bad)} 应抛含输入串的 TypeError`,
    );
  }
  // 非法 now 同样抛 TypeError（契约面：Date 或 epoch 毫秒）
  assert.throws(() => timeAgo(new Date(), 'x'), TypeError);
  assert.throws(() => timeAgo(new Date(), NaN), TypeError);
});

test('stage-machine._timeAgo 委托 datetime.timeAgo 且解析失败回退原串', () => {
  const sm = new StageMachine(null);
  // 真实时钟相对量（90 分钟前 → 1 小时前），不依赖绝对日期
  assert.equal(sm._timeAgo(new Date(Date.now() - 30 * 60 * 1000).toISOString()), '30 分钟前');
  assert.equal(sm._timeAgo(new Date(Date.now() - 90 * 60 * 1000).toISOString()), '1 小时前');
  // zh-CN 本地旧格式（_parseFlexibleTs 回退面，非 padded 形状）仍可算档位
  const past = new Date(Date.now() - 90 * 60 * 1000);
  const legacy = `${past.getFullYear()}/${past.getMonth() + 1}/${past.getDate()} ${past.getHours()}:${String(past.getMinutes()).padStart(2, '0')}`;
  assert.equal(sm._timeAgo(legacy), '1 小时前');
  // 解析失败回退：乱串原样返回；空输入 → 未知
  assert.equal(sm._timeAgo('not-a-date'), 'not-a-date');
  assert.equal(sm._timeAgo(''), '未知');
  assert.equal(sm._timeAgo(undefined), '未知');
});

test('toWallClock 既有行为不受 coerceClock 内部重构影响', () => {
  const d = new Date(2026, 9, 6, 8, 5, 9);
  assert.equal(toWallClock(d), '2026-10-06 08:05:09');
  assert.equal(toWallClock(d.getTime()), '2026-10-06 08:05:09');
  assert.throws(() => toWallClock('not-a-date'), (e) => e instanceof TypeError && e.message.includes('not-a-date'));
});
