---
author: flow-machine-draft
created_at: 2026-10-13T04:17:08.520Z
---
# 决策记录（Decisions）— 2026-10-13-h2-repo-heading-parse

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：节扫描穿过段头后误延「文件变更清单」节边界——非段头的 ## 章节标题（如「## 接口契约」）仍必须截断。缓解：截断判定=^## 且不匹配 REPO_SECTION_HEADER_RE（精确形态：编号前缀+key+仓变更+括号备注+冒号可缺），普通标题形如「<词> 仓变更」的误写由 plan-postcheck 既有 LOOSE_RE 点名（不在本变更面）；测试钉死「非段头 ## 截断」回归。次风险：h3 段头（### <key> 仓变更）现在有 RE 命中与 detectRepoFromSubsection token 命中两条等价路径——实现上段头分支前置统一处理，### 分支保持原样，两路径不叠加执行。试过放弃的方案：①改四处文案弃段头形态（推荐 ### 子段/cross-repo: 两种）——与生态既定约定（厚道模板/覆盖对账/docs-check 三处解析器）制造第二套约定，agent 在厚薄两道间会拿到互相矛盾的指引；②在 flow.js 收口侧做段头归一化预处理——对账口径分散两处，plan-postcheck/design-facts 不受益。均否。
