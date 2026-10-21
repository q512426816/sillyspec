# 决策知识 — sync

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-unmapped-160@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-26-watcher-timeline-p2
原编号：D-001@v1
锚点：未记录
最近确认：6328ddda2229a76c82273efe7743b8efd9ca92cc
理由：最大风险=语义修正引发回归——主变更有用例钉住旧「尾部标 broken」行为，需同步改期望（该用例钉的正是误标行为，改期望即清偿本体）。放弃的方案：inferFlipTimes 直接收 tasks 勾选态做尾部判断——把渲染关注度混进纯计数函数层次更脏；按层分责（计数函数管链、渲染层管已勾缺时刻）更清晰。

## D-unmapped-176@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-watcher-push-endpoint
原编号：D-001@v1
锚点：未记录
最近确认：206278f5f9a71352bff93bdd9857447e6648aaaf
理由：最大风险：平台端点再次演进（本仓注释曾指向已消亡的 observation 端点）——缓解：模块头注释锚定端点出处变更名（change-events-r18-full）可追溯；推送失败恒 warn 可见不静默吞。放弃方案：平台侧加 /api/observation/events 兼容层（在平台仓加死代码面更大，放弃）；恢复批量端点（平台已是单条契约且恒 200 语义，放弃）。

## D-unmapped-178@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-archive-timeline-bake
原编号：D-001@v1
锚点：未记录
最近确认：a688429853a0c5b11dd44ddd4b54dc29583daad7
理由：最大风险：平台/漂移模式下 runtimeRoot 与 specBase/.runtime 分裂，烤制读错目录 → 静默漏烤。缓解：编排内用 resolvePlatformOpts + resolveRuntimeRoot 与既有消费者同链；跳过/失败均输出注记行保持可观测；测试用 fixture runtimeRoot 直验。次风险：巨型事件流污染 git——尺寸帽 2MiB 超帽只烤 timeline.md 并注记。 放弃的方案：①watcher 活跃期直接把事件写进 changes 目录（放弃——改写侧协议面大，且活跃期事件属 .runtime 隐私/排除边界，D-002 语义不动）；②CLI 回退时把归档副本反向重建到 .runtime（放弃——制造两份真相源，违背「本地 jsonl 唯一真相源」既有口径）。 评审留痕（独立评审 PASS 2×P3 清偿）：P3-1 副本读源失败时头注记虚报副本在场——已修（eventsCopySkipped 扩读源失败形态，注记文本改为「尺寸超帽或读源失败」与实际产出一致，补测试）；P3-2 「与 spawnWatcher 写侧同链」对 flow.js 各拉起位在平台极端漂移下存在既有分裂面——措辞修正：烤制的 runtimeRoot 解析与既有消费链（resolvePlatformOpts>resolveRuntimeRoot）同源，平台模式下若写读目录分裂属既有面，本设计的兜底是跳过时输出注记行保持可观测、非静默漏烤。

## D-unmapped-194@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-sentinel-mirror-waiver
原编号：D-001@v1
锚点：未记录
最近确认：ae743b55c285996f05b4dce48beae3b32afcc2a0
理由：风险：①agent 故意不覆写任务面借镜像豁免绕 per-task 证据——镜像任务即成功标准镜像，其交付由实测门/patch/review 整体背书，绕的是重复记账不是交付门（守卫语义不弱化：覆写任务仍拒收无证据勾选，Drill 2 实证）；②基线快照缺失（旧变更/快照失败）→ fail-safe 全量从严（旧行为）；③比对经行分割与 trim 归一——行尾/首尾空白漂移仍判镜像（宽松面有界：任何内容改写即判非镜像从严）。死路=给镜像任务也造 per-task 证据仪式（改写任务+amend token——本会话三连 workaround 实证是纯仪式）。退役判据=镜像豁免面出现真实假勾选逃逸案例（实测门绿但成功标准未兑现且无 review 拦截）。

## D-unmapped-195@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-28-sentinel-waiver-hardening
原编号：D-001@v1
锚点：未记录
最近确认：197678ea3195b88c19a2f719a75e6993fa3dfba8
理由：风险：①过渡期变更（镜像豁免变更与本变更之间 start 的）无锚定——信任基线（窗口一天内的少量变更，接受）；②agent 篡改 flow-state 里的 baseline_sha256 本身（change 目录内文件）——flow-state 属机器记账面，篡改它等于篡改 substeps/review_force 等全部收口依据，攻击面超出本哨兵职责（审计件 change.patch sha256 锚定兜底）。watcher R1 为 advisory 人判面，容忍无锚基线（消费侧未哈希校验——硬门在 flow done，纵深以锚定为准）；死路=把基线挪进 git 追踪（.runtime 惯例是本地观测面不进 git，为豁免破例不值）。退役判据=零提交从严误伤真实场景（如纯评审类变更无交付提交但有合法勾选）出现投诉。

