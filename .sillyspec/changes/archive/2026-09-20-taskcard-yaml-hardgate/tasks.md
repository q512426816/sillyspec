---
author: qinyi
created_at: 2026-09-20 22:20:00 +08:00
---
# 任务注册表（Tasks）— 2026-09-20-taskcard-yaml-hardgate

- [x] task-01: 新增 src/taskcard-frontmatter.js——splitFrontmatter + parseTaskFrontmatter（frontmatter 界定 CRLF 容错；js-yaml mark 换算文件 1 基行:列；除 js-yaml 零依赖防环）
- [x] task-02: plan 侧——parseTaskContracts 归一共享源 + yamlError 显式降级键；validatePlanFeasibility 步骤 0b frontmatter 合法性硬校验（坏卡 ERROR 带 文件:行:列，紧随重复键检测） (depends_on: task-01)
- [x] task-03: verify 侧——parseTaskAcceptance 三态契约（no-frontmatter/invalid-yaml/ok）；探针 7 构建与 renderProbe7Lines 按 fmError 区分「frontmatter 非法 YAML」与真无 acceptance 防御行 (depends_on: task-01)
- [x] task-04: 测试——multi-agent-platform 三张坏卡拷贝为夹具（坏行 20/22/26（独立审查 node 实测修正：调查报告的 19/21/25 是 YAML 文本内行号））+ test/taskcard-frontmatter-hardgate.test.mjs 新用例 + test/acceptance-matrix-probe.test.mjs 契约迁移 + test/cross-task-contracts.test.mjs 邻接用例，相关测试全绿 (depends_on: task-02, task-03)
