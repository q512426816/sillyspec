---
author: agent (Claude)
created_at: 2026-08-15T15:55:00+08:00
change: platform-takeover-declaration
---

# 模块影响分析（module-impact）

## 受影响模块

| 模块 | 文件 | 影响类型 | 说明 | 更新结果 |
|---|---|---|---|---|
| run/shared（公共工具） | src/run/shared.js | 修改 | writePlatformPointer 双写→三写（+声明文件）；新增 PLATFORM_MANAGED_FILENAME 常量与 checkPlatformManaged 读侧 helper。所有调用方（init.js / command.js）自动获得声明落盘 | done（verify 核对与实际 diff 一致） |
| progress（进度管理） | src/progress.js | 修改 | resolvePlatformSpecDir 无指针分支插入声明检查；新增 PlatformManagedError（extends PointerUnreachableError，不覆写 name）。progress/status/worktree/doctor 等入口获得 fail-closed | done（verify 核对与实际 diff 一致） |
| run/command（命令分发） | src/run/command.js | 修改 | runCommand 独立指针恢复链封堵（指针+platform-scan.json 皆缺失后查声明，命中 exit 1）。run/quick/scan/全部 stage 别名命令获得 fail-closed | done（verify 核对与实际 diff 一致） |
| sync（平台同步） | src/sync.js | 修改 | platform disconnect 三清（local.yaml platform 段 + 指针 + 声明） | done（verify 核对与实际 diff 一致） |
| index（CLI 入口） | src/index.js | 修改 | platform pointer --cleanup 输出补 disconnect 提示 | done（verify 核对与实际 diff 一致） |
| doctor-diagnostics（诊断） | src/doctor-diagnostics.js | 修改 | D2 pointer 健康新增 pointer_missing_but_managed 信号（只读非阻断） | done（verify 核对与实际 diff 一致） |

## 不受影响模块（显式排除）

- `src/db.js` / SQLite 层：无 schema 变更，声明是文件非数据库。
- `src/stages/*.js` 阶段定义：不改任何 stage prompt / 步骤（提示词镜像无需重提取）。
- `src/init.js`：不加改动（ql-20260815-004 已接好 writePlatformPointer，三写在 helper 内部扩展自动生效）。
- worktree 机制：声明按 cwd 查，worktree 内无声明 = 走本地，与指针行为一致（design R-04）。

## 模块文档同步义务

- `docs/sillyspec/file-lifecycle.md`：新运行时文件类型登记（task-07）。
- `docs/sillyspec/platform-interface-map.md`：指针章节补声明机制（task-07，doc-ref-check 校验）。
- `.claude/skills/sillyspec-doctor/SKILL.md`：新诊断信号（task-07）。

## 测试影响面

- 新增 `test/platform-managed-declaration.test.mjs`（八场景）。
- 既有平台测试兼容性已核验（plan review）：无"删指针后期望静默落本地"断言；手写指针文件的测试不经 writePlatformPointer 不受三写影响。
- `test/run-tests.mjs` cleanHomePointer 扩展清理 HOME 声明（防泄漏自愈，task-06）。
