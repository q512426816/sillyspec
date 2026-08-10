---
author: qinyi
created_at: 2026-08-10 13:15:00
---

# 验证报告（verify-result）— worktree-apply 抗脏（dirty 拦截时输出逐文件 rescue 指令）

## 结论（Conclusion）

**PASS WITH NOTES**

方案 A（cp 指令）+ 实现 2（generateRescueCommands helper + result.rescueCommands 字段）全量落地，fail-loud 安全边界完整保留，全 acceptance 命中，全量测试零回归。Notes 见末节（dogfood apply 路径 + 并发 session 测试数漂移，均非缺陷）。

## 验证范围

变更 `2026-08-10-worktree-apply-dirty-resilient`，5 task / 5 Wave 串行：
- task-01 `generateRescueCommands` 纯函数（src/worktree-apply.js）
- task-02 step3.5 前移 hashMismatch + deletedFiles 收集 + 注释归因（src/worktree-apply.js，Grill P0）
- task-03 step4.5/5a 拦截接入 rescue + assess 透出（src/worktree-apply.js）
- task-04 index.js apply/assess 结构化 rescue 打印段（src/index.js）
- task-05 rescue 测试套件 + 全量回归（test/worktree-apply-rescue.test.mjs）

涉及文件：src/worktree-apply.js / src/index.js / test/worktree-apply-rescue.test.mjs（3 文件，design §文件变更清单一致）。

## 测试结果（单元 + 集成 + 回归）

### 单元测试（test/worktree-apply-rescue.test.mjs，新建，37 断言）
- **A generateRescueCommands 纯函数四分类（20 断言）**：SAFE-CP / EXCLUDE-DIRTY / EXCLUDE-MISMATCH / DELETE 四分支各验；DELETE 优先级（同文件命中 deleted+dirty+mismatch→只 rm，不计两类）；dirtyFiles 传 Set 与数组一致；路径正斜杠规范化（Windows 盘符→正斜杠，无反斜杠）；不 mutate 入参；空 changedFiles 零返回。
- **B P0 时序回归 AC-1（4 断言）**：main 已提交推进 fileA + fileB dirty 触发 step4.5 拦截 → result.hashMismatchFiles 含 fileA（task-02 前移生效）+ rescue EXCLUDE-MISMATCH 排除 fileA + SAFE-CP 不含 fileA。**锁死 step3.5 前移不回退（R-03 数据丢失防护）**。
- **C 前移等价 AC-8（3 断言）**：checkOnly / real apply 两路径 result.hashMismatchFiles 一致（R-07）。
- **D dirtyFiles 口径 AC-6（2 断言）**：computeRescueDirtyFiles 含 untracked + .sillyspec/docs/（Grill 残留 gap 闭环，对齐 filterDeliverableFiles）。
- **E 零回归 AC-3（2 断言）**：未拦截场景 result.rescueCommands === null。
- **F 拦截集成 + assess 透出（4 断言）**：applyWorktree dirty 拦截 rescueCommands 非空 + errors 含 cp 块；assessApplyRisk 透出 assessment.rescueCommands。
- **G 跨模式 deletedFiles AC-9（2 断言）**：native-worktree / in-place-fallback 两模式 result.deletedFiles 口径一致（design 自审存疑项实测闭环）。

单独 `node test/worktree-apply-rescue.test.mjs`：**37/37 PASS，0 FAIL**。

### 集成测试（CLI 端到端，task-04 自检）
临时 fixture（worktree 改 src/fileA + main dirty src/fileB → step4.5 拦截），真实 CLI `node bin/sillyspec.js worktree apply tc --check-only` EXIT 1，stderr 实测含：
```
🆘 Rescue commands (1 safe / 0 excluded，旁路 git apply，cp 后需手动 sillyspec worktree cleanup tc):
   cp "<worktreePath>/src/fileA.txt" "<projectRoot>/src/fileA.txt"
```
errors 主通道文本（「校验失败」/「未提交」）保留未被 rescue 段取代。19 断言全 PASS。

### 回归测试（既有 worktree-apply 套件零回归）
- test/worktree-apply-uncommitted.test.mjs：5/5 PASS（step4.5/5a 真正冲突仍拦截——fail-loud 不变量实证）
- test/worktree-apply-baseline-clean.test.mjs：3/3 PASS
- test/worktree-apply-relax-committed-advance.test.mjs：17/17 PASS（step5b hashMismatch display 前移后语义不变）

