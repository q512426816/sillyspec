---
author: flow-machine-draft
created_at: 2026-10-28T16:03:46.900Z
---
# 需求规格（Requirements）— 2026-10-29-open-metrics-gate

## 功能需求

### FR-01: 收口开放指标门（commands.metrics）

收口实测（runQuickTestLintGate / verify 质量扫描）在触及代码文件时，若 local.yaml 配置了 commands.metrics（非 unavailable），【必须】在隔离快照内执行该命令：退出码 0=通过；非 0 或超时=门红计入 failed 阻断收口；未配置或标 unavailable 时【必须】跳过留痕（fail-open 不阻断，语义与 commands.lint 逐条对齐），且该 skipped reason 【必须】自带一句配置引导（可配 commands.metrics 接入指标门 + 快慢定位一句）——收口输出与证据文件即引导面，不另设说教输出；命令因环境缺二进制失败（CNF 特征且输出无文件路径）时【必须】降档 skipped 带修复指引（复用 lint 环境缺件语义，不拦门）。超时链：显式调用参 > metrics_timeout_sec > env SILLYSPEC_METRICS_TIMEOUT_MS > 缺省 180s。执行命令时【必须】注入 `SILLYSPEC_CHANGE_FILES` 环境变量（本变更文件清单——审计∪声明口径，POSIX 相对路径换行分隔）——大仓增量门据此只扫变更面（不读该变量的命令零感知，向后兼容）。本变更【禁止】新增 npm 依赖、【禁止】在机制层绑定任何具体指标工具（工具中立规约 00）。

#### 场景：未配置跳过（fail-open）

Given local.yaml 无 metrics 键或值为 unavailable / When 收口实测触及代码文件 / Then metrics 检查返回 status=skipped 且 reason 留痕（「local.yaml 未配置 commands.metrics（或标记 unavailable）」形态 + 一句配置引导），不计入 failed，action 判定与现状一致（仅 metrics 字段自身新增）。

#### 场景：配置且通过

Given metrics 为退出码 0 的命令 / When 收口实测 / Then 该命令在门禁隔离快照内执行（非主仓工作区），status=passed，结果以 kind: metrics 计入 verify-runs 证据，failed 不含 'metrics'。

#### 场景：配置且失败阻断

Given metrics 为退出码非 0 的命令 / When 收口实测 / Then failed 含 'metrics'、action=fail，收口被拦；修复后重跑断点续（幂等重执行）。

#### 场景：超时门红

Given 命令运行超过 metrics_timeout_sec（或缺省 180s 帽）/ Then status=failed（reason 注明超时秒数）并阻断。

#### 场景：纯 doc/配置变更不跑

Given 变更文件均未触及代码（CODE_PATH_SEGMENT_RE / CODE_EXTENSION_RE 双通道不中）/ Then 整个实测走既有 skip 早退，metrics 不执行（与 test/lint 同款短路）。

#### 场景：环境缺件降档

Given 命令因二进制缺失失败（CNF 特征）且输出无可归属文件路径 / Then 降档 skipped 带修复指引（安装依赖后恢复实测），不拦门。

#### 场景：增量门环境注入

Given 配置 metrics 且收口实测执行该命令 / Then 子进程环境含 SILLYSPEC_CHANGE_FILES=本变更文件清单（POSIX 相对路径换行分隔），命令可据此只扫变更面（大仓增量门）；命令不读该变量时行为与不注入一致。

### FR-02: 评审面假测试判据（空实现判据 + 根因判据）

收口评审任务书（renderReviewerTaskbook）检查单【必须】新增测试有效性判据：空实现判据（断言测行为——若实现改为全部返回空的空操作而测试仍全绿，则测试无效，评审员须对绑定测试作答此判据）与根因判据（只吞崩溃/藏失败的 guard 不是修复——兜底掩盖≠根因消除）。测试厚度 advisory（buildTestSurfaceAdvisory）命中时返回文案【必须】附带空实现判据提示句；负例（有测试改动/纯 doc/少文件）返回 null 行为不变。

#### 场景：任务书渲染含判据

When renderReviewerTaskbook 渲染任意变更任务书 / Then 检查单含两条可判定判据文案（评审员可据其对「测试有效性」与「修复根因性」逐条作答），其余段落与现状一致。

#### 场景：advisory 命中附判据

Given 变更交付 ≥3 个 src 类文件且 0 个测试文件改动 / When buildTestSurfaceAdvisory 计算 / Then 返回文案末尾附空实现判据提示句；负例输入返回 null 逐字不变。

