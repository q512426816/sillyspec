# 决策知识 — unmapped

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-unmapped-002@v1 : 平台共享智能体绑定的守护进程取管理员自己名下
状态：implemented
原编号：D-003@v1
锚点：未记录
最近确认：3b2df3ff
理由：仅平台管理员自己名下的在线 daemon runtime。依据：避免引入「管理员

## D-unmapped-003@v2 : 平台共享智能体会话——源码只读 + 指定目录可写
状态：implemented
原编号：D-002@v2
锚点：未记录
最近确认：3b2df3ff
理由：用户实答（重问轮）：「允许某个目录下写操作，可以生成点文档原型图
supersedes：D-002@v1

## D-unmapped-004@v2 : 共享机器/智能体由用户在会话中显式选择
状态：implemented
原编号：D-004@v2
锚点：未记录
最近确认：3b2df3ff
理由：用户实答（重问轮）：「会话选择共享的机器和智能体呀，用户自己选」
supersedes：D-004@v1

## D-unmapped-005@v1 : 实现方案选 B——统一授权表 daemon_runtime_grants
状态：implemented
原编号：D-006@v1
锚点：未记录
最近确认：3b2df3ff
理由：用户选定方案 B：新建 daemon_runtime_grants 统一授权表，工作区共享与

## D-unmapped-006@v1 : 打破 daemon 零改动 Non-Goal——session 级 overlay roots 写守卫增量（spike-02 B 裁决）
状态：implemented
原编号：D-011@v1
锚点：未记录
最近确认：3b2df3ff
理由：选项 II（最小 daemon 增量）：_judgeWriteViaPolicyEngine 增加 per-session

## D-unmapped-007@v1 : platform grant 的 pinned runtime 不经共享档案直接钉定 → 404
状态：implemented
原编号：D-012@v1
锚点：未记录
最近确认：3b2df3ff
理由：否——共享的是智能体而非裸 runtime：authorize_pinned_runtime 的

## D-unmapped-022@v1 : 缓存范围 = has_permission + data_scope 一并覆盖
状态：implemented
变更：2026-07-23-rbac-permission-cache
原编号：D-001@v1
锚点：未记录
最近确认：163e1065
理由：同时覆盖 has_permission(collect_permissions* 集合)与 data_scope(manager_project_ids / is_super_admin)。两套都是高频热路径,一并做避免二次返工。

## D-unmapped-023@v2 : 失效策略 = 整体清空 + 失效失败 ERROR 告警(supersedes D-002@v1)
状态：implemented
变更：2026-07-23-rbac-permission-cache
原编号：D-002@v2
锚点：未记录
最近确认：163e1065
理由：所有权限变更触发点统一执行 invalidate_all_permissions 清空 perm:* + ppm-scope:* 全部(继承 v1)。v2 增补:invalidate 失败升 **ERROR 级日志**(可监控告警),非 warning——失效失败是安全事件,可能留下最长 TTL 的越权窗口;读/写业务缓存故障仍降级静默(不影响请求)。
supersedes：D-002@v1

