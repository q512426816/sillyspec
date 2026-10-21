---
author: sillyspec-fr-index
created_at: 2026-10-21T04:40:00.317Z
---

# FR 索引 — ppm

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/ppm.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-unmapped-393 明细变完成时自动创建关联任务
变更：2026-07-15-2026-07-15-milestone-detail-auto-task
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1
场景正文：
- 场景：默认场景 — Given 一条里程碑明细 `execute_user_id` 已填写 明细 `execute_user_id` 为空；Then 系统创建一条 `PlanTask`，字段按 D-002 映射（user_id←execute_user_id、content←task_theme、start/
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-milestone-detail-auto-task/requirements.md#FR-01
最近确认：43f3d65dc

## FR-unmapped-394 Excel 导入即完成的明细批量建任务
变更：2026-07-15-2026-07-15-milestone-detail-auto-task
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given import_commit 中某行必填字段齐全（required_filled=true → 落 done） 导入行必填缺失（→ draft）或 valid=f；When 导入提交 导入提交 异常冒泡；Then 为每个 done 明细各建一条任务（按 FR-01 映射），与明细入库在同一事务内 该行不建任务（draft 明细不触发） 整批导入（明细 + 任务）回滚，无脏
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-milestone-detail-auto-task/requirements.md#FR-02
最近确认：43f3d65dc

## FR-unmapped-395 编辑已完成明细同步更新关联任务
变更：2026-07-15-2026-07-15-milestone-detail-auto-task
状态：active
摘要：默认场景
依据决策：D-002@v1、D-007@v1
场景正文：
- 场景：默认场景 — Given 一条明细已有 `ps_plan_node_detail_id` 关联任务 明细无关联任务（如 draft 明细被编辑）；When `update_detail` 修改了执行人 / 计划开始 / 计划完成 / 任务主题 / 工作量 / 所属模块 `update_detail`；Then 关联任务对应字段同步更新；`task.status` **不**被覆盖（保留任务自身推进） 不新建任务（仅变 done 才建）
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-milestone-detail-auto-task/requirements.md#FR-03
最近确认：43f3d65dc

## FR-unmapped-396 明细变更时任务迁移到新版本
变更：2026-07-15-2026-07-15-milestone-detail-auto-task
状态：active
摘要：默认场景
依据决策：D-001@v1
场景正文：
- 场景：默认场景 — Given 一条 done 明细已有任务 变更后的新版本 draft 随后被提交变 done；When `change_process`（旧 done→archived + 新建 draft 版本） `_transition`→DONE；Then 关联任务的 `ps_plan_node_detail_id` 迁移到新版本 draft.id（同事务） 命中已迁移的任务并更新字段（不新建第二条）
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-milestone-detail-auto-task/requirements.md#FR-04
最近确认：43f3d65dc

## FR-unmapped-397 删除明细解关联、保留任务
变更：2026-07-15-2026-07-15-milestone-detail-auto-task
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 一条明细有关联任务；When `delete_detail`；Then 关联任务 `ps_plan_node_detail_id` 置 null，任务行及其执行/工时记录保留
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-milestone-detail-auto-task/requirements.md#FR-05
最近确认：43f3d65dc

## FR-unmapped-398 强一致事务
变更：2026-07-15-2026-07-15-milestone-detail-auto-task
状态：active
摘要：默认场景
场景正文：
- 场景：默认场景 — Given 联动任一步（建/同步/迁移/解关联）失败；When 异常冒泡；Then 明细操作整体回滚（明细与任务同事务，要么都成功要么都回滚）
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-milestone-detail-auto-task/requirements.md#FR-06
最近确认：43f3d65dc

## FR-unmapped-399 历史数据不补建
变更：2026-07-15-2026-07-15-milestone-detail-auto-task
状态：active
摘要：默认场景
依据决策：D-006@v1
场景正文：
- 场景：默认场景 — Given 上线前已存在的 done 明细；When 无新的提交/编辑/变更/删除/导入操作；Then 不产生任何任务（联动仅在实时触发时生效，无回填脚本）
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-milestone-detail-auto-task/requirements.md#FR-07
最近确认：43f3d65dc

