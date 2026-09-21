
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

## ql-20260920-010-7a19 | 2026-09-20 14:14:27 | 质量扫描伪影分诊+失败签名去重+module缺省收窄（对撞三轮68分钟单步机制收口）
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（classifyTestFailureArtifact 四类伪影签名纯函数+runVerifyTestCheck 缺省收窄（defaultedToModule 三处可见面））
- src/run/verify-quality-scan.js（dedupKey/台账读取/去重判定/分诊编排+executeVerifyQualityScan 入口对账与主树对照接线）
- src/config-schema.js（test_strategy desc 缺省语义登记）
- test/verify-artifact-triage.test.mjs（新建，分诊/去重/缺省三面测试）
- test/gate-snapshot-monorepo.test.mjs（venv junction 回归钉（修复一 b））
需求：质量扫描伪影分诊+失败签名去重+module缺省收窄（对撞三轮68分钟单步机制收口）
根因：对撞三轮实证 verify 质量扫描单步 68 分钟（旧版同位 9 分钟）：构成=agent 反复触发门禁的多轮重跑+三连假红重试（9.7+8.2+7.8 分钟），假红根因全是工具/环境自身缺陷而非被测代码；等待结构封顶了 prompt 级修复的收益，需 CLI 机制级收口
方案：三件：①d 失败签名去重——computeQualityScanDedupKey（代码指纹+known_failures 豁免面哈希，指纹不含豁免面而补救路径恰恰靠它）+loadLastQualityScanRecord+shouldReuseLastFailedScan 纯函数+executeVerifyQualityScan 入口对账（失败签名未变→跳过重跑重放阻断与出路指引，逃生阀 SILLYSPEC_VERIFY_QUALITY_SCAN_RERUN）；②a 伪影分诊——classifyTestFailureArtifact 四类签名（env 缺件/overlay 缺模块/CRLF/判账假阳性）+applyArtifactTriageRerun 编排（快照口径失败命中→主树单点复跑对照：过=伪影坐实放行/仍挂=真失败拦截，分诊永不单独放行）；③c modules 已配未显式 test_strategy 缺省收窄 module（未配仓零打扰，config-schema 登记）。附 b 项裁决为非活 bug（venv junction 2026-09-12 已落地，第三轮台账实证生效）补回归钉
结果：test/verify-artifact-triage.test.mjs 13/13（分诊四类+对照/编排四态/去重矩阵+E2E 五连含豁免补救闭环/缺省收窄+双对照）+gate-snapshot-monorepo 6/6（venv junction 钉）+邻接回归 11/11+plan 侧 13/13+lint 703 绿；全量 npm test 收尾门禁实测通过
审计：[gate] L2（跨 4 模块 · 13 文件：4 代码/3 测试）advisory；模块文档认领缺失（同步模块卡进改动集，或 --no-docs 显式豁免）
审计：⚖️ 归属切分：2 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：src/stages/plan-postcheck.js, test/plan-wave-structure-guard.test.mjs

