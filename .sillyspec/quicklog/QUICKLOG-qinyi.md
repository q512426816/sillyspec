
## ql-20260919-013-2c0e | 2026-09-19 11:11:09 | postmortem：ceremony 级联顺序死锁——追赶检查点末位 vs 双跑 error 先拦
状态：进行中
关联变更：（无）
文件：（见实际改动）

## ql-20260919-014-533f | 2026-09-19 13:42:22 | 双跑事实面 checkpoint 污染修复（five-cuts 实证 45 文件虚增 23 条）
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：双跑事实面 checkpoint 污染修复（five-cuts 实证 45 文件虚增 23 条）
根因：两处基线缺陷：resolveMainChangedFiles 主仓区间并集的反向区间（主仓 HEAD 未前移时 checkpoint 内容显示为删除照样列名）+ resolveVerifyChangedFiles 已提交补齐块 merge-base 假设失效（checkpoint 落 worktree 分支，merge-base 指到 checkpoint 之前）
方案：主仓侧窗口改锚 fork 点 merge-base(HEAD,diffBase)（主仓没动则窗口空、wt-commit 流语义不变、不可得退旧区间）；补齐块基线优先 meta 锚点 baselineCommit>actualBaseHash>baseHash 三级；真 worktree fixture 回归钉（用例 6：checkpoint 上 overlay+真实提交，断言事实面只含真实改动——首跑复现污染，修复后过）
结果：【实测门 skip（审计）：门内 3/3 脆断于无关文件 verify-required-evidence-check（155-171ms 'test failed'），该文件在 5 上下文全绿——单跑/与变更文件配对/5 文件模拟/门同款 30 文件 deps 命令 spawnSync/同命令 execSync——不可复现，疑门环境特有（CLI 进程内派生差异），留痕待查】变更面实测：verify-postcheck-worktree 6/6 绿（含新用例 6）、相邻 verify-postcheck-module 88 绿、cross-repo 26 绿、全量两轮仅已知 docs-check 环境红、lint 686 文件绿

## ql-20260919-015-85ab | 2026-09-19 16:04:04 | ceremony 级联死锁修复：双跑低报自动追赶重定价
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：ceremony 级联死锁修复：双跑低报自动追赶重定价
根因：ql-013 postmortem：声明追赶检查点位于完成级联末位（escalateCeremonyTierAtGate），双跑 error 在 verify postcheck 更早拦住 --done——级联走不到末位追赶永不执行，gate 提示『由阶段门重定价』时序不可达，five-cuts 实证 3 轮 --done 卡死只能手动改档位文件
方案：runCeremonyDualRunCheck mismatch 分支内先按事实面执行追赶（applyDeclarationCatchUp 同款三分支语义：transitions 空→整档换 factTier、非空→max(factTier,地板)），写回档位文件+violation message 附『已自动重定价，重跑即过勿手动改档』；本次仍 error（低报惩罚保留，friction +1 已记）；fail-soft 异常降级留痕
结果：行为验证三分支全绿（空迁移 S1→S3/地板托底/写回读回链）；回归 verify-postcheck-worktree 6+module 88+ceremony-tier 104 全绿；lint 688 绿；低报语义不变（仍 error+记账），死的只是『提示不可达』的时序盲点

## ql-20260919-016-6b17 | 2026-09-19 18:41:25 | 恢复主仓 map blast 段（span-risk 会话 known-issues 登记的活风险收口）
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：恢复主仓 map blast 段（span-risk 会话 known-issues 登记的活风险收口）
根因：five-cuts 归档走 --skip-apply：30 前缀 blast 自举表只存在于悬空提交 bbe30ab（分支已删），主仓 map 无 blast 段——evidence 门全失效（declarations=0 → evidenceRequired 恒 false）、会话/租约域变更判 S1 逃顶档
方案：git show bbe30ab:.sillyspec/.../_module-map.yaml 提取 blast 段（39 行 3 条目）追加回主仓 map；known-issues 条目标记已修复
结果：三档走位复验全绿：会话域 S3+evidence（2 hits）/门禁判定面 S2（2 hits）/零声明面 S1；blast-surface 27+rebuild-preserve 8 回归绿

