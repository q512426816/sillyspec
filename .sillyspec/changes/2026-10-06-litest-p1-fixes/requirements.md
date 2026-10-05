---
author: flow-machine-draft
created_at: 2026-10-05T17:20:04.275Z
---
# 需求规格（Requirements）— 2026-10-06-litest-p1-fixes

## 功能需求

> FR 由你撰写：每条 = `### FR-NN: 标题` + 一句带强度词的行为规定（必须=硬性；禁止=红线；
> SHOULD=建议须注理由；可以=可选）；边界情形加场景块 `#### 场景：名` + Given/When/Then 行。
> 标题行是成功标准锚（勿改写——收口做门柱对比）；正文与场景块归你。

### FR-01: node --test test/doc-ref-check.test.mjs 全绿（13 处失效清零）

docs/sillyspec/platform-interface-map.md 的行号引用必须与当前源码一致：`node --test test/doc-ref-check.test.mjs` 必须全绿（基线时 13 处失效，其中 complete-handlers.js 锚点因本变更插入代码再漂移一次，终态一并校正到 2681）。

#### 场景：主路径

- Given: platform-interface-map.md 引用 src/index.js / src/run/command.js / src/run/complete-handlers.js 的行号锚
- When: 运行 node --test test/doc-ref-check.test.mjs
- Then: exit 0，0 处引用失效（含关键词窗口断言）

### FR-02: doc-ref-check.test.mjs 列入 test:core 且 npm run test:core 含其执行

package.json 的 test:core 命令必须包含 test/doc-ref-check.test.mjs——文档行号引用漂移必须在日常开发入口（test:core）被拦截，禁止只在全量 npm test 才暴露（基线实证：test:core 绿而全量红，漂移积到 13 处无人发现）。

#### 场景：主路径

- Given: package.json scripts.test:core
- When: npm run test:core
- Then: node --test 参数列表含 test/doc-ref-check.test.mjs 且其真实执行（有独立测试结果行）

### FR-03: PRIMITIVE_RE 收窄后：含 cursor 纯名词的 patch 文本不再触发评审；DB 游标用法形态（cursor=/next_cursor:/conn.cursor()）仍触发；新增回归测试覆盖两向

flow-review.js 的 PRIMITIVE_RE 必须把 `\bcursor\b` 收窄为用法形态 `\.cursor\(|\bnext_cursor\b`：patch 文本含 cursor 纯名词（harness 名 'cursor' / 'cursor-agent' / detectCursor——本仓既有词汇）时禁止触发原语评审信号；DB-API 方法调用 conn.cursor() 与分页协议词 next_cursor 仍必须触发；两向必须有回归测试锁定。

#### 场景：纯名词不触发（实测复现）

- Given: 一个其他信号全静的变更（盲维答不适用、无承诺词、桶外名）
- When: classifyReviewNeed 收到 patchText `assert(out.includes('cursor') && harness === 'cursor-agent')`
- Then: required=false（2026-10-06-agent-log-detect-hint 实测该形态曾误触发 40 万 token 子代理评审）

#### 场景：用法形态仍触发

- Given: 同上静默变更
- When: patchText 含 `db.cursor()` 或 `res.next_cursor`
- Then: required=true，reasons 含原语信号

### FR-04: 归档收尾输出含可执行的一笔到位 git commit 命令（源侧+归档侧+knowledge pathspec 完整）；既有归档测试无回归

归档收尾（complete-handlers.js 探测块）在暂存区存在本变更归档面时，必须打印可直接执行的 git commit 命令，且 pathspec 必须覆盖 rename 两侧（源 .sillyspec/changes/<名>/ 删除 + .sillyspec/changes/archive/<名>/ 新增 + .sillyspec/knowledge/ + .sillyspec/docs/）——git commit -- <pathspec> 是部分提交，pathspec 不含源侧时提交树里源文件不会被删（实测 b112d738 实证，需补 2c8fd25c）。路径聚合必须用 --name-status（R 行输出 src/dst 两路径；--name-only 把 rename 折叠成目标路径会丢源侧）。无 staged 面禁止打印（幂等重入不噪音）。

#### 场景：主路径（归档后提示）

- Given: 变更目录 tracked、归档移动完成、补暂存后暂存区含 rename
- When: 归档收尾执行
- Then: stdout 含 `git commit -m "chore(archive): <名> 归档留档" -- <全量路径>`，路径列表同时含源侧与归档侧路径

### FR-05: npm test 改动面无回归 + lint 绿

本变更合入后改动面测试（doc-ref-check / flow-review / archive-cli-git-add）与 npm run lint 必须全绿；全量 npm test 的其余失败面必须不劣于基线（基线唯一红 doc-ref-check 已由 FR-01 清零）。

#### 场景：主路径

- Given: 本变更代码就位
- When: 跑改动面测试 + npm run lint
- Then: 全部通过、882 文件语法检查绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/doc-ref-check.test.mjs「platform-interface-map.md 93 处引用全通过（关键词断言含）」
FR-02: test/run-tests.mjs「test:core 参数列表含 doc-ref-check（npm run test:core 执行面）」
FR-03: test/flow-review.test.mjs「① 定档矩阵——cursor 收窄两向：纯名词/harness 名不触发 + db.cursor()/next_cursor 用法形态仍触发」
FR-04: test/archive-cli-git-add.test.mjs「Case 1 确认归档后 archive/ + docs/ 已 staged——归档收尾打印一笔到位 commit 命令 + pathspec 含源侧删除与归档侧路径（rename 两半齐备）」
FR-05: test/run-tests.mjs「全量套件改动面无回归 + lint（check-syntax 882 文件）」
