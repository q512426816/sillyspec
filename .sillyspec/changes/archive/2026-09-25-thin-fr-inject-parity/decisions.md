---
author: flow-machine-draft
created_at: 2026-09-25T10:02:16.472Z
---
# 决策记录（Decisions）— 2026-09-25-thin-fr-inject-parity

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：风险：--input 路径提取是启发式（可能误提取 URL 片段）——只作域路由输入，无模块前缀匹配即空域+一行诚实提示，无误伤面；bigram 0.6 阈值沿用 brainstorm 侧已校准判据（误报/漏报基线与厚道一致而非新造）。死路①：fresh 全量注入所有域 FR——信息量爆炸稀释注意力，弃；按域路由+空态提示是正确力度。死路②：把注入做成硬门（无命中阻断 start）——违反 2 调用协议精神，注入是读取面增强非门，弃。死路③：rot/dup 判定复制 quick-done/stage-contract 代码——复制即漂移（本次修的正是漂移病），全部 import 复用，弃。
