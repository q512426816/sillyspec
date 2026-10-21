# 决策知识 — frontend

> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。

## D-frontend-002@v1 : plan 模式采用强确认交互
状态：implemented
原编号：D-001@v1
锚点：`frontend/src/components/daemon/plan-approval-card.tsx`
最近确认：04bb45fe
理由：强确认，类似 askuser 弹窗。

## D-frontend-003@v1 : 预览弹窗用 antd Modal
状态：implemented
原编号：D-005@v1
锚点：`frontend/src/components/files/file-preview-modal.tsx`
最近确认：3b1624fb
理由：FRONTEND_PAGE_STYLE 约定弹窗不用 Drawer；标题栏含元信息+下载，body 按注册表分发（D-004）。

## D-frontend-004@v1 : PDF 渲染用 pdf.js 画布（iframe+原生查看器不可依赖）
状态：implemented
原编号：D-007@v1
锚点：`frontend/src/components/files/previewers/pdf-previewer.tsx`
最近确认：3b1624fb
理由：ql-20260827-001——Chrome 原生查看器对内嵌 blob PDF 报"未能加载"、嵌入式 Chromium 无 PDF 组件；pdf.js 逐页画布零插件依赖，worker 静态放 public/，>50 页截断提示下载。

## D-frontend-005@v1 : Excel 不做在线渲染（xls/xlsx → fallback 下载引导）
状态：implemented
原编号：D-008@v1
锚点：`frontend/src/components/files/preview-registry.ts`
最近确认：3b1624fb
理由：ql-20260826-013 用户决策——SheetJS 表格还原度差、OnlyOffice/LibreOffice 管线先后退役（字体/网格排版/页数偏差），Excel 预览弹窗直接给下载引导。

## D-frontend-006@v1 : md 附件渲染器统一 useObjectUrl 托管 blob 生命周期
状态：implemented
原编号：D-009@v1
锚点：`frontend/src/components/files/use-object-url.ts`
最近确认：3b1624fb
理由：鉴权拉 blob → createObjectURL → 卸载/切换自动 revoke 三件套统一 hook，消灭三入口手写拉取泄漏风险（R-04）。

## D-frontend-007@v1 : OnlyOffice 渲染器免 npm 包（动态 script + DocsAPI）
状态：implemented（休眠）
原编号：D-010@v1
锚点：`frontend/src/components/files/previewers/onlyoffice-previewer.tsx`
最近确认：3b1624fb
理由：不引 @onlyoffice/documenteditor-react——DocsAPI 全局 + 自写最小类型；api.js 单飞加载；DS 9 替换式挂载（holder 被 iframe 替换）→ 兜底超时以父容器出现 iframe/holder 消失为成功信号（ql-20260826-002 误降级教训）。

## D-frontend-008@v1 : 进行中可见性三层方案（投影+徽标 / CLI 上报增强 / 心跳不做）
状态：implemented
变更：2026-08-29-change-delete-closure-and-spec-pull
原编号：D-007@v1
锚点：`frontend/src/components/changes/change-activity-badge.tsx`
最近确认：0ec935c9
理由：Layer 1 ChangeSummary.last_pushed_at 投影（progress 行既有列，零 migration）+ 活动徽标三态（active≤30min「进行中」/active>30min「停滞」/waiting|null 空闲）；ACTIVITY_STALE_MS=30min 阈值与 ISO_LIKE_RE 正则白名单防御解析（畸形串回退原文不炸组件）均为前端展示层关注点不进后端 DTO，复用既有 30s 轮询零新增请求；Layer 2 CLI X3 步骤开始/X4 任务边界补推为跨仓渐进增强（后端零改动）；Layer 3 心跳 Non-Goal 协议预留。徽标文案只陈述事实（「最后信号 x 分钟前」）不断言挂死（R-12）；current_step_status 不区分 pending/in-progress 是 Layer 1 启发式固有边界（态 1/态 2 仅由阈值区分），强判定需心跳留将来。

## D-frontend-009@v1 : 覆盖范围不含 git-log
状态：implemented
变更：2026-08-26-file-fullscreen-preview
原编号：D-002@v1
锚点：未记录
最近确认：5d86ddb1
理由：用户勾选「统一预览弹窗加全屏 + 工作区文件浏览器」，未勾选 git 提交记录文件列表。

## D-frontend-010@v1 : 方案 A 统一弹窗升级
状态：implemented
变更：2026-08-26-file-fullscreen-preview
原编号：D-003@v1
锚点：frontend/src/components/files/file-preview-modal.tsx
最近确认：5d86ddb1
理由：用户选「方案A：统一弹窗升级」。

## D-frontend-011@v1 : CSS 伪全屏而非浏览器 Fullscreen API
状态：implemented
变更：2026-08-26-file-fullscreen-preview
原编号：D-004@v1
锚点：未记录
最近确认：5d86ddb1
理由：antd Modal 尺寸切换（100vw/100vh）实现伪全屏，参考 agent-log-viewer.tsx L905 fixed inset-0 先例。不用 requestFullscreen()——iframe/弹窗嵌套下兼容坑多且不可控。

## D-frontend-012@v1 : 新增 HtmlPreviewer 渲染器
状态：implemented
变更：2026-08-26-file-fullscreen-preview
原编号：D-005@v1
锚点：frontend/src/components/files/previewers/html-previewer.tsx（新增）
最近确认：5d86ddb1
理由：新增 html 渲染器：iframe sandbox="allow-scripts allow-popups" + srcDoc（与 change-file-tree 内联 HTML 预览同款安全策略）；registry 增 text/html mime + html/htm 扩展名。

## D-frontend-013@v1 : explorer/变更文件不接 OnlyOffice
状态：implemented
变更：2026-08-26-file-fullscreen-preview
原编号：D-007@v1
锚点：未记录
最近确认：5d86ddb1
理由：不接。officeSource 仅支持 session_attachment|file 两类有平台 id 的来源；这两处无 id，不传该字段恒走本地渲染器（docx-preview/SheetJS）。

