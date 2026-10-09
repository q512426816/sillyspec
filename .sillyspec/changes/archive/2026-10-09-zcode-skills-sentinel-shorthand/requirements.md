---
author: flow-machine-draft
created_at: 2026-10-09T01:06:25.719Z
---
# 需求规格（Requirements）— 2026-10-09-zcode-skills-sentinel-shorthand

## 功能需求

### FR-01: .zcode 在场 → detectTools 发现 zcode；skillToolDirs 含 zcode→.zcode/skills 映射（--tool zcode 技能可落）

- init 工具发现与技能落点必须覆盖 zcode 宿主：detectTools 在项目目录存在 `.zcode` 时必须报出 `zcode`；cmdInstall 的技能落点映射 skillToolDirs 必须含 `zcode: '.zcode/skills'`，使自动发现与显式 `--tool zcode` 两条路都能把内嵌技能复制到 `.zcode/skills`。

#### 场景：.zcode 项目技能同步

- Given 项目目录存在 `.zcode/skills`；When detectTools 扫描；Then 发现列表含 `zcode`
- Given 用户显式 `--tool zcode`；When init 安装；Then 内嵌技能落 `.zcode/skills`

### FR-02: 连写组三形态（斜杠/顿号/逗号+空格）展开后任务全有完成证据；补零归一；task-010/版本串三连数字不误切；既有独立 token 行为零变化

- 提交消息中的任务连写组（如 `task-01/02/03`、`task-1、2，03`）必须先展开为独立规范 token（补零到两位）再做哨兵完成证据判定与 autopilot 自动勾选提取，两处必须共用同一展开纯函数（expandTaskShorthand）；展开必须带尾数前瞻边界——`task-010` 不证 task-01、`task-01/013` 三连数字版本串整组不误切；既有独立 token 消息判定行为必须零变化。

#### 场景：连写组一次交付多任务

- Given tasks.md 全勾且提交消息含 `task-01/02/03`；When 哨兵判定；Then 状态 complete（不再误拒「零完成证据」）
- Given 提交消息含 `task-1、2`；When 展开；Then 得 `task-01 task-02`（补零归一）

### FR-03: 既有六工具信号（claude/cursor/openclaw/codex/gemini/opencode）发现零变化

- 新增 zcode 分支必须不影响既有六信号的发现结果：各信号目录单独在场时 detectTools 输出必须与改动前一致，零信号兜底 claude 不变。

#### 场景：六信号回归

- Given 仅 `.claude` 在场；When detectTools；Then 输出恰为 `['claude']`（其余信号同构）

### FR-04: 三个新技能随 .claude/skills 源分发，init 同步可达

- 内嵌技能源 `.claude/skills` 必须新增 sillyspec-export / sillyspec-quick / sillyspec-resume 三个技能（各含 SKILL.md），随 npm 包分发；技能落点同步路径复用 FR-01 的映射面，init 刷新时可达各宿主技能目录。

#### 场景：CLI 升级刷新技能

- Given 已装项目运行 init 刷新；Then 三个新技能出现在该宿主技能目录

### FR-05: 新增两测试文件（7 用例）+ lint 全绿

- 本变更新增 test/init-zcode-skills.test.mjs（3 用例）与 test/sentinel-token-shorthand.test.mjs（4 用例）必须全绿；仓库 lint 必须通过。

#### 场景：收口实测

- Given 交付面落盘；When 运行两测试文件与 lint；Then 7 用例全过、lint 零报错

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/init-zcode-skills.test.mjs「① .zcode 在场 → zcode 进发现列表」「② skillToolDirs 含 zcode 映射（源级钉）」
FR-02: test/sentinel-token-shorthand.test.mjs「① 连写组三形态展开：三任务全有证据（不再误拒）」「② expandTaskShorthand 纯函数：补零/边界/非连写零变化」「③ 前瞻边界：task-01 不证 task-010；未勾全不误判」「④ 既有独立 token 行为零变化」
FR-03: test/init-zcode-skills.test.mjs「③ 既有六信号发现零变化」
FR-04: 不适用：技能为纯文档资产随包分发（.claude/skills 源文件在场即交付），无独立行为测试面；落点同步行为由 FR-01 用例钉住
FR-05: test/init-zcode-skills.test.mjs「①-③ 全绿」；test/sentinel-token-shorthand.test.mjs「①-④ 全绿」（lint 由收口实测门覆盖）
