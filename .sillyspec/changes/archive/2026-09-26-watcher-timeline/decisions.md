---
author: flow-machine-draft
created_at: 2026-09-26T07:28:01.019Z
---
# 决策记录（Decisions）— 2026-09-26-watcher-timeline

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=推断面的诚实性：勾选时刻是顺序推断（事件不记 id）、描述行继承机器稿 60 字截断、提交锚依赖仓内 hash 可达（合并重定基后失联降级只显 hash）。对策是显式标注：表头「≈」+ 尾注列数据源与盲区（观测起点≠诞生时刻、单飞锁盲窗）——宁可标注粗糙也不冒充精确。放弃的方案：①改 watcher 事件流带 checkedTasks id 明细——改写入面格式是侵入性变更，且历史流已定格无法回填，收益仅推断精度；②从 DB progress 库取阶段时间——thin 变更状态不落 DB（红线），无数据可取；③agent 干活时自述留痕——协议负担，违背 thin 立身之本（那是完整流程 --output 的能力面）。
