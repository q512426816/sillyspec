---
author: flow-machine-draft
created_at: 2026-09-27T13:09:56.352Z
---
# 需求规格（Requirements）— 2026-09-27-thin-module-scope-persist

## 功能需求（GWT 骨架已机器预填——可编辑覆盖；FR 进知识索引）

<!--AGENT:FR区 agent 填写功能需求（GWT 骨架已预填——覆盖/修改/保留均可） -->
### FR-05: buildFrozenPatch 的 diff 采集失败必须判采集失败（fail-closed），不得落 patchStatus ok 的伪完整 patch（评审 P1 清偿）
Given 冻结 patch 生成时 `git diff <baseRef>` 执行失败（如 core.bare 误写、git 环境异常）
When buildFrozenPatch 被调用
Then 返回 null（调用方 patchStatus=failed 留痕），patch 正文不得只含 untracked 自拼 hunk 而缺全部 tracked 改动

### FR-01: flow done 时模块对账结果以结构化数据落盘进 change-patch.json（受影响模块
Given 系统就绪
When flow done 时模块对账结果以结构化数据落盘进 change-patch.json（受影响模块 id/命中文件数/文档相对路径/文档是否随变更更新，及未登
Then 行为符合本条标准描述

### FR-02: 落盘口径与 console 对账输出口径一致（同一次计算结果，非二次推导）
Given 系统就绪
When 落盘口径与 console 对账输出口径一致（同一次计算结果，非二次推导）
Then 行为符合本条标准描述

### FR-03: 无模块图或零命中时向后兼容：不写段或写空数组，不报错不阻断收口
Given 系统就绪
When 无模块图或零命中时向后兼容：不写段或写空数组，不报错不阻断收口
Then 行为符合本条标准描述

### FR-04: 有测试锁定结构化落盘行为与向后兼容行为
Given 测试 相关模块就绪
When 有测试锁定结构化落盘行为与向后兼容行为
Then 行为符合本条标准描述

## 测试绑定（每条 FR 至少一行——空槽将在 flow done 时自动从测试结果补全）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ④ 集成：flow done 后归档件 change-patch.json 落盘模块对账三键（console 与落盘同源）；① 结构化返回：modules: 包层命中 + docTouched 仓根相对判定 + 与 console 行同源

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ①（lines 与 modules 同一 rec 断言）+ ④（flow done stdout 对账行与 change-patch.json 三键同源断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ② 无模块图 / 零命中向后兼容：空数组形态，不抛错；③ 子项目前缀 + doc 缺失标记

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs 全部 5 用例（①②③④⑤，node --test 定向跑 5/5 绿；回归 flow-protocol 22/22 + flow-route/review/draft 16/16 + scope-audit 41/41）

<!--AGENT:测试绑定FR-05 哪个测试文件/用例覆盖这条 FR（项目相对全路径＋用例名；空槽将在 flow done 自动从测试结果补全——预填可加速）——例外裁决书写面（机器段之外合法） -->
test/flow-parity.test.mjs ⑤ buildFrozenPatch fail-closed：diff 采集失败返回 null，不落伪 patch（评审 P1 清偿）+ test/scope-audit.test.mjs 回归 41/41
