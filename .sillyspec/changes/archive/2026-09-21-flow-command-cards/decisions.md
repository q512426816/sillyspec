---
author: qinyi
created_at: 2026-09-21 10:30:00
---
# 决策记录（Decisions）— 流程命令卡

## D-001: 薄卡定位——卡只承载 bootstrap 层，不镜像步骤提示

- 状态：accepted
- 背景：OpenSpec opsx 卡是全流程厚文档（611 行）；sillyspec 每步指令已由 prompt.js 按状态实时渲染。
- 决策：卡四段契约（何时用/生命周期速查/防坑清单/边界声明），显式声明「步骤内容跑 sillyspec run <stage> 取实时指令」。
- 后果：卡内容与 CLI 演进的漂移面收敛到「命令形态与坑清单」，sha 标记+init 重跑收口。

## D-002: 内容源=包内静态资产，非运行时生成

- 状态：accepted
- 背景：方案 B（从 docs/prompt/_extracted.json 运行时生成）把仓库级镜像工具耦合进包级资产，且镜像源是步骤提示内容（与卡语义不同）。
- 决策：assets/command-cards/*.md 随 npm 打包，注入器只做「读资产→写目标」+标记幂等。
- 后果：内容与代码同版本发布零漂移窗口；卡更新走正常代码 PR。

## D-003: 落点仅 zcode 与 claude

- 状态：accepted
- 背景：codex/gemini/opencode/cursor/openclaw 的指令面是 AGENTS.md/@引用；全落点扩面收益低。
- 决策：zcode（.zcode/commands/sillyspec/，VALID_TOOLS 新增）+ claude（.claude/commands/sillyspec/）；其余工具不在范围。
- 后果：扩面另立项；AGENTS.md 注入机制不动。