## D-unmapped-024@v2 : 缓存粒度 = 拆键 platform/all/workspace + everywhere 内存并集(supersedes D-003@v1)
状态：implemented
变更：2026-07-23-rbac-permission-cache
原编号：D-003@v2
锚点：未记录
最近确认：163e1065
理由：**不能共用**(v1 错误)。三者返回语义不同的集合(repo://sillyhub/backend/app/modules/auth/rbac.py:37-84 实证):platform=平台级、all=全工作区并集、everywhere=platform∪all。v2 拆为三键:`perm:{u}:platform`、`perm:{u}:all`、`perm:{u}:{workspace_id}`;everywhere 读 platform+all 内存并集,**不单独存**。has_permission 在所有调用先判 platform,workspace_id=None 时再判 all,workspace_id 指定时判单工作区键。
supersedes：D-003@v1

## D-unmapped-025@v1 : 无 Redis 降级 = 回退查 DB(不加本地兜底)
状态：implemented
变更：2026-07-23-rbac-permission-cache
原编号：D-004@v1
锚点：未记录
最近确认：163e1065
理由：沿用 api_key_service 约定,Redis 故障 try/except 回退查 DB,不加本地内存 TTL 兜底。保证正确性优先;本地兜底引入多实例一致性问题,得不偿失。

## D-unmapped-026@v1 : ppm-scope uuid 反序列化保证类型
状态：implemented
变更：2026-07-23-rbac-permission-cache
原编号：D-005@v1
锚点：未记录
最近确认：163e1065
理由：JSON 只能存 str,但 data_scope 下游用 uuid 做判断(`problem_operable` 的 `project_id in manager_pids`,project_id 是 uuid)。get_cached_ppm_scope 反序列化时必须把 manager_project_ids 还原为 `set[uuid.UUID(...)]`,is_super_admin 还原为 `bool`。否则 uuid-in-set[str] 恒 False,经理编辑/删除问题静默失效。

## D-unmapped-027@v1 : WorkspaceService.create 失效点补全
状态：implemented
变更：2026-07-23-rbac-permission-cache
原编号：D-006@v1
锚点：未记录
最近确认：163e1065
理由：补入。`_ensure_creator_as_owner`(`repo://sillyhub/backend/app/modules/workspace/service.py:1257`,line 770 写 UserWorkspaceRole 授 owner)的**所有调用方**——`create`(`:148/165/222`)与 `scan_generate`(`:609`,daemon-client 建工作区独立路径,`:669` 调用,不经 create)——commit 后都需调 invalidate_all_permissions,创建者的 all/everywhere 缓存才及时失效(否则最长 TTL 内缺新 ws 权限——权限缺失方向,非越权,但仍是错误)。plan-review 发现 scan_generate 遗漏(Design Grill X2 当时未穷尽 `_ensure_creator_as_owner` 调用方,属误判闭合,现补)。bootstrap 启动种子(auth/service.py seed_*)免失效(进程冷启无缓存)。

## D-unmapped-049@v1 : 方案 A——daemon 消费 SDK task_* + agent_task_status SSE 通道扩展
状态：implemented
变更：2026-08-27-background-subagent-progress
原编号：D-001@v1
锚点：未记录
最近确认：debd368d
理由：daemon session-manager 拦截 SDK `task_started/task_progress/task_notification` system 消息，映射为扩展的 `agent_task_status` SSE 事件（复用 Redis `agent_session:{id}` 频道模式），异步启动回执解析做兜底。否决方案 B（daemon 透传 system 落库、backend 解析派生：事件与日志两套真相源，历史回看重放解析脆弱）；否决方案 C（前端纯展示层聚合：永远缺终态信号，卡片转圈到会话结束）。

## D-unmapped-050@v1 : 生命周期双写——SSE 事件 + [TASK_*] 持久日志行
状态：implemented
变更：2026-08-27-background-subagent-progress
原编号：D-002@v1
锚点：未记录
最近确认：debd368d
理由：生命周期节点除发 SSE 外，同步落 `[TASK_STARTED]/[TASK_PROGRESS]/[TASK_NOTIFICATION]` 前缀的 stdout 日志行（单行 JSON，行级带 parent_tool_use_id）。前端 assembler 识别前缀解析为段元数据，回放与实时同源；行带 parent 自动享受跨轮归位。

## D-unmapped-051@v1 : 跨轮归位在 backend 落库时做（submit_messages 重映射 run_id）
状态：implemented
变更：2026-08-27-background-subagent-progress
原编号：D-003@v1
锚点：未记录
最近确认：debd368d
理由：backend `submit_messages` 落库时，带 parent_tool_use_id 的行查 tool_use_id→run_id 映射（进程内 LRU + agent_run_logs tool_call 行冷启动反查）改写为派发 run。否决前端会话级链接（每个消费日志的页面都要适配，容易漏）。历史数据不迁移（项目未上线）。

## D-unmapped-052@v1 : 空 prompt 防御——后端 422 为主，前端禁点为辅
状态：implemented
变更：2026-08-27-background-subagent-progress
原编号：D-004@v1
锚点：未记录
最近确认：debd368d
理由：backend `inject_session` 对 strip 后为空的 prompt 抛 422（中文文案，领域类 SessionEmptyPrompt，过 l10n 守护）；前端发送按钮空内容 disabled 为辅助。服务端拒绝是权威（防任何调用方）。

## D-unmapped-066@v1 : 注入通道选前导拼接，不动 system_prompt 与 daemon
状态：implemented
变更：2026-08-29-session-user-preamble
原编号：D-001@v1
锚点：未记录
最近确认：c7346118
理由：现有 4 条注入通道中选「前导拼接」：backend `daemon/session/context.py` 新增前导构建函数，`session/service.py` create_session 的 `_prefix_parts` 接线（变更/页面/PPM/团队简报四前导同款模式）。否决 system_prompt 通道（仅 claude 消费，codex 不支持，且是 per-AgentProfile 语义）与 daemon 侧注入（daemon 纯透传、不认识用户）。

## D-unmapped-067@v1 : 仅首轮注入 + 覆盖重派重渲染路径；后续轮次与服务身份注入不带
状态：implemented
变更：2026-08-29-session-user-preamble
原编号：D-002@v1
锚点：未记录
最近确认：c7346118
理由：仅首轮（用户信息+规则留在上下文持续生效，避免每轮膨胀）；掉线重派（batch-session-inherit 的 prompt 重渲染路径）须确认重渲染时同样带上。后续轮次 `_inject_into_session` 与平台审批代写等服务身份注入不带用户前导（由「仅首轮」自然满足）。

## D-unmapped-068@v2 : 不加 Role 字段，角色名称直接给 agent 自行判断沟通风格
状态：implemented
变更：2026-08-29-session-user-preamble
原编号：D-003@v2
锚点：未记录
最近确认：c7346118
理由：用户在 brainstorm step 6 明确推翻 Role 加字段方案：「直接给角色名称给 agent 分析就行，不要加字段了」。用户信息块内列出角色名称原文 + 一小段静态沟通适配指引文案，由 agent 根据角色名自行判断用业务语言还是技术语言。无 schema 迁移、无 admin/前端改动，变更范围缩小为 backend daemon/session 模块。
supersedes：D-003@v1

## D-unmapped-069@v1 : SillySpec 工具规则条件注入（工作区根存在 .sillyspec/ 才拼）
状态：implemented
变更：2026-08-29-session-user-preamble
原编号：D-004@v1
锚点：未记录
最近确认：c7346118
理由：条件注入：仅会话绑定的工作区根目录检测到 `.sillyspec/` 目录才拼入。无条件注入会诱导 agent 在非 SillySpec 项目擅自 `sillyspec init` 污染用户仓库。无工作区会话不注入该块。

## D-unmapped-070@v1 : batch（批量任务）路径本期不注入
状态：implemented
变更：2026-08-29-session-user-preamble
原编号：D-005@v1
锚点：未记录
最近确认：c7346118
理由：本期仅做交互会话（interactive session）；batch 已有 CLAUDE.md prepend 通道，将来可复用同一套模板函数，不纳入本变更范围。

## D-unmapped-071@v1 : 整体方案选 A（后端前导拼接 + Role 受众字段），否决 B（纯 prompt 猜测）与 C（system_prompt 通道）
状态：implemented
变更：2026-08-29-session-user-preamble
原编号：D-007@v1
锚点：未记录
最近确认：c7346118
理由：用户在 explore 阶段看到完整对比表后确认「帮我实现吧」= 选 A。A 是唯一同时满足 D-001~D-006 的方案；B 违反 D-003（自由文本角色名不可靠推断）且画像判定失控；C 违反 D-001（codex 不支持 systemPrompt，provider 不对称）。

## D-unmapped-078@v1 : 缺口①触发形态 — 心跳恢复事件触发
状态：implemented
变更：2026-08-30-daemon-self-heal
原编号：D-001@v1
锚点：未记录
最近确认：ecdae9ba
理由：`_sendHeartbeatOnce` 成功分支、degraded 累计 >720s 守卫、复用 boot

## D-unmapped-079@v1 : 下载校验口径 — 零子进程
状态：implemented
变更：2026-08-30-daemon-self-heal
原编号：D-003@v1
锚点：未记录
最近确认：ecdae9ba
理由：buffer ≥64KB 且 `BUILD_ID` 正则可提取（与 `DISK_BUILD_ID_RE` 同款，

## D-unmapped-080@v1 : respawn 最后防线 — 不退出保活
状态：implemented
变更：2026-08-30-daemon-self-heal
原编号：D-005@v1
锚点：未记录
最近确认：ecdae9ba
理由：spawn 前同款校验，不过 → error 日志 + 提前 return 不退出；返回类型

## D-unmapped-081@v1 : respawn 前校验提前到 stop 之前（主拦截点）
状态：implemented
变更：2026-08-30-daemon-self-heal
原编号：D-009@v1
锚点：未记录
最近确认：ecdae9ba
理由：新增 `validateBundleOnDisk` 导出；`_tryUpdate` 在 stop() **之前**调用：

## D-unmapped-084@v1 : PPM 个人工作台头像维持首字占位（用户头像功能非目标）
状态：implemented
原编号：D-003@v1
锚点：未记录
最近确认：41c3b37
理由：2026-09-10-account-avatar-upload——PPM 已上线模块不动，WorkbenchProfile.avatar_text 维持首字；展示范围圈定为个人中心+顶栏+群聊（用户选定）。后续要接入再单独立变更。

## D-unmapped-138@v1 维持 R-01 接受不修代码，文档登记观察项（方案 A）
状态：implemented
变更：2026-09-16-background-task-grace-timeout
原编号：D-001@v1
锚点：未记录
最近确认：83b402f6b
理由：D（不改代码），文档载体方案 A。维持 2026-09-15-background-task-permission-lockout R-01 已接受的 P1 风险；本变更收窄为 known-issues.md 观察条目（四要素：暴露差/缓解链/重估触发/未来修复首选）+ 本变更 design.md 否定决策存档
故障面：若未来线上实证注册表泄漏（守卫放行但无对应存活任务），无界宽限暴露面超出设计先例——观察项记录的重估触发条件命中时按「未来修复首选：双窗兜底（条目存活=静默<60min 对齐先例 且 总时长<4h 绝对上限）」重开变更
退役判据：SDK 提供 per-task 权限上下文（canUseTool 带 task 归属）或 task_notification 可靠送达保证时，本观察项与 R-01 一并退役

## D-unmapped-173@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-pushgate-green-repair
原编号：D-001@v1
锚点：未记录
最近确认：eb946a2e7bf4a93671effef01ac7778043b7ba3f
理由：最大风险：行号锚是「随代码漂移的活契约」，后续提交再动 shared.js/index.js 行布局会再红——本变更只修当前态，不引入锚自愈机制（属另一变更面）。放弃的方案：给全部 17 处加 ? 后缀跳过关键词断言——被否：这批锚是真实代码引用而非纯位置叙事，跳过断言等于降低校验强度掩盖漂移。

## D-unmapped-177@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-09-27-pushgate-birth-tests-sync
原编号：D-001@v1
锚点：未记录
最近确认：48511fdc2075698795988139af8079b7001eb7bf
理由：最大风险：若 eb3b4bce 的放行语义后续被裁决回退（出生态不允许直入主流程），本两处断言需随语义再翻转——留锚在转换表注释。放弃的方案：直接删掉 brainstorm→execute 表行与 1a 用例——被否：删断言等于丢防护面，保留带 fromStageData 的真入门变体才守住「跳步拦截」语义。

## D-unmapped-218@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-03-splitgwt-direct-test
原编号：D-001@v1
锚点：未记录
最近确认：b1bd40888408db06043d6fd6352cb1343ac3a6e9
理由：风险趋零（纯断言追加）。试过放弃：删 export 关键字改内部函数——回退批次1 design 的导出声明且丢失直测价值，放弃；补消费方是更优解。

## D-unmapped-309@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-10-release-3-32-4
原编号：D-001@v1
锚点：未记录
最近确认：060a6f70e810071b6e752609a6257721fb2a0fe6
理由：最大风险：钉扎 IP 失效或 DoH 通道本身也被劫持（阿里 DoH 已沦陷，腾讯 DoH 是当前唯一可信通道）——IP 直连腾讯 DoH 端点（1.12.12.12）不依赖被劫持的域名解析，通道存活由发布前预核验（钉扎 npm view 返回真实 latest=3.32.3）先行证明：预核验失败即停，不带病发布。试过放弃的方案：① 改 hosts 文件钉扎——动系统配置，污染面大于进程级注入，放弃；② 用未钉扎 npm view 的结果做核验——劫持环境下数据不可信（本次实测返回污染值 3.32.2），放弃；③ 跳过核验直接发布——违背 3.32.2/3.32.3 惯例（latest 双核验是发布 FR），放弃。

## D-unmapped-381@v1 风险与死路（design 槽4 收割）
状态：implemented
变更：2026-10-15-pseudo-domain-clearance
原编号：D-001@v1
锚点：未记录
最近确认：5570285d46e6b499799c7a903903ea11bdd970e0
理由：最大风险：release 模块卡的 doc-debt 机器把任何 package.json 触达（含依赖升级）计为卡欠账 behind——接受：这正是发布面应有的可见性，欠账是 advisory 不阻断。次风险：docs-consistency 承接 10 条语义混杂（报告/收件箱/入库）——接受并留痕：一次性文档工作不值逐条建卡，未来同类工作若复发再立专域。放弃方案：①全部迁 unmapped（伪域计数归零但把 holding pen 灌爆，unmapped 基线消音机制会被打穿）；②为每个 auto-* 补卡转正（伪域即「无模块卡」的病本身，转正等于把噪音域固化进路由词典）；③按 suggestDomainFromFiles 机械迁移（实测对纯文档变更 5/8 组无法判定、2/8 组误建议——正是伪域成因机制本身，不可作为裁决依据）。

## D-unmapped-430@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-known-failures-c-recycle
原编号：D-001@v1
锚点：未记录
最近确认：5f38ad905c44fb86a4d82dff3897c57093014793
理由：最大风险：某测试套件 fixture 输出在真失败场景被行级正则计入失败行——但这只影响失败归因展示（哪些行算「失败行」），不影响 pass/fail 判定（exit 码 + TAP 摘要）；且待审计组条目本身注记「裸子串有吞真风险」，删除方向是收紧。放弃的方案：逐条等待「下次命中再锚定或删」——该约定已挂一个月（9-28 迁移至今），TAP 修复发版多轮无人命中，属拖延而非审慎；坑文原始约定就是修复后整段回收。

## D-unmapped-438@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-20-stage-templates-retrofit
原编号：D-001@v1
锚点：未记录
最近确认：f5b89b761f7b562048b80f057db96b4d59275c71
理由：最大风险=形式主义（为补流程装样子）——倒推入册的价值仅在审计链补全，若交付本身未验证就是空转。对冲：FR-02 绑定真实测试且收口实测门复核（6/6 绿是协议硬门非自述）。放弃的方案：a) 手工改上一变更归档件（往 change.patch 里补 diff）——归档件是 sha256 锚定的冻结审计面，回写违反不可变原则（D-unmapped-152 同款死路：归档件不回写）；b) revert 后重交付走完整协议——无谓翻搅 git 历史，交付内容零变化纯增风险；c) 不补册（接受缺口留 git log）——缺口已向用户披露、用户指示入册，补册成本一条轻量变更是合理对价。

