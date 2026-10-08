---
author: qinyi
created_at: 2026-07-05 02:00:00
---

# 测试坑 (testing-gotchas)

> 后端 pytest + 前端 vitest/React Testing Library 踩过的坑。

## 后端：pytest patch 函数内局部导入的目标

被测函数内部用 `from app.core.db import get_session_factory`（函数级局部导入）时，`patch("app.modules.agent.service.get_session_factory")` 会报 `AttributeError: module does not have the attribute`，因为该名字从未绑定到 service 模块命名空间。

- 正确做法：patch 源头模块属性 `app.core.db.get_session_factory`。局部导入每次执行时从源模块取属性，patch 源头才能拦截。
- 同理适用于任何「函数内 import」的 mock。模块级 import 才 patch 使用方模块。

## 后端：无本地 venv 时在 Docker 后端容器跑 pytest

- 本机只有 Windows Store 的 python stub（exit 49 不执行），项目走 Docker 部署无 venv。
- 主机项目盘挂载在后端容器 `/host-projects`，git worktree 可经 `/host-projects/.../multi-agent-platform/.sillyspec/.runtime/worktrees/<change>` 访问。
- 生产镜像 venv 缺 pytest，但 `pip install pytest` 装到 `~/.local`(user-site)，venv python 默认不加载；运行时 `sys.path.insert(0, site.getusersitepackages())` 后 `pytest.main()` 即可。
- 用 `PYTHONPATH=<worktree>/backend` 让测试 import 命中 worktree 改动代码，不污染容器 /app（镜像层）。
- 验证回归：在 `/host-projects/.../backend`(main) 上跑同样测试对比，区分预存失败与本次引入的回归。

## 前端：MENU_PERMISSION_GROUPS 跨 menu 重复 permission.key 致 queryByLabelText 失败

当 MENU_PERMISSION_GROUPS 中同一个 permission.key 出现在多个 menu（如 `user:read` 在 `git-identities`/`users`/`settings` 三处），picker 三级渲染会为每个出现位置生成一个独立 checkbox，aria-label={p.key} 在 DOM 中重复。

- 后果：React Testing Library 的 `screen.queryByLabelText("user:read")` 抛 `getMultipleElementsFoundError`。
- 规避（不修改 picker 实现，仅调整测试）：
  - 全局计数断言：`screen.getAllByLabelText("user:read").length` 折叠某 menu 前后比较。
  - 容器内查询：`within(menuContainer).getByLabelText(p.key)`，先通过 menu label 文本定位容器。
  - 单 menu 单 key 校验：选 only-once 的 key 做断言（如 `organization:read` 只在 organizations menu 出现）。

## 前端：antd v5 DatePicker 周几/日历表头显示英文，仅 ConfigProvider locale 不够

- 现象：DatePicker 日历表头星期显示英文（Su/Mo/Tu…），即便已配 `ConfigProvider locale={zhCN}`。
- 根因：antd v5 DatePicker 内部用 dayjs 渲染日历表头，这些取自 **dayjs 全局 locale**，而非 antd ConfigProvider 的 locale。`ConfigProvider locale={zhCN}` 只影响 antd 自有文案（「今天」按钮、placeholder），管不到日历表头星期。
- 修复：补 `import 'dayjs/locale/zh-cn'; dayjs.locale('zh-cn');`，与 ConfigProvider locale 双保险。
- 通用坑：antd v5 全家桶（DatePicker / RangePicker / Calendar / TimePicker）的日历本地化 = `ConfigProvider locale`（antd 文案）+ `dayjs.locale`（日历表头/月份）**缺一不可**。

## 前端：antd v5 两字中文按钮 autoLetterSpacing 致 DOM 字间空格（getByRole 匹配失败）

- 现象：antd v5 `Modal.confirm({ okText: "移除", cancelText: "取消" })` 的两字中文按钮，DOM 渲染为 `<span>移 除</span>`（字间插空格，autoLetterSpacing 特性）。测试 `getByRole("button", { name: "移除" })` 严格匹配失败。
- 根因：antd v5 对 CJK 文本默认开启 `autoLetterSpacing`，渲染时在字符间插入空白节点，破坏 `aria-label`/name 严格匹配。
- 解法：测试用正则 `/移\s*除/` / `/取\s*消/` 兼容字间空白；或关 `autoLetterSpacing`（影响视觉一致性，不推荐）。前端测试断言中文按钮一律用 `\s*` 兼容。

## 前端：MarkdownText 用 next/dynamic ssr:false，jsdom 测试同步 render 得 null

- markdown-text.tsx 用 `next/dynamic` `ssr:false`，jsdom 测试同步 `render` 处于 loading（返回 null），assistant 文本不进 DOM 致 `getByText` 失败。
- 修法：测试文件顶部 `vi.mock` 成纯文本渲染（测父组件逻辑而非 markdown 库本身）。
- 影响组件：agent-log-viewer / interactive-session-panel / runtime-session-dialog。

