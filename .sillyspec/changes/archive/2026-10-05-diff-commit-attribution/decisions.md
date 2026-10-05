---
author: flow-machine-draft
created_at: 2026-10-05T04:50:40.754Z
---
# 决策记录（Decisions）— 2026-10-05-diff-commit-attribution

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：提交 message 未携带变更名后缀的裸提交会污染归属（用户手提交 `fix: typo` 触碰过他侧文件 → 该文件判 unknown → 保留 own → 漏剔）——fail-closed 方向（多冻不错杀），与现状等价不劣化；文档化于 FR-02。放弃的方案：①扫 archive/ 下变更的声明清单参与 foreignMap——历史变更清单永久抢文件，恰是否决决策 sentinel-evidence-freeze⑤ 防的形态，且 7 天陈旧规则对已归档目录语义混乱；②按提交作者 email 归属——多会话共用同一 git 身份（本仓两实测会话同 user），作者维度无区分度；③改 flow.js 调用点显式传 baseline——该文件并行会话在途，整文件提交会夹带他侧未提交改动（规则 11），故全部改为函数内自取。
