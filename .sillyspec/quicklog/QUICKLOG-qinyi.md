
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

## ql-20260919-017-fa4d | 2026-09-19 18:46:01 | pre-push 测试债清偿：main 四处预存测试失败阻推送——①stage-review-checklist 字面锚滞后于 five-cuts D-009 措辞 ②docs-check-fix S7 字节对照钉未过滤 dab74fc 裸…
状态：进行中
关联变更：（无）
文件：（见实际改动）

## ql-20260919-018-640f | 2026-09-19 18:55:49 | 自举声明表校验钉——blast/span_risk 段丢失防复发（今日 blast 段丢失事故的结构性收口）
状态：已完成
关联变更：（无）
文件：（见实际改动）
需求：自举声明表校验钉——blast/span_risk 段丢失防复发（今日 blast 段丢失事故的结构性收口）
根因：five-cuts 归档 skip-apply 遗留：主仓 map blast 段整体缺失，loadBlastDeclarations 返 0——evidence 门恒 false、会话域逃顶档，丢段不报错是安静地不设防；今日已手工恢复（ql-016）但缺口仍在（任何 map 重写/skip-apply 可复发）
方案：NEW:test/bootstrap-declaration-pin.test.mjs 三组 11 断言：blast ≥3 条目+域前缀在场+evidence ≥1+门禁 S2 在场 / span_risk ≥9 token+两族在场 / 三档走位语义钉（worktree→S3+evidence、stage-contract→S2、datetime→S1）——丢段 CI 即红且失败信息带恢复路径先例；连带：conventions 撞词条回填首日实测数字（单价 1/4 已验证非估计）；审计 tag 回收（对象已进 main）
结果：钉 11/11 绿（含一次自身 bug 修正：loader 返回编译对象数组取 .pattern）；lint 含新测试文件