## ql-20260920-011-c0d4 | 2026-09-20 14:37:34 | Wave 拓扑守卫：plan-postcheck 可合并相邻波对差值判据（伪并行串行链硬拦+深链 advisory）
状态：已完成
关联变更：（无）
文件：
- src/stages/plan-postcheck.js（assessWaveStructure 导出+planPostcheck Wave 比对块接线（文件面加载/阈值判定/advisory 与 error 双出口））
- test/plan-wave-structure-guard.test.mjs（新建，纯函数五态+集成三态）
需求：Wave 拓扑守卫：plan-postcheck 可合并相邻波对差值判据（伪并行串行链硬拦+深链 advisory）
根因：对撞三轮 plan 把 13 任务手排 6 波全串行链（Wave N 依赖 Wave N-1，平均 2.2/波，Wave 5 单波 30 分钟），方向合法故被 planPostcheck『结构不一致但方向合法→静默放行』放过，execute 108 分钟并行度归零（旧版同任务 4 波 75 分钟）
方案：assessWaveStructure 纯函数（可合并相邻波对=相邻波间无 depends_on 依赖边且 allowed_paths 并集无交集；≥2→ERROR 硬拦带具体可并入对与 plan-adopt-waves 出口；显式波数=拓扑最小且≥5→advisory 深链提示核 depends_on 过声明不阻断——真串行链合法放行）；planPostcheck 显式 Wave 比对块接线（wavePathSets 任务卡加载，卡片缺失按空面同 validateWaveProposal 口径）；刻意不用波数≥5+平均<2.5 启发式（会误伤真依赖链：链深 N≥5 平均=1 但串行合法）；topoSortWaves 本身 Kahn 最早可行层不保守，不动排序只加拦截；同波共享文件分离合法不算可合并（双写竞态保护）
结果：test/plan-wave-structure-guard.test.mjs 8/8（纯函数五态含既有『单对保守串行不拦』语义保持+executePlanPostcheck 集成三态拦/放/advisory）+plan 侧回归 13/13+lint 703 绿；quick 收尾门禁实测

## ql-20260920-012-ff71 | 2026-09-20 15:11:17 | spec-sync 网络同步转后台异步执行——--done 不再被网络尾巴拖住分钟级
状态：已完成
关联变更：（无）
文件：
- src/run/bg-sync.js（新增：后台同步模块（父侧 spawn 决策/单飞锁/未连接预判；子侧清位-跑轮-查位循环+日志留痕））
- src/run/shared.js（triggerSync 入口接 bg 分支——默认后台化，三条件回落 inline（opts.inline/SILLYSPEC_SYNC_BG=0/bg 子进程回环））
- src/sync.js（新增 peekPlatformConnected——与 _getPlatform 同源判据的连接预判（未连接不 spawn 零开销））
- src/stages/quick.js（step2 末步预告补 --file-notes 仅末步生效的前置提示）
- test/spec-sync-bg.test.mjs（新增：锁判定五态+spawn 决策矩阵+e2e 真子进程+逃生阀，26 断言）
- test/platform-mode-trigger-sync.test.mjs（triggerSync 直调补 inline:true（断言进程内行为））
- test/platform-sync-quick-session-spectree.test.mjs（直调补 inline + CLI 子进程场景设 SILLYSPEC_SYNC_BG=0 保确定性）
- test/platform-sync-archive-final-state.test.mjs（triggerSync 直调补 inline:true）
- test/hub09-sync-circuit-abort.test.mjs（triggerSync 直调补 inline:true）
- test/spec-sync-abort-classification.test.mjs（triggerSync 直调补 inline:true）
- docs/sillyspec/platform-interface-map.md（triggerSync 后台化条目 + 锚点漂移修复（含 2 处基线存量债））
- docs/sillyspec/troubleshooting.md（新增条目 #67：网络尾巴拖住命令返回（后台异步化闭环））
- docs/sillyspec/prompt-control-debt.md（shared.js 锚点 1108→1131 漂移修复）
需求：spec-sync 网络同步转后台异步执行——--done 不再被网络尾巴拖住分钟级
根因：triggerSync 17 处 fire-and-forget，但在飞 fetch 拖住 Node 事件循环，CLI 打完输出仍要等网络收尾才返回 shell（用户实证末步 --done 约 4 分钟无中间输出易误判挂死；8s 熔断只封上限不治本）。次要：--file-notes 仅末步生效的提示只在 step3 prompt 可见，step2 传了被拒白跑一轮
方案：triggerSync 默认转 detached 后台子进程执行同步（新模块 run/bg-sync.js：未连接平台预判零开销不 spawn、单飞锁 pid+时效判活、活锁 rerunQueued 合并迟到状态、子进程输出留痕 .runtime/spec-sync-bg.log、后台轮预算 max(SILLYSPEC_SYNC_TIMEOUT_MS,45s) 5轮封顶；SILLYSPEC_SYNC_BG=0 逃生阀回落旧行为，bg 子进程回环强制 inline 防 fork 链），17 个调用点零改动受益；stages/quick.js step2 末步预告补 file-notes 前置提示
结果：新测试 26/26 断言绿（e2e：triggerSync 8ms 返回、同步经后台子进程到达服务器、锁自清、日志落盘；本仓实弹后台轮 2.5s 完成真实平台同步）；全量 npm test 553 文件 EXIT=0；lint 705 文件 0 告警；docs check 592/592 全绿（顺手修 2 处基线存量锚债）
审计：[gate] L1（跨 3 模块 · 14 文件：4 代码/6 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量已含
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.claude/CLAUDE.md

