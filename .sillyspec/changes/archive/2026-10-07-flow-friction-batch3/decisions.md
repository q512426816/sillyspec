---
author: flow-machine-draft
created_at: 2026-10-06T16:31:11.110Z
---
# 决策记录（Decisions）— 2026-10-07-flow-friction-batch3

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：②的建议可能「答非所问」——basename 全等命中只覆盖「缺目录前缀/移动了位置」这类幻觉（postmortem 实证主力形态），对完全虚构的文件名无效（此时无建议段，回到现状）；BFS 8000 上限在大仓深目录下可能截断扫描漏掉真候选——建议是锦上添花，截断只意味着少一条提示不误报。第二个风险：④把「批量跳过」合法化可能被滥用为「一键清债不思考」——reason 是必填审计面的弱化（可选参数）；缓解：CLI 输出明示「reason 是审计面请确认真实」+ verify 门只认文件不认命令，agent 仍可手写。试过但放弃：a) 把 stage-review 检查并进默认档 error 语义——那会让 gate 默认档 FAIL 而 --done 才是执法点，两道门抢执法权造成新分裂（informational 是唯一不破口径的位置）；b) suggestClosePaths 用模糊匹配（编辑距离/前缀）——误建议比无建议更害（agent 照抄错路径再撞一轮门），basename 全等是零误报下限；c) visual-evidence 在 execute 收口硬拦——执法点在 verify 是分级门设计（ui_visual_gate 配置），execute 只该提醒不该抢。
