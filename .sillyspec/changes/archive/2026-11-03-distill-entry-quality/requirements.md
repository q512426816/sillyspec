---
author: flow-machine-draft
created_at: 2026-11-03T03:33:12.062Z
---
# 需求规格（Requirements）— 2026-11-03-distill-entry-quality

## 功能需求

### FR-01: 提炼要求模板正文字段扩展为「问题、解法、证据（文件/提交）、适用条件与反例」——反例明确写何时不适用或不能推广到的场景，防止条目被当成无条件规则

- 必须：`build_distill_prompt` 全形态（session/resume/change/quick × spec_dir 有无）的提炼要求第 2 条，字段清单由「问题、解法、证据（文件/提交）、适用条件」扩展为「…适用条件与反例」，并附反例释义句（适用条件写何时适用；反例写何时不适用或不能推广到的场景，防止被当成无条件规则）。

#### 场景：主路径

- Given 任一 source_type 与 spec_dir 组合（含 legacy 无 spec_dir 形态）
- When 调用 `build_distill_prompt`
- Then 返回文含「适用条件与反例」字段清单与反例释义句（五形态一致，无按形态分叉）

### FR-02: 新增编辑实录要求：记录修复或方案取舍的知识条目，以实际落盘的编辑与最终差异为准，不得只写修改意图

- 必须：提炼要求第 2 条尾部并入编辑实录句——记录修复或方案取舍时以实际落盘的编辑与最终差异为准，不得只写修改意图（与 FR-01 同句，同属条目正文写法面）。

#### 场景：主路径

- Given 全形态同 FR-01
- When 调用 `build_distill_prompt`
- Then 返回文含「以实际落盘的编辑与最终差异为准」「不得只写修改意图」

### FR-03: 新增断言实证纪律：每条断言须有会话事实支撑（文件/提交/命令输出/原话），超出实证的「支持/自动/无需」类承诺必须收窄表述或补证据，禁止推测性断言

- 必须：提炼要求新增断言实证纪律条目（编号 3，原查重条目顺延为 4）——每条断言须有会话事实支撑（文件路径、提交、命令输出或用户原话）；「支持/自动/无需」类承诺超出实证范围时收窄表述或补证据；禁止推测性断言。

#### 场景：主路径

- Given 全形态同 FR-01
- When 调用 `build_distill_prompt`
- Then 返回文含「会话事实支撑」「推测性断言」，且查重指引仍完整存在（顺延编号不丢内容）

### FR-04: test_distill.py 对上述三段新文样做全形态断言（session/resume/change/quick/legacy 五形态），既有用例零回归

- 必须：`test_build_distill_prompt_spec_dir_propose_guidance` 的五形态循环（fresh_session/resume_session/change/quick/legacy）新增三段新文样断言块；test_distill.py 全绿，既有用例零回归。并行变更 `2026-11-03-knowledge-search-async-refresh` 的 WIP 面（router.py）与本变更 diff（distill.py/test_distill.py）无交集，其存量错误按仓规则归属判别留痕、不计入本变更回归面。

#### 场景：主路径

- Given 断言先行落地（旧文样下先红）
- When 修改 distill.py 文样后重跑
- Then 新断言全绿且既有用例不回归

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: backend/app/modules/knowledge/tests/test_distill.py「test_build_distill_prompt_spec_dir_propose_guidance（全形态循环新断言块）」
FR-02: backend/app/modules/knowledge/tests/test_distill.py「test_build_distill_prompt_spec_dir_propose_guidance（全形态循环新断言块）」
FR-03: backend/app/modules/knowledge/tests/test_distill.py「test_build_distill_prompt_spec_dir_propose_guidance（全形态循环新断言块）」
FR-04: backend/app/modules/knowledge/tests/test_distill.py「test_build_distill_prompt_spec_dir_propose_guidance（先红后绿对账）」