## FR-unmapped-400 项目→成员两级可展开表
变更：2026-07-15-2026-07-15-project-members-rebuild
状态：active
摘要：默认场景
依据决策：D-002@v1、D-003@v1、D-006@v1
场景正文：
- 场景：默认场景 — Given 用户进入 `/ppm/project-members` 一级项目列表已加载 项目未展开；When 页面加载 用户点击某项目行（展开图标）；Then 显示**一级项目列表**（项目名称/项目编号/负责人/成员数/项目状态/项目类型/更新时间/操作），而非成员平铺 **懒加载**该项目成员（调 `GET /pr
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-project-members-rebuild/requirements.md#FR-01
最近确认：a4c99d382

## FR-unmapped-401 一级表展示负责人（推算）与成员数（聚合）
变更：2026-07-15-2026-07-15-project-members-rebuild
状态：active
摘要：默认场景
依据决策：D-001@v1、D-002@v1
场景正文：
- 场景：默认场景 — When 聚合接口返回该项目行 推算负责人 渲染负责人列 聚合接口返回；Then 「负责人」= 该类成员中 `created_at` **最早**者的 `user_name` 取 `created_at` 最早的一个（唯一确定） 显示「—」（
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-project-members-rebuild/requirements.md#FR-02
最近确认：a4c99d382

## FR-unmapped-402 6 维搜索
变更：2026-07-15-2026-07-15-project-members-rebuild
状态：active
摘要：默认场景
依据决策：D-002@v1
场景正文：
- 场景：默认场景 — Given 搜索区有 6 个筛选项（项目名/项目状态/项目类型/负责人姓名/成员姓名·账号/角色） 填「成员姓名/账号」= "zhang" 填「负责人」= "张" 点「重置；When 用户填写任意组合并点「查询」 查询 查询 重置搜索；Then 一级项目表按条件刷新（调 summary 接口带筛选），结果只命中匹配项目 命中「该项目下存在成员 `user_name` 或 `users.username`
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-project-members-rebuild/requirements.md#FR-03
最近确认：a4c99d382

## FR-unmapped-403 成员子表显示登录账号列
变更：2026-07-15-2026-07-15-project-members-rebuild
状态：active
摘要：默认场景
依据决策：D-004@v1
场景正文：
- 场景：默认场景 — Given 后端 `ProjectMemberService.page()` LEFT JOIN `users` 成员子表渲染 某成员 `username` 为空（None；When 返回成员 某成员有 `username` 渲染账号列；Then `ProjectMemberResp` 含可选 `username`（登录账号） 「账号」列显示其登录账号 显示「—」（兜底）
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-project-members-rebuild/requirements.md#FR-04
最近确认：a4c99d382

## FR-unmapped-404 两种新增成员入口
变更：2026-07-15-2026-07-15-project-members-rebuild
状态：active
摘要：默认场景
依据决策：D-006@v1
场景正文：
- 场景：默认场景 — Given 用户点页头「+ 添加项目成员」（全局） 用户在某项目展开行的子表点「+ 新增成员」（项目内） 新增成员表单（选用户联动回填部门/姓名、角色多选逗号拼接）；When 打开成员表单抽屉 打开成员表单抽屉 提交；Then 抽屉显示「所属项目」选择（跨项目），提交后成员入所选项目 项目已锁定（不显示「所属项目」选择），提交后成员入当前项目 沿用现有 `PpmProjectMembe
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-project-members-rebuild/requirements.md#FR-05
最近确认：a4c99d382

## FR-unmapped-405 增删成员后成员数实时更新
变更：2026-07-15-2026-07-15-project-members-rebuild
状态：active
摘要：默认场景
依据决策：D-007@v1
场景正文：
- 场景：默认场景 — Given 用户在展开行子表新增/编辑/删除成员成功；When `PpmProjectMembersTable` 的 `onChanged` 回调触发；Then 父级 `PpmProjectMembersGroupTable` 重新拉 summary，该行「成员数」实时刷新
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-project-members-rebuild/requirements.md#FR-06
最近确认：a4c99d382