## D-unmapped-444@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-brainstorm-proto-worktree
原编号：D-001@v1
锚点：未记录
最近确认：25e267fc5c5063acdbb6eb7ba2b7eeb77970735c
理由：最大风险：豁免面覆盖 verify 阶段——「verify 只审查不改码」的软约束在 worktree 内被放开。判定：可接受。Bash 侧对 worktree 内 cwd 本就无条件放行（echo > 即可写文件），Write/Edit 门与 Bash 门不一致才是现状异常；隔离区内改动不进主树、apply 有 allowlist 门把交付面，风险有双层兜底。 放弃案①：按变更活跃态收窄（仅 DB status='active' 的变更 worktree 放行）——放弃：hook 无法知道当前 agent 属于哪个 change，只能按路径判；且归档残留 worktree 的可写性与 Bash 侧对齐更可预期，引入 DB 活跃态判断反而制造两门不一致窗口。 放弃案②：给 brainstorm 加专用声明（如 proto-worktree flag/mode）——放弃：多一层声明状态要维护，收益只是名义上的「阶段纯度」；位置豁免一条规则覆盖全部非 execute 阶段，且与 Bash 侧策略同构。 放弃案③：只改 STAGE_HINTS 指引不动豁免（纯文档）——放弃：hooked harness 里 agent 被拦后按指引进了 worktree 仍被 :808 阶段门拦死，指引成死路，问题没解。

