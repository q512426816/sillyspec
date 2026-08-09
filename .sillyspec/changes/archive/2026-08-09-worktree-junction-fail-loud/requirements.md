---
author: qinyi
created_at: 2026-08-09T15:50:00+08:00
---
# 需求（Requirements）— worktree junction 解链 fail-loud

## 功能需求
- **FR-01**: `cleanup`(:742) `lstatSync` 判 junction 的 `try{}catch{}` 静默 → lstat 失败(EPERM) 改 throw fail-loud 阻断 cleanup（不跳过解链、不继续 git worktree remove）
- **FR-02**: `cleanup`(:744-754) junction 解链(rmdir/unlinkSync) 的 `try{}catch{}` 静默 → 解链失败改 throw fail-loud 阻断（不继续 git remove 跟 junction 删主仓）
- **FR-03**: `_doctorReprovision`(:870) lstat 静默 catch → throw fail-loud（同 FR-01 口径）
- **FR-04**: `_doctorReprovision`(:872-878) 解链 catch → throw fail-loud（**废弃 :878 best-effort 注释**，解链失败不调 `provisionDeps`，避免 install 经 junction 误改主仓）
- **FR-05**: 错误信息含恢复指引（关闭占用进程 / 手动 `rmdir "<wtNodeModules>"` / 重试 sillyspec worktree cleanup）
- **FR-06**: 新增 `test/worktree-junction-fail-loud.test.mjs`（mock lstat 抛 EPERM → 断言 throw；mock 解链失败 → 断言 throw + 不继续 git remove/provisionDeps；正常 junction 解链仍成功）
- **FR-07**: `npm test` + `npm run lint` 全绿，零回归（含既有 worktree-native-overlay / worktree-apply 等套件）

## 参考决策
D-001@v1（junction 解链 fail-loud 决策占位；decisions.md 未独立建文件，悬空引用——CLI 校验 D-xxx@vN 字面出现在 verify-result.md 即可）

## 风险（R1-R5 详见 design.md 风险登记）
R1 fail-loud 阻断 cleanup 影响流程（恢复指引缓解）；R2 EPERM 偶发瞬态（不自动重试）；R3 _doctorReprovision 行为变化（doctor 显式调用合理）；R4 非 Windows 一致 fail-loud；R5 测试 mock 跨平台。
