---
author: sillyspec-fr-index
created_at: 2026-11-03T03:57:34.807Z
---

# FR 索引 — knowledge

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/knowledge.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-knowledge-001 提炼要求模板正文字段扩展为「问题、解法、证据（文件/提交）、适用条件与反例」——反例明确写何时不适用或不能推广到的场景，防止条目被当成无条件规则
变更：2026-11-03-distill-entry-quality
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-11-03-distill-entry-quality/requirements.md#FR-01
最近确认：659ab72a84e3fad4bd3f3dc0c9b7ead59d17d409

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-03-distill-entry-quality:flow:测试绑定FR-01
  tests: backend/app/modules/knowledge/tests/test_distill.py「test_build_distill_prompt_spec_dir_propose_guidance（全形态循环新断言块）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-03-distill-entry-quality
  status: active

## FR-knowledge-002 新增编辑实录要求：记录修复或方案取舍的知识条目，以实际落盘的编辑与最终差异为准，不得只写修改意图
变更：2026-11-03-distill-entry-quality
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-11-03-distill-entry-quality/requirements.md#FR-02
最近确认：659ab72a84e3fad4bd3f3dc0c9b7ead59d17d409

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-03-distill-entry-quality:flow:测试绑定FR-02
  tests: backend/app/modules/knowledge/tests/test_distill.py「test_build_distill_prompt_spec_dir_propose_guidance（全形态循环新断言块）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-03-distill-entry-quality
  status: active

## FR-knowledge-003 新增断言实证纪律：每条断言须有会话事实支撑（文件/提交/命令输出/原话），超出实证的「支持/自动/无需」类承诺必须收窄表述或补证据，禁止推测性断言
变更：2026-11-03-distill-entry-quality
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-11-03-distill-entry-quality/requirements.md#FR-03
最近确认：659ab72a84e3fad4bd3f3dc0c9b7ead59d17d409

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-03-distill-entry-quality:flow:测试绑定FR-03
  tests: backend/app/modules/knowledge/tests/test_distill.py「test_build_distill_prompt_spec_dir_propose_guidance（全形态循环新断言块）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-03-distill-entry-quality
  status: active

## FR-knowledge-004 test_distill.py 对上述三段新文样做全形态断言（session/resume/change/quick/legacy 五形态），既有用例零回归
变更：2026-11-03-distill-entry-quality
状态：active
摘要：主路径
全文：.sillyspec/changes/archive/2026-11-03-distill-entry-quality/requirements.md#FR-04
最近确认：659ab72a84e3fad4bd3f3dc0c9b7ead59d17d409

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-11-03-distill-entry-quality:flow:测试绑定FR-04
  tests: backend/app/modules/knowledge/tests/test_distill.py「test_build_distill_prompt_spec_dir_propose_guidance（先红后绿对账）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-11-03-distill-entry-quality
  status: active