## D-unmapped-445@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-flow-skill-askuser
原编号：D-001@v1
锚点：未记录
最近确认：b9dfb18de4292ba64e383d6ab8b8d7fdaeb578f2
理由：最大风险：措辞与既有 skill 口径不一致造成双口径——用与 brainstorm 逐句对照验收兜住。放弃方案：① 改 templates/agents-instruction.md（AGENTS.md 生成源）加全局交互规范——放弃：作用域过宽，用户只要求 flow skill 对齐其他 skill 的既有形态，且各 skill 是在 SKILL.md 内自带该节，改全局源反而引入新形态；② 同步改 assets/command-cards/flow.md 命令卡——放弃：命令卡无多选项问询段落，无对齐对象。

## D-unmapped-446@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-review-dispatch-answer-salvage
原编号：D-001@v1
锚点：未记录
最近确认：f27d52f08db0345965fef871144bff6fd0b6d916
理由：最大风险：**平台 get_worker_result 的 answer 字段形态未拿到 schema 实证**（dsh 会话只证明「平台 UI 可见回答正文」与「artifacts 回收不到」）。缓解：answer/result 双字段兜底 + 任务书 ```json 块指引让原文落在可扫描形态 + salvage 把 artifacts 原文也序列化兜底——三重兜底下最坏退化仍是现状（completed-no-artifact + ②降级），不会更差。 放弃案： - **仅在 --salvage 时写 worker-answer.md**（正常回收不写）——放弃。终态原文是审计证据面（dsh 事故里人工只能靠平台 UI 贴回原文），回收成功也应留原文；且「写了但没提示」无成本（一个 markdown 文件随 .runtime 生命周期回收）。 - **completed-no-artifact 时 CLI 自动降级写 self review**——放弃。降级是人工决策（②里显式确认「平台确无结果」），CLI 自动降级正是本事故要修的「静默把独立评审降成自审」。 - **--from 直接指向 worker-answer.md**——放弃。register-stage-review --from 对文件做 JSON.parse+schema 校验，原文 markdown（含 ```json 围栏与说明文字）必然解析失败；--from 指向「人工修整出的纯 review.json 文件」，worker-answer.md 是修整素材。 - **client.js 里直接做 JSON 提取**——放弃。传输层保持纯度（task-02 既有约束），语义解析归消费方 extractReviewFromArtifacts，本次只透传原文。

