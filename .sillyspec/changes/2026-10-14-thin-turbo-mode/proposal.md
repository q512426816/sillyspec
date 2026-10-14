---
author: qinyi
created_at: 2026-10-14 08:27:24
generated_by: sillyspec-fourpiece-init
---
# 提案书（Proposal）

## 动机
轻量变更（薄道）很多时候只需要 spec 文档和写代码，但 flow done 收口仍强制跑 test+lint 实测（大仓 15-20 分钟）与一串仪式门（hunk 归属/dirty 冻结/ui 探针/评审），验证仪式对「明确定义的小改动」是纯税，拖慢交付节奏。用户希望通过提示词驱动 agent 触发一个极速模式：按次显式触发，只保留 spec 面与证据面，跳过验证仪式。

## 关键问题
1. **纯提示词跳不过 CLI 硬门**：flow done 的校验是代码内硬门，提示词面必须有 CLI 侧承载（flag+留痕），两层缺一不可（D-003）。
2. **现有逃生门覆盖不足**：env `SILLYSPEC_QUICK_TEST_GATE=skip`（src/run/quick-audit.js:482）只整门跳 test+lint，hunk/dirty/review/ui 探针照跑且 env 不持久、审计弱（D-005 rejected-B）。
3. **实证核验不能默认失效**：仓级配置常开极速等于默认裸奔；触发权必须收在「用户显式触发」边界内（D-001/D-005 rejected-C）。

## 变更范围
薄道两端 + 提示词面三处：`flow start --turbo` 留痕、`flow done` 读态按跳过面早退（逐项 skipped 留痕）、AGENTS.md 选道表极速行 + flow 命令卡文档 + 预段极速形态约定（轻量跑+单轮问询+一次收口）。附零回归三态测试。

## 不在范围内（显式清单）
- 完整五阶段厚道（run <stage> 全族）不做极速版（D-004）
- 头脑风暴阶段机状态/步数不做 CLI 改动（预段极速纯提示词约定）
- 必留面（spec 结构校验/tasks 全勾/ledger/patch 冻结/distill/archive）语义不做任何放松（D-002/D-006）
- 不做 agent 自主判断触发（D-001）

## 成功标准（可验证）
- `flow start --turbo` 后 flow-state.yaml 出现 turbo 留痕字段，start 输出极速指引；不带 flag 时 start 输出与改动前逐字一致
- turbo 变更 `flow done`：test+lint 实测早退 skip（理由带用户触发留痕）、hunk/dirty 降 advisory、ui 探针跳过、评审强制豁免——逐项在收口输出可见；spec 结构校验/tasks 全勾/ledger/patch 冻结/distill/archive 照常执行且语义不变
- 收口 gateSummary 带「极速模式」标注与 skipped 明细（审计可追溯：谁/何时/跳过面）
- 厚道 `run <stage>` 全族代码路径零改动（grep 可证）
- 新增测试覆盖三态：无 flag 缺省零回归（逐字一致断言）/turbo 跳过面生效/turbo 必留面照常
