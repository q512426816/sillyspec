---
author: flow-machine-draft
created_at: 2026-11-08T03:17:55.344Z
---
# 需求规格（Requirements）— 2026-11-08-flow-askuser-confirm

## 功能需求

### FR-01: flow start 输出的断点①（批准）提示明确要求用 AskUserQuestion 呈现摘要与选项，而非纯文字等回复

- **必须**：flow start 输出中的断点①（批准）提示明确要求 Agent 用 AskUserQuestion 工具把 spec 摘要与选项（批准开始实现 / 需要调整 / 否决）呈现给用户。
- **禁止**：断点①提示写成「把摘要给用户看 → 等用户回复」这类纯文字征询而不提 AskUserQuestion。

#### 场景：主路径

Given 用户完成 flow start 立项，When 读取 flow start 输出中的断点①提示，Then 文案含「AskUserQuestion」且给出选项示例（批准/需要调整/否决）。

#### 场景：恢复简报

Given 变更未批准且重入 flow start，When 读取恢复简报的「下一步」，Then 补批指引同样指向 AskUserQuestion 征询用户。

### FR-02: 三断点纪律（①批准 / ②执行 / ③归档）均写明用 AskUserQuestion 征询用户

- **必须**：flow start 输出的三断点纪律中，① spec 断点、② 执行断点、③ 归档断点三条各自写明用 AskUserQuestion 呈现结果与选项。
- **禁止**：任一断点只写「给用户看 / 等用户确认」而不指定 AskUserQuestion 工具。

#### 场景：主路径

Given 用户运行 flow start，When 读取三断点纪律段，Then ① ② ③ 三条均出现 AskUserQuestion 字样。

### FR-03: sillyspec-flow SKILL.md 断点①段落写明 AskUserQuestion 用法（批准/需要调整/否决选项）

- **必须**：`.claude/skills/sillyspec-flow/SKILL.md` 的断点①段落写明用 AskUserQuestion 呈现 FR 条目、design 四节摘要与选项（批准开始实现 / 需要调整 / 否决），用户批准后再运行 flow approve。

#### 场景：主路径

Given Agent 加载 sillyspec-flow skill，When 阅读断点①段落，Then 能看到 AskUserQuestion 与三个选项的明确用法。

### FR-04: test/flow-order-canon.test.mjs 与 test/flow-checkpoints.test.mjs 全绿

- **必须**：本次新增断言与既有断言全部通过，两测试文件无回归。

#### 场景：回归

Given 文案与 skill 改动落盘，When 运行两测试文件，Then 全部用例通过。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/flow-order-canon.test.mjs「① flow start 横幅：【你要做的】正典顺序句 + 断点纪律顺序语义」
FR-02: test/flow-checkpoints.test.mjs「① 简报含三断点纪律」
FR-03: test/flow-order-canon.test.mjs「⑤ 命令卡与 SKILL.md：生命周期含补 spec 面 → 批准 → 干活」
FR-04: test/flow-order-canon.test.mjs「①⑤」+ test/flow-checkpoints.test.mjs「①」全绿
