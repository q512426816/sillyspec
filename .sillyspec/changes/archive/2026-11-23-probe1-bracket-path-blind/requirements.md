---
author: flow-machine-draft
created_at: 2026-11-23T06:29:59.143Z
---
# 需求规格（Requirements）— 2026-11-23-probe1-bracket-path-blind

## 功能需求

### FR-01: 方括号字面路径（含 [id] / [...slug]）在主仓或 worktree 真实存在时，按具体文件扫描，TODO/FIXME 可被命中

- **必须**：design 清单中的路径若含方括号（如 `[id]`、`[...slug]`），且该路径作为字面文件在主仓或 worktree 真实存在，探针 1 必须按具体文件读取并逐行扫描，不得归入 `globEntries` 跳过。
- **必须**：主仓缺失、worktree 存在时按 worktree 版本扫描，`worktreeHits` 照常计数。

#### 场景：主仓字面路径

Given design 清单含 `src/app/[id]/page.js`，且主仓该文件存在并含 `// TODO: 接线`
When 运行探针 1
Then `matches` 含该路径的命中项，`globEntries` 不含该路径

#### 场景：worktree 字面路径

Given 主仓无该文件、worktree 有且含 TODO
When 运行探针 1
Then 命中来自 worktree 版本且 `worktreeHits` 递增

### FR-02: 真 glob 路径（含 * 或 ? 通配）仍归入 globEntries，不误扫

- **必须**：路径含 `*` 或 `?` 通配符（或含方括号但字面文件不存在）时，必须归入 `globEntries` 交给 agent 展开，不得当作字面文件扫描或报入 `skippedFiles`。

#### 场景：通配路径

Given design 清单含 `src/**/*.js`
When 运行探针 1
Then `globEntries` 含 `src/**/*.js`，`matches` 不含该路径

### FR-03: glob 项或跳过项非空且命中为空时，报告不再输出「✅ 无 TODO/FIXME/尚未实现 标记命中」，改为显式 ⚠️ 说明结论不完整

- **必须**：`matches` 为空且 `globEntries` 或 `skippedFiles` 非空时，渲染报告禁止输出「✅ 无 TODO/FIXME/尚未实现 标记命中」，必须输出显式 ⚠️ 行说明「结论不完整」。
- **必须**：`matches`、`globEntries`、`skippedFiles` 全空时，仍保留原 ✅ 全清结论。
- **禁止**：新增 ⚠️ 行撞上 `PROBE1_HIT_LINE_RE`（`- ⚠️ \`路径:行号\``），避免污染探针一致性对账。

#### 场景：有未扫描面

Given 探针 1 零命中、存在 1 个 glob 项
When 渲染报告
Then 报告不含「✅ 无 TODO/FIXME/尚未实现 标记命中」，含「结论不完整」的 ⚠️ 行

#### 场景：全干净

Given 零命中且无 glob / 跳过项
When 渲染报告
Then 报告含原 ✅ 全清结论

### FR-04: 新增回归测试覆盖方括号字面路径命中、真 glob 不入扫描、报告措辞三态，相关测试全绿

- **必须**：新增/更新测试覆盖方括号字面路径命中、真 glob 不入扫描、报告措辞两态（有未扫描面 / 全干净），且 `test/verify-probes.test.mjs` 全绿。

#### 场景：测试面

Given 上述实现完成
When 运行 `node test/verify-probes.test.mjs`
Then 全绿且新增断言覆盖三类路径

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/verify-probes.test.mjs「探针1 方括号字面路径按具体文件扫描并命中 TODO」
FR-02: test/verify-probes.test.mjs「探针1 真 glob 路径归入 globEntries 不误扫」
FR-03: test/verify-probes.test.mjs「探针1 存在未扫描面时报告不输出全清结论」
FR-04: test/verify-probes.test.mjs「探针 1 三态回归整文件全绿」
