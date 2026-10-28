---
author: flow-machine-draft
created_at: 2026-10-28T06:03:11.596Z
---
# 任务注册表（Tasks）— 2026-10-28-overlap-route

- [x] task-01: loadOwnDeclaredSet 补导出 + src/overlap-detect.js（活跃枚举→反查表→≥2 检出，fail-open 空集），用例：双变更同声明检出/不相交空/单方声明损坏空集——跑绿
- [x] task-02: 归档退出用例（重叠方移入 changes/archive/ 后检出为空）——跑绿
- [x] task-03: sillyspec overlap 动词注册（index.js case + 用法行 + topCommands）：有重叠列清单附分流与落地序列指引、零重叠确认行、恒 exit 0——CLI 用例跑绿
- [x] task-04: flow.js cmdFlowVerifyDrafts 通过分支 advisory 钩子（fail-open 静默）：有相交出路由提示行、无相交输出与基线逐字一致——用例跑绿
- [x] task-05: 既有面回归（verify-drafts 相关测试 + 批准门用例）+ lint 绿