## ql-20260919-017-fa4d | 2026-09-19 18:46:01 | pre-push 测试债清偿：main 四处预存测试失败（536/5→542/542 绿）
状态：已完成
关联变更：（无）
文件：
- test/stage-review-checklist.test.mjs（字面锚对齐 five-cuts D-009 现行措辞（evidence:true 声明面），逻辑零改动）
- test/docs-check-fix.test.mjs（stripHint 按既定先例补 dab74fc 指引行过滤）
- test/final-four-fixes.test.mjs（夹具补 blast 声明面恢复证据门对照前提（D-009 架构））
- test/review-material-pack.test.mjs（六处相对路径锚 REPO_ROOT（cwd 无关））
- src/run/command.js（flag 校验+help 短路块上移至 quick 会话生成前（零副作用契约恢复））
- docs/sillyspec/platform-interface-map.md（command.js 行号位移三锚更新）
需求：pre-push 测试债清偿：main 四处预存测试失败（536/5→542/542 绿）
根因：四处债均非 span-risk-pattern-migration 引入（stash A/B+基点复测归属）：①checklist 字面锚滞后 five-cuts D-009 措辞（判级 critical→evidence:true）②docs-check-fix S7 字节对照钉漏过滤 dab74fc 裸文件名指引行③final-four-fixes 证据门夹具未随 D-009 声明面架构现代化（无 blast 声明→evidence 空过，当时被 worktree 环境失败族掩住）④run quick --help 副作用回归——--input 门上移后 flag 校验/help 短路仍后会话生成/owner 落盘/agent-log 上报（幻影会话实测）+未知 flag 被 --input 门先拦；⑤review-material-pack 六处相对路径吃 process.cwd（套件 chdir 污染）
方案：①②③⑤测试侧：字面锚对齐现行契约/stripHint 补新演化行过滤/夹具补 blast 声明面（src/server.js evidence:true）/全文件 REPO_ROOT 绝对锚（import.meta.url 推仓根）；④src 侧：flag 校验+--help 短路块（FLAG_SEMANTIC_HINTS/knownFlags/fail-fast/短路，71 行自包含）整块上移至 quick 会话生成之前，未知 flag 先于 --input 语义门（形态错>语义缺），--input 门 help 豁免留作纵深防御；command.js 行号位移连带更新 platform-interface-map.md 三处锚
结果：全量 npm test 542/542 绿（修复前 536/5）+npm run lint 全绿（690 文件未引用导出 0）；六文件=src/run/command.js+4 测试文件+1 文档；src/knowledge-stats.js 与 src/run/shared.js 为并行会话在途面不属本条（显式排除声明）
审计：[gate] L1（跨 2 模块 · 8 文件：3 代码/4 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量已含
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/knowledge-stats.js, src/run/shared.js

## ql-20260919-018-640f | 2026-09-19 18:55:49 | 自举声明表校验钉——blast/span_risk 段丢失防复发（今日 blast 段丢失事故的结构性收口）
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：自举声明表校验钉——blast/span_risk 段丢失防复发（今日 blast 段丢失事故的结构性收口）
根因：five-cuts 归档 skip-apply 遗留：主仓 map blast 段整体缺失，loadBlastDeclarations 返 0——evidence 门恒 false、会话域逃顶档，丢段不报错是安静地不设防；今日已手工恢复（ql-016）但缺口仍在（任何 map 重写/skip-apply 可复发）
方案：NEW:test/bootstrap-declaration-pin.test.mjs 三组 11 断言：blast ≥3 条目+域前缀在场+evidence ≥1+门禁 S2 在场 / span_risk ≥9 token+两族在场 / 三档走位语义钉（worktree→S3+evidence、stage-contract→S2、datetime→S1）——丢段 CI 即红且失败信息带恢复路径先例；连带：conventions 撞词条回填首日实测数字（单价 1/4 已验证非估计）；审计 tag 回收（对象已进 main）
结果：钉 11/11 绿（含一次自身 bug 修正：loader 返回编译对象数组取 .pattern）；lint 含新测试文件