## ql-20260920-013-f8e3 | 2026-09-20 18:19:21 | brainstorm→quick 转轨变更僵尸状态闭合（scale:small 刻意转轨 linked quick --done 即收尾）
状态：已完成
关联变更：（无）
文件：
- src/run/complete-handlers.js（closeQuickLinkedChanges 转轨放行（scale:small 三信号判定豁免缺陷①②闸与无 tasks.md 判定，readDesignScale 动态导入破环 fail-safe，注释/JSDoc 补转轨段；--force-baseline 因核心收尾管线属危险面））
- test/quick-close-linked-changes.test.mjs（新增 6 转轨测试（主场景 closed/骨架全勾 closed/未勾行仍拦/scale:large 仍拦/无 scale 仍拦/in-progress 时近性照拦））
- docs/sillyspec/platform-interface-map.md（handleScanStageCompleted 锚随动 2267→2301（本改动在其上方插入所致，docs check 建议行号））
需求：brainstorm→quick 转轨变更僵尸状态闭合（scale:small 刻意转轨 linked quick --done 即收尾）
根因：closeQuickLinkedChanges 三闸对刻意转轨变更永真拦截——ql-20260819-010 阶段完成态闸（brainstorm --done 必置 completed）、缺陷②60min 时近性闸（转轨间隔天然分钟级）、tasks 判定（scale:small 按 brainstorm 末步约定不生成 tasks.md）——d192f89 原始目标场景被三闸全部误拦，linked quick --done 后变更永留 active/brainstorm 成僵尸（2026-09-20 daemon 三键变更实证：quick 17:27 完成提交 c1ce37e9e，change 仍 active/brainstorm last_active=17:26）
方案：closeQuickLinkedChanges 新增转轨判定：current_stage=brainstorm + stage_status=completed + design.md frontmatter scale:small 三信号齐=刻意转轨（复用 gates.js 既有 readDesignScale，动态 import 破环——gates 静态导入本模块；异常 fail-safe 按非转轨走原闸）。转轨变更豁免阶段完成态闸与时近性闸，tasks 判定按 quick 语义（无 tasks.md=无待办放行，文件存在仍按全勾、未勾行照拦）；scale=large/未写 scale 的「即将进 plan」在途变更两闸防护面零变动
结果：目标套件 22/22 全绿（16 既有护栏零回归+6 新增转轨测试全过）+邻接 quick-single-change-auto-link/progress-get-change-stage 10/10+lint 706 文件绿+全量 npm test 退出码 0

## ql-20260920-014-3174 | 2026-09-20 23:03:04 | gate-snapshot 祖先比对 trim 失真——verify 门快照误取主仓旧版致 worktree 交付假红
状态：已完成
关联变更：（无）
文件：src/run/gate-snapshot.js（+10/-4）, test/gate-snapshot-ancestor-trim.test.mjs（+86/-0）
需求：gate-snapshot 祖先比对 trim 失真——verify 门快照误取主仓旧版致 worktree 交付假红
根因：git() 助手全输出 trim，git show 祖先内容被剥尾换行与磁盘读取不对称，已存在文件恒误判双写分叉取主仓（taskcard-yaml-hardgate verify 实证）
方案：比较三侧统一 cmpText=normalizeEol+trim 对称口径（src/run/gate-snapshot.js 双写一致性段），首尾空白不参与分叉判定；--force-baseline 因修复对象即受保护文件本身
结果：直测 test/gate-snapshot-ancestor-trim.test.mjs 3/3（单侧修改取 worktree + 真分叉/陈旧 worktree 语义护栏）；CLI 实测 npm test 全量与 lint 本步门禁执行