## D-frontend-014@v1 : Esc 保持 antd 默认关窗
状态：implemented
变更：2026-08-26-file-fullscreen-preview
原编号：D-008@v1
锚点：未记录
最近确认：5d86ddb1
理由：保持 antd Modal 默认（Esc 直接关窗）。拦截改写需 hack antd 键盘处理链，脆弱且收益小；原型演示的「先退全屏」仅为示意，不作为实现要求。

## D-frontend-015@v1 @V1 渲染层策略：独立移动渲染层（方案 A）
状态：implemented
变更：2026-08-26-mobile-workspace-page
原编号：D-001@v1
锚点：未记录
最近确认：e784c9fb
理由：新增 `/m/workspaces/[id]/**` 独立移动页面：变更列表/详情用移动卡片 + 全屏钻取重绘；会话直接复用 SessionPanel 内核（继门户页/悬浮窗之后的第四宿主）。数据层 100% 复用 `lib/changes.ts` + `lib/daemon.ts` + `lib/tasks.ts`，桌面代码零回归（仅解除 m/workspaces 门禁等 4 处最小改动）。middleware UA 分流（matcher 已含 `/workspaces/:path*`）与 route-guard（已放行 `/workspaces/:id/**`）无需结构改动

## D-frontend-016@v1 @V1 会话能力边界：完整内核复用
状态：implemented
变更：2026-08-26-mobile-workspace-page
原编号：D-003@v1
锚点：未记录
最近确认：e784c9fb
理由：SessionPanel 内核 100% 复用，所有高级功能（消息队列/子代理目录/上下文用量/会话配置）保留，仅重排样式适配手机竖屏。对齐 2026-08-25-unified-floating-session 验证过的"一内核·N 宿主"模式

## D-backend-002@v1 : 数据链路走方案 A——git_log 模块扩展独立轻量 status 端点
状态：implemented
变更：2026-08-26-workspace-git-status
原编号：D-002@v1
锚点：backend/app/modules/git_log/router.py
最近确认：86d6c405
理由：复用 git_log 模块与 host-fs 平名通道，daemon 加单方法 git_status、backend 加 GET /git-log/status、前端共享组件。

## D-backend-007@v1 ctx_tokens 派生位置——归一化器源头上报处派生（方案 A），否决消费侧统一派生（方案 B/C）
状态：implemented
变更：2026-09-13-ctx-usage-all-providers
原编号：D-001@v1
锚点：sillyhub-daemon/src/interactive/providers.ts:ProviderCaps（caps 键落点）+ sillyhub-daemon/src/interactive/usage-ctx.ts:ctxTokensFromNetInput（公式单源落点，execute 新建）
最近确认：未记录
理由：用户原话指定方向：「都要接入的，并且需要统一抽象出来（我记得最近刚刚做了个统一抽象的事情，就是怕后面再接新 agent 又遗漏一些功能）」。据此选方案 A（各归一化器在 usage 构造处用共享 helper 派生 + ProviderCaps 第 11 键声明走既有三端生成与守护链）。

## D-frontend-017@v1
状态：implemented
变更：2026-09-19-tool-report-session-replay
原编号：D-001@v1
锚点：repo://sillyhub/frontend/src/components/daemon/session-panel/session-panel-page.tsx:3474（isToolReportBody 分支）、repo://sillyhub/frontend/src/components/daemon/turn-timeline.tsx:220（SessionTurnView）
最近确认：53c67e02a
理由：直接按普通会话样式展示会话时间线，数据源换成 agent 日志对话化消息——复用真组件（TurnTimeline）而非自造相似渲染器

## D-frontend-018@v1
状态：implemented
变更：2026-09-19-tool-report-session-replay
原编号：D-002@v1
锚点：repo://sillyhub/frontend/src/components/daemon/agent-log-card.tsx:877（AgentLogCard 折叠栏——子代理入口可沿用该形态）
最近确认：53c67e02a
理由：主日志 = 回放正文；子代理日志降级为次级「工作会话」入口（不并入正文，避免同一叙事重复两遍）；主日志多条（同 ctx 多次本地会话）时最新为主、更早折叠

## D-backend-016@v1
状态：implemented
变更：2026-09-19-tool-report-session-replay
原编号：D-004@v1
锚点：repo://sillyhub/sillyhub-daemon/src/agent-log/parse-zcode-model-io.ts:66（NormalizedLogMessage）、repo://sillyhub/backend/app/modules/platform_sync/router.py:849（messages 端点）
最近确认：53c67e02a
理由：四层打通——daemon 解析器透传 usage/turn/model/耗时 + 全会话累计 → RPC 返回结构 → 平台 GET /agent-logs/{id}/messages schema → gen:types → 前端映射到 SessionTurnView token 字段与会话用量环；老 daemon 字段可选、缺省显示「未知」；cursor-agent 回放 token 恒「未知」（数据不落盘，非解析器可解）

## D-backend-017@v1
状态：implemented
变更：2026-09-19-tool-report-session-replay
原编号：D-008@v1
锚点：decisions.md D-001/D-004/D-007
最近确认：53c67e02a
理由：方案A——前端适配器把 NormalizedLogMessage[] 映射为 SessionTurnView 喂 TurnTimeline 真组件；daemon zcode 解析器补 usage/turnId/model/累计 + 新增 claude-code、cursor-agent 解析器与 cursor-agent 扫描上报；平台 messages schema 加可选字段 + gen:types；平台库零表结构改动，按需现读

## D-frontend-019@v1 agent 回复去气泡、用户消息保留气泡
状态：implemented
变更：2026-09-20-agent-reply-no-bubble
原编号：D-001@v1
锚点：未记录
最近确认：fbbf02f4b
理由：用户确认（2026-09-20 explore 会话 + AskUserQuestion 选择直接立项）：agent 回复文本去掉气泡（边框/底色/阴影/内边距，内容铺在时间线背景上）；用户消息（含轮内引导消息三态气泡）保留品牌色右对齐气泡不动。依据：主流 AI 会话同款形态（Claude/ChatGPT/Gemini/DeepSeek），且项目已半途演进——子代理文本段已透明化去气泡、agent 气泡曾因"顶满成文档块"收窄 86%→80%、mobile 限宽放宽至 94%。

