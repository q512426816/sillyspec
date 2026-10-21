---
author: flow-machine-draft
created_at: 2026-10-21T17:20:58.947Z
---
# 决策记录（Decisions）— 2026-10-21-known-failures-unescape

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 锚点：a/.b
- 答案：最大风险：存量 local.yaml 中已手写「未转义反斜杠」的双引号条目（如手工直编辑出 "a\.b$"——严格 YAML 下 \. 非法，js-yaml 会抛错拒改，本就到不了读侧；宽松形态按未知转义回落字面，\. 不变、\. 回落为 .——语义与修复前对该形态的读法（原样保留 \.）不同。缓解：该形态在 YAML 严格语义下本不合法，js-yaml 门（list/apply 已有）先拦；豁免失配的后果方向是保守（多跑一轮）不是假绿）。次风险：三读侧 import 新模块的加载顺序/循环——叶子模块零 import，无环。 试过放弃的方案：①改写侧不转义（裸写反斜杠）——产出非法 YAML，js-yaml 门必拒，自毁;②读侧整体换 js-yaml 解析该段——三处读侧刻意轻量化不引重链（config-known-failures 注释自述），且整段重解析会动既有「断链容忍/注释容忍」行为面，超本次对称性修复；③只在 verify-postcheck 修——docs-check 与 CLI 侧同病不同修，三口径继续漂移。