## D-unmapped-210@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-29-watcher-fakecheck-retire
原编号：D-001@v1
锚点：未记录
最近确认：0972a16c61f70b38c27ee28798adea489f6920e9
理由：风险：失去实时人判信号——收口哨兵+单拍门已覆盖同判据的终态裁决，实时层只剩噪音（合法勾选全部闪嫌疑）；历史事件流中的存量 fake-check 事件仍会被 alerts/timeline 渲染（读侧规则名无关）——属历史数据如实展示非新增噪音。弃案：降为 info 级保留——半 retire 徒增状态面。

## D-unmapped-230@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-05-hindsight-checkbox-noise
原编号：D-001@v1
锚点：未记录
最近确认：f689d82f93ee0c0978221d01ff84703090e1946f
理由：最大风险：正则把非任务行误归一——行首 `- [x]`/`- [ ]` 形态在 tasks.md 语义域内就是任务勾选框，误归一面只可能是 agent 在 tasks.md 写 checkbox 形态的非任务内容（极反形态）；且归一只影响改写比分子，不碰文件本体。 试过放弃：① 改 computeEditRatio 忽略 checkbox 前缀——共享内核，动它波及 flow-draft 起草面口径，放弃；② 阈值从 0.6 提到 >0.8——治标：4 任务全勾 0.8、5 任务 0.833 恒穿过任何 <1 阈值，翻格噪声是分子问题不是阈值问题，放弃。

## D-unmapped-279@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-08-batch-tick-false-positive
原编号：D-001@v1
锚点：未记录
最近确认：b125a8940021463953eae7f26d8a24e083acba31
理由：最大风险：消费层 stage 过滤放宽了检测面——若未来有真实「design.md 勾选框被 agent 一把勾」的纪律诉求，本门不再覆盖（须另立信号面）。接受理由：design 自审是 authored-whole 断言面（模板即如此），一把勾与整体写盘不可区分，覆盖它的成本就是本次实证的误伤。放弃的方案：仅修 watcher 源头层（历史流与未知发射面无纵深）；仅修消费层（幻影事件仍进平台展示流污染时间线）。

## D-unmapped-347@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-commit-guard-s3
原编号：D-001@v1
锚点：未记录
最近确认：3367ea65d8625a1f0db9d78ee53ac004629e5f70
理由：最大风险：CRLF/clean filter 形态下「假不一致」——add 与 pathspec 提交构造临时索引都走同一 clean filter，理论恒等；实验仓有 CRLF warning 未干扰。若真仓出现 filter 假阳性（理论上仅 .gitattributes 变更窗口内），fail-open 只多一条警告不阻断，噪声可控。次风险：GIT_INDEX_FILE 语义随 git 版本漂移（实验锚定当前 git 2.x 行为：pathspec 提交设临时索引、全量提交不设或设真索引）——两形态都有跳过护栏，语义漂移最坏退化为零告（漏报不误报）。试过放弃的方案：①比对工作树文件 mtime/hash 与暂存区——绕远且 filter 归一化要自己做，直接比索引 blob 更贴近提交语义；②S3 升格阻断——与 fail-open 硬约束冲突（守卫挂全会话共享 .husky，绝不能拦人提交），升格是策略决策另行裁决；③收口侧检测——信息窗口已过（外来 hunk 已进库），实证无效。均否。

## D-unmapped-350@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-13-sync-ledger-tombstone
原编号：D-001@v1
锚点：platform_sync/service.py
最近确认：89f30febe3343e13d7832e540367648c5529eea4
理由：最大风险：合成载荷被平台 `_ensure_change_row` 在「从未同步过」的变更上先建占位行再立即被墓碑收敛——产生一行 location='deleted' 的墓碑行；这与平台既有 3 行历史墓碑（2026-08-26/09-10/09-11）形态一致，可接受。次风险：平台行有 last_pushed_at 而合成载荷不带 base_ts——平台契约「base_ts 缺失无条件接受」（platform_sync/service.py 分支 1），无 409 面；若平台后续收紧该契约，fallback 是 best-effort 失败日志（不阻断）。 放弃的方案：①daemon reconcile 对账「平台 active 行 vs 本地全无」主动软删——多机工作区下他机活跃变更会被误删，需要引入行级机器归属，改动面过大；②sync 对 progressData null 一律发墓碑——打错 --change 名（从未存在）会把平台同名真变更误软删，不可接受；台账正是为了区分「从未存在」与「存在过且已终态」。平台侧 7 天占位行保护窗 + 全量 reparse 兜底（已有）继续作为外部裸删（rm -rf + SQL 全清）的最后防线。