## D-frontend-020@v1 双渲染路径同步改，不做新旧形态分叉
状态：implemented
变更：2026-09-20-agent-reply-no-bubble
原编号：D-002@v1
锚点：sillyhub/frontend/src/components/daemon/turn-timeline.tsx:671
最近确认：fbbf02f4b
理由：同步改。旧路径（segments undefined 的孤儿 turn/旧数据）与 v2 路径若形态不一致，同一会话里新旧消息长相分叉，违背"回退不崩不空且行为等价"的既有约定（repo://sillyhub/frontend/src/components/daemon/turn-timeline.tsx:671 注释）。代价仅是多改一处类名。

## D-frontend-021@v1 实现方案选 B（容器语义重构）
状态：implemented
变更：2026-09-20-agent-reply-no-bubble
原编号：D-005@v1
锚点：未记录
最近确认：fbbf02f4b
理由：方案 B。⚠️ 采纳方式如实记录：AskUserQuestion 会话内用户未作答（离席），按预置推荐默认继续，非用户亲选——用户可 `sillyspec run brainstorm --reopen --from-step 4` 改选，改选 C 时本决策 superseded。理由要点：新建无框正文类（seg-text-body 语义名）承载 agent 文本，bubble 类名只留用户侧，避免"名不副实"；顺带删子代理透明化补丁（.seg-subagent-body .seg-text-bubble 覆盖，去气泡后天然冗余）+ 迁移 mobile 规则；方案 A 的共享类 .turn-bubble 拆样式是埋坑（用户气泡与旧路径答复共用），方案 C 超出本次气泡诉求（YAGNI）。
故障面：类名替换遗漏（测试/样式选择器仍引用旧类）——靠全仓 grep .seg-text-bubble/.turn-bubble 清单化核对兜底
退役判据：若后续整体对齐主流形态（方案 C 复潮），正文容器类可沿用，仅结构层重排

## D-backend-003@v1 定时发送的实现方案
状态：implemented
变更：2026-09-07-session-pin-rename-scheduled-send
原编号：D-001@v1
锚点：未记录
最近确认：35f3d6528
理由：**方案 B：新建 `agent_session_scheduled_messages` 表 + 独立 sweeper 常驻协程**。到点扫描 due 条目，逐条复用 `inject_session_as_service`（忙轮自动入 `agent_session_queued_messages` 既有队列），单条状态 pending → dispatched / cancelled / failed，失败隔离。

## D-frontend-022@v2 liveness 联表取数与未读转移检测（客户端状态机）
状态：implemented
变更：2026-09-08-session-list-liveness-dot
原编号：D-001@v2
锚点：未记录
最近确认：35f3d6528
理由：**客户端转移检测状态机**：hook 每轮（30s）对每个有 liveness 的会话，取 localStorage 存的该会话「上次已知 state」与当前 state 比较——`prevState ∈ {working, blocked}` 且 `current == idle` 时置未读标记（`sillyhub:liveness-unread:${sessionId}` = 转移发现时间戳）；随后更新 `sillyhub:liveness-state:${sessionId}` = current。红点显示 = 未读标记存在；`selected` 置真（覆盖点击/Enter/深链三路）时清除未读标记。首次见到该会话（无 prevState，含 unknown/无记录）不亮红点，避免初次打开刷屏。取数缓存槽固定 `"all"`（queryKey `["agent-liveness-overview", "all"]`）——API 本就不按 workspace 过滤（鉴权 scope 全量），固定槽让悬浮宿主/门户多挂载共享同一份缓存与轮询；与总览卡（wsId 槽）各自独立互不干扰（跨路由 gcTime 内仍可复用 react-query 缓存）。
supersedes：D-001@v1

## D-frontend-023@v1 未读转移语义继承（归档草案 D-006 落地）
状态：implemented
变更：2026-09-08-session-list-liveness-dot
原编号：D-003@v1
锚点：未记录
最近确认：35f3d6528
理由：触发边 = `working/blocked → idle` 状态转移（用户原话）；清除 = 用户看过该会话（点开）；**不往状态枚举加「未读」**（用户硬约束）。

## D-frontend-024@v1 展示硬约束继承（D-004 两层 + 双主题 + 悬停卡定位）
状态：implemented
变更：2026-09-08-session-list-liveness-dot
原编号：D-002@v1
锚点：sillyhub/frontend/src/components/sessions/session-list-panel.tsx:2640
最近确认：35f3d6528
理由：行尾**只加 ~18px 状态小灯**（复用 `liveness-badge.tsx` 的 LivenessDot 与 LIVENESS_META，不重写五态视觉）；**不新增列、不改列表布局**；完整信息只出现在悬停卡；无关联日志的会话不显示灯；色值只用语义阶。悬停卡用 **antd Popover（trigger=hover，默认 portal 渲染）**包住 18px 小灯实现——SessionRow 根节点 `overflow-hidden` 会裁剪 absolute 定位卡片（repo://sillyhub/frontend/src/components/sessions/session-list-panel.tsx:2640，Grill BL-02），portal 渲染是唯一不破行布局的落法；悬停卡内容为**组合渲染**（LIVENESS_META 状态名 + 静默时长相对时间（last_event_at）+ 证据摘要（state_evidence 截断）+ 推导时间（state_derived_at）），不直接用 livenessTitle 单行字符串（其为原生 tooltip 拼接形态）；「关联」行删除（AgentLogListItem 无 change_key/quick_id 数据源，Grill CC-04）。

