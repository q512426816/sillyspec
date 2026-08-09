---
author: qinyi
created_at: 2026-08-09T15:08:00+08:00
---

# module-impact.md — persist completed 移到 gate 后 + completeStageGates 异常兜底

## git diff 真实变更文件（真相源，以 git diff 为准）
- src/run/complete.js（修改）
- src/run/gates.js（修改）
- src/run/stage.js（修改）
- test/stage-completion-atomicity.test.mjs（新增）

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| runtime | 逻辑变更 | src/run/complete.js, src/run/gates.js, src/run/stage.js | ① 三处阶段完成分支 persist（`pm._write`+`triggerSync`）从 `completeStageGates` 调用前移到成功返回后——`complete.js` completeStep(:278gate→:282_write+:283sync)、`complete.js` continueStep(:729gate→:732_write)、`stage.js` noAI 末步(:357gate→:360_write)，消除"persist completed→跑 gate 崩溃"窗口（DB 不留假 completed，gate 异常/失败→rollbackCompletionAndReturn 回 in-progress 落盘）；② `gates.js` completeStageGates(:549) 收尾段(:554-621 execute 并发预检+handleScanStageCompleted+validateMetadata+validateFileLocations+auxiliary 重置+runStageCompletionGates)整体 try/catch，任一段抛非结构化异常→catch→rollbackCompletionAndReturn（回滚 in-progress+落盘+返回未完成对象）不冒顶 exit 1，:624 handleExecuteWorktreeCleanup 在 try 外（副作用独立），execute 并发预检内层 advisory try/catch 保留。接口签名不变（completeStageGates 入参/返回结构不变），仅收紧阶段完成状态机原子性 | false |

## 未匹配文件（_module-map.yaml schema_version=1 旧格式无 paths 字段 / 测试文件）

| 文件 | 说明 | 建议 |
|------|------|------|
| test/stage-completion-atomicity.test.mjs（新增） | completeStageGates 异常兜底 + persist 移后原子性测试（5 用例 34 断言：runValidators/runVerifyTestCheck/validateMetadata/handleScanStageCompleted throw→rollback + 原子性 status 非 completed） | 测试文件，归 test |

## 三重交叉验证
- 声明范围（design.md「文件变更清单」）：src/run/complete.js + src/run/stage.js + src/run/gates.js + test/stage-completion-atomicity.test.mjs
- 任务范围（plan.md task-01~05 allowed_paths）：与声明一致（task-06 验收门禁无代码产出）
- 真实变更（git diff）：与声明/任务范围完全一致，无 scope creep
- 以 git diff 为准：4 文件 = 声明 = 任务，三重一致

## needs_review 汇总
- runtime 模块影响明确（逻辑变更：persist 移后 + try/catch，接口签名不变，行为收紧——阶段完成原子性增强），needs_review=false
- 无新公共入口/新文件待补录（test 文件归 test，非模块映射问题）

## 模块文档更新结果（archive step3）

| 文件 | 更新内容 |
|------|----------|
| modules/runtime.md | 注意事项加「阶段完成原子性：persist(_write+triggerSync) 移到 completeStageGates 成功后 + completeStageGates 整体 try/catch 异常 rollbackCompletionAndReturn 不冒顶」条目（complete.js completeStep/continueStep + stage.js noAI 末步 + gates.js try/catch 四处） |
| _module-map.yaml | runtime needs_review 保持 false（改动明确，接口不变；非新文件待补录） |

注：_module-map.yaml schema_version=1 无 paths 字段，本次按模块文档归属（runtime.md 收录 src/run/complete.js/gates.js/stage.js）手动匹配；schema_version=2 升级后 paths glob 可自动匹配。
