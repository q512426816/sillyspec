---
author: flow-machine-draft
created_at: 2026-10-22T23:49:53.216Z
---
# 需求规格（Requirements）— 2026-10-23-turbo-docs-auto

## 功能需求

### FR-01: turbo docs-auto 常设授权档与自动降档

- local.yaml 新键 `turbo: docs-auto`（readFlowConfig 逐键正则，未配置/坏值 fail-soft 恒 false）必须在 cmdFlowDone 入口生效：旗标档（--turbo）未开且 tier 非 thick 时判定面——changedFilesSinceBaseline（提交∪脏面）经 dirty_gate_ignore 前缀剔除后非空且无任何文件命中代码分类器（quick-audit 的 CODE_PATH_SEGMENT_RE/CODE_EXTENSION_RE 单一源）→ turbo 等效 true（turboSource=docs-auto），五个既有消费点（实测门/评审豁免/dirty advisory/UI 探针/hunk 门）读同一局部变量零改动继承。

#### 场景：纯文档面自动降档

Given local.yaml 配 turbo: docs-auto，变更交付面仅文档（docs/note.md，盲维四问实质作答——无本档必评）；When 运行 flow done；Then 收口一次完成：无评审任务书、输出含 turbo(docs-auto) 授权源留痕行、实测门合成 skipped 且 reason 含 docs-auto 授权源（不显示「用户显式触发」）、归档完成。

#### 场景：旗标档不变

Given --turbo 旗标档（st.turbo=true）；When 运行 flow done；Then 行为与改动前逐字一致（turboSource=flag，reason 文案原样）。

### FR-02: fail-closed 面判定与零回归

- 面判定必须 fail-closed：面空（含纯治理件变更）/任一文件命中代码分类器/读取或判定异常，一律不降档走全量仪式；未配置键的仓必须行为零变化（零回归锚）。

#### 场景：含代码面不降档

Given 配置在场但交付面含 src/work.js；When 运行 flow done；Then 不降档：评审照常定档（盲维实质作答→任务书 exit 1）、无 turbo(docs-auto) 留痕行。

#### 场景：未配置零回归

Given 同纯文档面但未配置键；When 运行 flow done；Then 评审照常定档（任务书 exit 1）——豁免来自配置而非面本身。

### FR-03: 授权源可观测

- docs-auto 降档必须在收口输出留一行授权源（turbo(docs-auto)＋授权源 local.yaml turbo: docs-auto＋升厚即失效）；实测门合成 skipped 的 reason 必须区分授权源——docs-auto 档不显示「用户显式触发」字样（防文案与判定漂移）。

#### 场景：reason 区分授权源

Given docs-auto 降档收口；Then gate reason 含 `local.yaml turbo: docs-auto` 且不含 `用户显式触发`。

### FR-04: 测试矩阵

- 新增测试必须覆盖：配置+纯文档面→完成无任务书+授权源行；同面未配置→任务书照常；配置+src 面→不降档任务书照常；unit readFlowConfig 键三态（未配置 false/docs-auto true/坏值 false）。

#### 场景：四态

Given temp 仓与直调各场景；When 分别执行；Then 断言各自成立。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/turbo-docs-auto.test.mjs「①配置+纯文档面→完成无任务书+授权源行」「④旗标档 reason 原样」
FR-02: test/turbo-docs-auto.test.mjs「②同面未配置→任务书照常」「③配置+src 面→不降档任务书照常」
FR-03: test/turbo-docs-auto.test.mjs「①配置+纯文档面→完成无任务书+授权源行」
FR-04: test/turbo-docs-auto.test.mjs「①-④」＋readFlowConfig 键三态 unit
