---
author: qinyi
created_at: 2026-08-02
---

# 决策台账 — 2026-08-02-init-claude-md

> 本次变更的实现/验收决策。每条带稳定版本 ID， supersede 时升 vN。

## D-001@v1 — 范围只做 Claude，不做 Cursor

- **背景**：需求要点 ③ 问是否对称加 Cursor（.cursor/rules）。
- **决策**：本次只让 init 为 Claude 生成 CLAUDE.md；Cursor 留后续变更。
- **理由**：Cursor 规则文件是 `.cursor/rules/*.mdc`（带 description/globs/alwaysApply frontmatter），与 CLAUDE.md 单文件结构不同，非完美对称，混入会模糊本次边界。
- **影响**：文件变更清单不含 cursor 相关；验收不含 .cursor/rules。
- **覆盖**：design.md「非目标」「兼容策略」。

## D-002@v1 — 通用模板去掉整个「完成汇报格式」段

- **背景**：sillyspec 自身 CLAUDE.md 含 `爸爸~爸爸~[时间]：` 汇报格式，需决定是否进通用模板。
- **决策**：通用模板**去掉整段汇报格式**（不是中性化称呼，是整段移除）。
- **理由**：sillyspec init 是公共 npm 工具，会被其他开发者项目调用；汇报格式（尤其个人称呼）各项目自定，不内置。
- **影响**：模板验收断言"不含汇报格式段 / 不含 `爸爸~爸爸~`"。
- **覆盖**：design.md「设计目标 2」「非目标」「风险 R-05」。

## D-003@v1 — 采用方案 A（claude 独立注入函数）

- **背景**：三种实现方案对比（A 独立函数 / B 通用化两态 / C 配置表）。
- **决策**：方案 A。claude 不加入 `INSTRUCTION_TOOLS`，单独 `injectClaudeInstructions()`。
- **理由**：最小爆炸半径（现有三工具注入零改动、最低回归风险）；与现有 claude 分治处理（skillToolDirs/detectTools）同一模式；YAGNI（其他工具当前不需 FULL 模板，不为想象中的对称提前抽象）。
- **影响**：`src/init.js` 新增独立函数 + doInstall 单调用点；不动 INSTRUCTION_TOOLS/INSTRUCTION_FILE_MAP/injectInstructions。
- **覆盖**：design.md「总体方案-方案选型」「文件变更清单」「接口定义」。

## D-004@v1 — 版本感知幂等仅作用于 claude

- **背景**：用户补充"init 写入带版本信息，重复 init 同版本不更新"。
- **决策**：版本感知（版本标记 + 同版本跳过 + 升级刷新/提示）**仅 claude**；codex/gemini/opencode 维持现 `## SillySpec` 标记"有则跳过"，不改。
- **理由**：改三工具标记方案会破坏既有安装的幂等检测（旧 `## SillySpec` 标记不被新方案识别 → 重复追加）；claude 此前不生成 CLAUDE.md，无历史包袱，可干净引入版本标记。
- **影响**：`injectClaudeInstructions` 含版本感知三态四分支；测试覆盖同版本跳过/升级刷新/完整态仅提示；验收不含三工具版本感知。
- **覆盖**：design.md「总体方案-版本感知幂等设计」「兼容策略」「风险 R-03/R-04」。
- **后续事项（非本变更）**：若要全工具版本感知，需单独迁移变更（marker scheme migration）。