### 全量 npm test
- worktree 内：149 文件 ALL PASS（0 失败）
- main 工作区（worktree apply 后）：150 文件 ALL PASS（0 失败，含 rescue 套件；+1 系并发 session 新增测试）

### lint（node test/check-syntax.mjs）
229 文件全绿（src 75 + test 154）。

## 设计一致性

逐项对照 design.md（v2 Grill PASS）：
- ✅ generateRescueCommands 签名逐字匹配 §接口定义
- ✅ step3.5 前移匹配 §step 顺序修正（Grill P0，baseHash 用 meta.baseHash）
- ✅ 逐文件四分类匹配 §逐文件分类算法表（优先级 DELETE→EXCLUDE-DIRTY→EXCLUDE-MISMATCH→SAFE-CP）
- ✅ dirtyFiles 统一口径匹配 §dirtyFiles 口径统一（computeRescueDirtyFiles 复用 filterDeliverableFiles，保留 .sillyspec/docs/）
- ✅ result.rescueCommands additive 字段匹配 §字段数据流（3 真实 consumer，撤回虚假 --json consumer）
- ✅ index.js 打印段匹配 §文件变更清单
- ✅ fail-loud 不变量匹配 §非目标 + R-01（step4.5/5a 拦截决策零改动，autocrlf on/off 实证）
- ✅ 决策追踪 D-001（方向 A）/ D-002（实现 2）/ D-003（安全子集）/ D-004（Grill 三修）全被实现覆盖

## 任务蓝图验收

任务卡 acceptance 全命中：
1. ✅ 造主仓脏文件场景，apply 失败时给出逐文件 cp 指令（方案 A）— generateRescueCommands + step4.5/5a 接入 + index.js 打印段，CLI 自检实证
2. ✅ 现有 fail-loud 对真正冲突仍拦截 — step4.5/5a 拦截决策零改动，worktree-apply-uncommitted 5/5 零回归实证
3. ✅ 改 src/worktree-apply.js — task-01/02/03
4. ✅ 补测试 — task-05（37 断言含 P0 时序回归）

## 兼容性 / 回退

- rescueCommands / deletedFiles 均为 additive 字段，现有消费方不读即不受影响
- applyWorktree / assessApplyRisk 签名零变更，对外行为不变（未拦截 rescueCommands===null）
- hashMismatch 前移语义等价（仅计算位置提前，判定逻辑不变）
- 全可回退：删 generateRescueCommands 调用 + 字段 + step3.5 前移（还原 step5b）即回到现状

## 风险 / 技术债务

- 无新增技术债务（additive + 可回退）
- 残留非阻断观察（design Grill 已记）：
  - R-06 rescue 让 agent 习惯性绕过正常 apply → error 文案明确「cp 后需手动 sillyspec worktree cleanup」，不自动 cleanup
  - step4.5 注释归因已补正（git 硬约束 → Windows/autocrlf CRLF 副作用），CRLF 根因（.gitattributes 规范化）属另一更大工程，超出本变更范围

## Notes（非缺陷，诚实记录）

1. **dogfood apply 路径**：execute 后 worktree 变更经 `sillyspec worktree assess`（决策 WARNING）自动 apply 到 main 工作区（3 文件 cleanly），供 verify 测试对账跑 main 实测真实变更（非 worktree）。apply 用 main 旧 apply 代码完成——因 main 当前 dirty 文件均在 step4.5 排除范围（.sillyspec/changes/ docs/），未触发拦截，apply 成功。这正是 rescue 要解决的并发脏场景的"幸运未触发"子例。
2. **并发 session 测试数漂移**：全量 npm test 计数随并发 session 提交新测试文件增长（worktree 149 → main 150 → lint 154），均 0 失败，rescue 套件始终在内。
3. **in-place 模式 deletedFiles**：design v1 自审存疑项（native vs in-place name-status 口径）经 task-05 G 节实测两模式一致，闭环。

## Runtime Evidence

本变更是 CLI 流程控制器的 worktree apply 增强（纯 Node 库函数 + CLI 打印段），无 daemon/backend/服务启动入口，不触发 integration-evidence 部署级/集成级门控（design 明示「不涉及生命周期契约」）。证据为上述单元/集成/回归测试实测结果（150 文件 npm test + 37 断言 rescue 套件 + CLI 端到端 stderr）。
