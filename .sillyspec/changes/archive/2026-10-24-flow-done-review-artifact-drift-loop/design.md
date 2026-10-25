---
author: flow-machine-draft
created_at: 2026-10-25T11:12:29.304Z
---
# 设计记录（Design Record）— 2026-10-24-flow-done-review-artifact-drift-loop

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

坑实证三连循环：复审锚（reviewedAgainst）之后本变更 own 提交只碰治理文件（review.json 自身归档前提交的典型形态）时，既有两条保留路径双双失灵——`reviewAnchoredToHead` 要求锚==当前 HEAD，锚与 HEAD 之间隔着 review.json 提交即恒 false；`governanceOnly` 看整个冻结窗，窗口内更早的复审前修复提交（复审 reviewedAgainst 已覆盖）把 ownFiles 拖进交付文件也恒 false。两条恒 false 合流 → 隔离重评 → 重评再提交 review.json 又前移 → 再隔离……永不收敛。修法：新增 `deliveryFaceAnchoredAfter`（flow-parity.js），把「已覆盖」的度量单位从窗口换成锚点——锚之后的 own 提交才是复审未见面；锚后仅治理文件且未触 requirements/design → 交付面未变，结论有效，保留不隔离。同批修增量复审的 findings 开放态盲区（flow-review.js `isOpenFinding`）：修复→resume 同一评审员的增量产物在 findings 保留历史条目并标 status，阻断判定此前盲数全条目；现在只数开放态（词表 resolved/resolved-as-accepted/accepted/false-positive，缺省与未知值 fail-closed 按开放）。配套给评审任务书补写入纪律（目录不存在=已归档停手勿重建；评审产物保持工作区未提交态随归档一次性入库，防审计时点漂移）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `src/flow-parity.js` 新增导出 `deliveryFaceAnchoredAfter({ cwd, change, anchorSha })` → `{ ok, ownCount, files, touchedPromiseFace }`；锚空/非 7-40 hex/非 HEAD 祖先/git 失败一律 `{ ok: false }`（fail-safe 宁可多评）。
- `src/flow-review.js` 新增导出 `isOpenFinding(f)`（开放态判定）；`extractAnchorSha` 由模块私有改导出（跨复用）；`renderReviewerTaskbook` 的 review.json 模板增 `findings[].status` 字段说明与写入纪律两行；`validateReviewJson` 校验面不变（status 为可选额外字段不拒收）。
- `src/flow.js cmdFlowDone` patch 漂移处置：隔离重评分支前先问 `deliveryFaceAnchoredAfter`，成立则保留 review.json 并输出治理件理由（既有 governanceOnly 保留路径语义不变）。
- 对外 CLI 行为变化：增量复审带 status 的 review.json 不再被历史条目误拦；复审后仅治理提交不再触发隔离重评循环。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：锚后提交乱序（评审先于治理提交落盘）不影响判定——判定只看 git log 事实面（锚..HEAD 的 own 提交文件集合），不假设时序；锚迟到（评审产物晚于新提交写锚）时锚..HEAD 集合为空，ok=true 保留，与「评审对象未变」语义一致。
2. 并发写：review.json 保持工作区未提交态随归档提交，多会话并发收口时先落者胜、后落者被 patch 冻结面/dirty 门拦（既有机制）；本判定是只读 git 查询，无共享可变态。
3. 切换/生命周期：rebase 重写历史使锚非祖先 → execFileSync 非零退出走 catch 返回 ok=false，宁可多评；变更归档后目录消失 → 评审任务书写入纪律要求停手报告，不重建目录。
4. 作用域：判定以 `--change <名>` 过滤 own 提交（parseChangeNamesFromSubject），他变更提交不入集合；跨仓场景锚仍指当前仓 HEAD，跨仓交付面沿用既有双形态 reviewedAgainst（本变更不扩）。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：治理文件前缀 `.sillyspec/` 判定把「借治理路径夹带交付内容」的提交误判为保留——缓解：承诺面（requirements/design）单列强拦（touchedPromiseFace → 不成立），且 review.json 等治理件本身不进 patch 冻结面，夹带内容不因保留判定进冻结证据；后果方向是多保留一轮评审对象而非漏拦交付变更。试过放弃的方案：①放宽 reviewAnchoredToHead 为「锚是 HEAD 祖先」——把复审后真正的交付提交也放行，假绿方向不可接受；②按文件 mtime/索引快照判交付面变化——mtime 不可靠（checkout/重排即漂移），快照引入新冻结面与既有 patch 冻结重复；③在评审员侧解决（评审前自查锚后提交）——评审员无收口视野，循环仍在收口侧，治标不治本。
