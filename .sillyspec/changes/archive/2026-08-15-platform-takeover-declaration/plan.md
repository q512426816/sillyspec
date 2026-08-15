---
author: qinyi
created_at: 2026-08-15T15:45:00+08:00
plan_level: full
---

# 实现计划（Plan）— 平台接管声明机制

## Spike 前置验证
无（纯业务逻辑，技术方案确定：静态落盘文件 + 读取校验，无新技术栈/集成不确定性）。

## Wave 1（机制主体，并行无依赖）
- [x] task-01: writePlatformPointer 三写扩展 + checkPlatformManaged 读侧 helper（覆盖：FR-01, FR-07, D-A@v1）
- [x] task-02: resolvePlatformSpecDir 声明检查 + PlatformManagedError（覆盖：FR-02①, FR-03, FR-05, D-B@v2, D-D@v2）
- [x] task-03: runCommand 指针恢复链封堵（覆盖：FR-02②, FR-03, D-B@v2）

## Wave 2（依赖 Wave 1）
- [x] task-04: platform disconnect 三清 + pointer --cleanup 提示（覆盖：FR-04, D-C@v2）
- [x] task-05: doctor D2 诊断信号 pointer_missing_but_managed（覆盖：FR-06）
- [x] task-06: 八场景测试（七机制场景 + doctor 信号场景⑧）+ cleanHomePointer 扩展（覆盖：FR-01~FR-07）
- [x] task-07: 文档同步（file-lifecycle.md / platform-interface-map.md / skills / 提示词镜像无涉及）

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | writePlatformPointer 三写 + checkPlatformManaged | W1 | P0 | — | FR-01, FR-07, D-A@v1 | shared.js：增写声明文件（managed/specRoot 副本/workspaceId/declaredAt 四字段）；读侧 helper 宽容返回 null 不抛错 |
| task-02 | resolvePlatformSpecDir 声明检查 + PlatformManagedError | W1 | P0 | — | FR-02①, FR-03, FR-05, D-B@v2, D-D@v2 | progress.js：无指针分支调 checkPlatformManaged；新错误类**不覆写 name**（顶层 catch 严格匹配 index.js L1790） |
| task-03 | runCommand 恢复链封堵 | W1 | P0 | — | FR-02②, FR-03, D-B@v2 | command.js：指针+platform-scan.json 皆缺失后、specBase 兜底本地前查声明，命中 exit(1)+引导（注释写明对齐 PointerUnreachableError 顶层 catch，与邻近 exit(2) 风格差异的理由）；显式 --spec-dir 分支天然不受影响 |
| task-04 | disconnect 三清 + cleanup 提示 | W2 | P0 | task-01 | FR-04, D-C@v2 | sync.js：disconnect 删 local.yaml platform 段（现状）+ 指针 + 声明；index.js：cleanup 输出补 disconnect 提示 |
| task-05 | doctor 诊断信号 | W2 | P1 | task-01 | FR-06 | doctor-diagnostics.js：D2 无指针分支调 checkPlatformManaged，报 pointer_missing_but_managed（只读非阻断）；测试断言归 task-06 场景⑧（同 Wave 同文件并行冲突，postcheck 拦截后调整） |
| task-06 | 八场景测试 | W2 | P0 | task-01,02,03,04,05 | FR-01~FR-05, FR-07 | 新测试文件：①三落盘 ②resolvePlatformSpecDir 直测 ③runCommand CLI 子进程 ④无声明走本地 ⑤disconnect 三清 ⑥--spec-dir 逃生口 ⑦幂等 ⑧doctor 信号（FR-06 证据）。tmpdir fixture 强制清理防 R-01；**扩展 run-tests.mjs cleanHomePointer 同步清理 HOME 下 .sillyspec-platform-managed**（防 cwd 纠正缝隙泄漏致 home 全 fail-closed，plan review gap 项） |
| task-07 | 文档同步 | W2 | P1 | task-01~05 | — | file-lifecycle.md 登记新文件；platform-interface-map.md 补双入口描述（doc-ref-check 行号同步）；doctor skill 如涉及 |

## 关键路径
task-01 → task-06（三写先行，测试殿后验证全链路）；task-02/03 与 task-01 并行。

## 全局验收标准
- [ ] npm test 全量通过（含新增七场景测试）
- [ ] npm run lint 通过
- [ ] doc-ref-check 通过（platform-interface-map.md 行号同步）
- [ ] （brownfield）无声明文件的项目行为逐字节不变——纯本地项目零影响
- [ ] 双入口 fail-closed 均有测试证据（单测 + CLI 子进程）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-A@v1 | task-01 | 声明文件三落盘（测试场景①） |
| D-B@v2 | task-02, task-03 | 双入口 fail-closed（测试场景②③） |
| D-C@v2 | task-04 | disconnect 三清（测试场景⑤） |
| D-D@v2 | task-02 | name 不覆写（错误类实现 + 顶层 catch 命中） |
| D-E@v2 | task-01 | 四字段声明 schema（测试场景①断言字段集） |
| FR-01~FR-05, FR-07 | task-01~04, task-06 | 七场景测试场景①~⑦（⑦=幂等对应 FR-07） |
| FR-06 | task-05 | doctor --json 信号断言（task-05 内测试） |