## ql-20260919-019-344f | 2026-09-19 19:16:24 | 钩子 #1
状态：已完成
关联变更：（无）
文件：src/knowledge-stats.js（+302/-0）
需求：钩子 #1
根因：quick 写面真空
方案：join+digest+事件+stats
结果：24/24+lint 绿
审计：📝 文档欠账（D-8）：1 个源码文件改动未同步任何模块文档（涉及模块：docs-consistency）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs-check-baseline

## ql-20260919-020-dddf | 2026-09-19 21:07:08 | plan full 分级判据去项目特化——「CLI + 平台 + DB 联动」改通用「跨技术层联动」
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（full 判据一行去项目特化）
- docs/prompt/plan.md（镜像同步手改（动态阶段 _sync 跳过））
- docs/prompt/_extracted.json（_extract.mjs 机械重生成）
- docs/prompt/index.html（_build-site.mjs 机械重生成）
需求：plan full 分级判据去项目特化——「CLI + 平台 + DB 联动」改通用「跨技术层联动」
根因：该判据 60a0109 首版按 SillySpec 自身架构写死，但 plan 阶段 prompt 随 CLI 下发到所有安装项目，前端/纯算法等项目里三层对不上号；仓库同概念先例（plan-execute-contract.md:155「前后端联动」）已是通用措辞
方案：src/stages/plan.js full 判据改「跨技术层联动（同一变更需多层协同改造，如前端 + 服务端 + 数据库）」保留多层协同意图；镜像 docs/prompt/plan.md 手改同步（动态阶段 _sync 跳过）；既定流水线 _extract.mjs + _build-site.mjs 重生成 _extracted.json/index.html，plan#3 附带路径物化机械差异（HEAD 基线内嵌临时 worktree 绝对路径→主仓根，非语义变更）
结果：plan 系 21 测试文件 32/32 绿（含镜像同步测试）；旧文案全仓 0 残留；quick --done 门禁实测全量 npm test + lint
审计：[gate] L1（跨 1 模块 · 4 文件：1 代码/0 测试）advisory；每文件注记已全覆盖；测试增量不适用（≤1 代码文件）

## ql-20260919-021-b5de | 2026-09-19 21:29:03 | 通用性审计第二批——shipped prompt 九处具体项目专名清理（真实仓名/真实DTO/自身模块名/消费者命令名→中性占位或通用示例）
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（数据流示例中性化+sub-grid→user-service）
- src/stages/brainstorm-auto.js（AC-006 核心模块定义通用化）
- src/stages/plan.js（UserDTO+reason 通用化+<repo-key> 反例）
- src/stages/execute.js（契约措辞 provider→consumer+Python 陷阱去专名）
- docs/prompt/brainstorm.md（_sync 自动同步）
- docs/prompt/brainstorm-auto.md（_sync 自动同步）
- docs/prompt/plan.md（动态镜像手改）
- docs/prompt/_extracted.json（机械重生成）
- docs/prompt/index.html（机械重生成）
需求：通用性审计第二批——shipped prompt 九处具体项目专名清理（真实仓名/真实DTO/自身模块名/消费者命令名→中性占位或通用示例）
根因：工具定位通用，prompt 演化期把 dogfood 与消费者项目的真实实体（sub-grid-security/DaemonRuntimeRead/budget_tokens 数据流/import app·gen:types/AC-006 四模块名）当示例写进了随 CLI 下发所有项目的模板
方案：九处纯文案改中性：AC-006 核心模块定义通用化；数据流示例换中性实体；sub-grid-security→user-service/<repo-key>；DaemonRuntimeRead→UserDTO；related_tests reason 去消费者重构故事；契约注入措辞去前端/后端框架改 provider→consumer；Python 陷阱段去消费者命令与目录名（陷阱语义保留）。行为零变更；静态镜像 _sync 自动同步、plan.md 手改、_extracted/_build-site 重生成
结果：靶向测试 89/89 绿；_verify 镜像失配 14=基线持平零新增；shipped 面专名残留 0（仓内代码注释 3 处 provenance 不下发保留）；quick --done 门禁实测全量 test+lint
审计：[gate] L1（跨 1 模块 · 9 文件：4 代码/0 测试）advisory；每文件注记已全覆盖；测试增量缺失（4 个代码文件无测试改动）

