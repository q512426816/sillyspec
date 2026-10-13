---
author: flow-machine-draft
created_at: 2026-10-13T02:46:21.712Z
---
# 设计记录（Design Record）— 2026-10-13-thin-empty-face-crosscheck

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

改 src/flow.js 的 cmdFlowDone patch 子步与 cmdFlowStart 横幅。patch 侧：把 design 文件变更清单的解析（parseFileChangeListDetailed）与「疑似跨仓声明未按规范标注」防呆告警从非空 else 分支提到 ownFiles 判空之前（两分支共享执行）；空冻结面且声明清单存在未标注交付条目时升格为阻断（原先一行提示即 patchOk=true 短路——multi-agent-platform 仓 2026-10-12-fire-ledger-form-strict 生产实证：跨仓交付撞空面后告警整段没跑、归档件永久缺 patch 留档）。为什么选这个方案：证据文档（thin-done-empty-face-no-declared-crosscheck.md 37c7d146b）逐行核实了短路结构（空面 if→else 整段挂靠），最小修法就是把「读声明+告警」提到分支之前——跨仓冻结在空面的补齐明确不在本变更面（纯跨仓空面出 advisory 点名缺口，留后续变更）。start 侧：横幅在 local.yaml repos 注册非空时补一行跨仓清单写法（thin 通道此前零跨仓指引，契约只活在厚流程模板里）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

cmdFlowDone 新增参数 acceptEmptyFace（CLI flag `--accept-empty-face`，与 --accept-orphan-face 同族）；flow-state.yaml 新增可选键 accept_empty_face（签收留痕：by/at/declaredCount，持久化后重跑不再阻断）。行为变化：①空面+声明清单有未标注条目 → patch 子步 exit 1 阻断（文案三处置一次给全）；②空面+清单全部规范标注（e.repo）→ 不阻断，出「空面不做跨仓冻结」advisory；③防呆告警空面也执行且嫌疑判定放宽（主仓不存在即点名，首段命中注册仓额外标注 key）；④flow start 横幅注册仓非空时多一行跨仓写法提示。planEntries 解析/告警的位置前移对非空分支行为等价（同一份代码从 else 内挪到分支前，非空面照旧执行）。文件格式：无变化（change.patch/change-patch.json 生成逻辑不动）。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。门判定是纯函数式逐条扫描（声明清单 × 文件系统存在性 × 注册仓别名表），无顺序依赖；声明清单在 flow start 后由 agent 编辑、flow done 时点读盘——以 done 时点实态为准，与冻结面同时点口径。首段别名命中是多对一映射（key 与路径 basename 双注册），重复别名取先注册者（Map 覆盖语义，与既有 else 分支内告警同一实现，口径不变）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

门只读 design.md/local.yaml/文件系统，写面仅 flow-state.yaml 的 accept_empty_face 键（签收时一次性写入，走既有 saveFlowState 通道，与 spec_approved 等键同款串行写）。多会话并行时 change 目录归单变更所有（AGENTS.md 隔离规则），无跨变更同写面。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。阻断走 reportMidFail('patch') + exit 1，子步状态机不标 done——重入从 patch 断点续，修复（提交/标注/签收）后重跑自然过。签收留痕持久化在 flow-state（首次带 flag 落盘），后续重跑/中断恢复不丢——这正是选 flow-state 而非 per-run flag 记忆的原因（design-question-autorepair 会话实证：per-run flag 在评审多轮重跑中每次都要重带，漏带即重复阻断）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。嫌疑扫描的「主仓不存在」判定用 flow done 的 cwd（主仓根），注册仓表来自本仓 .sillyspec/local.yaml——多工作区各自读各自的 local.yaml，不共享状态。e.repo 标注条目不进嫌疑面也不进阻断触发面（合规书写不该被罚）；.sillyspec/ 前缀治理条目剔除（治理件本就不入冻结面，声明了也不构成矛盾）。纯跨仓空面（清单全 e.repo）不阻断只 advisory——避免把「按契约正确书写」的形态拦死。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：误伤合法空面形态。三处防误伤设计——①剔除 .sillyspec/ 治理条目与 e.repo 已标注条目后才判「声明非空」；②纯跨仓规范标注空面降为 advisory；③签收留痕持久化（重跑不重复拦）。次风险：嫌疑判定放宽（主仓不存在即点名）在非空面分支也生效后，路径笔误（声明了不存在的路径但冻结面非空）会从「快照行计划未动」升级为告警点名——是增益不是回归（计划未动行本来就不可见地躺在快照里）。试过放弃的方案：①空面分支内做完整跨仓冻结+留档（重构 writeCloseTraceArtifacts 对空 ownFiles 的适配）——本变更面膨胀且 close-trace-freeze-integrity 的「空面不落伪完整 patch」设计承诺会被触碰，留纯跨仓空面为 advisory 点名+后续变更；②per-run flag 不落盘（与 --accept-dirty-gap 同款）——评审多轮重跑必重复阻断，选 flow-state 持久化；③把防呆告警同时升格为非空面阻断——非空面已有快照「计划未动」可见对账，告警足矣，阻断面保持最小。均否。
