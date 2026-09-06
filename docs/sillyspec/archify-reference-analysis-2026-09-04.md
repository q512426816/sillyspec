# Archify 对照分析：为什么它快，scan 能借鉴什么

> updated_at: 2026-09-04
> author: qinyi
> 背景：用 archify（github.com/tt-a1i/archify，Agent 图表技能，47k stars）为 sillyspec 和 SillyHub 各生成一张架构图，全程走完它的 validate → deliver → visual-check 验收链；另派两个子代理分别深挖 archify 源码机制与本仓 scan 管线现状，三方交叉验证后形成本文。
> 配套产物：两张图的 JSON IR 样本（sillyspec.architecture.json / sillyhub.architecture.json）即「架构事实结构化快照」的活样本。

---

## 一、为什么 archify 分析快、省 token

实测形态：两张架构图各 4-5 轮 validate 收敛到 showcase 全绿；agent 侧总阅读量 ≈ SKILL.md（137 行）+ 1 个 schema + 1 个示例 ≈ 600 行封顶；agent 生成物是 5-6KB 的类型化 JSON IR，其余全部由确定性工具产出。

| # | 机制 | archify 怎么做 | scan 现状对照 |
|---|------|---------------|--------------|
| 1 | **生成物小** | agent 只写 JSON IR（5KB），渲染/排版由渲染器确定性完成 | 7 份 markdown（每份 ≥15-20 行）全部由 agent 生成 |
| 2 | **阅读有合同** | 「只读一个 schema + common + 一个示例」，细节下沉 references/ 按需读；SKILL.md 压在 160 行内且有测试锁定 | 每个子代理各自从零 grep/rg 探索代码库，探索成本重复发生且不可缓存 |
| 3 | **反馈比探索便宜** | 失败给 规则码+实测值(如 clearancePx 0 < minimumPx 4)+枚举修复，不需要回头重读 schema | workflow check 失败只说缺章节/行数，agent 常常整篇重写 |
| 4 | **supportedFixes 机器验证** | `acceptsFix` 把候选修复应用到克隆上重新编译，被证明能消除诊断的建议才列入 | 修复建议藏在 detail 文案里（scan-fix-headers 是先例），机器无法路由 |
| 5 | **机器校验替代 agent 自检** | agent 从不读回自己的产物检查；校验是工具的事 | 深度扫描步骤要求 agent 自己「验证文件是否生成且非空」 |
| 6 | **收敛规则封顶** | 「错误数创新低；连续两轮无改善即停，如实上报」写进 SKILL | 重试指令无终止条件，存在打转风险 |
| 7 | **机械事实预咀嚼** | 画图事实来自一份现成分析文档一次阅读；核验走 `git cat-file` 钉住 revision | 端点/模块/依赖由 agent 自己 grep 发现，而 endpoint-extractor（已带 source:line）闲置在 verify 侧 |

一句话：**agent 只做「判断密集」的部分（选事实、定结构、修诊断指向的那一处），机器做「token 密集」的部分（探索、渲染、校验、重试）。** token 成本正比于 agent 生成的字节，不正比于系统产出的信息量。

## 二、scan 管线现状（子代理盘点结论）

- 检查链几乎 100% 格式检查：scan-docs.yaml 只有 `file_exists / min_lines / contains_sections / no_placeholder / file_count / no_empty_files`；管线内嵌的事实核验仅 1.5 项（`local_config_invalid` 命令对账、`knowledge_broken_refs` 文件名级）。
- 最强资产被埋没：`collectDocRefs` / `resolveCandidates` / `validateRefLines`（`src/docs-check.js:75` 起）已实现「行级+符号级核验+自动重锚（classifyFix）」，但 ① 只认 .js/.mjs（P1b 后扩展）；② 未接进 scan 管线（P0 后已接）；③ 读工作树而非钉住 commit。
- 确定性抽取器错位：endpoint-extractor 的 FastAPI/Express/Spring 抽取（带 source:line）挂在 verify 侧，与 scan 零关联。
- frontmatter 元数据靠 agent 手抄 CLI 注入值，`scan-fix-headers` 是兜底——欠账的证明。
- 三个 postcheck 入口（深度档 handleWorkflowPostCheck / 平台收尾 handleScanStageCompleted / quick 档 executeScanPostcheck），加检查须三处同步。

## 三、可借鉴机制清单（按价值排序，来自 archify 源码深挖）

1. **诊断信封五字段**：`code / severity / subject / evidence(实测 vs 阈值) / supportedFixes`，进程边界崩溃也走结构化回执（fail-closed），诊断按 message 去重防错误洪水。
2. **deliver 交付流水线**：字节冻结 → 渲染快照 → 全检 → 同目录暂存 + 原子 rename → SHA-256 双回执 → 失败保 last-good。
3. **SKILL 行为契约 + 文档即测试**：artifact first、限定阅读集、实现防火墙、收敛规则、反作弊条款；用测试逐句断言文档关键句存在。
4. **三层证据分级**：deliver（确定性）/ visual-check（浏览器实测）/ 感知审查（人）claim 永不混同；机器回执硬编码 `visualReview: pending`，结构上无法冒充人工批准；退出码 0/1/2（环境不可用 ≠ 跳过）。
5. **质量分层**：固定检查集 + error/warning 门控切换（standard 档 5 项 composition 降 warning）+ 阈值集中常量 + 档位烙进产物属性可事后复核。
6. **钉住 revision 的源码证据**：声明即必须核验（`git cat-file -t <rev>:<path>`，读对象库不读工作树），origin/top-level 防伪，核验回执内嵌产物形成闭环。
7. **输出路径别名安全**：symlink/大小写/NFD 归一化探针、输入输出互斥。

