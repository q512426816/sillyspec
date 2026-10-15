---
author: flow-machine-draft
created_at: 2026-10-15T05:04:25.979Z
---
# 设计记录（Design Record）— 2026-10-15-vector-capability-autodetect

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

用户设计裁决：向量开关放每仓 local.yaml 不是终态——**端点部署本身就是开关**，客户端应自动探测平台能力。本变更把缺省语义从「缺省关」（vector-gate-tighten，端点不存在+无发现机制时代的正确补丁）改为「缺省 auto 跟随平台能力」：

① **能力探测缓存**（knowledge-vector.js 新增私有三件）：`.sillyspec/.runtime/vector-capability.json`（{url, available, probedAt}）——readCapabilityCache（按平台 URL 匹配，换平台/坏 JSON/字段缺失=无缓存）、writeCapabilityCache（值未变且未过期零写盘；目录自建；全 fail-soft）。.runtime 已 gitignored 且被 daemon spec 上传排除（UPLOAD_EXCLUDE_TOP_BASE），是仓内机器态标准落点（knowledge-hits 同款）。

② **vectorEnabled 缺省路径改 auto**：env on|auto 强制开、off 强制关；yaml on 强制开、off 强制关（用户逃生阀，优先级高于缓存）；absent/auto=读缓存判定——unavailable 未过重试窗（CAPABILITY_RETRY_MS=1h）=关，否则乐观试。platformVectorRecall 探测结果落缓存：404→unavailable（重试窗内零再探测）、200→available。

③ **hint 语义随迁**：auto 模式没有可执行配置——vectorSwitchHint 的「未开请配置」提示退役，改为仅 auto+缓存 unavailable 时给信息性提示（「平台部署后最迟 1 小时内本仓自动启用，无需配置」）；强制关（用户显式选择）零说教。

④ **config-schema desc/example 同步**（缺省 auto、off=逃生阀、example 改 `vector_search: off`——新项目 example 不再引导写 on）。

「端点部署本身就是开关」闭环：平台部署后，任一消费仓下次检索重新探测（缓存过期）→ 拿到 vector 结果 → 缓存翻 available → 全仓自动启用，零配置变更。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- src/knowledge-vector.js：vectorEnabled 缺省语义变化（缺省关→缺省 auto 探测）；新增模块私有 readCapabilityCache/writeCapabilityCache/CAPABILITY_RETRY_MS；platformVectorRecall 新增缓存落盘副作用（404/200 两分支）；vectorSwitchHint 返回文案语义随迁（签名不变）。
- src/config-schema.js：knowledge.vector_search desc/example 更新（renderExample 模板段同步，防漂耦合测试钉）。
- 消费面（search hint 键/flow 注入提示行）签名与触发条件不变，仅文案语义随迁。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

1. 乱序/迟到到达：探测结果以最后一次写为准（last-write-wins），缓存语义最终一致；spec 树/平台部署状态变化经重试窗（1h）收敛。
2. 并发写：多 CLI 进程并发检索同仓——writeCapabilityCache 原子性依赖单次 writeFileSync（小文件 <200B，撕裂读由 JSON.parse catch 兜底=视同无缓存重探）；最坏并发双探测一次，无腐化。
3. 切换/生命周期：缓存跨进程持久于 .runtime（仓内机器态）；进程重启不失效；换平台 URL 自动失效重探；重试窗常数 1h 是部署感知延迟上界。
4. 作用域：缓存键含平台 URL——同仓换平台/多 workspace 指向不同平台各自缓存；.runtime 是仓内路径，无跨仓串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：重试窗内平台完成部署 → 最多 1h 语义召回延迟——可接受（advisory 面；on 强制开可即时验证）。次风险：乐观试在平台网络不可达时每重试窗一次 3s 超时成本——404/超时都写 unavailable（超时也写：不可达≠端点在场，同窗跳过），成本从「每检索一次」降为「每窗一次」。放弃方案：①心跳探测（后台定时打端点——CLI 无常驻进程，引入复杂度无收益）；②平台配置下发开关（平台侧加配置面+sync 下发链路——过度工程，能力探测已闭环）；③保持缺省关（用户裁决否决：每仓手工配置不可扩展，「新项目 agent 怎么知道配置」的发现性问题在 auto 下消解为零）。
