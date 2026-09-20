---
author: qinyi
created_at: 2026-09-21 10:30:00
---
# 提案书（Proposal）— 流程命令卡（工作流自教学层）

## 动机

R4 对照实验（round4/result-S.md）实证：OpenSpec `init` 生成 opsx 命令卡（611 行三文件），agent 读卡约 1.5 分钟零试错上手全流程；sillyspec 侧同任务 agent 撞 worktree 守卫 3 次才找到 `--allow-worktree-cwd --spec-dir` 组合、四参数 `--done` 格式是流程中途才从步骤输出里学到、`SILLYSPEC_SESSION_ID` 每命令导出靠错误信息补课。sillyspec 的每步指令由 CLI 按状态实时渲染（架构优势），但 **bootstrap 层（怎么启动/有哪些命令/坑在哪）没有任何静态载体**——agent 只能试错学。

## 关键问题

1. **上手税**：新会话 agent 对 sillyspec 的命令面/参数形态零先验，全靠撞错误信息学习（R4-S-Q 实测：守卫 3 连拒 + 参数格式中途学）。
2. **AGENTS.md 载不动命令速查**：19 条规则全量常驻 context，再堆命令细节把常驻 token 面做反；且 zcode/claude 的 slash 命令入口形态（按需加载）拿不到。
3. **静态文档腐烂风险**：若手抄命令到文档，随 CLI 演进必烂——需要包内资产+版本标记幂等注入（injectAgentsInstructions 先例），而非仓库级手维护。

## 变更范围

- `assets/command-cards/*.md`：7 张卡源文（run-brainstorm / run-plan / run-execute / run-verify / run-archive / run-quick / status），随 npm 打包。
- `src/command-cards.js`：注入器 `injectCommandCards(projectDir, { tools, force })`——三态幂等（无→写新/标记完好→按版本覆盖/手改→warn 跳过 force 才覆盖）。
- `src/init.js`：`VALID_TOOLS` 增 `zcode`、tools 含 zcode/claude 时接线注入（.zcode/commands/sillyspec/ 与 .claude/commands/sillyspec/）。
- `test/command-cards.test.mjs`：注入/幂等/手改跳过/force/资产齐全断言。

## 不在范围内（显式清单）

- doctor / explore / scan / progress 等其余命令不做卡（低频，AGENTS.md 已载）
- codex / gemini / opencode / cursor / openclaw 不生成卡（AGENTS.md/@引用已是其指令面，扩面另立项）
- 卡内容不镜像 docs/prompt 步骤提示（两套语义：卡=bootstrap 层，步骤=CLI 实时渲染）
- 发布期活文档锚不为卡新增 gate（卡是 init 产物不是仓内活文档）

## 成功标准（可验证）

- `sillyspec init --tools zcode` 后 `.zcode/commands/sillyspec/` 下 7 张卡存在且 frontmatter 含 `generated_by` + 版本 + sha 标记（断言）
- 重跑 init（同版本）幂等零变更；升级版本后标记完好卡被覆盖更新（断言）
- 手改过的卡被跳过并 warn，`--force` 才覆盖（断言）
- claude 落点 `.claude/commands/sillyspec/` 同语义（断言）
- 7 张卡内容各含四段契约：何时用/生命周期速查/防坑清单/边界声明（内容断言）
