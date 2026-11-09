---
author: flow-machine-draft
created_at: 2026-11-09T07:30:00.000Z
---
# 需求规格（Requirements）— 2026-11-09-legacy-red-fixes

## 功能需求

### FR-01: knowledge SKILL 恢复 2b1fd2fb^ 版本,3 测试 5 断言绿

- `.claude/skills/sillyspec-knowledge/SKILL.md` 必须恢复到 2026-11-08-project-map(2b1fd2fb) 回退之前的版本——含 accept 命令行、refresh 退役说明、propose `--body-file` 通道、K 形态四段模板四项 2026-11-07 三知识变更写入的内容；恢复后 knowledge-accept-channel T6（2 断言）、knowledge-generated-retire（1 断言）、knowledge-k-shape-minimal（2 断言）必须全绿。

#### 场景：误回退恢复

Given SKILL.md 处于 2b1fd2fb^ 版本，When 跑三个 knowledge 测试，Then SKILL 文案断言全过。

### FR-02: test/.sillyspec 残渣清除+产生源头修复,home-guard 与 relayout 绿

- `test/.sillyspec` 运行残渣目录必须被清除，且产生源头必须修复：backlog-batch-e ③ 的 MCP gate 调用段必须以隔离目录为 cwd（禁止在 test/ 下触发 runtime 目录 mkdir）；spec-dir-home-guard Test 5 前必须对 `test/.sillyspec` 做前置清理防护（防未知源头复发）。修复后 spec-dir-home-guard 与 runtime-relayout 必须在全量顺序跑态下绿（runtime-relayout 此前单跑绿、全量红即为污染形态）。

#### 场景：残渣不再复发

Given 全量套件顺序跑，When 跑完后检查 test/ 目录，Then 无 `.sillyspec` 残渣产生，且 spec-dir-home-guard 与 runtime-relayout 全绿。

### FR-03: platform-interface-map.md 行号锚对齐当前源码,doc-ref-check 绿

- `docs/sillyspec/platform-interface-map.md` 的行号位置锚必须更新到当前源码实际行号：§7 中 isPlatformMode(890→895)、isSelfReferentialSpecRoot(890→839)、triggerPull/triggerPullActiveChange/checkApproval early-return(1217/1068/1144→1254/1282/1353)、raceWithAbort(942→947)、describeSyncError(spec-sync.js:56→120)，并核对 resolveSyncTotalTimeoutMs(936) 实际行；修复后 doc-ref-check 必须绿。

#### 场景：行号锚全对齐

Given 文档行号更新后，When 跑 doc-ref-check，Then 零断言失败。

### FR-04: prompt-golden 金档按现行提示词再生

- stage 提示词金档必须走官方再生成通道（`SILLYSPEC_REGEN_PROMPT_GOLDEN=1`）更新到现行提示词，再生后的 diff 必须随本变更提交入库供评审可见（漂移内容为断点文案演进，属有意修改非意外漂移）；再生后 prompt-golden 必须绿。

#### 场景：金档对齐现行提示词

Given 再生成执行后，When 跑 prompt-golden，Then 哈希比对通过。

### FR-05: thin-user-decision-record 断言对齐现行断点②文案

- 测试断言必须从旧句「等用户确认再跑收口」更新为现行句「等用户选择再跑收口」（文案演进来自 a556e117「轻量变更确认环节改用 AskUserQuestion 工具问询」，属有意演进；「执行断点」关键词与「汇报顺带对账」半句断言保持不变）；修复后 thin-user-decision-record 必须绿。

#### 场景：文案锚对齐

Given 断言更新后，When 跑 thin-user-decision-record，Then 三断言全过。

### FR-06: sillyspec 全量测试绿

- sillyspec 仓全量测试套件必须 0 失败（8 个预存失败全部清偿，且不引入新失败）。

#### 场景：全量回归门

Given 全部修复合入后，When 跑全量套件，Then 退出码 0。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-accept-channel.test.mjs「T6 SKILL 文案」+ test/knowledge-generated-retire.test.mjs + test/knowledge-k-shape-minimal.test.mjs
FR-02: test/spec-dir-home-guard.test.mjs「Test 5 非 home 祖先链正常向上命中」+ test/runtime-relayout.test.mjs
FR-03: test/doc-ref-check.test.mjs「文档引用行号校验」
FR-04: test/prompt-golden.test.mjs「stage 提示词金档哈希比对」
FR-05: test/thin-user-decision-record.test.mjs「② 断点②对账半句」
FR-06: test/run-tests.mjs「全量 0 失败」