## D-unmapped-447@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-lint-to-prepush
原编号：D-001@v1
锚点：未记录
最近确认：af6d334b7c0080ccbf67daa13dfa7da1781b11f9
理由：最大风险：收口证据不再含 lint 后，代码变更的 lint 破坏推迟到 push 才暴露（pre-push 拦截），多 agent 并行仓里 push 时 lint 红可能是他侧在途文件、归属判别成本后移——用户已知此代价并显式选 A；缓解：pre-push 钩子同一命令同一口径拦截，不丢防线只换时点。次风险：模板规则 4 措辞随版本发布扩散到消费仓——语义为 additive（描述既有 unavailable 标记），不改默认行为。放弃方案：① B 案面感知 lint（变更面零 lintable 文件才跳过）——放弃：用户显式选 A，且 B 需改 CLI+更多测试面；② 新增 lint_strategy 配置键——放弃：既有 unavailable 标记覆盖诉求，加键徒增配置面；③ 只改 AGENTS.md 不动模板——放弃：test-runner-failed-face ③ 逐字一致断言会红，且模板与 AGENTS 漂移。

## D-unmapped-448@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-cli-manifest-since-cache
原编号：D-001@v1
锚点：未记录
最近确认：2cbe778e170a09a1990e1e7cf189dfaa131b7017
理由：最大风险：**缓存与服务器清单脱钩后的幻影行**（缓存含服务器已不存在的行 → 每轮生成 no-op delete op）。诱因仅限缓存文件被外部破坏或服务器纪元更换；防线三层——spec_version 倒退检测全量对账、inc_count 定期全量对账（默认 50 轮）、`SILLYSPEC_SPEC_SYNC_FULL=1` 逃生门；幻影 delete 在服务端本就是无行 no-op（R-07），changes/ 整删另有 computeSpecOps 空树守卫兜底。次风险：缓存文件体积与全量清单同量级（2MB 级）——本地磁盘无压力，读取 <50ms（实测量级），可接受。 放弃的方案：① 只存游标不存 files（每次让服务器返回「游标后全量」）——服务器需新语义（返回基线+增量两段）且无合并锚，协议复杂化；② ETag/If-None-Match 整体未变短路——无变化场景才有效，任何单行变化仍全量 2.2MB；③ 服务器端存客户端会话——有状态、多机 CLI 各自游标互踩，与无状态端点原则冲突。

