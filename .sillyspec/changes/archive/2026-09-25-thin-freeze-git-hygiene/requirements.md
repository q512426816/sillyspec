---
author: flow-machine-draft
created_at: 2026-09-25T04:54:34.561Z
---
# 需求规格（Requirements）— 2026-09-25-thin-freeze-git-hygiene

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: --freeze-dirty 显式声明入冻
Given 共享主仓存在本变更的未提交交付文件
When flow done --freeze-dirty
Then 非他侧声明的 dirty 交付文件全归本变更并入冻结面（exclusiveFrom='flag' 标签区分）

### FR-02: 共享主仓 dirty 警告三选一
When flow done 时共享主仓有未提交交付文件且未声明
Then 警告点名三选一（接受缺口 / --freeze-dirty 重跑 / 专属 worktree），简报同步冻结面规则说明

### FR-03: 归档后 git 压扁指引
When flow done 归档完成且 head 不等于 baseline
Then 打印 reset --soft <baseline> 压扁为单提交指引，注明审计真相在 change.patch sha 锚定不依赖历史形态

### FR-04: 测试覆盖
Given 上述三件行为
When 跑 flow 系测试
Then flag 入冻/三选一文案/压扁指引均有断言且全绿
<!--
参考摘录（非约束——agent 可采纳/改写/忽略；每条格式 ### FR-NN: 标题 + Given/When/Then）
FR-01: flow done 新增 --freeze-dirty：显式声明非他侧声明的 dirty 交付文件全归本变更并入冻结面（独占 worktree 自动路径的手动版）
FR-02: 共享主仓 dirty 警告文案改为三选一指引（commit 后重跑 / --freeze-dirty / 专属 worktree）；简报同步软化为冻结面规则说明
FR-03: 归档完成时打印 git 整理指引：head 不等于 baseline 时提示 reset --soft 压扁为单提交，注明审计真相在冻结件不依赖历史形态
FR-04: 新增/更新测试覆盖 flag 入冻与指引输出；flow 系全绿
-->


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑱（late-dirty.py 入冻 + work.js 照常 + 声明标签断言）

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑥b（三选一文案断言）

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol.test.mjs ⑱（Git 历史可自由整理 + reset --soft 断言）

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
test/flow-protocol/flow-review/flow-parity/flow-route/stage-burst 套件 42 例（余 1 为并行会话 flow-draft WIP 连带红）
test/flow-protocol/flow-review/flow-parity/flow-route/stage-burst 42 例（余 1 为并行会话 flow-draft WIP 连带红）