## ql-20260920-015-e784 | 2026-09-20 23:25:07 | verify-probes --init 刷新通道缺失与段头宽收误收（问题B）
状态：已完成
关联变更：（无）
文件：src/index.js（+14/-4）, src/verify-probes.js（+3/-3）, test/api-coverage-matrix.test.mjs（+15/-0）
需求：verify-probes --init 刷新通道缺失与段头宽收误收（问题B）
根因：已存在不覆盖与骨架指引承诺的刷新路径矛盾；/api/i 无词边界把 OpenAPI 标题收进 sectionHint
方案：index.js 增 --force 全量重生成骨架带重置警告与备份指引（usage/help 同步）；两处骨架指引改写为 --init --force 可行操作；API_FACE_SECTION_RE 加词边界
结果：test/api-coverage-matrix.test.mjs 22/22 含新增词边界断言；node --check 双文件过；CLI 实测全量与 lint 本步门禁执行
审计：[gate] L1（跨 2 模块 · 3 文件：2 代码/1 测试）advisory；每文件注记缺失（--file-notes 覆盖变更文件全集）；测试增量已含

## ql-20260920-016-3185 | 2026-09-20 23:29:05 | 探针5本变更端点口径被整仓baseline击穿（问题C）
状态：已完成
关联变更：（无）
文件：src/contract-matrix.js（+26/-5）, test/probe5-change-relevant-surface.test.mjs（+70/-0）
需求：探针5本变更端点口径被整仓baseline击穿（问题C）
根因：change-relevant 判定为属于artifact端点集，artifact池是全仓baseline时全集命中，418存量端点误标本变更端点刷屏
方案：有变更文件面时改判端点定义源文件属于本变更diff面（providerFile归一双向endsWith，parityChanged一次解析两用）；面不可得回退artifact口径、无artifact回退全列零回归
结果：新增test/probe5-change-relevant-surface.test.mjs两用例（整仓baseline夹具只变更文件端点进relevant加无changeName回退护栏）；probe5全家五件13/13；CLI实测全量与lint本步门禁执行

## ql-20260920-017-77b0 | 2026-09-20 23:34:39 | 问题D+E：①gate/verify --done 失败明细只活在 stdout（宿主转后台截断即丢，2026-09-20 报告实证 target_files ②类逐条明细没被取回靠推断绕 3 轮）②known_failures 豁免提示不…
状态：进行中
关联变更：（无）
文件：src/machine-interface.js, src/index.js, src/run/gates.js, test/gate-failure-artifact.test.mjs

