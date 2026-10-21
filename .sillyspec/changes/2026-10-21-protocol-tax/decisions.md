# 决策记录

## D-001@v1 FR-02 复用既有 reentryHit 机制，无新增实现面

2026-10-21 本机实测：同步骤第二次渲染 48 行（<60 目标已满足），静态全文由 2026-09-21-r5-efficiency-batch2 的 reentryHit + .runtime/step-guide-state/ 变更级台账压缩。task-03 交付收缩为冻结回归测试（test/output-repeat-delta.test.mjs），不重复造轮子。评审 P3-1 指出 design 未回写此改道——已回写。

## D-002@v1 FR-06 实测：status 慢的三层来源与修复（6.3s→0.82s）

消费仓实测（timing 段归因）：① 入口 triggerPullActiveChange（status 别名已跳）；② 重播种后 triggerSync（isStatus 已跳）；③ 真凶=outputStep 每次渲染 fire-and-forget 的 triggerStepStartSync——status 阶段渲染也推 progress，进程退出等在飞 POST 10-20s（平台慢时 21.6s 实测）。修复=status 阶段渲染跳过该上报（写命令语义不变，task tick 对照 sync=数字）。修后 0.82s，验收 <1.5s 达成。

## D-003@v1 FR-07 实测：doctor 41.8s→3.0-4.0s（三处批量化）

CPU profile 定位 95% 串行 spawnSync，三处等价批量化：① 归档锚点 anchorOk 逐 SHA cat-file -e → 单次 cat-file --batch-check（batchCatFileExists，70% 热点）；② worktree _branchReviewReferences 逐 hash 双 merge-base 探针 → rev-list(branch --not mainHEAD) 锚集两次 spawn（数学等价：is-ancestor ⟺ rev-list 成员，探针二排除 ⟺ --not；失败回退旧探针）；③ apply 交付指纹 staged 面逐文件 git show :path → 单次 cat-file --batch（batchStageBlobSha256，按响应序映射）。findings 逐条等价（doctor 簇 9 测试文件全绿），实测 run1-3：3.0/4.0/3.5s，<5s 达标。

## D-004@v1 全量套件红归属判别：4 确定红中 1 我方（已修）3 非我方

868 文件 852 绿 7 红；7 红中 3 并发抖动复跑绿（flow-protocol/runtime-relayout/scan-refresh）；4 确定红基线对照（d61be3b2^ 临时 worktree + node_modules junction）：doc-ref-check 基线绿→我红（插行锚漂 20 处，docs check --fix 已修复绿）；decisions-lifecycle 与 platform-temp-residue-heal 基线亦红（预存，非本变更引入，疑 knowledge-tier-denoise 并行会话活跃面）；spec-dir-home-guard 基线绿我红但根因=主仓未跟踪遗留 test/.sillyspec 目录拦截向上命中（会话开始前即在场，基线 worktree 无此目录即绿），环境脏非代码。

## D-005@v1 收口批 3/3 必红根因：测试 env 整体替换丢会话身份→所有权门自拦

证据 timing-seg-fail-evidence.log（测试内失败落盘机制抓获）：fixture 被 schema-init（继承 env）以 zcode-protocol-tax 身份认领，TIMING_ENV={DEBUG..} 整体替换的子进程丢 SILLYSPEC_SESSION_ID 降级 anon@ → --done 撞所有权门 exit 1；外部跑（无会话身份，全 anon=自）恒绿——完美伪装。修法=env 继承再叠加（{...process.env, DEBUG_SILLYSPEC_TIMING:'1'}）。注：本形态与 z1 会话考古的「anon 自锁」同家族；另过程中两次误诊（并发抖动重试硬化）保留为纵深防御。
