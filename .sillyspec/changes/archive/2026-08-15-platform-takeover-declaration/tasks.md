---
author: agent (Claude) + 用户
created_at: 2026-08-15
updated_at: 2026-08-15
---
# tasks.md — 平台接管声明机制

> 前置：design.md §5/§6（含 Grill 修正 D-B/D-C/D-D/D-E）为本清单依据。

## T1 writePlatformPointer 三写 + 读侧 helper（Wave 1）
- [ ] `src/run/shared.js`：`writePlatformPointer` 增写 `<cwd>/.sillyspec-platform-managed`（managed:true + specRoot 副本 + workspaceId + declaredAt）；新增 `PLATFORM_MANAGED_FILENAME` 导出常量 + `checkPlatformManaged(cwd)` 读侧 helper（返回 {managed, specRoot, ...} 或 null，读侧宽容不抛错）
- 验收：init/scan 带平台参数后三文件齐落；重复调用幂等（declaredAt 不强制保留首次——幂等写无害即可）

## T2 双入口 fail-closed（Wave 1）
- [ ] `src/progress.js`：新增 `PlatformManagedError extends PointerUnreachableError`（**不覆写 this.name**，message 首行"平台接管声明生效"）；`resolvePlatformSpecDir` 无指针分支调 `checkPlatformManaged`，命中 → 抛错
- [ ] `src/run/command.js`：指针恢复链（指针与 platform-scan.json 皆缺失后、specBase 兜底本地前）调 `checkPlatformManaged`，命中 → 打印引导 + exit(1)
- 验收：删指针保声明 → 两条路径都 fail-closed（resolvePlatformSpecDir 单元测 + runCommand CLI 子进程测 exit 1 含"平台接管"文案）；无声明行为逐字节不变

## T3 disconnect 三清 + cleanup 提示（Wave 2）
- [ ] `src/sync.js`：`platform disconnect` 三清——local.yaml platform 段（现状已有）+ `.sillyspec-platform.json` 指针 + `.sillyspec-platform-managed` 声明
- [ ] `src/index.js`：`platform pointer --cleanup` 输出补一行"如需彻底脱离平台请用 sillyspec platform disconnect"
- 验收：disconnect 后裸调恢复本地模式；cleanup 只删指针不删声明

## T4 doctor 诊断信号（Wave 2）
- [ ] `src/doctor-diagnostics.js`：D2 扩展 `pointer_missing_but_managed`（调 checkPlatformManaged，只读诊断项非阻断）
- 验收：doctor --json 能报该信号

## T5 测试（贯穿两 Wave）
- [ ] `test/platform-managed-declaration.test.mjs`：七场景——①三落盘 ②无指针+声明 fail-closed（resolvePlatformSpecDir 直测）③无指针+声明 fail-closed（runCommand CLI 子进程）④无声明走本地 ⑤disconnect 三清 ⑥--spec-dir 逃生口 ⑦幂等
- [ ] 全量 npm test + lint + doc-ref-check 过

## T6 文档同步（Wave 2）
- [ ] `docs/sillyspec/file-lifecycle.md`：登记新运行时文件 `.sillyspec-platform-managed`
- [ ] `docs/sillyspec/platform-interface-map.md`：指针章节补声明机制双入口描述（doc-ref-check 同步行号）
- [ ] `.claude/skills/`（doctor skill 如涉及）同步