## D-backend-004@v1 根治方案选 A——全链强制 workspace_id + daemon 映射查根
状态：implemented
变更：2026-09-09-conflict-root-workspace-scoping
原编号：D-001@v1
锚点：未记录
最近确认：35f3d6528
理由：**方案 A**。对比 RPC `sillyspec_conflict_snapshot` 与裁决指令 `sillyspec_resolve` 全链（REST 请求体 → WS payload → daemon 消息处理 → 前端弹窗下传）强制携带 `workspace_id`；daemon 用 `_sillyspecStatusRoots.get(workspaceId)` 解析根，**映射未命中不得回退单槽位**，抛 RpcError `workspace_root_unknown`（提示该工作区尚未被本机会话认领）；无 workspace_id 的旧调用形态保留单槽位 legacy 语义。辅防：无 workspaceId 的 claim 不再覆盖单槽位。与根因文档 `docs/sillyspec/conflict-compare-wrong-status-root.md` 已定稿口径一致。

## D-backend-005@v1 P0-2 独立配额池的作用域与实现层次
状态：implemented
变更：2026-09-10-review-dispatch-platform-fixes
原编号：D-002@v1
锚点：未记录
最近确认：f1bdbef95
理由：用户原话「支持按 workspace 或按 agent_profile 独立配置（独立池或不同 provider）」。探查证实 profile 绑定链路已全通，真缺口=llm_provider schema 锁死 claude + daemon injector REGISTRY 无 pi；补齐后 per-(user, agent_kind=pi) 默认与 profile/workspace(default_agent_profile_id) 两条路都开放，不在本变更里强选一条。

## D-frontend-025@v1 供应商下拉按会话引擎过滤 agent_kind
状态：implemented
变更：2026-09-11-session-provider-switch-codex-pi
原编号：D-002@v1
锚点：frontend/src/components/sessions/session-config-bar.tsx
最近确认：225dd771d
理由：用户裁决：按引擎过滤。codex 会话只列 codex kind 供应商，pi 只列 pi kind，claude 只列 claude kind。顺手修掉现状「全量展示 + 选错 kind 撞 backend 422（repo://sillyhub/backend/app/modules/daemon/session/service/inject_gates.py:556 agent_kind 不匹配）」的坑。

## D-frontend-001@v1 触发时机=仅 turn 空闲可压（轮中禁用）
状态：implemented
变更：2026-09-14-session-ctx-compact
原编号：D-002@v1
锚点：未记录
最近确认：1aacbb3d9
理由：用户选「仅空闲时可压」——turn running 时按钮禁用（提示「轮运行中」），turn 空闲后才可压缩；不打断用户正在跑的任务（各引擎原生 /compact 也都是空闲交互语义）。

## D-backend-009@v1 反馈呈现=端点响应回执 + 前端通知三分型
状态：implemented
变更：2026-09-14-session-ctx-compact
原编号：D-004@v1
锚点：未记录
最近确认：1aacbb3d9
理由：端点响应承载回执，前端按 provider 分型通知：pi「已压缩：X → 约 Y tokens」（数字来自 RPC response）/ codex「已触发上下文压缩」（受理无数字）/ claude「已发送 /compact（压缩轮运行中）」（流程可见性由会话流中的 /compact 轮本身承载）；失败通知带 error 原文（如 pi "Nothing to compact"）。

## D-backend-010@v1 架构=compact 同款 RPC 模式（可选 driver 方法+daemon RPC handler+caps 键）
状态：implemented
变更：2026-09-14-session-thinking-level
原编号：D-002@v1
锚点：未记录
最近确认：28915f71b
理由：方案 A：照 2026-09-14-session-ctx-compact 刚验证的 RPC 模式——driver.ts 加可选 `getThinkingLevels?(handle)`/`setThinkingLevel?(handle, level)` 两契约方法；daemon.ts 注册 `session_get_thinking_levels`/`session_set_thinking_level` 两 RPC handler；backend 两端点（GET 档位列表+POST 切换）；caps 第 13 键 `thinking_level`（claude/pi/codex=true、cursor=false）。B（进程重启式）否决：切档重启子进程丢流式状态体验差；C（inject 文本）否决：pi/codex 不认文本且档位查询无通道。

## D-backend-011@v1 保留服务端分页（量级一两百）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-002@v1
锚点：未记录
最近确认：e21bf19cc
理由：一两百个量级，服务端分页（12/页 limit/offset）保留，不做"加载全部"改造。

## D-frontend-026@v1 前端拖拽库——@dnd-kit/core + @dnd-kit/sortable
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-010@v1
锚点：未记录
最近确认：e21bf19cc
理由：引入 @dnd-kit/core + @dnd-kit/sortable（两者皆新依赖）。理由：1/2/3 列响应式网格的落点判定与位移动画，原生 HTML5 需手写碰撞检测且体验糙；dnd-kit 轻量、支持网格 sortable、键盘无障碍内置。

## D-backend-013@v1 数据层实现——方案 A（排序表 + 浮点中点锚点）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-011@v1
锚点：未记录
最近确认：e21bf19cc
理由：方案 A（用户 brainstorm Step 4 AskUserQuestion 亲选）。理由：唯一同时满足锚点跨页（客户端只需边界卡 id）+ 保住现有服务端 limit/offset 分页与四路筛选 SQL（LEFT JOIN 原生 ORDER BY）+ 每次拖拽 O(1) 单行写入；B 把排序挤到应用层与分页 SQL 冲突且全量写放大；C 跨设备不同步、分页下无法独立排序。淘汰记录：B 违反 D-002 精神（架空服务端分页）、C 违反 D-001（顺序非服务端持久）。

## D-frontend-027@v2 筛选态手柄形态——禁用态而非隐藏
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-005@v2
锚点：未记录
最近确认：e21bf19cc
理由：禁用态：手柄可见但灰显（cursor-not-allowed）+ 筛选条内提示。可发现性优于隐藏——用户在筛选态能看见"有排序功能但被保护"，而非以为功能不存在。
supersedes：D-005@v1