### FR-03: 配置面注册与自动带出

LOCAL_YAML_SCHEMA commands 段【必须】注册 commands.metrics（string, optional, live）与 commands.metrics_timeout_sec（number, optional, live）：readers 指向消费函数；desc 【必须】说明快慢定位（秒级静态分析适合收口门；变异测试类慢工具建议提帽或放 pre-push/CI 层）且机制层不得绑定具体工具名；desc 的类别指引【必须】点名常见质量维度（复杂度上限/重复率/死代码/覆盖率阈值）与「生态/构建工具检查任务（npx 类零安装、mvn/gradle 目标等）或仓内自写脚本」两类命令来源示例，语言中立不偏向单一生态（点名维度与形态是引导，不构成机制绑定——example 值给可直接跑的形态如 `npx <tool> src`）。注册后 local.yaml.example（renderExample）与 {LOCAL_COMMANDS} prompt 注入【必须】经既有机制自动带出新键——init 侧无单独改动。引导面【必须】三处在场：① local.yaml.example 注释（renderExample desc）；② AGENTS.md 模板（templates/agents-instruction.md）核心规则 4 的 lint 语义句后并列 metrics 同款语义一句（agent 每会话读 AGENTS.md 即知有此门可配，经 init 版本机制下发）；③ FR-01 的 skipped reason 引导句。

#### 场景：schema 注册可见

Then LOCAL_YAML_SCHEMA commands 段含两新键（path/type/readers/desc/example 齐全），config 校验链路通过。

#### 场景：example 自动带出

When renderExample() 生成示例 / Then 输出含 metrics 两键行（沿既有生成链，无特判分支）。

#### 场景：AGENTS 模板并列句

When 读 templates/agents-instruction.md 核心规则 4 / Then lint 语义句后并列 commands.metrics 同款语义（未配置/标 unavailable → 收口跳过留痕；配置后非零阻断；慢工具建议 pre-push/CI）。

### FR-04: 测试面与零依赖

本变更【必须】零新增 npm 依赖（package.json dependencies 集合不变）；【必须】新增自动化测试覆盖：FR-01 门三态（未配置跳过/配置通过/配置失败阻断）+ 超时 + 环境缺件降档 + 纯 doc 跳过、FR-02 两处文案渲染（任务书判据在场/advisory 附句/负例不变）、FR-03 schema 注册与 example 带出；既有回归面（quick-test-gate / flow-review / config-schema / verify-quality-scan 相关测试）【必须】绿 + lint 绿。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/quick-metrics-gate.test.mjs「未配置跳过：无 metrics 键与 unavailable 两形态均 skipped 留痕不拦门」
FR-01: test/quick-metrics-gate.test.mjs「配置通过：退出码 0 → passed 且 kind: metrics 证据落 verify-runs」
FR-01: test/quick-metrics-gate.test.mjs「配置失败阻断：退出码非 0 → failed 含 metrics、action=fail」
FR-01: test/quick-metrics-gate.test.mjs「超时门红：超 metrics_timeout_sec 帽 → failed（reason 注明超时）」
FR-01: test/quick-metrics-gate.test.mjs「环境缺件降档：CNF 特征且无文件路径 → skipped 带修复指引」
FR-01: test/quick-metrics-gate.test.mjs「纯 doc 变更：实测早退 skip，metrics 不执行」
FR-01: test/quick-metrics-gate.test.mjs「增量门注入：命令子进程环境含 SILLYSPEC_CHANGE_FILES=变更清单（换行分隔 POSIX 路径）」
FR-02: test/flow-review.test.mjs「任务书检查单含空实现判据与根因判据（关键句断言在场）」
FR-02: test/quick-metrics-gate.test.mjs「advisory 命中附空实现判据句；负例返回 null 不变」
FR-03: test/config-schema.test.mjs「commands.metrics 与 metrics_timeout_sec 注册（readers/desc/example）及 renderExample 带出」
FR-03: test/quick-metrics-gate.test.mjs「引导面三处在场：example 注释 + AGENTS 模板规则 4 并列句 + skipped reason 引导句」
FR-04: test/quick-metrics-gate.test.mjs「零依赖断言：实现后 package.json dependencies 集合与基线一致」（与上述全部新用例 + quick-test-gate / flow-review / config-schema / verify-quality-scan 既有面回归共同构成验收证据）