## D-unmapped-449@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-p0-p1-hardening
原编号：D-001@v1
锚点：未记录
最近确认：4421027e5b776be0f12c38d88517d66275034a9c
理由：最大风险：① 心跳行污染机器可读输出——若走 stdout，`--json` 消费方 JSON.parse(stdout) 会炸；定案走 stderr（console.error），人类/agent 均可见且 stdout envelope 纯净（pwsh 下 stderr 偶发 NativeCommandError 包装是既有环境噪声，心跳仅 >60s 慢路径出现，可接受）。② 冲突标记正则误报（把文档示例当标记）——限定 stash 面文件集 + 行首 `<{7} `/`={7}$`/`>{7} ` 三形态锚定，误报面收敛到「stash 恢复刚触碰的文件自身含行首标记」，即使误报也只是一次可人工解除的 apply 失败，fail-closed 方向安全。③ anon 自动升级被滥用冒充接管——升级仅限「匿名占位（机器级标识）→ 同主机显式身份」，匿名占位本就只拦他机（R-01 明示局限），升级不弱于既有隔离强度；他人显式/跨机持有不受影响。 试过放弃：① libuv 退出断言崩溃根修——Node on Windows 运行时缺陷（async 句柄关闭竞态），应用层无法根除，降级为 spawn-settle bounded 等待缓解（句柄建立完成后再放行父进程退出）；② known_failures 用 js-yaml 整体重序列化——丢注释，用户文档性受损，放弃，改定向行级手术；③ handoff 原子转移所有权到新 SESSION_ID——与既有「SESSION_ID 是所有权标识非会话实例，交接要求保持不变」设计冲突（handoff.js 头注释与 stage-session ledger 契约），且换 ID 本就是偏离交接块指引的操作，定案为粘贴块内显式预告 --takeover 出路；④ `--continue` 幂等化等 P2 项——不在本变更 P0/P1 范围，未纳入。

