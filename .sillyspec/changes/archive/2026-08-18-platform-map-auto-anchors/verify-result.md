---
author: qinyi
created_at: 2026-08-19T10:49:55+08:00
updated_at: 2026-08-19T10:49:55+08:00
---

# 验证报告（Verify Result）— docs check --fix 零侵入自动重锚

## 结论
PASS WITH NOTES

## 任务完成度
6/6 任务全部完成（plan.md checkbox 全 [x]，TaskCard acceptance 逐条核验）：

| 任务 | 状态 | 验收证据 |
|------|------|------|
| task-01 fix 分类 | ✅ | `src/docs-check.js:347`（invalid[].fix = classifyFix）+ `:382`（分类实现：全候选唯一命中→fixable，多/零命中或无 token→needs-manual）；既有 invalid/suggest/reason 字段不变——test/docs-check.test.mjs 既有 29 测试全过实证兼容 |
| task-02 applyFixes | ✅ | `src/docs-check.js:418` 导出；docLine 定点替换、同行多引用从后往前、dryRun 零写盘、CRLF 保持、越界条目跳过记 skipped |
| task-03 CLI 接线 | ✅ | `src/index.js:593`（BARE_FLAGS 含 --fix/--dry-run）、`:637`（fixActive）、`:649-697`（fixReport + 重锚报告 + exit code 三态：全修→0 / 余 needs-manual→1 / 配置错误→2）；未知 flag 显式 exit 2 |
| task-04 六场景测试 | ✅ | test/docs-check-fix.test.mjs 16 测试 / 7 套件全过（node --test 实证 pass=16 fail=0），含 git-archive 旧 CLI 子进程对照——缺省路径输出逐字节一致（D-004） |
| task-05 真实漂移实测 | ✅ | review.json 全程记录：人为挪 index.js 12 行 → 检出 3 失效 → dry-run 预览（2 fixable + 1 多命中保守）→ --fix 写回（git diff 确认仅行号数字变）→ 多命中人工闭环 → doc-ref-check 80/80 → 严格还原 |
| task-06 文档同步 | ✅ | docs-consistency.md 模块卡 L20/L29「四件全部只读」→「四件写侧边界」+ 唯一例外 --fix 写回；file-lifecycle.md L59-68 docs check 章节含 --fix/--dry-run/exit code/fixReport；updated_at 均更新 |

## 对照设计检查
- **§5.1 确定性选择规则**：零命中→needs-manual ✅、单命中→自动改写 ✅、多命中→保守交人工 ✅（D-006）；多候选文件 token 唯一性全量校验（自审存疑项已落地，非只查 candidates[0]）✅
- **§5.2 行为矩阵**：全绿 exit 0 / 失效+全修 exit 0 / 余 needs-manual exit 1 / dry-run 预览 exit 1 / 配置错误 exit 2，与实现一致 ✅
- **§9 兼容策略**：无 --fix 时 CLI 行为与现状逐字节一致（task-04 CLI 子进程对照测试实证）；只改行号数字不改文件名与 token；writeFileSync 常规写 ✅
- **探针结果**：P1 未实现标记——变更文件仅命中 index.js:1493「TODO: task-11」（16fcf3e 历史提交既有，platform connect 交互 token，非本变更引入）；P2 设计关键词 classifyFix/applyFixes/fixable/needs-manual/suggestLines 全部源码命中；P3 测试覆盖无缺口
- **风险应对 R-01~R-05**：全部有对应实现与测试（多命中保守 R-01 / 纯位置引用人工 R-02 / doc-ref-check 二次拦截 R-03 / 同行从后往前 R-04 / CRLF 保持 R-05）

