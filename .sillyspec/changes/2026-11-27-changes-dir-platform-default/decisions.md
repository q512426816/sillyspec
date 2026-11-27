---
author: qinyi
created_at: 2026-11-27 23:40:57
generated_by: sillyspec-fourpiece-init
change: 2026-11-27-changes-dir-platform-default
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条（格式见 brainstorm Step 3 模板）；幂等按 D-xxx@vN 判重 -->
<!-- 引用规范：evidence 等处的源码位置写仓根相对全路径+行号（形如 src/foo.js:<行号>——行号写实际数字）——裸文件名在 docs-check 层1 靠 basename 全仓扫描找候选，找不到候选或关键词窗口不匹配即失效，到 pre-push 才拦（2026-09-19 实证 64 处返工） -->

## D-001@v1: 仓边界分两变更——本变更只做 sillyspec CLI 侧，平台侧另立紧随
- type: scope
- priority: P0
- status: confirmed
- source: user
- question: 平台侧调整（spec-pull 主通道化、同步失败显性化、收口提示联动、版本历史延后）放进本变更还是另立？
- answer: 分两个变更。本变更聚焦 sillyspec CLI 侧（init 默认 ignore、归档链、收口提示、文档），平台侧在 multi-agent-platform 仓另立变更紧随，对着已定 CLI 行为做适配。
- normalized_requirement: 本变更的交付面与验收面仅覆盖 sillyspec 仓；任何平台仓代码改动不在本变更 tasks 内。
- impacts: [FR-边界, design 文件变更清单]
- 锚点: .sillyspec/changes/2026-11-27-changes-dir-platform-default/design.md##非目标
- evidence: 用户 AskUserQuestion 回答（2026-11-27 23:41，「分两个变更(推荐)」）

## D-002@v1: 本仓 dogfood 存量保留+新增不入库——.gitignore 加行吃狗粮
- type: compatibility
- priority: P0
- status: confirmed
- source: user
- question: 本仓已入库 13227 个变更文档（archive 占 99.8%、125MB），切换新默认时存量怎么办？
- answer: 存量保留+新增不入库。本仓 .gitignore 加 `.sillyspec/changes/`——gitignore 对已跟踪文件无效，13227 个存量继续跟踪；新变更目录不再入库。本仓真实切换到新默认（dogfood）。
- normalized_requirement: 本仓切换后，git status 对新建变更目录不再出现未跟踪条目；存量归档文件的跟踪状态不变。
- impacts: [FR-存量兼容, task-本仓切换]
- 锚点: .gitignore（本仓切换行）+ design.md##Phase 4
- evidence: 用户 AskUserQuestion 回答（2026-11-27 23:41，「存量保留+新增不入库(推荐)」）

## D-003@v2: 跟踪声明走 local.yaml 显式配置，init 模板同步写 .gitignore
- supersedes: D-003@v1（布尔词汇升版为枚举词汇，机制核心——显式声明优于运行时探测——不变）
- type: architecture
- priority: P1
- status: accepted
- source: code
- question: 「默认不放 git」的控制点在哪——纯 .gitignore 文件探测、local.yaml 配置声明，还是两者？
- answer: 我的判断：local.yaml 显式配置项（变更文档 git 跟踪策略，枚举 `changes.doc_tracking`，缺省 platform=不入库，词汇对齐 D-004@v2）作为 CLI 行为真源；init 模板同步往项目 .gitignore 写忽略行（文件事实与配置声明一致）。理由：①收口落库 epilogue（src/flow.js:3083 调 renderArchiveLandingEpilogue，src/run/complete-handlers.js:875 computeArchiveLanding）在「不入库」仓里若继续按未落库打 🚨+commit 命令就是常驻噪音，需要稳定的行为分支真源；②git check-ignore 纯探测对「存量保留+新增不入库」形态（D-002）有歧义——已跟踪存量与新 ignore 并存，探测结果不能表达「用户选择跟踪」语义；③对齐知识库 conventions「门禁/定价类输入必须项目声明」口径（local.yaml gitignore 当共享价目表已被 D-008@2026-11-14-scan-incremental 否决过的是「把声明塞 gitignore 当配置」——本条正相反：声明进 local.yaml，gitignore 只是 init 的机械副产物）。
- normalized_requirement: CLI 收口 epilogue 与归档链暂存动作按 local.yaml changes.doc_tracking 分支行为（分支细则见 D-004@v2）；配置缺省时回退 platform（不入库）；init 建仓时按生效值≠repo 写入 .gitignore 忽略行。
- impacts: [FR-配置项, FR-收口提示形态, task-归档链分支]
- evidence: src/flow.js:3083（收口 epilogue 调用点）、src/run/complete-handlers.js:875（computeArchiveLanding）、src/init.js:401-421（init 已有 .gitignore 修改逻辑，ignoreRules 写入先例）
- 故障面: local.yaml 未升级的存量仓（配置缺省=platform）在升级后收口 epilogue 从「🚨+commit 命令」变为两段式形态——已依赖该提示做归档提交的存量用户习惯被改变，需 doctor/文档给迁移指引（显式声明 repo 恢复原行为）
- 退役判据: 若平台侧后续把「文档版本历史」建成一级能力且 spec-pull 一键化闭环，枚举词汇需随平台策略词汇（platform-native/repo-native 类）二次对齐时重议