## ql-20260919-022-1c3d | 2026-09-19 21:47:01 | 通用性审计第三批——CLI 运行时消息与 scan 示例六处消费者专名清理（api-types/gen…
状态：已完成
关联变更：（无）
文件：
- src/worktree-apply.js（apply 警告去 api-types/gen:types）
- src/worktree.js（doctor 提示去 gen:types/backend）
- src/run/verify-quality-scan.js（归因提示同款）
- src/run/quick-audit.js（假 M 归因同款）
- src/config-schema.js（gate_snapshot note 同款）
- src/stages/scan.js（示例项目名改 demo-platform）
- docs/prompt/scan.md（_sync 自动同步）
- docs/prompt/_extracted.json（机械重生成）
- docs/prompt/index.html（机械重生成）
需求：通用性审计第三批——CLI 运行时消息与 scan 示例六处消费者专名清理（api-types/gen:types/backend 路径/multi-agent-platform→中性表述）
根因：上批只扫 stage prompt 模板面，worktree-apply/worktree/verify-quality-scan/quick-audit 四模块运行时消息、config-schema note、scan 示例 YAML 仍带消费者项目真实命令与项目名
方案：六处纯文案：生成产物示例改「类型生成/代码生成产物类」、doctor PYTHONPATH 示例改 <项目源码根>、scan 示例 project 改 demo-platform；行为零变更；scan.md _sync 自动同步+_extracted/_build-site 重生成
结果：靶向 160/160 绿（71 测试文件）；_verify 失配 14=基线持平；全 src+镜像+产物专名残留 0；quick --done 门禁实测全量 test+lint