## ql-20260921-001-2dbf | 2026-09-21 00:52:38 | R4-S-Q 两个 CLI 缺陷修复：资产尾 changelog 边车缺 export 死路 + --done 显式关联变更被静默丢弃
状态：已完成
关联变更：（无）
文件：
- src/run/shared.js（loadQuickModuleIndex 补 export（R4-S-Q 缺陷 A））
- src/run/complete-handlers.js（mergeGuardLinkedChanges 纯函数+guard 并入回写（缺陷 B 核心））
- src/run/complete.js（completeStep 解构与 handler 透传两处接线）
- test/quick-asset-tail.test.mjs（§8 回归 10 断言（真实 import+merge 语义+接线源文本钉））
- docs/sillyspec/platform-interface-map.md（行号锚重锚 8 处（含并行会话遗留 7 处机械修复））
需求：R4-S-Q 两个 CLI 缺陷修复：资产尾 changelog 边车缺 export 死路 + --done 显式关联变更被静默丢弃
根因：R4 对照实验细读实证：①complete-handlers 动态 import 解构 loadQuickModuleIndex 得 undefined（shared.js 缺 export），资产尾②调用即 TypeError 被 fail-open 吞，changelog 边车整条死路（§7 单测直接模拟 join 语义未走真实 import，故漏检）；②--linked-changes 在 --done 时经 runStage opts 传入但 completeStep 解构与 handleQuickStageCompletion 签名均无此参，guard 只读落盘文件——两次 --done 均带 flag 而蒸馏尾零触发、quicklog 渲染『关联变更：（无）』
方案：A=shared.js:1294 补 export；B=complete.js 解构+调用两处透传、complete-handlers 签名增两参、新增导出纯函数 mergeGuardLinkedChanges（并集去重保序/'none' 清空 manual 面/auto 独立并集/无变化返回原引用免回写/guard 非对象原样返回）在 guard 读取后并入并回写 sessionGuardFile（brownfield 不造对象，回写 fail-open）；test/quick-asset-tail.test.mjs 增 §8 回归 10 断言（真实 import 钉 A、merge 六面、接线源文本钉两处）；docs 重锚 8 处（我 1 处 2365→2400 + 并行会话 794529e5 遗留 7 处 index.js 锚，docs check --fix 机械）
结果：quick 门禁实测 npm test 40+558/558 全绿（含 doc-ref-check 88/88）+ npm run lint 通过（712 文件、未引用导出 0）；quick-asset-tail 本文件 35/35（新增 §8 十断言）；未发版（3.29.4 之后随批）

