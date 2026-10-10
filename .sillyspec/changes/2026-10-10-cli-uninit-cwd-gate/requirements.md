---
author: flow-machine-draft
created_at: 2026-10-10T01:27:30.829Z
---
# 需求规格（Requirements）— 2026-10-10-cli-uninit-cwd-gate

## 功能需求

### FR-01: CLI 入口统一硬拦：非豁免命令在祖先链+平台指针+--spec-dir 均未命中 .sillyspec 的目录运行 → exit 2，文案含当前目录、git root（如有）、三条修复指引（cd 回项目根 / 先 init / --spec-dir 显式指定）

- 非 init/scan 类命令在「本地祖先链（resolveSpecDir 全套守卫）+ 平台指针 + 显式 --spec-dir」均未命中 .sillyspec 的目标目录运行时，CLI 必须（MUST）在命令分发前以 exit 2 硬拦，且报错文案必须（MUST）包含目标目录、git root（在 git 仓内时）与三条修复指引（cd 回项目根 / sillyspec init 或 scan / --spec-dir 显式指定）。

#### 场景：未初始化 git 仓跑 flow

- Given 一个已 git init 但无 .sillyspec 的目录
- When 执行 sillyspec flow status --change x
- Then exit 2，stderr 含「未初始化」、git root 路径、sillyspec init 与 --spec-dir 指引；不产生任何落盘

#### 场景：未初始化裸目录跑 task

- Given 一个无 git 无 .sillyspec 的目录
- When 执行 sillyspec task list
- Then exit 2，文案注明「当前不在 git 仓内」且给出同三条指引

### FR-02: 豁免命令（init/scan/doctor/status/progress/next/workspace/setup/knowledge/local/config/mcp/dashboard/platform/wt-commit/agent-log——按设计可在未初始化目录运行或有自身 fail-closed）行为不变

- 16 个豁免命令必须（MUST）在任意目录（含未初始化目录）保持既有行为与退出码，禁止（MUST NOT）被未初始化目录硬拦改变行为（它们按设计可在未初始化目录运行，或有自身 fail-closed 报错）。

#### 场景：status 在未初始化目录

- Given 无 .sillyspec 的目录
- When 执行 sillyspec status
- Then 输出自身的「未找到进度数据」空态文案（不含硬拦文案），不因本门改变 exit code

### FR-03: 子目录命中祖先链 → 放行且 dir 重锚定 spec 根：裸 join(dir,'.sillyspec') 调用点（如 task）子目录运行与根目录行为一致

- 目标目录经祖先链命中 .sillyspec 时，CLI 必须（MUST）放行并把入口 dir 重锚定到 spec 根父目录（打印一行锚定提示），使裸 join(dir,'.sillyspec') 调用点（如 review status 的 rsSpecBase）在子目录运行与项目根运行读到同一 spec；本就上溯的 resolveEffectiveDir 系必须（MUST）退化为无操作。

#### 场景：子目录跑非豁免命令

- Given 项目根有 .sillyspec，cwd 在其子目录 src/lib
- When 执行 sillyspec review status --change x
- Then 不被硬拦，输出含「已锚定到项目根：<根>」，spec 读取落项目根而非 src/lib

### FR-04: 平台模式（pointer/接管声明/--workspace-id/--runtime-root）与 --spec-dir 显式不受影响

- 目录内存在平台 pointer（.sillyspec-platform.json）或接管声明（.sillyspec-platform-managed）、或命令显式带 --spec-dir / --workspace-id / --runtime-root / --spec-root 时，本门必须（MUST）跳过判定（不拦、不重锚定），平台模式与显式意图的 spec 解析及 fail-closed 错误面必须（MUST NOT）被遮蔽；linked worktree（主仓 .sillyspec 不在 cwd 祖先链上）必须（MUST）放行且不重锚定（锚定归命令层自有逻辑，如 endpoints baseline 的主仓锚定）。

#### 场景：平台 pointer 项目跑非豁免命令

- Given cwd 有 .sillyspec-platform.json 指向存在的 specRoot（本地无 .sillyspec）
- When 执行 sillyspec review status --change x
- Then 不触发未初始化硬拦，走命令自身的平台解析链

#### 场景：平台模式首扫（无 pointer 新目录）

- Given 一个无 .sillyspec、无 pointer 的新目录
- When 执行 sillyspec run scan --spec-root <外部 spec 根>
- Then 不触发未初始化硬拦（--spec-root 为平台显式意图，spec 恒在仓外）

### FR-05: 新增测试覆盖以上各面，相关回归全绿

- 本变更必须（MUST）以 test/uninit-cwd-gate.test.mjs 覆盖判定单元四象限与 CLI e2e 六面；受既有测试 fixture 影响的用例必须（MUST）以保意图方式同步（补 .sillyspec 预置或显式 flag），全量测试套件必须（MUST）全绿。

#### 场景：全量回归

- Given 本变更的全部提交落盘
- When 运行 node test/run-tests.mjs 全量套件
- Then 除已被本变更换修复的存量红（quick-retired R5 版本锚）外无任何失败

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/uninit-cwd-gate.test.mjs「未初始化目录跑 flow → exit 2 + 硬拦文案（含修复三选一指引）」「git 仓未初始化 → 文案给出 git root 锚点」「未初始化非 git 目录 → block 且 gitRoot=null」「未初始化 git 仓 → block + gitRoot 指向仓根」
FR-02: test/uninit-cwd-gate.test.mjs「豁免命令（init/scan/doctor/status/wt-commit 等）任意目录 → exempt」「豁免命令行为不变：status 在未初始化目录不触拦」
FR-03: test/uninit-cwd-gate.test.mjs「已初始化根 / 其任意子目录 → pass + anchor=spec 根父目录」「已初始化根的子目录跑非豁免命令 → 放行 + 重锚定到项目根」
FR-04: test/uninit-cwd-gate.test.mjs「显式 --spec-dir / 平台 flag → skip」「平台 pointer / 接管声明在 dir → skip」「--spec-dir 显式指定 → 不拦」「--spec-root 平台首扫 flag → 不拦」「平台 pointer 在 cwd 的项目 → 不因缺本地 .sillyspec 被拦」「linked worktree（兄弟路径）主仓有 .sillyspec → pass 且 anchor=null」
FR-05: test/uninit-cwd-gate.test.mjs「非豁免命令清单抽样」+ 全量套件（node test/run-tests.mjs）二次全量仅剩存量 R5 红、补锚后隔离验证 25/25 绿