## D-frontend-028@v2 「移动到…」弹窗范围收敛——页首/页尾 + 方向锚点
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-009@v2
锚点：未记录
最近确认：e21bf19cc
理由：弹窗仅保留页首/页尾（用户 Step 5 确认的设计形态），"某卡前后"精确落位由页内拖拽覆盖不重复提供。锚点按移动方向区分：页首=向上 before_id 目标页第一张/向下 after_id 目标页第一张；页尾=向上 before_id 目标页最后一张/向下 after_id 目标页最后一张；目标页内容先经现有列表接口拉取；锚点为自身时前端跳过请求。
supersedes：D-009@v1

## D-backend-014@v1 边缘投放带锚点由服务端页相对解析（to 枚举 + rank 响应）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-012@v1
锚点：未记录
最近确认：e21bf19cc
理由：投放带请求改 `{to: "next_page_head"|"prev_page_tail"}`（可选 page_size 默认 12），服务端在默认视图有序序列（可见 ∧ active ∧ 未删，按显示序）上定位被移动卡 rank、按分页数学解析目标插入 rank，再走统一中点路径；响应携带移动后 rank，前端 floor(rank/page_size) 换算目标页自动翻页+高亮。否决客户端预取相邻页方案：每次拖拽多两请求且边界卡在并发移动下会过期，分页数学在客户端重复实现必再出 off-by-one。

## D-backend-012@v2 边缘投放带锚点表达改 to 枚举（UX 不变）
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-003@v2
锚点：未记录
最近确认：e21bf19cc
理由：维持边缘投放带路线（用户 explore 亲选的 UX 不变），仅锚点表达从客户端 id 锚点改为 `{to: next_page_head|prev_page_tail}` 服务端解析（D-012）。v1 的锚点写法作废；翻页+高亮闭环承诺保留。
supersedes：D-003@v1

## D-backend-015@v1 分页数量不变量——move 是纯重排
状态：implemented
变更：2026-09-14-workspace-drag-sort
原编号：D-014@v1
锚点：未记录
最近确认：e21bf19cc
理由：不允许（用户 2026-09-14 明确约束）。move 只做单行 sort_position 更新，不增删任何行；任何移动后 total 不变、每页恒 PAGE_SIZE 张（末页允许不满），跨页移动=源页少一张/目标页多一张后重新切片。

## D-unmapped-028@v1 : 会话面板基元统一方向 = antd
状态：implemented
变更：2026-08-22-session-panel-unify
原编号：D-001@v1
锚点：未记录
最近确认：6fdabce0
理由：用户拍板 antd（AskUserQuestion 2026-08-22）。

## D-unmapped-029@v1 : 实施方式 = 一次性原子改造
状态：implemented
变更：2026-08-22-session-panel-unify
原编号：D-002@v1
锚点：未记录
最近确认：6fdabce0
理由：用户选方案 A：同一变更内一次做完，单轮验收。

## D-unmapped-030@v1 : TurnStatusBadge 纳入 antd 化（Grill U-01）
状态：implemented
变更：2026-08-22-session-panel-unify
原编号：D-003@v1
锚点：未记录
最近确认：6fdabce0
理由：用户拍板一并换 antd（贯彻「整个会话 UI 家族统一」）。

## D-unmapped-031@v1 : 按钮尺寸 = 主操作 32px / 打断 small 24px（Grill U-02）
状态：implemented
变更：2026-08-22-session-panel-unify
原编号：D-004@v1
锚点：未记录
最近确认：6fdabce0
理由：用户拍板：主操作 antd 默认 32px，打断对齐 page 惯例 small 24px。

## D-unmapped-032@v1 : 📎 附件按钮 antd 映射 = type="text"（Grill U-03）
状态：implemented
变更：2026-08-22-session-panel-unify
原编号：D-005@v1
锚点：未记录
最近确认：6fdabce0
理由：设计内定 type="text"（对应 ghost 无边框语义）。

## D-unmapped-044@v1 : 三入口统一为一个门户组件（以 /sessions 为准）
状态：implemented
变更：2026-08-22-workspace-sessions-portal
原编号：D-001@v1
锚点：未记录
最近确认：c06c7934
理由：以 /sessions 为准抽共享 SessionsPortal（scope 判别联合），三入口渲染同一组件（用户三轮 AskUserQuestion 拍板：范围两处一起/方案A/设计确认）。

## D-unmapped-045@v1 : 变更详情承载=专属路由门户
状态：implemented
变更：2026-08-22-workspace-sessions-portal
原编号：D-002@v1
锚点：未记录
最近确认：c06c7934
理由：方案A：卡片变入口（前 3 条预览+打开按钮）跳专属路由（用户选，对比页内展开/全屏弹窗两案）。

## D-unmapped-046@v2 : scope 列表数据源=全局端点+服务端过滤（取代 D-003@v1 客户端过滤）
状态：implemented
变更：2026-08-22-workspace-sessions-portal
原编号：D-003@v2
锚点：未记录
最近确认：c06c7934
理由：后端 GET /sessions 增 workspace_id/change_id 可选过滤参；前端 scope 复用全局端点（owner-scoped+全字段+筛选+分页），v2 的降级矩阵/客户端过滤/筛选隐藏全部退场。
supersedes：D-003@v1

## D-unmapped-047@v1 : ?session= 升级为门户统一能力
状态：implemented
变更：2026-08-22-workspace-sessions-portal
原编号：D-004@v1
锚点：未记录
最近确认：c06c7934
理由：SessionsPortal 统一支持 ?session=<id> 初始选中（迁移旧 :95-113 能力，无效 id 静默忽略），三入口通用。

## D-unmapped-048@v1 : ended 会话恢复自动→手动（以 /sessions 行为为准）
状态：implemented
变更：2026-08-22-workspace-sessions-portal
原编号：D-005@v1
锚点：未记录
最近确认：c06c7934
理由：统一为 page 模式手动重开——用户「以 /sessions 为准」原则的直接推论；design §4.E 明示为有意交互变更。