## 范围外新增（如实申报）
`docs/sillyspec/platform-interface-map.md` 锚点漂移修复（6 处）：execute 期间主仓被并行变更推进（ql-20260818-008 等 commit 改 src/index.js）产生真漂移。处理方式正是本 feature 的目标场景实战：`--fix` 自动修 2 处唯一命中（pullList 1499→1563、collectStatus 1451→1515）+ 按候选列表人工修 4 处多命中（triggerPull→1641、triggerPullActiveChange→785/936、probeSillyHub/renderDispatchInstruction→1348/1378、pointerPath 枚举→1433）。修复后 doc-ref-check 80/80 全绿。此文件不在 design §6 清单（当时无法预见 execute 期间并行漂移），但符合 module-impact.md 已登记的「临时实测对象」边界语义的延伸——从临时变为正式修复。

## 验证证据

### 测试结果
- **全量**：`npm test` exit=0（node --test 汇总 225+ 通过，0 失败；CLI 对账同源）
- **针对性**：`node test/docs-check-fix.test.mjs` pass=16 fail=0；`node test/doc-ref-check.test.mjs` 80/80 通过（59 处带关键词断言）；test/docs-check.test.mjs / docs-check-cli.test.mjs 既有套件全过（兼容性）
- **lint**：`npm run lint`（check-syntax.mjs，315 文件）通过——未引用导出 0 项 hard fail
- **真实 CLI 实跑**：`node bin/sillyspec.js docs check --fix --dry-run`（预览零写盘）与 `--fix`（写回）均按预期工作，重锚报告输出正确

### 决策核验（decisions.md 当前版本）
- **D-001@v2**（进入落地实现，accepted）：已落地——plan → execute → verify 全流程推进，本次验证即其 impacts 的 verify 环节 ✅
- **D-002@v2**（零侵入自动重锚，accepted）：源码零锚注释、文档零改造，--fix 复用 suggestLines token 搜索 ✅
- **D-003@v2**（文档保持标准 file:line，accepted）：修复只改行号数字，无占位符形态出现（task-04 测试断言文档字节级不变）✅
- **D-004@v1**（不替代 docs-check，accepted）：校验逻辑/ratchet 门/pre-push 零改动；无 --fix 逐字节一致有 CLI 子进程对照测试 ✅
- **D-005@v1**（不引入 AST 解析依赖，accepted）：零第三方新增依赖、零新脚本文件（applyFixes 在既有 src/docs-check.js 内）✅
- **D-006@v1**（多命中歧义保守处理，accepted）：多命中默认不自动修、报告候选交人工（实测验证）✅
- superseded 决策（D-001@v1/D-002@v1/D-003@v1/D-003@v2-rev1）无下游引用，无 stale reference ✅

## module-impact.md 核对
影响矩阵与实际一致：docs-consistency（src/docs-check.js + 模块卡 + 测试）、cli-entry（src/index.js 路由）。「更新结果」表四项状态已回填：docs-consistency 模块卡 done（task-06）、file-lifecycle.md done（task-06）、_module-map.yaml skipped（无增删）、cli-entry.md done（verify 收尾补变更索引条目）。无死信。

## 变更风险等级
risk_level 由 design frontmatter 显式声明 = **unit-sufficient**（覆盖关键词判级）。理由：本变更是纯本地 CLI flag 增强（docs check 增量分支 + 纯函数写回），无 daemon/backend 跨进程、无 session/lease/lifecycle 状态机、无部署启动路径；design 正文自审章节「不涉及 session/lease/agent_run/daemon/lifecycle 关键词」的否定语境会被机械字面匹配误判，故显式声明。测试以单元 + CLI 子进程集成对照为充分验证层级。

## Runtime Evidence
不适用（unit-sufficient 级，无跨进程/部署路径）。CLI 行为证据见上节「真实 CLI 实跑」。

## 遗留与建议
1. 主仓 docs check 全量仍有 13 处其他文档的 needs-manual 失效引用（ARCHITECTURE.md / prompt-control-debt.md / self-audit 快照等）——均为存量漂移且 token 多命中需人工语义判断，不在本变更范围；其中带日期的审计快照可考虑加入 local.yaml skip 列表。
2. 并行 session 在主仓有未提交改动（brainstorm.js prompt 调整 / .gitattributes / QUICKLOG 骨架），与本变更正交，提交时用显式 pathspec 隔离。
