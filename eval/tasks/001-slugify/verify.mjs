// 判分脚本：以「被测工作目录」为 cwd 运行（node <本文件>，cwd=workdir）。退出码 0 = 通过。
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { pathToFileURL } from 'node:url';

const mod = await import(pathToFileURL(join(cwd(), 'src', 'slugify.mjs')).href);
const slugify = mod.slugify ?? mod.default?.slugify;
assert.equal(typeof slugify, 'function', '应导出具名函数 slugify');
assert.equal(typeof mod.default, 'function', '应提供 default 导出');

assert.equal(slugify(null), '');
assert.equal(slugify(undefined), '');
assert.equal(slugify(''), '');
assert.equal(slugify(42), '42');
assert.equal(slugify('  Hello   World!  '), 'hello-world');
assert.equal(slugify('Foo Bar BAZ'), 'foo-bar-baz');
assert.equal(slugify('a--b'), 'a-b');
assert.equal(slugify('!!!'), '');
assert.equal(slugify('Ünïcode Test'), 'ncode-test');
assert.equal(slugify('tab\tand\nnewline'), 'tab-and-newline');
assert.equal(slugify('-leading and trailing-'), 'leading-and-trailing');
assert.equal(slugify('Hello World', { hyphen: '_' }), 'hello_world');
assert.equal(slugify('a b', { hyphen: '+' }), 'a+b');
assert.throws(() => slugify('a b', { hyphen: '--' }), TypeError);
assert.throws(() => slugify('a b', { hyphen: '' }), TypeError);

console.log('001-slugify verify OK');
