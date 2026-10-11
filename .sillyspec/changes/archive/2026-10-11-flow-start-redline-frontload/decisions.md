---
author: flow-machine-draft
created_at: 2026-10-11T15:47:48.965Z
---
# 决策记录（Decisions）— 2026-10-11-flow-start-redline-frontload

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=横幅膨胀稀释注意力（现约 60 行，红线块若展开成段会更没人读）——用 3 行编号红线并同步压缩下方重复表述对冲（实测渲染行净 +2，已在增量可控范围；评审 P3 核正初稿「净行数不增」的误记）。死路：曾考虑让 `expandTaskShorthand`（sentinel-assertions.js）直接支持「task-01..task-05」区间展开——放弃：那是放宽反假完成收口门的判据语义，属门设计变更；用户实证报错清楚改起来快，痛点在知晓时点不在判据本身，前置告知即可不动门。
