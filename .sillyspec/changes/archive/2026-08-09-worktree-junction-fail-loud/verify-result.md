---
author: qinyi
created_at: 2026-08-09T22:40:00+08:00
risk_level: unit-sufficient
---

# 验证报告（Verify Result）— worktree junction 解链 fail-loud（review-2026-08-09 #4）

## 结论（Conclusion）

**PASS WITH NOTES** — 核心改动（cleanup + _doctorReprovision 双 fail-loud）实现完整、测试锁定、零回归。NOTE：worktree.md:82 模块文档需补「解链失败 fail-loud 不 provisionDeps」（archive 时同步，不阻断归档）。

## 测试结果

| 套件 | 结果 |
|---|---|
| test/worktree-junction-fail-loud.test.mjs（新增，7 用例/18 断言） | ✅ 18/0 pass（worktree 副本 + main 双跑） |
| npm test 全量（worktree 副本） | ✅ 147/0 零回归 |
| npm run lint | ✅ 226 文件绿（src 75 + test 151） |

测试矩阵覆盖（mock.module 三件套：fs.lstatSync / child_process.execSync / worktree-deps.provisionDeps）：
- cleanup lstat EPERM → throw（不 git remove）
- cleanup 解链失败 → throw（不 git remove）
- cleanup 正常 junction → 解链成功
- cleanup 非 junction → 不解链
- _doctorReprovision lstat EPERM → ok:false（provisionDeps 计数 0）
- _doctorReprovision 解链失败 → ok:false（provisionDeps 计数 0）
- _doctorReprovision 正常 → provisionDeps 调用 ok:true

## 设计一致性

- ✅ cleanup:738-757 两处 try{}catch{} 静默 → fail-loud throw（D-001@v1，符合 design 方案A）
- ✅ _doctorReprovision:866-881 同源 fail-loud + 废弃 :878 best-effort（D-002@v1，解链失败不调 provisionDeps）
- ✅ 错误信息含恢复指引（rmdir 路径 + 重试命令，FR-05）
- ✅ 接口签名不变（cleanup/_doctorReprovision 仅容错收紧，调用方 run/doctor 已有 try/catch 兜底）

## 模块文档一致性

- ⚠️ NOTE：worktree.md:82「_doctorReprovision 解链 + provisionDeps(force=true) 重供给」需补「解链失败 fail-loud 阻断，不调 provisionDeps（D-002@v1）」——archive step 同步，不阻断 verify。
- file-lifecycle.md 不涉及（#4 改容错策略，非 stage/step 状态机，design 已声明 lifecycle 豁免）。

## 决策追踪矩阵

| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-001@v1 | FR-01,02,03,04,05 | task-01, task-02 | 测试用例 1-6（lstat EPERM + 解链失败 throw/ok:false） | ✅ 闭环 |
| D-002@v1 | FR-04 | task-02 | 用例 5/6（provisionDeps 计数 0，解链失败不 install） | ✅ 闭环 |

## 代码审查

- 容错策略收紧合理（静默 catch → throw，保护主仓 node_modules 不可逆数据丢失）
- Windows rmdir / Unix unlinkSync 分支一致 fail-loud（R4 跨平台口径一致）
- _doctorReprovision throw 被外层 :892 catch 兜底成 ok:false——满足「不调 provisionDeps」（D-002@v1 核心），错误 msg 传到 return，用户可见
- 测试 mock 三件套 + 自举 respawn（照抄 stage-completion-atomicity），跨平台隔离不碰真实 junction

## 风险/遗留

- R1 fail-loud 阻断 cleanup 影响 execute 归档：错误提示含恢复指引（手动 rmdir + 重试），用户可处理；优于静默删主仓 node_modules（数据丢失不可逆）
- platform-recovery.test.mjs 既有 flaky（无关本变更，子代理首跑偶现 1 例，重跑恢复绿）
- worktree.md:82 同步（archive 时补）