## D-unmapped-450@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-verify-reuse-large-repo
原编号：D-001@v1
锚点：未记录
最近确认：3c165eb38e5dcccdb611cdabcd8f8c477d258acc
理由：最大风险：FR-3 的面漂移假阻断——记录实测面 X 后 agent 手动补了测试绑定（面 X+Δ），dedupKey 不含测试面 → 复用可能拦下「其实新面能过」的收口。缓解：30min TTL 收敛窗口 + RERUN=1/force 逃生阀 + 阻断信息给四出路；错拦后果是「多等一轮人工确认」不是假通过（fail-closed 方向）。FR-2 资格先行理论上有「报告刚就绪、亲测本可在本步顺路跑掉却延后」的调度次优——接受（实测本来就该归亲测步，中间步顺路跑正是本次要消灭的浪费）。 试过放弃的方案：① dedupKey 无 git head 时回退「变更文件集内容哈希」——根因查明后不需要（maxBuffer 修复后主路径恢复，兜底代码纯增维护面）；② 收口门复用不带 TTL（与 noAI 闸完全对称）——面漂移风险无界，放弃；③ 把 gate verify CLI 也接快照口径判定——CLI 门本就主仓口径只读跑，接快照是语义扩张，超出本次修复面。

## D-unmapped-451@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-known-failures-unescape
原编号：D-001@v1
锚点：a/.b
最近确认：ea05501b7c2b0060d8542a2933d0209a25bcfe19
理由：最大风险：存量 local.yaml 中已手写「未转义反斜杠」的双引号条目（如手工直编辑出 "a\.b$"——严格 YAML 下 \. 非法，js-yaml 会抛错拒改，本就到不了读侧；宽松形态按未知转义回落字面，\. 不变、\. 回落为 .——语义与修复前对该形态的读法（原样保留 \.）不同。缓解：该形态在 YAML 严格语义下本不合法，js-yaml 门（list/apply 已有）先拦；豁免失配的后果方向是保守（多跑一轮）不是假绿）。次风险：三读侧 import 新模块的加载顺序/循环——叶子模块零 import，无环。 试过放弃的方案：①改写侧不转义（裸写反斜杠）——产出非法 YAML，js-yaml 门必拒，自毁;②读侧整体换 js-yaml 解析该段——三处读侧刻意轻量化不引重链（config-known-failures 注释自述），且整段重解析会动既有「断链容忍/注释容忍」行为面，超本次对称性修复；③只在 verify-postcheck 修——docs-check 与 CLI 侧同病不同修，三口径继续漂移。