## ql-20260921-002-161e | 2026-09-21 01:17:18 | R4 对撞反馈四修复：门禁 fail-fast 前置 + lint 归属鉴定降档（quick/verify 两门）+ advisory 计数歧义 + 守卫一键放…
状态：已完成
关联变更：（无）
文件：
- src/run/gates.js（fail-fast 前置块+lint 归属鉴定降档分支）
- src/verify-postcheck.js（extractLintFailureFiles/triageLintOwnership 导出+failureFiles 字段+计数措辞）
- src/run/quick-audit.js（quick 门 lint 失败归属鉴定接线）
- src/index.js（worktree 守卫一键放行整行）
- src/run/command.js（多实例守卫一键指定整行）
- test/lint-ownership-failfast.test.mjs（21 断言（提取6+判定6+源序钉5+接线措辞4））
- docs/sillyspec/*.md×4+core-engine.md（行号锚机械重锚+陈锚手工修）
需求：R4 对撞反馈四修复：门禁 fail-fast 前置 + lint 归属鉴定降档（quick/verify 两门）+ advisory 计数歧义 + 守卫一键放行整行
根因：R4-S-F/S-Q 对撞实证：①死信/预填注等纯文档 blocking 检查排在 9 分钟级 test+lint 实测门后，文档未清每轮 --done 先白烧门禁再被拦（R4-S-F 166min 主形状，db 计数死信拦 1 次+lint 硬拦 7 次）②lint 硬门在隔离快照含 HEAD 存量债文件时恒败（债文件不在变更归属集，agent 被逼范围外清偿或逃生口），quick 与 verify 两门同根因只修一侧另一侧重演 ③观察期计数『失败累计 1/1 次』读作 1-of-1 歧义 ④worktree 守卫与 monorepo 多实例拦的放行 flag 组合（--allow-worktree-cwd + --spec-dir）agent 试 3 次才拼对，报错只给 flag 名不给整行
方案：①gates.js 死信探针+预填注 error 门整块前移到 verify 实测门前（纯排序，语义文案 rollback 类型零变化，原位留已前移标记）②verify-postcheck.js 新增导出纯函数 extractLintFailureFiles（token 化剥引号行号尾缀+带分隔符代码扩展名口径）与 triageLintOwnership（owned/pre-existing/unattributable 三态双向 endsBy 归一），runVerifyLintCheck 返回值增 failureFiles 全文口径字段；gates.js verify lint 硬拦分支与 quick-audit.js quick 门失败分支同接：pre-existing 存量债→advisory 降档放行带清偿建议，owned/无路径可鉴定→维持硬拦保守 ③措辞改实测 N 次中失败 M 次 ④index.js（补 ancestorSpecDirs import）与 command.js 两守卫各附 sillyspec 原命令+双 flag 一键放行整行
结果：test/lint-ownership-failfast.test.mjs 新增 21 断言全绿；受影响既有件 quick-test-gate 28/0、quick-gate-snapshot 绿（无路径输出用例走 unattributable 维持硬拦语义兼容）；全量 npm test 40+559/559 + npm run lint 通过（713 文件）；docs check 重锚 4 活文档+手工修 core-engine.md pickModuleMapProject 陈锚（符号已迁 scope-audit.js:523）；未发版

## ql-20260921-003-c047 | 2026-09-21 01:40:28 | 纯超时失败降档 advisory——R4 门禁价值考古 36/106 假拦最大单一来源的根治
状态：已完成
关联变更：（无）
文件：
- src/verify-postcheck.js（isTimeoutOnlyTestFailure 纯函数+modules 单元数组）
- src/run/gates.js（verify test 门纯超时降档分支）
- src/run/quick-audit.js（quick test 门同接）
- test/test-timeout-downgrade.test.mjs（11 断言）
- docs/sillyspec/*.md（行号锚机械重锚）
需求：纯超时失败降档 advisory——R4 门禁价值考古 36/106 假拦最大单一来源的根治
根因：round4/gate-value-audit.md 考古实证：2 个月 227 次有效 test 门 106 败里 36 次（34%）是 600s 帽杀纯超时——超时=未完成非测试挂，硬拦只是浪费一轮门禁并逼 agent 全流程重跑；尾截 46 次不可判的根因同源（全量跑太长）
方案：verify-postcheck 新增导出纯函数 isTimeoutOnlyTestFailure（module 模式逐失败单元 reason 判超时/full 模式整体 reason，任一真实挂测或不可鉴定→false 保守硬拦）+ runModuleSubset 结果补 modules 单元数组；gates.js verify test 门与 quick-audit.js quick 门失败分支同接：纯超时→advisory 带三路处置指引（modules 块模块子集/定向复跑/SILLYSPEC_TEST_TIMEOUT_MS），真实失败 rollback 语义逐字不变——真拦 12 次的防线不动
结果：test/test-timeout-downgrade.test.mjs 新增 11 断言全绿（纯函数 8 面+两门接线源钉+单元数组源钉）；全量 npm test 40+561/561+lint 过；docs check --fix 重锚 5 活文档；平台仓 local.yaml modules 块另案补全 22 模块+be-core（extractModules 39 条目解析全命中验证，机器本地不入库）；未发版

## ql-20260921-004-61a4 | 2026-09-21 02:08:33 | R4 对撞深读三修复：gate verify lint parity + module-impact 引号/多项目 map + Wave 并发帽
状态：已完成
关联变更：（无）
文件：
- src/module-impact.js（引号剥壳+联合归类+classified 结构化+sidecar 按项目落位）
- src/machine-interface.js（runGate verify 补 verify-lint（同引擎归属降档+口径明示+fail-open））
- src/diagnostic-codes.js（verify_lint_failed 注册）
- src/stages/execute.js（显式 Wave 并发帽 ≤3 双行注入）
- docs/prompt/_extracted.json（镜像流水线同步（含 quick.md 存量漂移追平））
- test/r4-followup-fixes.test.mjs（新增 25 断言回归）
- test/plan-execute-contract.test.mjs（新契约钉更新）
- test/knife-batch2.test.mjs（synced 项目前缀期望更新）
- test/dispatch/execute-dispatch-integration.test.mjs（并发帽句更新）
需求：R4 对撞深读三修复：gate verify lint parity + module-impact 引号/多项目 map + Wave 并发帽
根因：①gate verify 只查 test 不查 lint，与 verify --done 的 lint 隔离快照门两套口径——R4-S-F 会话 db 实证 gate PASS 与 --done FAIL 并存、误导 agent 诊断 16 分钟；②module-impact 双机械 bug——parseModuleMapPaths 不剥引号致带引号 map 条目全死路径（对撞仓 frontend map 790 条几乎全带引号），且多项目仓只取目录序首个 map、R4-L 实证 24 文件全未匹配、sidecar 错写项目目录；③execute Wave 无并发上限——R4-L 4 路齐发实证触发平台额度/限流耗尽、整 Wave 中断 17 分钟由用户手动恢复
方案：machine-interface.js runGate verify 补 verify-lint 检查：与 --done 同引擎（runVerifyLintCheck+triageLintOwnership），存量债 advisory 放行、口径差异（工作树 vs 隔离快照，以 --done 为准）永久明示、装配失败 fail-open；diagnostic-codes.js 注册 verify_lint_failed。module-impact.js：parseModuleMapPaths 首尾成对引号剥壳；generateModuleImpactSkeleton 改多项目 map 联合归类（目录序首命中 wins）并产出 classified/unmatchedFiles；syncModuleDocSidecars 弃 markdown 反解、按命中项目落 sidecar（synced/skipped 带 project/ 前缀）。stages/execute.js 显式 Wave 派发行与调度行注入「同时在飞 ≤3」并发帽（超 3 分批错峰），隐式 Wave 串行铁律不动；docs/prompt 镜像同步
结果：新增 test/r4-followup-fixes.test.mjs 25 断言全绿；既有三件钉旧措辞的测试更新为新契约（plan-execute-contract 显式 Wave 并行+帽新文案、knife-batch2 synced 带项目前缀、execute-dispatch-integration 并发帽句）；全量 561/561 绿 + lint 过（715 文件）+ docs check 我方四文件零锚点漂移（余 3 失败均系并行会话在途 fixture）

## ql-20260921-005-eb19 | 2026-09-21 14:47:20 | R5对撞三修复：base锚点先写先得+plan存在性检查NEW:跨仓放行+文案逃生通道
状态：已完成
关联变更：（无）
文件：
- src/stages/execute.js（F1锚点先写先得(keepExisting)）
- src/stages/plan-postcheck.js（F2存在性检查NEW:/跨仓放行+F3文案逃生通道）
- test/base-commit-anchor-keepexisting.test.mjs（F1测试14断言）
- test/plan-postcheck-path-existence.test.mjs（F2/F3测试6断言）
- docs/sillyspec/platform-interface-map.md（行号锚漂移修正682→685/1246→1272）
需求：R5对撞三修复：base锚点先写先得+plan存在性检查NEW:跨仓放行+文案逃生通道
根因：R5对撞实证（round5/r5-collision-ehs-attribution.md P4/P9/N4）：Wave派发循环重渲染用实时HEAD覆写既有base锚点致漂移；存在性检查不认taskcard.js:129已定合法的NEW:前缀（模块口径分裂）且用单一projectRoot查跨仓路径必假阳性——plan --done三连卡壳+agent五次读CLI安装源码考古
方案：execute.js writeCommitAnchorToTaskCard增opts.keepExisting（先写先得、空值仍补值）并导出writeBaseCommitToTaskCard走该通道；plan-postcheck.js存在性检查NEW:条目跳过+repo≠main跨仓整卡跳过（复用parseFrontmatterScalar）；真缺失告警文案附NEW:/repo:逃生通道；附带platform-interface-map.md两处行号锚漂移修正
结果：新增20断言全过（14+6，红→绿）；npm test 565/565全绿；lint过（720文件+未引用导出0）；doc-ref 93/93
审计：[gate] L1（跨 1 模块 · 5 文件：2 代码/2 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260921-006-72e5 | 2026-09-21 16:12:37 | handoff 交接块加厚 B4a——任务面/未决/决策三段机械抽取，80 行帽
状态：已完成
关联变更：（无）
文件：
- src/handoff.js（三纯函数导出+装配后80行钳制纯只读）
- test/handoff.test.mjs（5a-5m十三断言（计数/折叠/未决/集成/行帽/顺序））
需求：handoff 交接块加厚 B4a——任务面/未决/决策三段机械抽取，80 行帽
根因：R5 优化方案 C-2 B4a（round4/optimization-plan.md v3.1 修订 1）：交接块原先只有阶段进度+续跑命令，「任务太大爆窗」的规程缺 Wave/任务/决策上下文——enrich 现有 buildHandoff 而非新命令立项
方案：src/handoff.js 新增 summarizeTaskFace（tasks.md checkbox 计数+待办清单，超 8 项折叠）/summarizeDecisions（D-xxx@vN 标题行 ID 清单）/summarizeBlockers（waiting/blocked/failed 步骤）三导出纯函数，buildHandoff 在状态行后注入上下文三段；HANDOFF_LINE_CAP=80 装配后钳制（粘贴块与警示行永不动，超限从上下文段尾截并留回源指引）；--json 契约 additive 加 truncated 字段
结果：handoff 单件 25/25 断言全绿（新增 5a-5m）；全量 569/569；lint 过（725 文件，未引用导出 0）
审计：⚖️ 归属切分：1 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/.changes/

## ql-20260921-007-615c | 2026-09-21 20:19:49 | R5 优化接线三件：Wave 边界 handoff 默认动作+受影响测试族前移 task start+评审铁律反例测试条
状态：已完成
关联变更：（无）
文件：
- src/run/complete.js（①账本纯函数+Wave 边界注入（输出面追加，状态机零改动））
- src/index.js（②task start 受影响测试族注入）
- src/stages/execute.js（③评审铁律反例条）
- test/r5-wiring-three.test.mjs（纯函数四态+三处文本钉）
- docs/sillyspec/platform-interface-map.md（7 锚重锚）
- .idea/vcs.xml（IDE 产物非本变更（窗口混入归属排除））
需求：R5 优化接线三件：Wave 边界 handoff 默认动作+受影响测试族前移 task start+评审铁律反例测试条
根因：两份 rollout 解剖实证的乘子接线——W1 62% 工具税源于全量当首验+守卫无反例；对向会话 75% 模型税中约 1/4 是单会话跨 4 Wave 背 130K×176 请求的肥上下文结构税（缓存救账单不救墙钟）
方案：①complete.js updateWaveSessionLedger 纯函数+Wave 边界注入（handoff 照抄命令+≥2Wave advisory+账本 best-effort）②index.js task start 注入 deps(auto) 同源受影响测试族（discoverModuleDependentTests 复用无二源）③execute.js 评审铁律反例测试核对条（守卫不该生效时确实不生效断言）；附带 platform-interface-map 7 处行号锚重锚。危险文件说明：complete.js 触点仅两处——纯函数 helper（无状态）+ printNext 块内 console.log 输出追加（不动状态机推进/门禁判定），状态机语义零改动
结果：r5-wiring-three 4/4（纯函数四态+三处文本钉）；全量 570/570 全绿；lint 过 726 文件；doc-ref 93/93
审计：[gate] L1（跨 3 模块 · 6 文件：4 代码/1 测试）advisory；每文件注记已全覆盖；测试增量已含

## ql-20260921-008-0e5a | 2026-09-21 21:02:17 | 快照门禁 E2E 测试基建：假项目夹具走真入口验证三态血统+负控
状态：已完成
关联变更：（无）
文件：test/gate-snapshot-e2e.test.mjs（+122/-0）
需求：快照门禁 E2E 测试基建：假项目夹具走真入口验证三态血统+负控
根因：batch2 verify 实证缺口：单元钉只覆盖组装函数，真链路无自动验证面，手工副本烧 6.5 分钟
方案：test/gate-snapshot-e2e.test.mjs：夹具=git 仓+probe.js 血统探针+WorktreeManager 真实 worktree；入口=executeVerifyQualityScan 进程内直调；四场景（保护/正常/分叉钉/负控）
结果：4/4 绿 @11.07s；全量 575/575；lint 过
审计：📝 文档欠账（D-8）：1 个源码文件改动未同步任何模块文档
