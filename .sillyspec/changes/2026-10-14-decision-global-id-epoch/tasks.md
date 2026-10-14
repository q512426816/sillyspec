---
author: flow-machine-draft
created_at: 2026-10-14T14:25:56.250Z
---
# 任务注册表（Tasks）— 2026-10-14-decision-global-id-epoch

- [x] task-01: 蒸馏写面发号——decision-distill 发号步（域前缀全域 max+1 只增不复用）、原编号字段渲染与读入（变更后/锚点前）、匹配谓词扩展（号或原编号）、多域扇出单一身份、跨文件清理同谓词；验证：test/decision-global-id-epoch.test.mjs「①」「②」绿
- [x] task-02: 读面双形态 + 向量契约——knowledge-match/knowledge-graph（supersedes 经原编号）/docs-check/doctor 四处双形态正则；knowledge-vector anchor 契约注记；验证：「④」「⑤」绿 + 真实库读侧演练（700 legacy 双形态解析计数不变）+ 受影响既有测试面全绿
- [x] task-03: 存量零触碰演练 + 回归收尾——真实库副本蒸馏样例新条目后 legacy 节段逐字节不变（「③」）；全量 npm test 零失败 + npm run lint 零 hard fail；模块卡 changelog 增量