## D-unmapped-452@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-21-docref-checkapproval-reanchor
原编号：D-001@v1
锚点：未记录
最近确认：5929f3da4ddea89580e4741cca1f8d749230e053
理由：无实质风险（一行字面量；校验器即回归锚）。放弃方案：无。

## D-unmapped-453@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-flow-verify-drafts
原编号：D-001@v1
锚点：未记录
最近确认：79f8808bb65338c6012af930f10b798f32f9e9ba
理由：最大风险：抽共享源时 approve 行为漂移——对策：approve 输出文案与退出码逐字保持，approve-channel-attest / approve-gate-tick 既有套件零改动全绿作回归锚。放弃方案：①独立实现一份「轻量校验」（两路判定必然漂移，弃）；②把 violations 明细塞进 flow status 恢复简报（status 是自愿查看面，塞校验输出令恢复简报膨胀——与 protocol-tax 输出瘦身方向相反，弃）。

## D-unmapped-454@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-flow-done-preflight
原编号：D-001@v1
锚点：未记录
最近确认：32b0e919913c1c6f2a09017400bee7525e860ab6
理由：最大风险：预检与权威门判定漂移（多拦=回归、漏报=白做）。对策：同源同判定（复用同一批函数而非重写）+ 旗标语义逐条镜像（turbo 降 advisory/处置旗标在场不拦/patch 子步已 done 跳过）+ e2e 与 unit 直调锁行为。批准后实现期裁剪：review.json schema 预验不做——三路皆负：①schema 违规成本=修正文件+重跑一轮 RTT，与检测时点无关（同轮提前检测不省轮次）；②违规发生的轮次 ledger 子步已 done（预检位于其内不跑）；③豁免轮（--no-review）权威门不读文件，预检先验会多拦权威门不拦的面（判定漂移）。放弃的方案：①把全部实测后门（绑定槽/空面/模块门）搬进预检——绑定自动补全依赖实测产物、空面/模块门依赖冻结面计算，前移需重实现半个 patch 子步，收益小风险大，本切片只搬独立可算的便宜门，弃；②预检写独立判定逻辑——必然漂移，弃。

## D-unmapped-455@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-dirty-gate-ignore
原编号：D-001@v1
锚点：未记录
最近确认：932698f0db4294d0492efd7610a1f6aac2bb7a2e
理由：最大风险：仓主把真交付路径误配进忽略清单 → 真缺口静默漏审。对策：①前缀是显式仓主声明（与 module_gate_ignore 同治理等级）；②ℹ️ 留痕行每轮可见（配了什么、剔了几个可审计）；③文档口径「已知残渣面」写进键语义。放弃方案：①CLI 自动猜残渣（untracked 整目录/运行库模式启发式）——枚举路径内容违反零枚举红线且必误伤真交付，弃；②按「他侧活跃变更声明」自动放行——经查 collectFreezeFiles 的 split.own 切分已实现该语义（他侧声明的 dirty 本就不进 dirtyWarned），无增量可做，留现状。

## D-unmapped-456@v1 设计期风险与放弃方案（底稿）
状态：implemented
变更：2026-10-23-turbo-docs-auto
原编号：D-001@v1
锚点：未记录
最近确认：6df7e3d814ae3a9eab2395d7a61660aaba9f60e8
理由：最大风险：误降档（有代码面被判纯文档→跳过实测与评审）。对策三重：①分类器复用实测门同源常量（实测门「宁可多跑不可漏跑」口径的同一双通道正则——src 段+代码扩展名）；②面含脏面（未提交代码文件也拦降档）且经 dirty_gate_ignore 剔除后判（已知残渣口径与 dirty 门同源）；③判定异常/面空 fail-closed 全量。放弃方案：①docs-auto 档保留评审 1/4 采样（与旗标档差异化）——需把评审豁免从 turbo 单布尔改成分源路由，五个消费点的简单继承就破了，采样校准由豁免面既有 1/4 承担，docs-auto 不叠加机制，弃（如实披露：docs-auto 档与旗标档同形全免）；②按 requirements/design 声明面判纯文档——声明可谎报/滞后，git 面是机械事实，弃。
