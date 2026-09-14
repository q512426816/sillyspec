---
author: qinyi
created_at: 2026-09-14 19:34:00
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| 会话（agent/人） | 启动 export SILLYSPEC_SESSION_ID；消费拒绝信息与 --takeover/--skip-apply |
| CLI（progress/worktree/run 链） | 首建 owner+心跳；锁内校验；checkOnly 归档门；放行过滤；归因分流 |
| 平台同步 | changes 投影带 owner_session（消费侧本变更不强制） |

## 功能需求

### FR-01: change 所有权+心跳
覆盖决策：D-001@v1, D-005@v1
Given changes 表 v6（owner_session 列）与会话标识三级（显式 env/--session > quick=changeName > anon@host 降级+教学 warning）
When apply/cleanup/assess 自动 apply/归档/quick 轻量归档链等接管类操作（锁内）且 owner 非本会话且 last_active < 活跃窗（heartbeat_minutes 可配缺省 15）
Then 拒绝执行：列 owner/最后活跃/--takeover 指引
When 窗口外
Then 放行并自动接管（重写 owner+注记）
When --takeover
Then 无条件接管+result/输出留痕
Given owner=NULL（存量/无主）
Then 任何会话可操作（首建写 own）

### FR-02: 归档收口
覆盖决策：D-002@v1
Given archive step3 前检查（applyWorktree checkOnly）
When worktree 未 apply 交付面非空
Then 归档阻断（错误含 apply 指引）；--skip-apply 显式跳过留痕放行
Given 无 worktree/零交付面
Then 零行为变化

### FR-03: 放行收紧+归因切换
覆盖决策：D-003@v1, D-004@v1
Given apply 校验 review 声明放行路径（主仓 :1042-1058/跨仓 :766）
When review changedFiles 与 allow 面（design∪target_files/allowed_paths∪linked 声明）不相交
Then 剔除出 admitted、进 violations 报告（含越权嫌疑标注）；相交文件放行如常
Given worktree 模式变更（判定源=changes.isolation_mode；NULL 存量按 meta 在场路由）
When review/草稿归因
Then 唯一源=worktree 分支 diff；分支已删终态=fail-closed 空集+「不可归因」注记；in-place 维持主仓窗口

## 非功能需求
- 兼容性：v5→v6 幂等迁移；owner=NULL 无主零变化；本会话自有 change 零路径变化；只读命令不校验
- 可回退：所有权/收口/过滤均为前置门，回退=摘除校验调用四处+列留存无害
- 可测试：真 git 临时仓（迁移/四态/旁路堵点/过滤/分流/终态空源全用例）

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01 | 所有权+心跳+--takeover |
| D-002@v1 | FR-02 | 归档收口 |
| D-003@v1 | FR-03 | 放行收紧 |
| D-004@v1 | FR-03 | 归因切换（模式源=DB/终态空源定案） |
| D-005@v1 | FR-01 | 载体=DB（v6 迁移+投影扩列） |