## D-unmapped-058@v1 : 关联入口双向都要
状态：implemented
变更：2026-08-28-session-ppm-task-binding
原编号：D-001@v1
锚点：未记录
最近确认：73a4eda3
理由：双向都要——任务/问题侧提供"发起会话"入口（详情/列表处），会话输入框 @联想扩展支持选择 PPM 任务/问题，与现有变更/快速修复绑定体验一致。

## D-unmapped-059@v1 : 全状态可关联
状态：implemented
变更：2026-08-28-session-ppm-task-binding
原编号：D-002@v1
锚点：未记录
最近确认：73a4eda3
理由：全状态可关联。列表/联想默认展示"进行中"，但已完成/未开始的任务也能手动关联（如复盘场景）。

## D-unmapped-060@v1 : 附件真注入 + 降级文字清单
状态：implemented
变更：2026-08-28-session-ppm-task-binding
原编号：D-003@v1
锚点：未记录
最近确认：73a4eda3
理由：真附件注入——后端尝试读取附件内容作为真附件传给 agent（能看图/读文件）；读取失败的降级为文字清单（附件名+链接）。

## D-unmapped-061@v1 : PPM 附件访问控制复用 _can_access
状态：implemented
变更：2026-08-28-session-ppm-task-binding
原编号：D-007@v1
锚点：未记录
最近确认：73a4eda3
理由：复用 FileService._can_access 同口径校验：有权条目物化注入；无权条目降级文字清单仅列文件名并注明「无权访问」（不带链接）。行为对齐 PPM UI 现状（batch_meta 同样静默剔除无权行），不引入跨用户文件读取。

## D-unmapped-062@v1 : PPM 附件物化为 SessionAttachment
状态：implemented
变更：2026-08-28-session-ppm-task-binding
原编号：D-006@v1
锚点：未记录
最近确认：73a4eda3
理由：创建会话携带 ppm item 时，后端把任务 file_urls 对应 File 读取 bytes → 写入 session attachment storage → 物化 SessionAttachment 行（session_id 直接回填、user_id=创建者），并入现有 attachment_ids 组装链路（assemble_inject_attachments/download 回调/标记行/前端展示全复用，daemon 零改动）。

## D-unmapped-063@v1 : 统一 PPM 绑定表（方案 B）
状态：implemented
变更：2026-08-28-session-ppm-task-binding
原编号：D-005@v1
锚点：未记录
最近确认：73a4eda3
理由：方案 B——一张 `ppm_item_session_links` 表（kind 字段区分 plan_task/problem），一套绑定 helper + 一个统一前导构建器；@联想/会话筛选/任务侧卡片前端逻辑复用一套。

## D-unmapped-064@v2 : 工作区排序键定死 workspace_id 升序
状态：implemented
变更：2026-08-28-session-ppm-task-binding
原编号：D-004@v2
锚点：未记录
最近确认：73a4eda3
理由：workspace_id 升序（UUID 字典序）为唯一排序键，后端 link.workspace_id 写入与前端预选同键，消除分叉。
supersedes：D-004@v1

## D-unmapped-072@v1 : token 统计范围 = 派发执行 ∪ 关联会话执行（按 run 去重）
状态：implemented
变更：2026-08-30-change-center-usage-stats
原编号：D-002@v1
锚点：未记录
最近确认：84a5b960
理由：并集去重（用户 AskUserQuestion 确认）。变更侧 = 直接挂 change_id 的 run ∪ 关联会话（change_session_links）内全部 run，按 run id 去重合并。跨变更共享会话时同一份消耗会在多个变更各显示一次——口径特性非 bug，详情页注明。快速修复无派发链路，恒走 quicklog_session_links→agent_sessions→agent_runs 会话链路（代码事实，非选项）。

## D-unmapped-073@v1 : 落地方式 = 实时聚合计算字段（零迁移）
状态：implemented
变更：2026-08-30-change-center-usage-stats
原编号：D-003@v1
锚点：未记录
最近确认：84a5b960
理由：实时聚合（用户 AskUserQuestion 确认）。查询时从 agent_runs / agent_run_model_usage 现算，DTO 计算字段，不新建表列、零 migration；数字与最新执行终态一致。列表用批量聚合（一条 SQL 按变更分组）。否决「冗余入表」。

## D-unmapped-074@v1 : 展示位置 = 列表 + 详情都要
状态：implemented
变更：2026-08-30-change-center-usage-stats
原编号：D-004@v1
锚点：未记录
最近确认：84a5b960
理由：列表 + 详情都要（用户 AskUserQuestion 确认）。变更中心「变更」tab 与「快速修复」tab 列表各加摘要列（耗时 + token 总量档）；变更详情页与快速修复抽屉展示完整五指标（输入/输出/缓存读/缓存写/调用次数 + 轮次）+ 分模型明细。对齐运行时页/会话页用量卡先例。

## D-unmapped-075@v1 : API 形态 = 方案 A（独立用量端点 + 列表内嵌摘要）
状态：implemented
变更：2026-08-30-change-center-usage-stats
原编号：D-005@v1
锚点：未记录
最近确认：84a5b960
理由：方案 A（用户 AskUserQuestion 确认）。列表 DTO（ChangeSummary / QuicklogEntryListItem）内嵌摘要字段，批量聚合一条 SQL 挂既有富化管道（零 N+1）；完整五指标+分模型明细走两个新独立端点；前端一个可复用用量组件覆盖变更详情页与快速修复抽屉。否决 B（详情响应膨胀、分模型明细无处安放、与先例不一致）与 C（run DTO 仅输入/输出两维，数据面不成立——session-usage-stats 先例已核实）。

## D-unmapped-076@v1 : 软删会话的执行计入统计
状态：implemented
变更：2026-08-30-change-center-usage-stats
原编号：D-006@v1
锚点：未记录
最近确认：84a5b960
理由：计入。消耗真实发生，用量口径=真实成本；UI 隐藏是展示层整洁考虑，两者不矛盾——详情卡注脚声明（R-07）。孤儿 run（agent_session_id 已置空）经派发锚点 change_id 仍可命中，不丢数。

