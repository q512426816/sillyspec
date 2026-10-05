---
author: flow-machine-draft
created_at: 2026-10-05T11:44:08.178Z
---
# 设计记录（Design Record）— 2026-10-05-branch-ref-anchor-scope

> 四节每节必答——答案直接写在问题下方；小改动可写「不适用：<理由>」；flow done 空节拒收。
> 需要列改动文件时加独立「## 文件变更清单」章节+表格（| 操作 | 路径 | 说明 |）——章节标题是 parseFileChangeList 的识别面，勿写在「接口契约」节内（收口声明面解析不到会误报夹带嫌疑）。
> 四问原文/FR 标题/镜像任务行是收口锚——从本模板原样保留或复制，勿手打重写（标点也要逐字：2026-10-05 两度实证句号手写成问号被锚对比拒收）。

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

_branchReviewReferences（src/worktree.js，cleanup 第 4 步消费）判「review.json 引用了分支 commit」用单探针 merge-base --is-ancestor hash branch——worktree 分支自带全部主仓历史，旧 review.json 引用历史主仓 commit（base 锚常见形态）全部误中（本会话实证 56 个引用全为无关历史件），误打 sillyspec-audit tag 且输出误导。修法：双探针——hash 在分支上（探针一不变）且**不在主仓 HEAD 可达集**（探针二 merge-base --is-ancestor hash HEAD，探针对象用 _resolveMainRepoRoot() 显式主仓根，防 native-worktree 复用路径下 HEAD=分支自身造成永不锚定的 fail-open）才计入引用。锚定语义收窄为「分支独有 commit」（baseline checkpoint/task commit——删分支 ref 后真正会悬空的只有它们）；主仓可达的历史 commit 删分支后仍可达，不构成悬空审计链。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

_branchReviewReferences(branch)（@private）行为收窄：返回的引用清单从「hash 是分支祖先或自身」改为「hash 是分支祖先或自身 且 不是主仓 HEAD 祖先或自身」；签名不变。cleanup 对外表现：仅当存在分支独有 commit 引用时打 sillyspec-audit tag + 打印审计锚定信息；纯历史引用场景改为直接删分支（details 记 branch deleted）。无 CLI/文件格式变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？
   成立——判定是纯读快照（候选 hash 来自既有 review.json 落盘件，探针是只读 git 查询），主仓 HEAD 在判定瞬间是什么就按什么算；cleanup 持主仓互斥锁跑，判定与删分支在同一临界区内，无乱序窗口。
2. 并发写：两个执行体同时操作同一数据/文件会发生什么？
   两探针均为只读 git 查询无写入面；review.json 并发写读到半写件时既有 JSON.parse 失败跳过分支吞掉（候选集少一条，fail 方向是少锚定非误删——与既有行为一致，本变更不触碰该路径）。
3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？
   安全——判定无中间状态落盘；探针二失败（null）时按「不在主仓可达」处理即维持锚定（fail-closed 宁误锚不误删），中断重跑幂等。
4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？
   无串台面：探针二显式锚定 _resolveMainRepoRoot()（git-common-dir 反推主仓根）——native-worktree 复用路径下 cwd 是 worktree 时不会把分支自身当「主仓 HEAD」；跨仓各有各的 execute-runs 注册表与分支命名空间，互不可见。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：主仓 HEAD 恰好不含某历史 hash 但另一常驻 ref（如 origin/main）含——探针二判「不在主仓可达」→ 误锚（多余 tag，不删任何东西，安全方向）；反之不存在漏锚面：hash 要悬空必须同时在分支上且不在任何常驻 ref，而探针二只看 HEAD 这一个 ref——HEAD 不含而 origin/main 含的场景锚定是多余的但无害。放弃的方案：① 枚举全部 refs 逐一判可达——覆盖更全但 N 探针成本与配置面（remote 名不确定）不成比例，且收益仅是少打几个无害 tag；② 改为 rev-list branch ^HEAD 取分支独有集再做集合判——语义等价但一次性拉全集在候选仅个位数时反而更重。均已弃。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/worktree.js | _branchReviewReferences 双探针：+主仓 HEAD 可达性排除（探针对象显式主仓根） |
| 新增 | test/branch-ref-anchor-scope.test.mjs | 历史 commit 引用不锚定/分支独有 commit 引用锚定/畸形 hash 跳过语义保持三形态单测 |
| 修改 | test/backlog-final-batch.test.mjs | 既有用例 fixture 拓扑修正：判定前 git checkout 切回默认分支（对齐生产 cleanup 拓扑——主仓 HEAD 在主干；三条断言逐字未动，评审裁决为拓扑修正非迁就实现） |