## ql-20260920-001-63a5 | 2026-09-20 00:11:15 | quick门禁monorepo子包感知修复——codeFiles分类器只认仓根src/test前缀，子包代码被误判纯doc跳过实测
状态：已完成
关联变更：（无）
文件：
- src/run/quick-audit.js（codeFiles双通道分类器（段匹配+扩展名兜底））
- test/quick-test-gate.test.mjs（3b子包用例+长名防误蹭断言）
- .sillyspec/docs/sillyspec/modules/runtime.changelog.md（边车登记ql-20260920-001）
需求：quick门禁monorepo子包感知修复——codeFiles分类器只认仓根src/test前缀，子包代码被误判纯doc跳过实测
根因：2026-09-19 multi-agent-platform回带收口实证：6个sillyhub-daemon/src/**与frontend/src/**文件触发「纯doc/配置改动SKIP」，门禁漏跑=静默放行代码变更
方案：run/quick-audit.js分类器改双通道：①路径段全等匹配（任意层src/test/tests/__tests__段，src-guide长名不误蹭）②代码扩展名兜底（ts/tsx/py/go等20+后缀，覆盖backend/app/**.py类目录约定外代码）；方向取宁可多跑不可漏跑；测试补3b用例（子包三路径不再skip）+长名防误蹭断言；runtime changelog边车登记
结果：quick-test-gate 28/28全绿（24→28）；CLI --done门禁亲跑（修复后src文件正确触发实测）

## ql-20260920-002-e219 | 2026-09-20 01:34:16 | P0批四件——对撞实验2.25倍token差距的三大浪费源+假红根因收口
状态：已完成
关联变更：（无）
文件：
- src/stages/plan.js（填卡默认主代理）
- src/stages/brainstorm.js（薄跑判定段）
- src/run/complete.js（detectVerifyBatchFinish）
- src/run/gate-snapshot.js（三方取新+行尾归一）
- test/verify-batch-finish.test.mjs（8断言）
- test/verify-gate-snapshot.test.mjs（双写回归钉）
- test/plan-optimization.test.mjs（步名断言）
- docs/prompt镜像（brainstorm同步）
- 两changelog（边车登记）
需求：P0批四件——对撞实验2.25倍token差距的三大浪费源+假红根因收口
根因：对撞实验实测：填卡子代理6.7M誊写税/brainstorm已收敛需求走全仪20分钟/verify尾巴110req肥上下文编排/主仓直写时快照拿陈旧worktree盖新导出致import假红
方案：①plan.js填卡默认主代理直填（≤8任务或单仓不派；>8且跨模块才batch≤3）②brainstorm.js探索步薄跑判定（已收敛直书；Grill/规范文件永不薄）③complete.js detectVerifyBatchFinish（结论已填+facts在场+锚定步过→剩余step一次标完；门禁照常全跑）④gate-snapshot.js三方取新+行尾归一防autocrlf误判
结果：verify-batch-finish 8/8+gate-snapshot 5/5含双写回归钉+全量544/0+lint 694绿+镜像14=旧基线持平

## ql-20260920-003-04cf | 2026-09-20 07:21:50 | P1-5 v1 阶段跑者瘦会话——handoff命令+阶段完成尾提示
状态：已完成
关联变更：（无）
文件：
- src/handoff.js（新模块）
- src/index.js（dispatch case）
- src/run/complete.js（尾提示）
- test/handoff.test.mjs（12断言）
- _module-map.yaml+cli-entry.changelog（登记）
- platform-interface-map.md（锚重锚）
需求：P1-5 v1 阶段跑者瘦会话——handoff命令+阶段完成尾提示
根因：对撞实验实测主会话203请求63M肥上下文重发税；CLI prompt自足缺的只是可粘贴交接块
方案：src/handoff.js（nextStageSuggestion四态+buildHandoff交接块）+index.js dispatch+complete.js四阶段完成尾提示+module-map登记
结果：handoff 12/12（CLI实跑夹具）；全量545/0；lint 696绿；docs锚--fix重锚

## ql-20260920-004-3ad6 | 2026-09-20 08:28:38 | run写路径所有权断言——双写碰撞直接根因修复（claim不抢不拒但写操作无assert）
状态：已完成
关联变更：（无）
文件：
- src/run/command.js（写路径断言块）
- test/change-owner-write-guard.test.mjs（五态端到端）
- runtime.changelog.md（ql-003）
需求：run写路径所有权断言——双写碰撞直接根因修复（claim不抢不拒但写操作无assert）
根因：今晚两会话并行驱动fr-index-l2，非owner会话三条--done直通落库步骤槽混写；断言只在apply/cleanup/assess接管类
方案：command.js claim块后写flag断言（done/reset/reopen/skip/answer/confirm/files）：self放行/stale放行自动接管/他人活跃结构化拒绝（owner指认+逃生阀+指引）；读路径与default不拦；quick恒self；fail-open
结果：9/9（直跑+套件双绿，hermetic HOME与import.meta.url两套件坑排掉）；全量548/0；lint绿；runtime边车登记

## ql-20260920-005-440a | 2026-09-20 08:35:44 | fr-index 追平两小刀（用户裁决）：①全文锚——新条目自动加「全文：.sillyspec/changes/archive/<变更>/requirements.md#FR-<局部号>」引用行（不复制正文零体积税；backfill同步补存…
状态：进行中
关联变更：（无）
文件：src/fr-index.js, src/run/prompt.js, test/fr-index-l2.test.mjs

## ql-20260920-006-f534 | 2026-09-20 09:00:14 | fr-index scenario-loss 检测（对撞对比唯一剩余内容差距，对标 OpenSpec 同名检查）：承接翻链时比对新旧条目场景集——被取代条目的场景名（场景正文行- 场景：X与摘要行；分隔）若在新FR的scenarios集（含…
状态：进行中
关联变更：（无）
文件：src/fr-index.js, test/fr-index-l2.test.mjs

## ql-20260920-007-c8a2 | 2026-09-20 10:45:40 | ceremony 项目化定价——S0~S3 判定阈值进 local.yaml（对话裁决：每个项目体系不一样）
状态：已完成
关联变更：（无）
文件：
- src/ceremony-tier.js（config参+normalizeTierConfig）
- src/ceremony-config.js（读取器）
- src/review-tier.js+src/verify-postcheck.js（双跑注入）
- src/config-schema.js（五键+模板）
- test/ceremony-pricing-config.test.mjs（18断言）
- module-map+core-engine.changelog（登记）
需求：ceremony 项目化定价——S0~S3 判定阈值进 local.yaml（对话裁决：每个项目体系不一样）
根因：三轴阈值/缺省档/五级映射硬编码引擎常量，项目无法按体系调参只能改源码
方案：computeCeremonyTier config 参五键（default_tier/span两阈值/friction起爆线/risk_tier_map部分覆写；非法回退+留痕；纯函数保持；只升不降无出口）+ceremony-config.js读取器+review-tier/verify-postcheck双跑同源注入+config-schema五键+example模板
结果：18/18直测+ceremony-tier 111/111零回归+config-schema 390/390+全量549/0+lint 701绿

## ql-20260920-008-ec1c | 2026-09-20 11:18:32 | 审查经济学三律——前置阶段23分钟审查等待的结构性收口
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（Grill三律块）
- src/stages/plan.js（审查步第7条）
- src/stages/execute.js（QA三律块）
- docs/prompt镜像（sync）
需求：审查经济学三律——前置阶段23分钟审查等待的结构性收口
根因：Grill 48请求17分钟+plan审查6分钟+FAIL重开全文复审，三轮占brainstorm+plan总时43%
方案：三阶段prompt同款：①预算硬钳（12/10/15分档，到达即verdict）②FAIL后resume原子代理+diff只验阻断项（5倍差实证）③run_in_background派发+主链先走+--done前回收（门禁照常）
结果：549/0+lint绿+镜像14=基线持平；纯prompt指引零gate改动

## ql-20260920-009-2045 | 2026-09-20 11:35:30 | 审查只读纪律（第四律）——补三律缺口：审查子代理是法医不是外科医生，禁越权改被审产物
状态：已完成
关联变更：（无）
文件：
- src/stages/brainstorm.js（第四律全文）
- src/stages/plan.js（④浓缩）
- src/stages/execute.js（④浓缩）
- docs/prompt镜像（同步）
- stages.changelog.md（登记）
需求：审查只读纪律（第四律）——补三律缺口：审查子代理是法医不是外科医生，禁越权改被审产物
根因：新会话铁证：Grill审查员在主会话零请求窗口直接Edit design.md 15处（独立性破坏/责任链断裂/48回合爆炸）；③并行化下后台改文件与主链前台写=同文件双写竞态
方案：brainstorm全文版第四律+plan/execute浓缩版④：工具面只读（Read/Grep/只读Bash），禁Edit/Write被审产物，唯一可写review.json，发现问题写checklist/blockers由主代理修；镜像同步
结果：镜像14=基线持平；lint 701绿；全量549/0；stages changelog登记