## 四、落地路线图

**P0（2026-09-04 已做）**：`scan_doc_ref_invalid` 检查挂进 `runScanPostCheck`——对 scan 文档跑 docs-check 的引用核验纯函数（存在性+行号边界，repo:// 跨仓引用跳过），WARNING 级，零 prompt 改动。scan 产物自此获得行级事实核验。当日实测：在本仓真实 scan 文档上逮到 1 条 WIP 引发的行号漂移（`runAutoMode` 锚点，已重锚；该文件常有并行改动，行号以 docs check 为准）。

**P1（2026-09-04 已做）**：
- 诊断信封升级：checks 条目增加 `evidence`（实测值）与 `supportedFixes`（枚举修复，含可执行 CLI 命令）字段，向后兼容（name/severity/detail 保留）；
- REF_RE 扩展到 cjs/ts/tsx/jsx/py/java/go——非 JS 项目的 scan 文档引用进入核验范围；
- scan 深度扫描 prompt 增加「事实引用纪律」（关键事实带反引号 path:line）与「收敛规则」（两轮无改善即停如实上报），quick 档 prompt 同步。

**P2（2026-09-04 已做核心，IR sidecar 未做）**：
- 层2 关键词断言：`collectInvalidDocRefs`（`src/docs-check.js`，单一语义源）做 层1+层2 联合核验——引用行所述符号须在源文件 [start-2, end+5] 窗口命中，捕获「文件对行号错」类漂移；
- `ref_exists` 声明式检查类型（workflow 引擎 + scan-docs.yaml 模板）：`{ type: ref_exists, min: N }` 要求文档至少含 N 条可核验引用，失败自动生成 retry prompt；
- scan-diff `staleRefs` 引用级漂移：scan 文档的 file:line 引用 × 基线后变更文件集交叉，输出「引用过时」清单（终端 + 报告，advisory 不计 driftCount）。

**P3（规划）**：scan IR sidecar（每文档 `*.facts.yaml`，claim+ref+token 三元组，供覆盖率和机器消费）；frontmatter 改 CLI 原子注入（消灭手抄，注意 complete-handlers.js 有并行 WIP，择机）；SKILL/提示词行为契约测试化；staleRefs 对接 docs-check 的 classifyFix 自动重锚建议。

**第二轮（2026-09-05，机制对账后落地）**：对照「为什么快」七机制逐项核账，补齐 token 效率侧三项——
- **机制 7 机械事实预咀嚼**：新模块 `src/scan-facts.js` + CLI `sillyspec scan facts [--path <子项目相对路径> --project <名>]`——确定性抽取 端点（endpoint-extractor 后端 + 前端调用）/ 依赖与 scripts / 源码规模 / git 基线，落 `docs/<project>/scan/_facts.md`（fail-soft，各段独立降级）。底稿引用为 cwd 相对 `path:line`，天然进入 scan_doc_ref_invalid 核验与 staleRefs 漂移追踪——**这份底稿即 scan IR 的机器半边**。
- **机制 2 阅读有合同/探索共享**：scan 步骤 3 改为「先跑 CLI 抽取，agent 只补机器拿不到的线索」；步骤 5 把 `_facts.md` 全文注入每个子代理，红线「禁止重新 grep 发现底稿覆盖的机械事实，冲突以底稿为准」——探索 token 不再按子代理数量重复计费。quick 档同步。
- **机制 5 机器校验替代 agent 自检**：步骤 5 删去「验证文件是否生成且非空」的自检指令，产物校验全权交给 workflow check（file_exists/ref_exists）与 postcheck（scan_doc_ref_invalid）。
- 测试 `test/scan-facts.test.mjs`（17 断言：双语言类型判定/依赖解析/端点引用形态/collectDocRefs 消费/截断/空目录/子项目锚定）。

**仍未做（agent 半边 IR 等）**：机制 1 的完整形态（agent claims sidecar）、机制 4 的 acceptsFix 机器验证修复建议——维持走正式 change 的判断。

## 五、风险与边界

- **agent 写 IR 的格式纪律**是最大风险（frontmatter 手抄前科）——P2 起 IR 校验失败应降级 warning + retry_prompts 重试，不 fail-closed。
- **SillyHub 对 postcheck-result.json 的消费契约**本仓不可见——本次改动全部 additive 字段，不改既有字段语义。
- **REF_RE 扩展**会让存量文档中此前被忽略的 .ts/.py 引用进入核验范围。注意 **docs-gate ratchet 只拦增量不吸收增量**（基线 0 时新失效必红 gate）——存量失效必须在同一变更内消化：本仓 2026-09-04 已消化（sillyhub-path-a-contract.md 的 10 处跨仓 .py 引用改 `repo://sillyhub/backend/app/...` 前缀、troubleshooting.md 的 pytest 示例记法改为不可命中形态）。
- **存量项目的 scan-docs.yaml 是 init 时复制的副本**，模板加约束只惠及新 init 项目，存量需迁移（P1c 的 prompt 侧改动不受此影响，prompt 在 CLI 内）。
- 不要全量 IR 化：CONCERNS/约定提炼等判断型内容保持 agent 散文，只结构化机械可验证子集——archify 能像素级校验是因为图的 schema 是闭集，代码世界不是。
