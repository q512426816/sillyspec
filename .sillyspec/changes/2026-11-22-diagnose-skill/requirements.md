---
author: flow-machine-draft
created_at: 2026-11-21T16:05:31.080Z
---
# 需求规格（Requirements）— 2026-11-22-diagnose-skill

## 功能需求

### FR-01: 新增 .claude/skills/sillyspec-diagnose/SKILL.md：五阶段 gated 诊断环（复现回路先行/最小化/可证伪假设排序/tagged 插桩/修复+回归锚定），frontmatter 含触发场景描述

- 必须新增 `.claude/skills/sillyspec-diagnose/SKILL.md`，形态对齐仓内既有 skill（frontmatter name/description + 内容节）；必须定义五阶段 gated 诊断环：①复现回路先行（red-capable 命令建好并跑红一次前禁止读代码建理论）②最小化 repro ③可证伪假设排序 ④tagged 插桩 ⑤修复+回归锚定；frontmatter description 必须含触发场景（用户报 bug/排查/偶发/为什么挂等）。

#### 场景：主路径

- Given agent 收到 bug 修复任务
- When 触发本 skill
- Then 先得到一条确定性、秒级、可独立重跑、对准本 bug 变红的复现命令，才进入假设与修复

### FR-02: skill 内含 SillySpec 流程衔接指引：bug 类轻量变更把复现命令写进成功标准、收口实测优先跑它、根因一句话 distill 进 knowledge

- skill 必须含与 SillySpec 流程的衔接指引：bug 类轻量变更必须在 flow start 成功标准里写复现命令；收口实测必须优先跑该命令（作为变更测试面证据）；修复后必须把根因一句话+复现命令 distill 进 knowledge（防同类坑）。

#### 场景：主路径

- Given bug 修复变更走轻量道
- When 收口实测门执行
- Then 复现命令从红转绿是修复成立的直接证据；根因进 knowledge 可检索

### FR-03: 纯 skill 层新增，不修改 src/ 与任何状态机代码

- 本变更必须只新增 `.claude/skills/sillyspec-diagnose/` 下文件与治理工件，禁止修改 src/ 下任何文件与 CLI 状态机行为。

#### 场景：主路径

- Given 收口采集 diff 面
- When 冻结对账执行
- Then 交付面不含 src/ 路径

### FR-04: 插桩前缀等纪律引用 execute 既有铁律口径，不双写正文

- skill 内插桩纪律必须引用 execute 阶段既有铁律口径（`[DEBUG-<id>]` 前缀，2026-11-21-prompt-microdesign-pack 落地），禁止双写正文规则——口径漂移时单点更新。

#### 场景：主路径

- Given execute 铁律的 DEBUG 前缀口径更新
- When 检视本 skill
- Then skill 引用口径而非自持副本，无第二份正文需要同步

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: 不适用：纯 skill 文档新增（agent 行为指引），无代码行为面，验收靠收口 diff 核对五阶段齐备
FR-02: 不适用：纯 skill 文档新增（流程衔接指引），验收靠收口 diff 核对指引在文
FR-03: 不适用：约束性条款，验收靠收口 diff 核对无 src/ 交付文件
FR-04: 不适用：纯文档引用关系，验收靠收口 diff 核对引用而非双写