## FR-unmapped-406 projects 页成员抽屉不回归（兼容）
变更：2026-07-15-2026-07-15-project-members-rebuild
状态：active
摘要：默认场景
依据决策：D-004@v1、D-006@v1
场景正文：
- 场景：默认场景 — When 渲染 `<PpmProjectMembersTable projectId />` projects 抽屉不传这两个 prop；Then 行为与现状一致（CRUD/搜索/分页正常），`ProjectMember.username` 可选字段不破坏现有消费 行为同现状（不回调、非嵌入式渲染）
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-project-members-rebuild/requirements.md#FR-07
最近确认：a4c99d382

## FR-unmapped-407 默认排序（不做成员数排序）
变更：2026-07-15-2026-07-15-project-members-rebuild
状态：active
摘要：默认场景
依据决策：D-005@v1
场景正文：
- 场景：默认场景 — Given 一级项目表未指定排序 派生列 owner_name/member_count；When 加载 试图排序；Then 默认按 `updated_at` 倒序 不在排序白名单内，被静默忽略（仅支持 updated_at/created_at/project_name/projec
全文：.sillyspec/changes/archive/2026-07-15-2026-07-15-project-members-rebuild/requirements.md#FR-08
最近确认：a4c99d382

## FR-unmapped-408 左点负载按今天分界 — 过去看实际工时
变更：2026-07-15-workbench-calendar-load-actual
状态：active
摘要：（无场景名）
依据决策：D-001@v1、D-002@v1、D-004@v1、D-005@v1、D-006@v1
全文：.sillyspec/changes/archive/2026-07-15-workbench-calendar-load-actual/requirements.md#FR-01
最近确认：f7f73d86c

## FR-unmapped-409 过去无实际记录 → 灰点
变更：2026-07-15-workbench-calendar-load-actual
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-15-workbench-calendar-load-actual/requirements.md#FR-02
最近确认：f7f73d86c

## FR-unmapped-410 未来侧剩余负载
变更：2026-07-15-workbench-calendar-load-actual
状态：active
摘要：（无场景名）
依据决策：D-006@v1、D-007@v1
全文：.sillyspec/changes/archive/2026-07-15-workbench-calendar-load-actual/requirements.md#FR-03
最近确认：f7f73d86c

## FR-unmapped-411 已用 ≥ 计划总量 → 剩余 0
变更：2026-07-15-workbench-calendar-load-actual
状态：active
摘要：（无场景名）
依据决策：D-007@v1
全文：.sillyspec/changes/archive/2026-07-15-workbench-calendar-load-actual/requirements.md#FR-04
最近确认：f7f73d86c

## FR-unmapped-412 右点零回归
变更：2026-07-15-workbench-calendar-load-actual
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-15-workbench-calendar-load-actual/requirements.md#FR-05
最近确认：f7f73d86c

## FR-unmapped-413 actual 区间缺失兜底
变更：2026-07-15-workbench-calendar-load-actual
状态：active
摘要：（无场景名）
依据决策：D-003@v1
全文：.sillyspec/changes/archive/2026-07-15-workbench-calendar-load-actual/requirements.md#FR-06
最近确认：f7f73d86c

## FR-unmapped-414 未来侧兜底（无 work_load / 无 end_time）
变更：2026-07-15-workbench-calendar-load-actual
状态：active
摘要：（无场景名）
依据决策：D-007@v1
全文：.sillyspec/changes/archive/2026-07-15-workbench-calendar-load-actual/requirements.md#FR-07
最近确认：f7f73d86c

## FR-unmapped-415 前端图例口径说明
变更：2026-07-15-workbench-calendar-load-actual
状态：active
摘要：（无场景名）
全文：.sillyspec/changes/archive/2026-07-15-workbench-calendar-load-actual/requirements.md#FR-08
最近确认：f7f73d86c