## D-unmapped-077@v1 : 用量卡取数用 react-query useQuery（非 useEffect）
状态：implemented
变更：2026-08-30-change-center-usage-stats
原编号：D-007@v1
锚点：未记录
最近确认：84a5b960
理由：useQuery。两个目标渲染点的既有卡片（repo://sillyhub/frontend/src/components/changes/detail/change-sessions-card.tsx:60 / repo://sillyhub/frontend/src/components/changes/quicklog-sessions-card.tsx:60）均用 useQuery 且都在 QueryClientProvider 内；session-usage-bar 规避的是会话浮窗零 react-query 约束，本变更两渲染点无此约束。变更详情页「本页禁新增网络请求」注释（repo://sillyhub/frontend/src/app/(dashboard)/workspaces/[id]/changes/[cid]/page.tsx:371）经核实为 last-signal 功能局部语境（禁的是为派生小字段加轮询，同页 sessions 卡已自取数）。

## D-unmapped-101@v2 品牌色派生 token 三主题分值（blue 不继承紫）
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-002@v2
锚点：未记录
最近确认：1f515ddce
理由：品牌色派生 token（--aurora-*/--row-active(-ring)/--shadow-glow/--shadow-primary）按既有 --shadow-primary 三主题分值惯例写满 :root/[data-theme="blue"]/[data-theme="dark"] 三块，blue 给蓝系取值
supersedes：D-002@v1

## D-unmapped-102@v1 消息形态 = 气泡 + 头像
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-003@v1
锚点：未记录
最近确认：1f515ddce
理由：用户选定「气泡 + 头像」——现有气泡骨架保留，agent 消息加品牌渐变头像（Bot/引擎图标），用户消息维持右对齐品牌色气泡

## D-unmapped-103@v1 范围含群聊面板
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-004@v1
锚点：未记录
最近确认：1f515ddce
理由：会话页 + 群聊一起改——group-chat-panel 的消息行同步焕新（头像/气泡层级/代码块已由 MarkdownText 共享自动获益）

## D-unmapped-104@v1 dark 主题底色一起调
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-005@v1
锚点：未记录
最近确认：1f515ddce
理由：连主题底色一起调——dark 主题 card/border 取值微调拉大页面底与卡片反差（themes.ts darkTheme + globals.css dark 变量块同步，取值仍限 Tailwind v3 zinc 阶默认值）；全站受益，回归面经 build+主页面实拍控制

## D-unmapped-105@v3 群聊 agent 成员无自定义头像时统一 Bot 渐变光环（取舍记录）
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-006@v3
锚点：未记录
最近确认：1f515ddce
理由：取舍为维持统一光环——发送者区分由消息行成员名行承担且群聊本就渲染成员名；统一 agent 视觉锚点（与单聊一致）价值大于分色辨识（分色仍保留在成员面板/facepile 等非消息行场景）；自定义头像（avatar 入参）优先级不变
supersedes：D-006@v2

## D-unmapped-106@v1 高级感设计语言（v2 原型定调）
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-007@v1
锚点：未记录
最近确认：1f515ddce
理由：v2 原型定调六根杠杆——①环境极光背景（品牌色径向渐变光晕，浅/dark 双套取值）；②多层弥散阴影替代硬边框（边框统一降透明 --border-soft）；③玻璃拟态（顶栏/面板头/列表列 backdrop-blur + saturate）；④渐变点睛收敛到三处：标题「智能体」渐变字、agent 光环头像、发送按钮；⑤macOS 风深空代码块（三色窗点+语言标签+复制钮）；⑥微交互（发送钮 hover 浮起/点击回弹、plus 钮 hover 渐变填充、composer 聚焦光环+弥散阴影）

## D-unmapped-107@v1 v3 修正——玻璃可读性 + 删流光顶条
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-008@v1
锚点：未记录
最近确认：1f515ddce
理由：①玻璃拟态不可读的根因是极光只铺内容区、玻璃面板底下是纯色底没有东西可透——v3 把极光铺满整个应用底（body background-attachment: fixed），侧栏/列表列/面板整体降透明 + backdrop-blur，玻璃下有色彩可透才读得出玻璃感；②panel-accent 渐变流光顶条整体删除——运行态氛围收敛为脉冲状态点 + 任务条 spinner 两个既有元素，克制优先，不再加新动效载体

## D-unmapped-108@v1 v4 自查修正（用户要求"你自己看看效果图"后的逐项自审）
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-009@v1
锚点：未记录
最近确认：1f515ddce
理由：自审五条——①浅色下用户气泡紫色面积太大太吵（max-width 76%→72% + shadow-primary 降重：阴影 alpha 减半）；②composer 聚焦光环 v3 过浓且原型硬编码常驻焦点态（dark 下呈 RGB 霓虹圈游戏感）——改 3px/10% 透明度柔环、阴影不再跳档、原型展示常态；③列表/导航选中态两主题都太弱——inset 描边从 border-soft 换品牌色 22%/30% 透明度（--row-active-ring 新 token）；④浅色右上极光泛紫过浓（13%→9%）；⑤dark 极光太弱整体死黑（四团光晕各加 3-4 个百分点）

## D-unmapped-109@v1 RoundDivider 状态六态映射
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-010@v1
锚点：未记录
最近确认：1f515ddce
理由：status 改六态判别联合，着色映射：completed=success / failed+killed=error / running=info / pending+interrupting=neutral

## D-unmapped-110@v1 死 token 删除 + G-02 43px 悬空口径修正
状态：implemented
变更：2026-09-09-sessions-visual-refresh
原编号：D-011@v1
锚点：未记录
最近确认：1f515ddce
理由：①四 token 全删（消费面 Tailwind 阶已达成同观感，留死定义徒增维护面）；②G-02 作废——task-05 的 43px 对齐要求删除（对话视图无过程行，全部视图按 G-03 不动，turn-segment-views 零改动是正确实现）；③design 文件清单 layout.tsx 行改指 app-shell.tsx（极光实际落点）