## D-004@v2: 配置形态定为策略枚举 changes.doc_tracking（默认 platform），归档链 changes/ 面暂存随枚举分支、knowledge/docs 面解耦
- supersedes: D-004@v1（Design Grill 独立评审 fail 后补齐归档链分支语义：complete-handlers.js:648/:704 的 changes/ 面 git add 在非 repo 值下跳过；:661/:675/:721 knowledge/docs 面 add 与枚举解耦保留、落库出口由 epilogue knowledge 面指引承担——修复「暂存面无限累积无出口」）
- type: architecture
- priority: P0
- status: confirmed
- source: user
- question: 配置形态选布尔最小面（方案 A）还是策略枚举前置对齐平台（方案 B）？
- answer: 方案 B。local.yaml 新增 `changes.doc_tracking` 枚举三值：`platform`（**默认**——变更文档权威在平台，不入库；未接平台时行为退化为不入库+收口提示注明仅本机）| `never`（不入库，单机自担）| `repo`（现状行为：随 git 跟踪、随提交入库）。CLI 归档链/收口 epilogue/doctor 按枚举值分支；init 建仓写 .gitignore 忽略行 + local.yaml 默认值。**默认值=platform 是我的判断**（用户选定枚举形态、未显式答默认值，可否决）：平台用户零配置即正确；单机用户默认满足「不放 git」（C3）；想入库的用户显式改 repo。存量仓缺省 platform 导致 epilogue 形态翻转（🚨 消失），由 doctor 迁移指引缓解。
- normalized_requirement: local.yaml `changes.doc_tracking` ∈ {platform, never, repo}，缺省=platform。repo 值：收口 epilogue 与归档链暂存全部现行为（🚨/✅+幂等 commit 命令）。platform/never 值：①归档链跳过 changes/ 面 git add（complete-handlers.js:648 archive/<名>/ 与 :704 changes/ 源侧补暂存）；②knowledge/docs 面 git add 保留（与枚举解耦——知识资产入库与变更文档跟踪是两件事）；③epilogue 两段式：changes/ 面输出单行形态说明+回退指引（需入库请设 repo），knowledge/docs 面若有暂存面则保留落库指引（该面出口不因枚举消失）。
- impacts: [FR-配置项, FR-收口提示形态, FR-init 模板, task-归档链分支]
- 锚点: src/flow.js:3083（epilogue 分支点）+ src/config-schema.js:45（LOCAL_YAML_SCHEMA）
- evidence: 用户 AskUserQuestion 回答（2026-11-27 23:47，「方案B:策略枚举前置」）
- 故障面: 平台侧变更定稿的策略词汇若与 platform|never|repo 不一致，映射改名波及 CLI 配置面、文档与存量用户 local.yaml
- 退役判据: 平台侧变更定稿策略词汇后若分歧，在平台变更或本变更 D-004@v2 统一改名并给 local.yaml 兼容读

## D-005@v1: 否决布尔最小面方案（前方案 A）
- type: architecture
- priority: P1
- status: rejected
- source: user
- question: 同 D-004 问句——配置形态布尔还是枚举？
- answer: 否决方案 A（布尔 `changes.git_tracking` 最小面，用户选定方案 B）
- normalized_requirement: 配置形态为枚举而非布尔（对齐 D-004）。
- impacts: [D-004]
- evidence: 用户 AskUserQuestion 回答（2026-11-27 23:47）
- 否决理由: 布尔表达力不足——平台侧另立变更定稿后仍需二次演进为枚举，两次改配置面+两轮文档+两轮存量迁移指引，总成本高于一次枚举到位
- 复潮条件: 平台侧变更无法定稿策略词汇（分歧持续）需要先解耦落地时，可降级回布尔形态并事后升级
