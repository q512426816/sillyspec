---
author: flow-machine-draft
created_at: 2026-09-25T09:24:23.412Z
---
# 需求规格（Requirements）— 2026-09-25-agents-lightweight-sync

## 功能需求（agent 填写——每条 FR 格式 ### FR-NN: 标题 + Given/When/Then；FR 进知识索引，写清行为语义）

<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->
### FR-01: 第 3 条附注改为轻量变更默认快道口径
Given 本仓 AGENTS.md 第 3 条附注仍称 `flow start/done` 薄协议为实验通道（local.yaml `flow.mode: thin` 显式开启）、不作默认
When 按模板 templates/agents-instruction.md 规则 5 口径同步该附注
Then 附注不再含「实验通道」「不作默认」表述，改述为轻量变更默认快道（`flow.mode` 缺省即 thin，显式 `mode: legacy` 回旧道），并补轻量→完整转道门（`--upgrade-thick` 用户同意门 + 实测失败自动升厚）——与 src/flow.js readFlowConfig 缺省值行为一致

### FR-02: 选道与倒推 B 模式改指轻量变更
Given 第 4/6/7 条把小修复、选道判据、倒推 B 收尾指向退役中的 quick 道
When 同步模板规则 3/8/9 口径
Then 第 4 条小修复走 `flow start --input` → `flow done` 两调用；第 6 条选道按流程形态判（明确→轻量 / 不明→brainstorm 预段 / Wave 编排→完整流程）；第 7 条倒推 B 用轻量变更收尾；三处 quick 均标注存量过渡通道（退役中，新工作不再用）

### FR-03: quicklog 落盘条目补存量通道括注
Given 第 15 条 quicklog 结构化落盘规则未标注通道定位
When 补存量通道括注
Then 明确「存量通道——新工作不再产生 quicklog 条目，轻量变更以变更级归档取代；仅收尾存量 quick 会话时适用」

### FR-04: 其余条目零改动
Given AGENTS.md 其余条目（头注释与第 1-2、5、8-14、16-19 条，含本仓专属 git 纪律与会话身份条目）与本口径同步无关
When 修正仅限第 3/4/6/7/15 条
Then 其余条目逐字不动，以 `git diff -- AGENTS.md` 变更范围核对为证


## 测试绑定（每条 FR 至少一行——test 文件路径或用例名；不适用要写理由；flow done 空槽拒收）

<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：纯指引文档口径同步，无代码行为面；口径所引行为（flow.mode 缺省 thin）由既有 src/flow.js readFlowConfig 实现及其测试覆盖，本变更零代码改动。

<!--AGENT:测试绑定FR-02 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：纯指引文档口径同步，无代码行为面；所引接口（flow start --input / flow done / --upgrade-thick）均为现存实现（src/flow.js、src/run/command.js），本变更零代码改动。

<!--AGENT:测试绑定FR-03 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：一行括注补定位说明，无行为面。

<!--AGENT:测试绑定FR-04 哪个测试文件/用例覆盖这条 FR（无测试面写「不适用：理由」）——例外裁决书写面（机器段之外合法） -->
不适用：以 git diff -- AGENTS.md 变更范围人工核对（仅第 3/4/6/7/15 条段落变更）为证，无自动化测试面。
