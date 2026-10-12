---
author: flow-machine-draft
created_at: 2026-10-12T13:57:12.182Z
---
# 决策记录（Decisions）— 2026-10-12-cli-friction-signal

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：标记的 workspace 是绝对路径快照，工作区移动/换机后过期。缓解：指路行与通用三出路并存（非替换）、registeredAt 留时点可判新旧；doctor 未来可加标记体检（本变更不做——YAGNI）。 试过但放弃：① uninit 门直接扫盘搜所有工作区的 local.yaml repos 反查——跨目录全盘扫描成本高且无索引，标记方案把索引放到被指物一侧，O(1) 读取；② 把标记写进工作树并建议 gitignore——污染目标仓工作树（用户仓不该被工具塞未跟踪文件），.git/ 内零污染是硬约束；③ deps 阻断自动执行 doctor --fix——门不应有副作用自愈（掩盖环境问题），只指路不代跑。
