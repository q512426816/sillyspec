---
author: flow-machine-draft
created_at: 2026-10-20T01:21:33.016Z
---
# 设计记录（Design Record）— 2026-10-20-gate-snapshot-carried-deps

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

判定面与物理携带面分离：他者声明文件从快照**判定面**（files 参数——overlay 对象与归因语义）剔除的归属语义原样保留，但不再从快照里物理消失——以新增的 `carriedFiles` 参数**物理携带**进快照（源=overlayRoot：worktree 模式取 worktree 在场版本、in-place 取主仓工作区版本），使快照复现「本变更实测时真实的依赖环境」。选这个方案而不是盲目把主仓全部脏文件并入（破坏隔离前提——未声明脏文件进快照会弄红门）或依赖闭包静态分析（跨语言 import 图不可靠）：携带面只收「已被他者变更显式声明、且已被 diff 窗口证明在途」的文件——归属可判（他者变更名在案）+ 假红可归因（控制台提示携带清单）+ 快照更贴近 worktree/主仓实测自洽态（worktree 模式下 worktree 自身本就含这些叠加内容，快照≈worktree 态才是 verify 门要测的东西）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

**`createGateSnapshot`（src/run/gate-snapshot.js:497）**：签名增 `carriedFiles = []`（可选）。携带面走与 `files` 相同的 overlay 循环（提取共用单文件源判定逻辑，含三态分叉/运行时面跳过/逃逸拒绝）；`.py` import 冒烟列表并入携带面；返回值 `{ snapshotRoot, cleanup, overlaid, pinnedCacheLinks }` 增 `carriedFiles: string[]`（实际拷贝清单）与 `carried: number`。缺省参数零变化（quick 门调用点不传——零回归契约）。

**`createVerifyGateSnapshot`（:883）**：foreign 过滤段（:906-919）从「剔除丢弃」改为「判定面剔除 + carriedFiles 传入」；携带发生时 `console.log` 提示一行。判定面为空回退主仓的 setFail 原因文案不变。

**消费方（gates.js / verify-quality-scan.js / quick-audit.js）**：不改——`carriedFiles` 为新增返回字段，现有消费（overlaid/snapshotRoot/cleanup）不变。

**CLI 命令/端点/文件格式**：零变化（内部函数签名扩展）。

行为面变化（唯一对外可见）：他者声明文件现在物理进快照（原为 HEAD 旧版）——快照内实测从「缺依赖必假红」变为「依赖自洽」；控制台多一行携带提示。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

携带面内容 = 快照建立时点 overlayRoot 的文件版本（快照语义本就是时点态）；他者变更随后演进不影响已建快照；快照重建时重新求值携带清单。与 files 面同款时点假设，无新假设。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

携带拷贝是 copyFileSync 单文件原子读（与既有 overlay 同款）；拷贝瞬间他者正在写该文件的竞态与既有 files 面完全同源（读到部分态的概率与现状相同，且 .py 有 import 冒烟回退 HEAD 兜底——携带面同受冒烟保护）。快照目录本身 tmpdir 独占（mkdtemp+账本），无共享写点。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

快照生命周期（账本/回收/双清销账）不感知携带面——目录整体回收，无携带面专属状态；他者变更归档/消失后其声明面不再命中，携带清单自然收敛——无需清理动作。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

携带面来源 = splitOwnVsForeignDiffFiles 的 foreign 结果（按本仓 specBase 的他者活跃变更声明面计算），与 cwd 同仓作用域；跨仓对账/冻结面不消费 carriedFiles（判定面不含它）——不串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：他者声明文件自身是坏半态时（他者 quick 正改到一半），携带进快照可能弄红本变更的门（隔离原教旨的反向代价）。缓解：①携带必伴随控制台清单（假红可归因到具体他者文件）；②携带面同受 import 冒烟保护（.py 坏半态回退 HEAD）；③对比现状——本变更依赖他者文件时现状是**必**假红（坑文场景），不依赖时携带才**可能**假红（他者恰好坏半态且影响本变更测试路径）——期望值严格改善；④SNAPSHOT_OFF 逃生通道不变。放弃的方案：①主仓全部脏文件并入快照——未声明脏文件无归属，假红不可归因，违背隔离立命之本（test:77 防弄红断言）；②declared 集静态依赖闭包拷贝——跨语言 import 图静态分析不可靠（JS/TS 动态 import、Python 延迟导入），漏判仍假红、误判扩大携带面；③快照内真失败自动回退主仓——放宽污染归属鉴定（主仓失败可能是并行污染），且与「快照失败先 SNAPSHOT_OFF 对照」的既有排障纪律冲突。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/run/gate-snapshot.js | createGateSnapshot 增 carriedFiles 参数与携带 overlay 循环（共用单文件源判定）+ 返回值 carriedFiles/carried；createVerifyGateSnapshot foreign 过滤改「判定面剔除+物理携带」+ 控制台提示 |
| 修改 | test/verify-gate-snapshot.test.mjs | 坑文主场景新增钉测试（依赖自洽端到端）；in-place 用例 :104 断言改钉（物理在场+carriedFiles 清单）；worktree 防弄红断言 :77 保留 |
| 新增 | test/gate-snapshot-carried.test.mjs | FR-01：carriedFiles 同款 overlay 语义（三态/运行时跳过/冒烟并入）+ 缺省零回归契约 |