## 后端：daemon 列表测试造 status 必须符合 cleanup_stale_runtimes 不变量

> 来源：2026-07-07-daemon-machine-runtime-hierarchy task-04 排序用例。

- `list_machines` / `list_runtimes_page` 进入先调 `cleanup_stale_runtimes()`（DEFAULT_RUNTIME_STALE_SECONDS=45）：选 `status='online'` 且心跳 >45s（或 NULL）的 instance 改 offline，**不反向 resurrect**（offline→online 由心跳端点主动刷新）。
- 测试造 data：设 `status="online"` 的 instance，`last_heartbeat_at` 必须 `<45s`（如 `now - timedelta(seconds=30)`），否则 cleanup 改 offline 污染排序/统计断言；设 `status="offline"` + 新心跳的 instance 保持 offline（cleanup 不 resurrect），可安全验证"online 优先于心跳新鲜度"。
- 通用坑：调用 `list_*`（内部 cleanup）的测试，造的 instance.status 必须与 last_heartbeat_at 一致（online ⟺ <45s），不能凭空设 online + 老 heartbeat。

## 后端：Pydantic 必填派生字段不能用 model_validate(ORM)+model_copy 两段式

> 来源：2026-07-07-daemon-machine-runtime-hierarchy task-03/04（_build_machine_read bug，task-04 测试捕获）。

- 现象：DTO 含必填派生字段（如 `runtime_count: int` 无 default），用 `Model.model_validate(orm_instance)` + `model_copy(update={派生字段: 值})` 两段式构造时，`model_validate` 在 `model_copy` 填值**前**就抛 `ValidationError: Field required`（ORM 无此属性）。
- 解法：派生字段在构造时显式传——全字段直构 `Model(field1=orm.x, ..., 派生字段=value)`；或给派生字段加 `default=0`（model_validate 用 default 不崩，model_copy 覆盖真实值，适合派生字段总有组装覆盖的场景）。
- 对比 `_runtime_read`（repo://sillyhub/backend/app/modules/daemon/router/runtimes.py:260）用 model_validate + model_copy 不崩，因 DaemonRuntimeRead 所有字段在 ORM 都有或 optional；DaemonMachineRead 崩是因 runtime_count/online_runtime_count 必填且 ORM 无。
- 通用坑：DTO 有"派生/聚合"必填字段（不在源 ORM 上）时，避开 model_validate(ORM) 两段式，用全字段直构或给派生字段 default。

## 后端：admin 套件 login 限流 429 致偶发 FAILED（预存，测试态跨用例累计）

> 来源：ql-20260808-001-4068（安全加固三联）跑 `tests/modules/admin` 时发现。

- 现象：`tests/modules/admin/test_users_router.py` 全量跑时 `test_update_username_change_success`（及 `test_create_user_then_login_by_username`）偶发 `assert 429 == 200`（`HTTP_429_LOGIN_RATE_LIMITED`）；单独跑该用例 100% 过。
- 根因：auth login 限流是**跨用例共享的测试态累计**（同 IP 127.0.0.1 的 INCR 计数在套件内不被重置）；`test_login_by_email_or_username` 单测发 5 次 `/api/auth/login`（故意测 4 次失败防枚举），把限流计数顶到阈值，后续断言「登录成功=200」的用例撞限流。conftest `_isolate_permission_timers` 只清 daemon `_permission_timers`，不含 login 限流。
- 判定为预存非回归：`git stash` 干净 HEAD 复跑 `test_users_router.py` 同样 FAILED 且**更糟**（2 用例 429）；安全加固新增测试用 `create_access_token` 铸 token、零 `/api/auth/login` 调用，不增加登录计数。
- 通用坑：① 套件级「偶发 429」基本是限流跨用例累计，先用「单跑该用例是否过 + git stash 干净 HEAD 是否复现」两步定位为预存再归因，别误判成新改动引入。② 修复方向（待做）：给 login 限流加测试态隔离（per-test 清零计数，或在 fixture 里 mock/抬高阈值），参照 `_isolate_permission_timers` 范式。③ 测「非登录路径」的权限/断言用 `create_access_token` 直接铸 token，绕开 login 限流，别走 `/api/auth/login`。

## 前端：jsdom 下 shadcn/Radix Avatar 的 AvatarImage 永不渲染——需 stub window.Image

- Radix AvatarImage 内部 `new Image()` 等 load 事件才挂 `<img>`，jsdom 不加载资源永不触发 → 头像图用例断言 img 永远拿不到、只见 AvatarFallback 首字。解法：测试里 stub `window.Image`（getter/setter 赋 src 时同步置 complete=true、naturalWidth=64 并 dispatch load），`URL.createObjectURL` 由 src/test/setup.ts 全局 polyfill 兜底。适用于一切经 useAvatarSrc（blob objectURL）→ shadcn Avatar 展示头像的组件测试（top-bar-avatar.test.tsx 实证）。
- 来源：2026-09-10-account-avatar-upload task-09
