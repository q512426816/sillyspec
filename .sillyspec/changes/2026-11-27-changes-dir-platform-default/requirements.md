---
author: qinyi
created_at: 2026-11-27 23:40:57
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 用户（仓所有者） | 通过 local.yaml 声明变更文档跟踪策略，决定 spec 入库/平台管/单机 |
| Agent（CLI 操作者） | 按 doc_tracking 感知收口提示形态与归档件处理动作 |
| 平台用户 | 仓绑定 SillyHub 平台，变更文档权威在平台（spec-sync 同步） |
| 单机用户 | 未接平台，不入库时文档仅存本机，丢失自担 |

## 功能需求

### FR-01: doc_tracking 枚举配置与缺省回退
Given 任一 sillyspec 仓的 local.yaml
When 声明 `changes.doc_tracking` ∈ {platform, never, repo} 或缺省或解析失败
Then 缺省与解析失败一律回退 `platform` 并留痕警告；非法值被 config validate 拦截报错；枚举的行为差异面=收口 epilogue 输出形态与归档链 changes/ 面暂存动作；变更目录不在项目工作树（外部 specDir）时 changes/ 面暂存天然为空操作，行为差异仅剩 epilogue 输出形态

### FR-02: 收口 epilogue 与归档链暂存按 doc_tracking 分支
Given flow done 收口终态输出与归档链执行
When doc_tracking=repo
Then 输出与归档链暂存行为逐字不变（✅ 已落库单行 或 🚨 未落库尾块+幂等 commit 命令，computeArchiveLanding 照跑，changes/ 面暂存照做）；When doc_tracking=platform/never
Then 归档链跳过 changes/ 面暂存（archive/<名>/ 与 changes/ 源侧补暂存短路，无 ⚠️ 补暂存失败告警），knowledge/docs 面暂存保留；epilogue 两段式——①changes/ 面输出单行「📁 变更文档不入库（changes.doc_tracking=<值>）：spec 以平台同步为准（未接平台时仅存本机）；需入库请设 changes.doc_tracking: repo」，该面不跑 git 重算、不输出归档 commit 命令；②knowledge/docs 面若暂存区存在本变更蒸馏面（新增一次 `git diff --cached --name-only` 过滤检查）则保留落库指引行，无暂存面不出该段

### FR-03: init 条件写 .gitignore
Given sillyspec init 建仓（specDir 内嵌项目）
When 生效 doc_tracking ≠ repo
Then 项目 .gitignore 幂等追加 `.sillyspec/changes/` 行；When = repo
Then 不写该行；local.yaml.example 增 doc_tracking 注释示例

### FR-04: doctor 存量迁移指引与残留检测语义
Given doctor 全量扫描
When HEAD 树含 `.sillyspec/changes/` 存量且 doc_tracking 未显式声明
Then 输出 INFO 建议显式声明 `changes.doc_tracking: repo`；显式声明或无存量不触发；detectArchiveCommitResidue 暂存区残留检测三值语义不变（暂存区出现变更文档=残留警告）

### FR-05: 本仓切换到新默认（吃狗粮）
Given 本仓 .gitignore 加 `.sillyspec/changes/` 行、local.yaml 显式 platform
When 新建变更目录或归档
Then git status 对新变更目录不再出现未跟踪条目；存量 13227 个已跟踪文件跟踪状态不变；新变更收口 epilogue 为两段式形态（changes/ 面单行说明+回退指引；本仓蒸馏常态下 knowledge/docs 面有暂存，落库指引段照常出现）

### FR-06: 文档族措辞同步
Given CLAUDE.md、AGENTS.md、.claude/skills/（sillyspec-archive/flow/commit 等）、docs/sillyspec/file-lifecycle.md
When 涉及「变更文档随提交入库/归档件提交」的惯例措辞与动作指引
Then 改写为按 doc_tracking 条件执行（repo 值才入库/提交归档件），与 CLI 实际行为一致

## 非功能需求
- 兼容性：Windows / Linux / macOS（纯 Node fs + git 子进程，无平台特有 API）；存量仓升级后行为可预期（缺省 platform 翻转由 doctor INFO + 文档迁移说明缓解，`repo` 一字段恢复原行为）
- 性能：platform/never 值下 changes/ 面不跑 git 重算子进程（computeArchiveLanding 短路）；epilogue knowledge/docs 面检查新增一次 `git diff --cached --name-only`（替代原该面隐含在 computeArchiveLanding 内的读取，总量持平）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | 全部 FR | 交付面仅 sillyspec 仓，平台侧另立变更（非目标） |
| D-002@v1 | FR-05 | 本仓存量保留+新增不入库 |
| D-003@v2 | FR-01 | 显式配置声明为行为真源，否决运行时 git 探测（supersedes D-003@v1 布尔词汇） |
| D-004@v2 | FR-01/FR-02/FR-03 | 枚举三值、缺省 platform、归档链 changes/ 面暂存分支+epilogue 两段式+knowledge/docs 面解耦、init 条件写入（supersedes D-004@v1） |
| D-005@v1 | FR-01 | 布尔方案否决留痕（防复潮），枚举形态由此固化 |

## 测试绑定（每条 FR 至少一行：`FR-NN: test/路径「用例名」`；不适用要写理由；flow done 空行拒收）

FR-01: test/doc-tracking-config.test.mjs「changes.doc_tracking 枚举校验与缺省/失败回退」
FR-02: test/flow-epilogue-doc-tracking.test.mjs「epilogue 两段式分支（repo 逐字现形态 / platform+never 两段式）」
FR-02: test/flow-epilogue-doc-tracking.test.mjs「归档链 changes/ 面暂存短路（:648/:704 不触 git add、knowledge 面照常）」
FR-03: test/init-doctor-doc-tracking.test.mjs「init ignoreRules 条件写入（≠repo 幂等写 / repo 不写 / 重入不重复）」
FR-04: test/init-doctor-doc-tracking.test.mjs「doctor 存量迁移 INFO 触发条件与残留检测语义回归」
FR-05: test/flow-epilogue-doc-tracking.test.mjs「platform 值收口两段式形态（本仓切换后的实际形态断言）」——仓库侧切换（.gitignore/local.yaml）为配置操作，验收靠 git check-ignore 与 git status 实测
FR-06: 不适用：纯文档措辞同步（视觉样式/纯配置/文档层不写测试），验收靠 docs-check 门与 CLI 行为对照
