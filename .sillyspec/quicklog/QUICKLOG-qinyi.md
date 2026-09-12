
## ql-20260912-010-0b9e | 2026-09-12 15:28:10 | 审查遗留终批：worktree.js hash-object/ls-tree argv 分批 + _branchReviewReferences 精确校验 +…
状态：已完成
关联变更：（无）
文件：
- src/worktree.js（三项）
- src/git-helper.js（env 选项）
需求：审查遗留终批：worktree.js hash-object/ls-tree argv 分批 + _branchReviewReferences 精确校验 + _createBaselineCheckpoint env/统一入口
根因：① 数百长路径全量 argv 逼近 Windows 32767 上限，hash-object 失败返 null 致 hasUnappliedChanges 全量误判 pending 卡死 cleanup；② 整分支 rev-list 进 Set 大历史仓可观内存时间且缩写 hash 漏检（rev-list 输出全 hash，缩写引用匹配不上——误删后悬空）；③ env 裸替换丢 SystemRoot/USERPROFILE/TEMP + 绕过 safeGit 的 safe.directory（dubious-ownership 必败）+ 无 timeout/maxBuffer。触及 worktree.js/git-helper.js 门禁链文件按解锁通道走 --force-baseline
方案：_chunkPathsPrivate 内联分批（环依赖规避，与 worktree-apply 同步演化注记）应用于 hash-object（批次行序拼接保索引对齐）与 _lsTreeBlobs；引用判定改先收候选 hash 再 merge-base --is-ancestor 精确校验；git() 新增可选 env 选项（缺省继承），baseline commit 走统一入口+env 展开
结果：新测试 backlog-final-batch 7/7（60 长路径分批 ls-tree 全量命中/全 hash+缩写引用检出+无关不引用/baseline checkpoint author=sillyspec）；全量 453/0 + lint 583 绿（CLI --done 门禁实测通过）
审计：⚖️ 归属切分：5 个窗口内未声明脏文件未计入文件行（并行会话改动或本会话漏声明）：.sillyspec/docs/sillyspec/scan/CONVENTIONS.md, docs/sillyspec/architecture-4a.md, docs/sillyspec/doc-consistency-debt.md, docs/sillyspec/prompt-control-debt.md, test/backlog-final-batch.test.mjs