## D-unmapped-115@v1 预会话草稿键细分，消除跨入口串台
状态：implemented
变更：2026-09-13-session-group-ux-fixes
原编号：D-001@v1
锚点：sillyhub/frontend/src/components/daemon/session-panel/turn-state.ts:304
最近确认：39d3d8c5c
理由：代码查证：真会话草稿按 sessionId 隔离（sillyhub.sessions.draft.<sid>）且所有 7 个 SessionPanel 宿主均有 key={sessionId} 强制重挂载，rAF 门闩（draftHydratedRef）时序推演在重挂载/非重挂载两路径均正确；唯预会话（sessionId=null）草稿用固定键 __pre__（repo://sillyhub/frontend/src/components/daemon/session-panel/turn-state.ts:304），跨工作区/跨机器入口共享——用户在不同入口开新会话时上一入口未发送内容必然带入，与用户「a 会话内容带到 b 会话」实测吻合。修复：预会话草稿键按 workspaceId+runtimeId 细分（__pre__:<ws>:<runtime>），真会话逻辑不动仅补测试覆盖。

## D-unmapped-116@v2 拖拽不使用 setPointerCapture（Grill 修正）
状态：implemented
变更：2026-09-13-session-group-ux-fixes
原编号：D-002@v2
锚点：未记录
最近确认：39d3d8c5c
理由：不用。repo://sillyhub/frontend/src/components/ui/panel-resizer.tsx:11-13 真实先例明文因 jsdom 无实现而不用 setPointerCapture，window 级 pointermove/pointerup 监听已保证拖出元素收事件；测试走 fireEvent(window) 同路径（explorer-page.test.tsx 补坐标方案）。@v1 表述中「+ setPointerCapture」为 brainstorm 期误引，以本版为准。
supersedes：D-002@v1

## D-unmapped-117@v1 群聊跨工作区可见性——后端返回可见工作区集合
状态：implemented
变更：2026-09-13-session-group-ux-fixes
原编号：D-003@v1
锚点：未记录
最近确认：39d3d8c5c
理由：选后端方案：list_groups 响应组装时为每个群计算 visible_workspace_ids（直接 workspace_id + project 经 PpmProjectWorkspace 关联的全部 workspace_id，批量查询无 N+1），GroupChatListItemRead 加字段；前端各消费点（桌面 session-list-panel / 移动 mobile-session-list / 悬浮宿主如有群分区）过滤改为 includes 判定。理由：单一数据源、全部消费点免费获益、避免每个消费点各自拉项目-工作区映射造成数据不一致与重复查询。可见性口径：仅放宽列表展示（用户须是群成员才看得到，现有 member 过滤不动），打开群后的访问控制仍走群成员校验，权限语义零变化。

## D-unmapped-118@v1 整体方案选 A——后端可见集合 + 预会话键细分 + Pointer Events
状态：implemented
变更：2026-09-13-session-group-ux-fixes
原编号：D-004@v1
锚点：未记录
最近确认：39d3d8c5c
理由：用户选定方案 A。理由要点：单一数据源、全部消费点免费获益、改动聚焦（backend 2 + frontend 5 文件）；否决 B（逻辑复制 3 处、映射独立加载有时序窗口）；否决 C（真会话串台未证实，为未证实问题重构违反 YAGNI）。

## D-unmapped-121@v1 对齐范围 = 变更中心列表页 + 详情页的功能补齐
状态：implemented
变更：2026-09-16-mobile-changes-parity
原编号：D-001@v1
锚点：未记录
最近确认：d33092ea3
理由：变更中心在 PC 端由两个路由承载——列表页 `/workspaces/[id]/changes`（含 quicklog tab）与详情页 `/workspaces/[id]/changes/[cid]`；移动端对应 `/m/workspaces/[id]/changes` 与 `/m/workspaces/[id]/changes/[cid]`。对齐范围为这两对页面。

## D-unmapped-122@v1 任务看板 / 任务执行页维持桌面引导，不在本次对齐
状态：implemented
变更：2026-09-16-mobile-changes-parity
原编号：D-002@v1
锚点：未记录
最近确认：d33092ea3
理由：不移植。原变更 2026-08-26-mobile-workspace-page D-002 已明确将任务域裁剪出移动端核心版，移动详情页保留「任务区桌面引导条」；任务看板+执行页是独立大块功能（非列表/详情的信息呈现），用户指令针对「变更中心内容」，未点名任务域。
故障面：用户若预期任务看板也上手机端，本决策遗漏该预期——汇报中显式列为可否决项

## D-unmapped-123@v1 实现方案 = 方案 A「既有组件复用挂载 + 移动壳适配」
状态：implemented
变更：2026-09-16-mobile-changes-parity
原编号：D-005@v1
锚点：未记录
最近确认：d33092ea3
理由：选方案 A。三案对比：A=PC 既有卡组件（ChangeUsageCard/ChangeLastSignal/ScopeAuditCommandCard/ChangeActivityBadge）布局无 lg 依赖可直接挂载，数据层函数与 query key 全部复用，移动壳（筛选抽屉/⋯菜单/折叠卡）沿用本页既有范式；B=每卡重写移动版，违反移动端代码明文约束「数据层 100% 复用桌面（禁止复制第二份实现）」（每份移动页头部注释均载），制造双实现漂移面；C=废弃 /m/ 路由体系改响应式，推翻 2026-08-26-mobile-workspace-page 整个架构决策，牵连 m/layout 钻取路由、MobileWorkspaceHeader、底部 Tab 等全部移动基建。A 是仓库惯例的直接推论，非开放取舍。
故障面：若某桌面组件在小屏实测溢出（如 ScopeAuditCommandCard 明细表），需就地加移动断点而非重写——执行时验证
退役判据：若未来移动端整体转向响应式单套页面（方案 C 复活），本决策随之退役
