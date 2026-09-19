
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

## ql-20260919-019-344f | 2026-09-19 19:16:24 | 钩子 #1：quick --done FR 写面腐烂 suspect 遥测——changedFiles × module-map join → 触达域 active FR → fr-rot-suspect advisory 事件+warn（…
状态：进行中
关联变更：（无）
文件：src/run/shared.js, src/knowledge-stats.js, test/knowledge-fr-stats.test.mjs

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
